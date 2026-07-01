"use client";

import { useState, useEffect } from "react";
import { Terminal } from "lucide-react";

export default function BackendStatus() {
  const [isAlive, setIsAlive] = useState<boolean | null>(null);
  const [logMsg, setLogMsg] = useState<string>("Initializing connectivity check...");
  const [viewMode, setViewMode] = useState<"line" | "log">("line");

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://apex-x-backend.onrender.com/api/v1";
        const healthUrl = API_BASE_URL.replace("/api/v1", "/health");
        
        setLogMsg(`[${new Date().toLocaleTimeString()}] Pinging backend at ${healthUrl}...`);
        const response = await fetch(healthUrl, { method: "GET" });
        setIsAlive(response.ok);
        if (response.ok) {
          setLogMsg(`[${new Date().toLocaleTimeString()}] Backend is LIVE (Status: ${response.status})`);
        } else {
          setLogMsg(`[${new Date().toLocaleTimeString()}] Backend returned Error (Status: ${response.status})`);
        }
      } catch (err: any) {
        setIsAlive(false);
        setLogMsg(`[${new Date().toLocaleTimeString()}] Backend is OFFLINE (${err.message})`);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 60000); // Check every 60s
    return () => clearInterval(interval);
  }, []);

  if (isAlive === null) return null;

  return (
    <>
      <button
        onClick={() => setViewMode(prev => prev === "line" ? "log" : "line")}
        className="fixed bottom-4 right-4 z-[10000] p-2 bg-canvas border border-border-subtle hover:bg-panel text-forensic-blue transition-colors rounded shadow-sm flex items-center justify-center"
        title="Toggle Backend Status View"
      >
        <Terminal className="w-4 h-4 opacity-70" />
      </button>

      {viewMode === "line" && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            width: "100%",
            height: "4px",
            backgroundColor: isAlive ? "#10b981" : "#ef4444",
            zIndex: 9999,
            transition: "background-color 0.5s ease",
            boxShadow: `0 -2px 10px ${isAlive ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'}`
          }}
          title={isAlive ? "Backend is LIVE" : "Backend is OFFLINE"}
        />
      )}

      {viewMode === "log" && (
        <div className="fixed bottom-0 left-0 w-full h-8 bg-[#1a1a1a] border-t border-[#333] flex items-center px-4 z-[9999]">
          <div className={`w-2 h-2 rounded-full mr-3 shrink-0 ${isAlive ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"}`} />
          <span className="text-xs font-mono text-gray-400 truncate tracking-wide">
            {logMsg}
          </span>
        </div>
      )}
    </>
  );
}
