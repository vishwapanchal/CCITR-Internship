import React, { useState, useEffect } from "react";
import BehaviorTimeline from "@/components/BehaviorTimeline";
import { REAL_TIMELINE_EVENTS } from "@/services/realData";
import { runDynamicAnalysis } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";

const MOCK_APIS = [
  { api: "DexClassLoader()", cls: "dalvik.system", risk: "CRITICAL" },
  { api: "getLastKnownLocation()", cls: "android.location.LocationManager", risk: "HIGH" },
  { api: "query(content://sms)", cls: "android.content.ContentResolver", risk: "CRITICAL" },
  { api: "sendTextMessage()", cls: "android.telephony.SmsManager", risk: "CRITICAL" },
  { api: "open(CAMERA_FACING_FRONT)", cls: "android.hardware.Camera", risk: "HIGH" },
  { api: "setActiveAdmin()", cls: "android.app.admin.DevicePolicyManager", risk: "CRITICAL" },
  { api: "getInstance(AES/CBC)", cls: "javax.crypto.Cipher", risk: "MEDIUM" },
];

const MOCK_NETWORK = [
  { dest: "c2.malware-ops.ru", proto: "HTTPS", port: "443", size: "-", dir: "OUTBOUND" },
  { dest: "91.234.99.18", proto: "HTTPS", port: "443", size: "-", dir: "OUTBOUND" },
  { dest: "update-service.ddns.net", proto: "DNS", port: "53", size: "-", dir: "OUTBOUND" },
];

interface DynamicTabProps {
  caseData: any;
  analysisResults?: any;
  isMockCase: boolean;
}

export default function DynamicTab({ caseData, analysisResults, isMockCase }: DynamicTabProps) {
  const { token } = useAuth();
  const [isStarting, setIsStarting] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  
  // Handle countdown timer
  useEffect(() => {
    if (countdown === null) return;
    
    if (countdown <= 0) {
      setCountdown(null);
      window.location.reload(); // Auto-refresh when done
      return;
    }
    
    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleRunEmulator = async () => {
    const confirmed = window.confirm(
      "📱 Before clicking OK:\n\n" +
      "1. Double-click 'launch_emulator.bat' in the Apex-X folder\n" +
      "2. Wait for the Android phone screen to appear\n" +
      "3. Click OK here to install the APK on the phone\n\n" +
      "The system will automatically launch the app and run automated UI exploration (Monkey) in the background.\n" +
      "Data collection runs for 90 seconds. You can watch the emulator to see what it's doing!"
    );
    if (!confirmed) return;
    
    try {
      setIsStarting(true);
      await runDynamicAnalysis(caseData.id);
      // Backend takes 90 seconds to collect data, start a 90s countdown in UI
      setCountdown(90);
    } catch (e) {
      alert("Failed to start dynamic analysis: " + e);
    } finally {
      setIsStarting(false);
    }
  };

  // Find dynamic phase result
  let dynamicResult = null;
  if (analysisResults && Array.isArray(analysisResults)) {
    const dynPhase = analysisResults.find((r: any) => r.phase === "dynamic");
    if (dynPhase?.result) {
      dynamicResult = dynPhase.result;
    }
  }

  // Map to BehaviorTimeline events
  const rawEvents = dynamicResult?.events || [];
  
  const dynamicEvents = rawEvents.map((evt: any) => {
    let type = "api_call";
    if (evt.category === "network") type = "network";
    if (evt.category === "file_io") type = "file_io";
    if (evt.category === "crypto") type = "crypto";
    if (evt.category === "sms") type = "sms";
    if (evt.category === "data_exfil") type = "permission";
    if (evt.category === "surveillance") type = "permission";

    let severity = "info";
    if (evt.risk_level === "CRITICAL") severity = "critical";
    else if (evt.risk_level === "HIGH" || evt.risk_level === "MEDIUM") severity = "warning";

    return {
      id: evt.id,
      timestamp: evt.timestamp,
      type: type,
      title: evt.api_call,
      description: evt.description + (evt.source === "heuristic_code_scan" ? " (Heuristic Scan)" : " (Logcat)"),
      severity: severity,
    };
  });
  
  const timelineEventsToUse = (dynamicEvents && dynamicEvents.length > 0) 
    ? dynamicEvents 
    : (isMockCase ? REAL_TIMELINE_EVENTS : []);

  // Process Suspicious APIs (extract unique from events)
  const dynamicApis = rawEvents.reduce((acc: any[], evt: any) => {
      const apiName = evt.api_call || "Unknown";
      if (!acc.some((t: any) => t.api === apiName)) {
        acc.push({
            api: apiName,
            cls: evt.class_name || evt.category,
            risk: evt.risk_level || "LOW",
            source: evt.source
        });
      }
      return acc;
  }, []);
  
  const apisToUse = (dynamicApis && dynamicApis.length > 0) ? dynamicApis : (isMockCase ? MOCK_APIS : []);

  // Process Network Connections
  const dynamicConnections = dynamicResult?.network_activity?.map((conn: any) => ({
      dest: conn.destination,
      proto: conn.protocol || "TCP",
      port: String(conn.port || 443),
      size: "-",
      dir: conn.direction || "OUTBOUND",
      source: conn.source
  })) || [];
  
  const networkToUse = (dynamicConnections && dynamicConnections.length > 0) ? dynamicConnections : (isMockCase ? MOCK_NETWORK : []);

  return (
    <div className="space-y-4">
      {/* Dynamic Summary Cards */}
      <div className="flex justify-between items-center mb-6 border-b border-gray-700/50 pb-4">
        <div>
          <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
            Dynamic Analysis
          </h2>
          <p className="text-sm text-gray-400 mt-1">Runtime behavior and network activity monitoring</p>
        </div>
        
        {!isMockCase && (
          <button
            onClick={handleRunEmulator}
            disabled={isStarting || countdown !== null}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white rounded-lg shadow-lg shadow-indigo-500/25 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {countdown !== null ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Collecting Data ({countdown}s)</span>
              </>
            ) : isStarting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Initializing...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Run Emulator Analysis (Visual VM)</span>
              </>
            )}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-panel border border-border-subtle p-4 flex flex-col justify-between">
          <span className="text-xs font-mono text-primary/60 uppercase tracking-wider mb-1">Analysis Mode</span>
          <span className="text-xl font-display font-bold text-primary">{dynamicResult?.mode === "emulator" ? "Real Emulator" : dynamicResult?.mode === "heuristic" ? "Heuristic (No VM)" : "Mock Data"}</span>
        </div>
        <div className="bg-panel border border-border-subtle p-4 flex flex-col justify-between">
          <span className="text-xs font-mono text-primary/60 uppercase tracking-wider mb-1">Total Events</span>
          <span className="text-xl font-display font-bold text-blue-600">{timelineEventsToUse.length} Captured</span>
        </div>
        <div className="bg-panel border border-border-subtle p-4 flex flex-col justify-between">
          <span className="text-xs font-mono text-primary/60 uppercase tracking-wider mb-1">Critical APIs</span>
          <span className="text-xl font-display font-bold text-red-600">{apisToUse.filter((a: any) => a.risk === "CRITICAL").length} Detected</span>
        </div>
        <div className="bg-panel border border-border-subtle p-4 flex flex-col justify-between">
          <span className="text-xs font-mono text-primary/60 uppercase tracking-wider mb-1">Network Activity</span>
          <span className="text-xl font-display font-bold text-orange-600">{networkToUse.length} Endpoints</span>
        </div>
      </div>

      <div className="bg-panel border border-border-subtle p-4">
        <h3 className="font-display font-semibold text-sm mb-3 border-b border-border-subtle pb-2">
          Behavioral Event Timeline
        </h3>
        {timelineEventsToUse.length === 0 ? (
          <p className="text-xs text-primary/50 italic py-8 text-center">Waiting for dynamic analysis events...</p>
        ) : (
          <div className="h-[500px]">
            <BehaviorTimeline events={timelineEventsToUse} />
          </div>
        )}
      </div>

      <div className="bg-panel border border-border-subtle p-4 overflow-hidden">
        <h3 className="font-display font-semibold text-sm mb-3 border-b border-border-subtle pb-2">
          Suspicious API Calls
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-border-subtle text-left">
                <th className="pb-2 font-mono text-xs text-primary/60">API</th>
                <th className="pb-2 font-mono text-xs text-primary/60">Context</th>
                <th className="pb-2 font-mono text-xs text-primary/60">Risk</th>
              </tr>
            </thead>
            <tbody>
              {apisToUse.length === 0 ? (
                <tr><td colSpan={3} className="text-xs text-center text-primary/50 py-4">No suspicious APIs detected</td></tr>
              ) : apisToUse.map((row: any, idx: number) => (
                <tr key={`${row.api}-${idx}`} className="border-b border-border-subtle/50 hover:bg-canvas/50">
                  <td className="py-2 font-mono text-xs">
                    <span className="font-semibold">{row.api}</span>
                    <span className="block text-[10px] text-primary/40 mt-0.5">
                      {row.source === "heuristic_code_scan" ? "Inferred (Heuristic Scan)" : "Observed (Runtime)"}
                    </span>
                  </td>
                  <td className="py-2 text-xs text-primary/60 font-mono break-all">{row.cls}</td>
                  <td className="py-2">
                    <span
                      className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-sm ${
                        row.risk === "CRITICAL"
                          ? "bg-red-100 text-red-700 border-red-200"
                          : row.risk === "HIGH"
                          ? "bg-orange-100 text-orange-700 border-orange-200"
                          : row.risk === "MEDIUM"
                          ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                          : "bg-blue-100 text-blue-700 border-blue-200"
                      }`}
                    >
                      {row.risk}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-panel border border-border-subtle p-4 overflow-hidden">
        <h3 className="font-display font-semibold text-sm mb-3 border-b border-border-subtle pb-2">
          Network Activity
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-border-subtle text-left">
                <th className="pb-2 font-mono text-xs text-primary/60">Destination</th>
                <th className="pb-2 font-mono text-xs text-primary/60">Protocol</th>
                <th className="pb-2 font-mono text-xs text-primary/60">Port</th>
                <th className="pb-2 font-mono text-xs text-primary/60">Direction</th>
              </tr>
            </thead>
            <tbody>
              {networkToUse.length === 0 ? (
                <tr><td colSpan={4} className="text-xs text-center text-primary/50 py-4">No network activity detected</td></tr>
              ) : networkToUse.map((row: any, index: number) => (
                <tr key={`${row.dest}-${row.port}-${index}`} className="border-b border-border-subtle/50 hover:bg-canvas/50">
                  <td className="py-2 font-mono text-xs">
                    {row.dest}
                    {row.source && (
                      <span className="block text-[10px] text-primary/40 mt-0.5">
                        {row.source === "Static IOC cross-reference" ? "Inferred (Static IOC)" : "Observed (Runtime)"}
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-xs font-mono">{row.proto}</td>
                  <td className="py-2 text-xs font-mono">{row.port}</td>
                  <td className="py-2">
                    <span
                      className={`text-xs font-mono font-semibold ${
                        row.dir === "OUTBOUND" ? "text-orange-600" : "text-blue-600"
                      }`}
                    >
                      {row.dir}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
