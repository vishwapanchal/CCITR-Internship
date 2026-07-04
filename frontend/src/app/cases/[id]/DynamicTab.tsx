import React from "react";
import BehaviorTimeline from "@/components/BehaviorTimeline";
import { REAL_TIMELINE_EVENTS } from "@/services/realData";

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
                    <span className="block text-[10px] text-primary/40 mt-0.5">{row.source === "heuristic_code_scan" ? "Static Heuristic Scan" : "Runtime Execution"}</span>
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
                    {row.source && <span className="block text-[10px] text-primary/40 mt-0.5">{row.source}</span>}
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
