"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Cpu, Loader2, Zap } from "lucide-react";
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
        "APEX-X Co-Pilot initialized — powered by DeepSeek R1. Select a case and ask me anything about its security analysis.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedCase, setSelectedCase] = useState(REAL_CASES[0]?.id || "");

  // Build context for the selected case
  // Builds COMPLETE context for the selected case — zero truncation.
  // The AI must know everything the analyst sees on screen.
  function buildCaseContext() {
    const c = REAL_CASES.find((x) => x.id === selectedCase);
    if (!c) return null;

    // ALL permissions for this case
    const perms = REAL_PERMISSIONS.filter((p) => p.case_id === c.id);
    // ALL IOCs for this case (every URL, domain, IP, email, API key)
    const iocs = REAL_IOCS.filter((i) => i.case_id === c.id);
    // ALL vulnerabilities/misconfigurations
    const vulns = REAL_VULNERABILITIES.filter((v) => v.case_id === c.id);
    // Graph data for this case
    const caseNodeId = REAL_GRAPH_NODES.find(
      (n) => n.type === "apk" && n.label === c.package_name
    )?.id;
    const graphNodes = caseNodeId
      ? REAL_GRAPH_NODES.filter(
          (n) =>
            n.id === caseNodeId ||
            REAL_GRAPH_EDGES.some(
              (e) =>
                (e.source === caseNodeId && e.target === n.id) ||
                (e.target === caseNodeId && e.source === n.id)
            )
        )
      : [];
    const graphEdges = caseNodeId
      ? REAL_GRAPH_EDGES.filter(
          (e) => e.source === caseNodeId || e.target === caseNodeId
        )
      : [];
    // Activity log
    const activity = REAL_ACTIVITY.filter((a) => a.case_id === c.id);

    // All other cases for cross-referencing
    const otherCases = REAL_CASES.filter((x) => x.id !== c.id).map((x) => ({
      apk_name: x.apk_name,
      package_name: x.package_name,
      threat_score: x.threat_score,
      verdict: x.verdict,
    }));

    return {
      // ---- Case Overview ----
      case_number: c.case_number,
      apk_name: c.apk_name,
      package_name: c.package_name,
      threat_score: c.threat_score,
      verdict: c.verdict,
      priority: c.priority,
      status: c.status,
      apk_hash: c.apk_hash,
      description: c.description,
      created_at: c.created_at,
      updated_at: c.updated_at,

      // ---- Permissions (COMPLETE) ----
      total_permissions: perms.length,
      dangerous_permissions: perms.filter((p) => p.protection_level === "dangerous").length,
      permissions: perms.map((p) => ({
        name: p.name,
        risk: p.risk,
        protection_level: p.protection_level,
        description: p.description,
        granted: p.granted,
      })),

      // ---- IOCs (COMPLETE — every single one) ----
      total_iocs: iocs.length,
      ioc_breakdown: {
        urls: iocs.filter((i) => i.type === "url").length,
        domains: iocs.filter((i) => i.type === "domain").length,
        ips: iocs.filter((i) => i.type === "ip").length,
        emails: iocs.filter((i) => i.type === "email").length,
        hashes_api_keys: iocs.filter((i) => i.type === "hash").length,
      },
      iocs: iocs.map((i) => ({
        type: i.type,
        value: i.value,
        context: i.context,
        confidence: i.confidence,
      })),

      // ---- Vulnerabilities (COMPLETE) ----
      total_vulnerabilities: vulns.length,
      critical_vulns: vulns.filter((v) => v.severity === "critical").length,
      high_vulns: vulns.filter((v) => v.severity === "high").length,
      vulnerabilities: vulns.map((v) => ({
        title: v.title,
        severity: v.severity,
        cvss_score: v.cvss_score,
        cvss_vector: v.cvss_vector,
        owasp_category: v.owasp_category,
        cwe_id: v.cwe_id,
        description: v.description,
        poc_narrative: v.poc_narrative,
      })),

      // ---- Threat Graph (connected nodes) ----
      connected_domains: graphNodes
        .filter((n) => n.type === "domain")
        .map((n) => n.label),
      graph_edges: graphEdges.map((e) => ({
        label: e.label,
        confidence: e.confidence,
      })),

      // ---- Analysis Pipeline Status ----
      phase_status: REAL_PHASE_STATUS.map((p) => ({
        phase: p.phase,
        status: p.status,
        progress: p.progress,
      })),

      // ---- Activity Log ----
      activity: activity.map((a) => ({
        action: a.action,
        details: a.details,
        timestamp: a.timestamp,
      })),

      // ---- Other cases in the system (for cross-reference) ----
      other_analyzed_apps: otherCases,
    };
  }

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const userMessage = input.trim();
    if (!userMessage || isLoading) return;

    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setInput("");
    setIsLoading(true);

    try {
      // Build conversation history for context
      const history = messages
        .filter((m) => m.role === "user" || m.role === "ai")
        .slice(-6) // last 3 exchanges
        .map((m) => ({
          role: m.role === "ai" ? "assistant" : "user",
          content: m.content,
        }));

      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          context: buildCaseContext(),
          history,
        }),
      });

      const data = await res.json();

      if (res.ok && data.message) {
        setMessages((prev) => [
          ...prev,
          { role: "ai", content: data.message },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "ai",
            content: `⚠️ Error: ${data.error || "Failed to get AI response"}. The Co-Pilot requires the OPENROUTER_API_KEY environment variable to be set.`,
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content:
            "⚠️ Network error — could not reach the AI service. Please check your connection.",
        },
      ]);
    } finally {
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
                  DeepSeek R1 via OpenRouter
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
                    DeepSeek R1 is reasoning...
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
              Powered by DeepSeek R1 · AI analysis may be incomplete — always verify with primary evidence.
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
