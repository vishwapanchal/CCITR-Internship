"use client";

import { useState, useEffect } from "react";

export default function BackendStatus() {
  const [isAlive, setIsAlive] = useState<boolean | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://apex-x-backend.onrender.com/api/v1";
        // The health endpoint is at the root /health
        const healthUrl = API_BASE_URL.replace("/api/v1", "/health");
        
        const response = await fetch(healthUrl, { method: "GET" });
        setIsAlive(response.ok);
      } catch (err) {
        setIsAlive(false);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 60000); // Check every 60s
    return () => clearInterval(interval);
  }, []);

  if (isAlive === null) return null; // Don't show while initially checking

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        width: "100%",
        height: "4px",
        backgroundColor: isAlive ? "#10b981" : "#ef4444", // Emerald-500 or Red-500
        zIndex: 9999,
        transition: "background-color 0.5s ease",
        boxShadow: `0 -2px 10px ${isAlive ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'}`
      }}
      title={isAlive ? "Backend is LIVE" : "Backend is OFFLINE"}
    />
  );
}
