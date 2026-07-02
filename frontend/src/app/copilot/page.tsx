"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Cpu, Loader2, Zap, ArrowLeft } from "lucide-react";
import Link from "next/link";
import {
  REAL_COPILOT_SUGGESTIONS,
  REAL_CASES,
  REAL_PERMISSIONS,
  REAL_IOCS,
  REAL_VULNERABILITIES,
  REAL_GRAPH_NODES,
  REAL_GRAPH_EDGES,
  REAL_PHASE_STATUS,
  REAL_ACTIVITY,
} from "@/services/realData";

interface Message {
  role: "system" | "user" | "ai";
  content: string;
}

export default function CoPilotPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "system",
      content:
        "APEX-X Co-Pilot initialized — powered by local Qwen2.5-Coder. Select a case and ask me anything about its security analysis.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedCase, setSelectedCase] = useState(REAL_CASES[0]?.id || "");

  // Build context for the selected case
  // Builds COMPLETE context for the selected case — zero truncation.
  // The AI must know everything the analyst sees on screen.
  // The backend handles building the case context via ChromaDB RAG.

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const userMessage = input.trim();
    if (!userMessage || isLoading || !selectedCase) return;

    setMessages((prev) => [...prev, { role: "user", content: userMessage }, { role: "ai", content: "" }]);
    setInput("");
    setIsLoading(true);

    try {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/api/v1";
      const ws = new WebSocket(`${wsUrl}/copilot/${selectedCase}`);
      let accumulatedMessage = "";

      ws.onopen = () => {
        ws.send(userMessage);
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "copilot_chunk") {
          accumulatedMessage += data.chunk;
          setMessages((prev) => {
            const newMsgs = [...prev];
            newMsgs[newMsgs.length - 1].content = accumulatedMessage;
            return newMsgs;
          });
          setIsLoading(false);
        } else if (data.type === "copilot_done") {
          setIsLoading(false);
          ws.close();
        } else if (data.type === "copilot_error") {
          setMessages((prev) => {
            const newMsgs = [...prev];
            newMsgs[newMsgs.length - 1].content = `⚠️ Error: ${data.error}`;
            return newMsgs;
          });
          setIsLoading(false);
          ws.close();
        }
      };

      ws.onerror = () => {
        setMessages((prev) => {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1].content = "⚠️ WebSocket error — could not reach the local AI service.";
          return newMsgs;
        });
        setIsLoading(false);
      };
    } catch (error) {
      setMessages((prev) => {
        const newMsgs = [...prev];
        newMsgs[newMsgs.length - 1].content = "⚠️ Error initializing connection to local LLM.";
        return newMsgs;
      });
      setIsLoading(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const currentCase = REAL_CASES.find((c) => c.id === selectedCase);

  return (
    <main className="flex-1 flex flex-col md:flex-row max-w-7xl mx-auto w-full p-4 md:p-6 gap-4 md:gap-6 h-[calc(100vh-70px)]">
      {/* Sidebar */}
      <div className="w-full md:w-80 flex md:flex-col gap-4 shrink-0">
        <Link href="/dashboard" className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors mb-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        
        {/* Case Selector */}
        <div className="bg-panel border border-border-subtle p-4">
          <label className="block text-xs font-mono text-primary/60 mb-2">
            ACTIVE CONTEXT
          </label>
          <select
            value={selectedCase}
            onChange={(e) => setSelectedCase(e.target.value)}
            className="w-full bg-canvas border border-border-subtle px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary/50"
          >
            {REAL_CASES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.case_number} - {c.apk_name}
              </option>
            ))}
          </select>
          {currentCase && (
            <div className="mt-3 space-y-1">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-primary/60">Risk Score</span>
                <span
                  className={`font-bold ${
                    currentCase.threat_score > 40
                      ? "text-red-600"
                      : currentCase.threat_score > 20
                      ? "text-orange-500"
                      : "text-green-600"
                  }`}
                >
                  {currentCase.threat_score}/100
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <Zap className="w-3 h-3 text-emerald-500" />
                <span className="text-primary/60">
                  Local Qwen LLM via Ollama
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Suggested Queries */}
        <div className="bg-panel border border-border-subtle p-4 flex-1 overflow-y-auto hidden md:block">
          <h3 className="font-display font-semibold text-sm mb-3 border-b border-border-subtle pb-2">
            Suggested Queries
          </h3>
          <div className="space-y-2">
            {REAL_COPILOT_SUGGESTIONS.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => setInput(suggestion)}
                className="w-full text-left p-2 text-sm text-primary/80 hover:bg-canvas border border-transparent hover:border-border-subtle transition-colors"
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
                  <div className="w-8 h-8 bg-primary text-white flex items-center justify-center">
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
                    ? "bg-canvas border border-border-subtle text-primary"
                    : msg.role === "system"
                    ? "bg-primary text-white"
                    : "bg-white border border-border-subtle shadow-sm"
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex gap-4 max-w-[85%]">
              <div className="shrink-0 mt-1">
                <div className="w-8 h-8 bg-primary text-white flex items-center justify-center">
                  <Cpu className="w-5 h-5" />
                </div>
              </div>
              <div className="p-4 bg-white border border-border-subtle shadow-sm text-sm">
                <div className="flex items-center gap-2 text-primary/60">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="font-mono text-xs">
                    Local AI is reasoning...
                  </span>
                </div>
              </div>
            </div>
          )}

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
              disabled={isLoading}
              className="flex-1 bg-white border border-border-subtle px-4 py-3 text-sm focus:outline-none focus:border-primary/50 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="bg-primary text-white px-6 flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="text-center mt-2">
            <span className="text-[10px] font-mono text-primary/40 uppercase">
              Powered by local on-premise AI · AI analysis may be incomplete — always verify with primary evidence.
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
