import os
import json
from typing import Optional, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, Text
from sqlalchemy.orm import declarative_base, sessionmaker

# LangGraph & LangChain Imports
from langchain_groq import ChatGroq
from langchain_core.tools import tool
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.messages import SystemMessage, HumanMessage # <-- Added HumanMessage

# ==========================================
# 1. DATABASE SETUP (SQLAlchemy)
# ==========================================
DATABASE_URL = "sqlite:///./crm_interactions.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class InteractionDB(Base):
    __tablename__ = "interactions"
    id = Column(Integer, primary_key=True, index=True)
    hcp_name = Column(String, index=True)
    interaction_date = Column(String)
    sentiment = Column(String)
    materials_shared = Column(String)
    notes = Column(Text)

Base.metadata.create_all(bind=engine)

# ==========================================
# 2. GLOBAL STATE (For UI Sync)
# ==========================================
ui_form_state = {
    "hcp_name": "",
    "interaction_date": "",
    "sentiment": "",
    "materials_shared": "",
    "notes": ""
}

# ==========================================
# 3. LANGGRAPH TOOLS
# ==========================================
@tool
def log_interaction(hcp_name: str, interaction_date: str, sentiment: str, materials_shared: str, notes: str) -> str:
    """
    Mandatory Tool: Logs a new interaction with a Healthcare Professional (HCP). 
    Use this when the user describes a new meeting to populate the UI form.
    """
    global ui_form_state
    ui_form_state = {
        "hcp_name": hcp_name,
        "interaction_date": interaction_date,
        "sentiment": sentiment,
        "materials_shared": materials_shared,
        "notes": notes
    }
    
    db = SessionLocal()
    new_log = InteractionDB(**ui_form_state)
    db.add(new_log)
    db.commit()
    db.close()
    return f"Successfully logged the new interaction with {hcp_name} and updated the form."

@tool
def edit_interaction(field_to_change: str, new_value: str) -> str:
    """
    Mandatory Tool: Edits an existing field on the current interaction form.
    field_to_change MUST be exactly one of: 'hcp_name', 'interaction_date', 'sentiment', 'materials_shared', 'notes'.
    """
    global ui_form_state
    if field_to_change in ui_form_state:
        ui_form_state[field_to_change] = new_value
        return f"Form updated: Changed {field_to_change} to {new_value}."
    return f"Error: {field_to_change} is not a valid form field."

@tool
def schedule_follow_up(hcp_name: str, date: str, intent: str) -> str:
    """Tool 3: Schedules a future follow-up task or reminder with the HCP."""
    return f"Follow-up task scheduled with {hcp_name} on {date} for: {intent}."

@tool
def get_hcp_history(hcp_name: str) -> str:
    """Tool 4: Retrieves past interaction history for a specific HCP to help the rep prepare."""
    db = SessionLocal()
    history = db.query(InteractionDB).filter(InteractionDB.hcp_name.contains(hcp_name)).all()
    db.close()
    if not history:
        return f"No previous history found for {hcp_name}."
    return f"Found {len(history)} past interactions. Last interaction notes: {history[-1].notes} (Sentiment: {history[-1].sentiment})"

@tool
def query_product_info(product_name: str, question: str) -> str:
    """Tool 5: Queries the medical knowledge base for product specifications, dosages, or safety info."""
    mock_kb = {
        "product x": "Product X recommended dosage is 10mg daily. Side effects may include mild nausea.",
        "product y": "Product Y is contraindicated in patients with severe hypertension."
    }
    info = mock_kb.get(product_name.lower(), "No specific data found for that product in the knowledge base.")
    return f"Knowledge Base Result for {product_name}: {info}"

# ==========================================
# 4. LANGGRAPH AGENT SETUP
# ==========================================
# Make sure to replace this if you didn't set the environment variable!
llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0) # Or add: api_key="gsk_..."
tools = [log_interaction, edit_interaction, schedule_follow_up, get_hcp_history, query_product_info]
memory = MemorySaver()

system_prompt = """You are an AI assistant built into a CRM for Life Science Field Representatives.
Your primary job is to control the UI form on the left side of the screen by calling tools based on the user's chat.
Be conversational, brief, and always use the tools provided to log data, edit data, or fetch info."""

agent_executor = create_react_agent(llm, tools, checkpointer=memory)

# ==========================================
# 5. FASTAPI APPLICATION
# ==========================================
app = FastAPI(title="AI CRM API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    thread_id: str = "default_user_1"

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    try:
        print(f"\n--- 🚀 NEW REQUEST RECEIVED: {request.message} ---")
        config = {"configurable": {"thread_id": request.thread_id}}
        
        print("Step 1: Fetching agent state...")
        state = agent_executor.get_state(config)
        
        input_messages = []
        
        # Safer check for empty state
        if not state.values or not state.values.get("messages"):
            print("Step 2: Injecting System Prompt (New Thread)...")
            input_messages.append(SystemMessage(content=system_prompt))
        else:
            print("Step 2: Thread exists. Skipping System Prompt.")
            
        print("Step 3: Appending User's Message...")
        input_messages.append(HumanMessage(content=request.message))
        
        inputs = {"messages": input_messages}
        
        print("Step 4: Invoking Agent (Connecting to Groq LLM)...")
        # If it fails here, it is 100% an API Key or LLM connection issue
        result = agent_executor.invoke(inputs, config)
        print("Step 5: Agent Execution Complete! Preparing response...")
        
        final_message = result["messages"][-1].content
        
        return {
            "response": final_message,
            "form_state": ui_form_state
        }
        
    except Exception as e:
        import traceback
        print("\n================== ERROR LOG ==================")
        traceback.print_exc()
        print("===============================================\n")
        raise HTTPException(status_code=500, detail="Backend crashed. Check terminal output.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)