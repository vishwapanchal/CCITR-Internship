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
  { dest: "c2.malware-ops.ru", proto: "HTTPS", port: "443", size: "12 KB", dir: "OUTBOUND" },
  { dest: "91.234.99.18", proto: "HTTPS", port: "443", size: "8 KB", dir: "OUTBOUND" },
  { dest: "update-service.ddns.net", proto: "DNS", port: "53", size: "128 B", dir: "OUTBOUND" },
  { dest: "cdn-payload.s3.amazonaws.com", proto: "HTTPS", port: "443", size: "45 KB", dir: "INBOUND" },
  { dest: "185.220.101.42", proto: "HTTPS", port: "443", size: "256 B", dir: "OUTBOUND" },
];

interface DynamicTabProps {
  caseData: any;
  analysisResults?: any;
  isMockCase: boolean;
}

export default function DynamicTab({ caseData, analysisResults, isMockCase }: DynamicTabProps) {
  // Process Behavior Timeline
  const dynamicEvents = analysisResults?.dynamic?.behavior_profile?.timeline?.map((evt: any, i: number) => {
    const hook = evt.hook || "unknown";
    let type = "api_call";
    let severity = "info";
    if (hook === "network") { type = "network"; severity = "warning"; }
    if (hook === "file") type = "file_io";
    if (hook === "crypto") type = "crypto";
    if (hook === "sms") { type = "sms"; severity = "critical"; }
    if (hook === "device") type = "permission";
    
    return {
      id: `dyn-evt-${i}`,
      timestamp: evt.timestamp || new Date().toISOString(),
      type: type,
      title: evt.event || "Unknown Event",
      description: Object.keys(evt.details || {}).length > 0 ? JSON.stringify(evt.details) : "No details",
      severity: severity,
    };
  });
  
  const timelineEventsToUse = (dynamicEvents && dynamicEvents.length > 0) 
    ? dynamicEvents 
    : (isMockCase ? REAL_TIMELINE_EVENTS : []);

  // Process Suspicious APIs
  const timeline = analysisResults?.dynamic?.behavior_profile?.timeline || [];
  const dynamicApis = timeline.reduce((acc: any[], evt: any) => {
      let risk = "LOW";
      if (evt.hook === "sms" || evt.event?.includes("exec")) risk = "CRITICAL";
      else if (evt.hook === "device" || evt.hook === "crypto") risk = "HIGH";
      else if (evt.hook === "network") risk = "MEDIUM";
      
      const apiName = evt.event || "Unknown";
      
      if (!acc.some((t: any) => t.api === apiName)) {
        acc.push({
            api: apiName,
            cls: evt.hook || "unknown category",
            risk
        });
      }
      return acc;
  }, []);
  
  const apisToUse = (dynamicApis && dynamicApis.length > 0) ? dynamicApis : (isMockCase ? MOCK_APIS : []);

  // Process Network Connections
  const dynamicConnections = analysisResults?.dynamic?.steps?.network?.connections?.map((conn: any) => ({
      dest: conn.dst_ip || conn.pair,
      proto: conn.protocol || "TCP",
      port: String(conn.dst_port || 443),
      size: "-",
      dir: "OUTBOUND"
  }));
  const dnsQueries = analysisResults?.dynamic?.steps?.network?.dns_queries?.map((query: string) => ({
      dest: query,
      proto: "DNS",
      port: "53",
      size: "-",
      dir: "OUTBOUND"
  })) || [];
  const allNetwork = [...(dynamicConnections || []), ...dnsQueries];
  
  const networkToUse = (allNetwork && allNetwork.length > 0) ? allNetwork : (isMockCase ? MOCK_NETWORK : []);

  return (
    <div className="space-y-4">
      <div className="bg-panel border border-border-subtle p-4">
        <h3 className="font-display font-semibold text-sm mb-3 border-b border-border-subtle pb-2">
          Behavioral Event Timeline
        </h3>
        <div className="h-[500px]">
          <BehaviorTimeline events={timelineEventsToUse} />
        </div>
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
                <th className="pb-2 font-mono text-xs text-primary/60">Class</th>
                <th className="pb-2 font-mono text-xs text-primary/60">Risk</th>
              </tr>
            </thead>
            <tbody>
              {apisToUse.map((row: any) => (
                <tr key={row.api} className="border-b border-border-subtle/50">
                  <td className="py-2 font-mono text-xs">{row.api}</td>
                  <td className="py-2 text-xs text-primary/60 font-mono break-all">{row.cls}</td>
                  <td className="py-2">
                    <span
                      className={`text-xs font-mono font-semibold px-2 py-0.5 ${
                        row.risk === "CRITICAL"
                          ? "bg-red-100 text-red-700"
                          : row.risk === "HIGH"
                          ? "bg-orange-100 text-orange-700"
                          : row.risk === "MEDIUM"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-blue-100 text-blue-700"
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
                <th className="pb-2 font-mono text-xs text-primary/60">Data Size</th>
                <th className="pb-2 font-mono text-xs text-primary/60">Direction</th>
              </tr>
            </thead>
            <tbody>
              {networkToUse.map((row: any, index: number) => (
                <tr key={`${row.dest}-${row.port}-${index}`} className="border-b border-border-subtle/50">
                  <td className="py-2 font-mono text-xs">{row.dest}</td>
                  <td className="py-2 text-xs font-mono">{row.proto}</td>
                  <td className="py-2 text-xs font-mono">{row.port}</td>
                  <td className="py-2 text-xs font-mono">{row.size}</td>
                  <td className="py-2">
                    <span
                      className={`text-xs font-mono font-semibold ${
                        row.dir === "OUTBOUND" ? "text-red-600" : "text-blue-600"
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
