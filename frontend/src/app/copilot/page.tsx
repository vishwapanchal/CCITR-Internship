"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, ShieldAlert, Cpu } from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { MOCK_COPILOT_SUGGESTIONS, MOCK_CASES } from "@/services/mockData";

export default function CoPilotPage() {
  const [messages, setMessages] = useState<{ role: "system" | "user" | "ai"; content: string; citations?: string[] }[]>([
    {
      role: "system",
      content: "Officer Co-Pilot initialized. I am ready to assist with your investigations. You can ask me about IOCs, behavioral timelines, or malware attribution for any active case.",
    },
  ]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedCase, setSelectedCase] = useState(MOCK_CASES[0].id);

  // In a real app, this would connect to the actual backend websocket
  const wsUrl = `wss://apex-x-backend.onrender.com/api/v1/copilot/${selectedCase}`;
  const { sendMessage, isConnected } = useWebSocket({
    url: wsUrl,
    onMessage: (data: any) => {
      if (data.type === "copilot_response") {
        setMessages((prev) => [
          ...prev,
          { role: "ai", content: data.message, citations: data.citations },
        ]);
      }
    },
    // Don't auto-reconnect if it fails since backend might not be running
    reconnect: false,
  });

  // Simulated AI response for when backend is offline
  const simulateAIResponse = (userQuery: string) => {
    setTimeout(() => {
      let response = "I analyzed the case data. ";
      let citations: string[] = [];
      
      if (userQuery.toLowerCase().includes("c2")) {
        response += "The application contacts several C2 domains, primarily c2.malware-ops.ru and update-service.ddns.net. It uses HTTP POST for exfiltration and DNS for heartbeat.";
        citations = ["ioc-1", "ioc-4", "evt-4", "evt-5"];
      } else if (userQuery.toLowerCase().includes("sms")) {
        response += "I detected critical SMS exfiltration. The app reads all SMS messages from the inbox and sends them to the C2 server, likely to bypass 2FA codes.";
        citations = ["evt-6", "evt-7", "YARA: AndroidSpy_SMSExfil"];
      } else {
        response += "Based on the evidence, this is a highly malicious spyware variant (SpyAgent family) that exfiltrates contacts, SMS, and captures screenshots.";
        citations = ["Report: Executive Summary"];
      }

      setMessages((prev) => [
        ...prev,
        { role: "ai", content: response, citations },
      ]);
    }, 1500);
  };

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setInput("");

    if (isConnected) {
      sendMessage(userMessage);
    } else {
      simulateAIResponse(userMessage);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <main className="flex-1 flex max-w-7xl mx-auto w-full p-6 gap-6 h-[calc(100vh-70px)]">
      {/* Sidebar: Context & Suggestions */}
      <div className="w-80 flex flex-col gap-4">
        {/* Case Selector */}
        <div className="bg-panel border border-border-subtle p-4">
          <label className="block text-xs font-mono text-forensic-blue/60 mb-2">ACTIVE CONTEXT</label>
          <select
            value={selectedCase}
            onChange={(e) => setSelectedCase(e.target.value)}
            className="w-full bg-canvas border border-border-subtle px-3 py-2 text-sm font-mono focus:outline-none focus:border-forensic-blue/50"
          >
            {MOCK_CASES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.case_number} - {c.apk_name}
              </option>
            ))}
          </select>
          <div className="mt-3 flex items-center gap-2 text-xs font-mono">
            <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-orange-500"}`} />
            <span className="text-forensic-blue/60">
              {isConnected ? "Connected to Backend WS" : "Local Simulation Mode"}
            </span>
          </div>
        </div>

        {/* Suggested Queries */}
        <div className="bg-panel border border-border-subtle p-4 flex-1 overflow-y-auto">
          <h3 className="font-display font-semibold text-sm mb-3 border-b border-border-subtle pb-2">
            Suggested Queries
          </h3>
          <div className="space-y-2">
            {MOCK_COPILOT_SUGGESTIONS.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setInput(suggestion);
                }}
                className="w-full text-left p-2 text-sm text-forensic-blue/80 hover:bg-canvas border border-transparent hover:border-border-subtle transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 bg-panel border border-border-subtle flex flex-col min-h-0 relative">
        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-4 max-w-[85%] ${
                msg.role === "user" ? "ml-auto flex-row-reverse" : ""
              }`}
            >
              {/* Avatar */}
              <div className="shrink-0 mt-1">
                {msg.role === "system" || msg.role === "ai" ? (
                  <div className="w-8 h-8 bg-forensic-blue text-white flex items-center justify-center">
                    <Cpu className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="w-8 h-8 bg-canvas border border-border-subtle flex items-center justify-center">
                    <span className="text-xs font-mono font-bold">YOU</span>
                  </div>
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={`p-4 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-canvas border border-border-subtle text-forensic-blue"
                    : msg.role === "system"
                    ? "bg-forensic-blue text-white"
                    : "bg-white border border-border-subtle shadow-sm"
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* Citations */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-border-subtle/30 flex flex-wrap gap-2">
                    <span className="text-xs font-mono opacity-60 flex items-center">
                      SOURCES:
                    </span>
                    {msg.citations.map((cit, i) => (
                      <span
                        key={i}
                        className="text-xs font-mono px-1.5 py-0.5 bg-canvas border border-border-subtle text-forensic-blue/70 cursor-pointer hover:border-forensic-blue/50"
                      >
                        {cit}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-canvas border-t border-border-subtle">
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Co-Pilot about the case..."
              className="flex-1 bg-white border border-border-subtle px-4 py-3 text-sm focus:outline-none focus:border-forensic-blue/50"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="bg-forensic-blue text-white px-6 flex items-center justify-center hover:bg-forensic-blue/90 disabled:opacity-50 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="text-center mt-2">
            <span className="text-[10px] font-mono text-forensic-blue/40 uppercase">
              AI-generated analysis may be incomplete or inaccurate. Always verify with primary evidence artifacts.
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
