import React, { useState, useRef, useEffect } from 'react';
import '../css/ChatUI.css'

const ollamaUrl = process.env.REACT_APP_OLLAMA_URL;

function ChatUI() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);
  const [isThinking, setIsThinking] = useState(false);


  const handleSubmit = async (e) => {
  e.preventDefault();
  if (!input.trim()) return;

  setIsThinking(true);

  const userMessage = { role: 'user', text: input };
  setMessages((prev) => [...prev, userMessage]);
  setInput('');

  
  await callModelSSE(input);
  
  };


  const callModelSSE = async (prompt) => {

    try {
      const response = await fetch(ollamaUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream"
        },
        body: JSON.stringify({ 
          sentence : prompt 
        })
      });

      setIsThinking(false);

      if (!response.ok || !response.body) {
        throw new Error("Backend error.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let accumulated = "";
  
      const modelMessage = { role: 'model', text: '' };
      setMessages((prev) => [...prev, modelMessage]);
      const idx = messages.length + 1;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split("\n\n");
        buffer = events.pop(); 

        for (const event of events) {
          const lines = event.split("\n");
          for (const line of lines) {
            if (line.startsWith("data:")) {
              const content = line.replace("data:", "");
              if (content) {
                accumulated += content;              
                setMessages((prev) => {
                  const updated = [...prev];                
                  if (idx !== -1) {
                    updated[idx] = { ...updated[idx], text: accumulated };
                  }
                  return updated;
                });
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("Error SSE POST:", err);
      setMessages((prev) => [...prev, {
        role: 'model',
        text: "⚠️ Model Error"
      }]);
    }
  };


  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="chat-container">
    
      <div className="chat-title">
        <h1>AI Mood Detector</h1>
      </div>

      <div className="chat-box">
        {messages.map((msg, idx) => (
          <div key={idx} className={`msg ${msg.role}`}>
            <strong>{msg.role === 'user' ? 'You:' : 'Model:'}</strong> {msg.text}
          </div>
        ))}
        <div ref={scrollRef}></div>
      </div>

      {isThinking && (
        <div className="thinking-indicator text-gray-500 italic mt-2 flash-color">
          🤔 Thinking...
        </div>
      )}
      

      <form className="chat-input" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          placeholder="Write your message..."
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit">Enviar</button>
      </form>
    </div>
  );
  
}

export default ChatUI;