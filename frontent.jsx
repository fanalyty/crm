import React, { useState, useEffect, useRef } from 'react';
import { configureStore, createSlice } from '@reduxjs/toolkit';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { Send, Bot, User, Loader2, FileText, Activity, Calendar, FileBox, AlignLeft } from 'lucide-react';

// ==========================================
// 1. REDUX SETUP (State Management)
// ==========================================
const initialState = {
  messages: [{ role: 'assistant', content: 'Hello! I am your AI CRM Assistant. Tell me about your HCP meeting today, and I will automatically log it for you.' }],
  formState: { hcp_name: '', interaction_date: '', sentiment: '', materials_shared: '', notes: '' },
  isLoading: false
};

const crmSlice = createSlice({
  name: 'crm',
  initialState,
  reducers: {
    addUserMessage: (state, action) => {
      state.messages.push({ role: 'user', content: action.payload });
    },
    addBotMessage: (state, action) => {
      state.messages.push({ role: 'assistant', content: action.payload });
    },
    updateFormState: (state, action) => {
      state.formState = { ...state.formState, ...action.payload };
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    }
  }
});

const { addUserMessage, addBotMessage, updateFormState, setLoading } = crmSlice.actions;
const store = configureStore({ reducer: { crm: crmSlice.reducer } });

// ==========================================
// 2. LEFT PANEL: AI-Controlled Form
// ==========================================
const FormPanel = () => {
  const formState = useSelector((state) => state.crm.formState);

  // Reusable input component. Note: readOnly is enforced!
  const FormField = ({ label, icon: Icon, value, isTextArea = false }) => (
    <div className="mb-4">
      <label className="flex items-center text-sm font-semibold text-gray-700 mb-1">
        <Icon className="w-4 h-4 mr-2 text-indigo-600" /> {label}
      </label>
      {isTextArea ? (
        <textarea
          readOnly
          value={value}
          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
          rows={4}
          placeholder="AI will populate this based on conversation..."
        />
      ) : (
        <input
          type="text"
          readOnly
          value={value}
          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
          placeholder="Waiting for AI input..."
        />
      )}
    </div>
  );

  return (
    <div className="w-1/2 h-full bg-white border-r border-gray-200 p-8 overflow-y-auto flex flex-col">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <Activity className="w-6 h-6 mr-3 text-indigo-600" />
          Log Interaction
        </h2>
        <p className="text-sm text-gray-500 mt-2">
          This form is read-only. Chat with the AI on the right to populate and edit these fields.
        </p>
      </div>

      <div className="flex-1">
        <FormField label="HCP Name" icon={User} value={formState.hcp_name} />
        <FormField label="Interaction Date" icon={Calendar} value={formState.interaction_date} />
        <FormField label="Sentiment" icon={Activity} value={formState.sentiment} />
        <FormField label="Materials Shared" icon={FileBox} value={formState.materials_shared} />
        <FormField label="Notes" icon={AlignLeft} value={formState.notes} isTextArea={true} />
      </div>
      
      <div className="mt-6 p-4 bg-indigo-50 rounded-lg border border-indigo-100 flex items-center text-sm text-indigo-800">
        <Bot className="w-5 h-5 mr-3" />
        Redux State Managed by LangGraph Agent
      </div>
    </div>
  );
};

// ==========================================
// 3. RIGHT PANEL: Chat Interface
// ==========================================
const ChatPanel = () => {
  const [inputText, setInputText] = useState('');
  const dispatch = useDispatch();
  const messages = useSelector((state) => state.crm.messages);
  const isLoading = useSelector((state) => state.crm.isLoading);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const userText = inputText;
    setInputText('');
    dispatch(addUserMessage(userText));
    dispatch(setLoading(true));

    try {
      // Connect to FastAPI Backend
      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, thread_id: 'demo_user_1' })
      });

      if (!response.ok) throw new Error('API Error');
      const data = await response.json();

      // 1. Update chat history with AI's reply
      dispatch(addBotMessage(data.response));
      // 2. Update the Redux Form State based on what the LangGraph Tools extracted
      dispatch(updateFormState(data.form_state));

    } catch (error) {
      console.error(error);
      dispatch(addBotMessage("Sorry, I encountered an error connecting to the server. Please ensure the FastAPI backend is running."));
    } finally {
      dispatch(setLoading(false));
    }
  };

  return (
    <div className="w-1/2 h-full bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 shadow-sm z-10 flex items-center justify-between">
        <h3 className="font-semibold text-gray-800 flex items-center">
          <Bot className="w-5 h-5 mr-2 text-indigo-600" />
          AI Assistant
        </h3>
        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">Groq gemma2-9b-it</span>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-indigo-600 ml-3' : 'bg-white border border-gray-300 mr-3'}`}>
                {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-indigo-600" />}
              </div>
              <div className={`p-4 rounded-2xl shadow-sm text-sm ${
                msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
              }`}>
                {msg.content}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex flex-row max-w-[80%]">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white border border-gray-300 mr-3 flex items-center justify-center">
                <Bot className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="p-4 rounded-2xl shadow-sm bg-white border border-gray-100 rounded-tl-none flex items-center text-sm text-gray-500">
                <Loader2 className="w-4 h-4 mr-2 animate-spin text-indigo-600" />
                Agent is thinking and executing tools...
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-200">
        <form onSubmit={handleSendMessage} className="relative flex items-center">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="E.g., I met with Dr. John today, sentiment was positive..."
            className="w-full pl-4 pr-12 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm shadow-inner"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="absolute right-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// 4. MAIN LAYOUT
// ==========================================
const AppLayout = () => {
  return (
    <div className="flex w-screen h-screen font-sans" style={{ fontFamily: "'Inter', sans-serif" }}>
      <FormPanel />
      <ChatPanel />
    </div>
  );
};

// ==========================================
// 5. ROOT PROVIDER
// ==========================================
export default function App() {
  return (
    <Provider store={store}>
      <AppLayout />
    </Provider>
  );
}