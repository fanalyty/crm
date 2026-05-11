AI-First CRM HCP ModuleAn AI-driven Customer Relationship Management (CRM) module designed for Life Science Field Representatives. This application features a "Generative UI" split-screen design where a LangGraph-powered AI assistant converses with the user and autonomously populates structured interaction logs.🌟 Key FeaturesAgentic UI: The form is entirely driven by natural language. Users chat with the AI, and the AI extracts entities to populate the Redux state in real-time.LangGraph Orchestration: Utilizes a stateful create_react_agent from LangGraph to handle conversational memory and tool execution.Groq LPU Inference: Powered by gemma2-9b-it via Groq for lightning-fast token generation.Redux State Management: The React frontend uses Redux Toolkit to manage chat history and real-time form state updates.🛠 Tech StackFrontend: React, Redux Toolkit, Tailwind CSS, Lucide Icons.Backend: Python, FastAPI, SQLAlchemy, Uvicorn.AI Framework: LangChain, LangGraph.LLM: Groq (gemma2-9b-it).Database: SQLite (SQLAlchemy configured, easily swappable to PostgreSQL/MySQL).🧰 The 5 LangGraph ToolsThe LangGraph agent is equipped with 5 specific tools tailored for a Life Science Field Rep:log_interaction (Mandatory): Extracts HCP Name, Date, Sentiment, Materials, and Notes from natural language to create a new log.edit_interaction (Mandatory): Modifies specific fields on the currently active form without overriding existing data.schedule_follow_up: Extracts a future date and intent to schedule follow-up tasks.get_hcp_history: Queries the database for past interactions with a specific doctor.query_product_info: Queries a simulated medical knowledge base for dosage/product info to assist the rep during conversations.🚀 How to Run Locally1. Backend Setup (FastAPI)Navigate to the backend directory (or where backend.py is located):# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows use `venv\Scripts\activate`

# Install required packages
pip install fastapi uvicorn pydantic sqlalchemy langchain-groq langgraph

# Set your Groq API Key
export GROQ_API_KEY="your_groq_api_key_here" # On Windows use `set GROQ_API_KEY=...`

# Start the server
uvicorn backend:app --reload --port 8000
The backend will be running at http://localhost:80002. Frontend Setup (React)Assuming you are using a standard React setup (like Vite or Create React App):# Install dependencies
npm install @reduxjs/toolkit react-redux lucide-react

# Start the development server
npm start # or `npm run dev` if using Vite
Ensure Tailwind CSS is configured in your React environment.🎥 Video Presentation Outline (Recommendation)UI Demo (0:00 - 3:00): Show the split screen. Emphasize that the form is read-only. Type "I met with Dr. Smith today, sentiment was highly positive." Show the form auto-populating.Edit Tool Demo (3:00 - 5:00): Type "Wait, the sentiment was actually neutral." Show only the sentiment field updating via the edit_interaction tool.Additional Tools Demo (5:00 - 8:00): Ask the AI to schedule a follow-up, ask for Dr. Smith's history, and ask a product dosage question.Architecture Walkthrough (8:00 - 12:00): Show backend.py. Explain how langgraph.prebuilt orchestrates the tools using the Groq LLM. Show frontend.jsx and explain how Redux catches the JSON payload from FastAPI to update the form state.Summary (12:00 - 15:00): Conclude with your understanding of Generative UI and how this architecture reduces manual data entry for field reps.
