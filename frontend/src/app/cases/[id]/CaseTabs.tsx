import ThreatScore from "@/components/ThreatScore";
import BehaviorTimeline from "@/components/BehaviorTimeline";
import NetworkGraph from "@/components/NetworkGraph";
import PermissionMatrix from "@/components/PermissionMatrix";
import IOCTable from "@/components/IOCTable";
import VulnerabilityCard from "@/components/VulnerabilityCard";
import PhaseProgress from "@/components/PhaseProgress";
import {
  REAL_PERMISSIONS,
  REAL_IOCS,
  REAL_TIMELINE_EVENTS,
  REAL_GRAPH_NODES,
  REAL_GRAPH_EDGES,
  REAL_VULNERABILITIES,
  REAL_YARA_MATCHES,
} from "@/services/realData";
import { downloadReport, downloadEvidencePackage } from "@/services/api";
import OverviewTab from "./OverviewTab";
import ReportsTab from "./ReportsTab";

interface CaseTabsProps {
  activeTab: string;
  caseData: any;
  phaseStatus: any;
  caseReports: any[];
  analysisResults?: any;
}

export default function CaseTabs({
  activeTab,
  caseData,
  phaseStatus,
  caseReports,
  analysisResults,
}: CaseTabsProps) {
  return (
    <div className="flex-1 min-h-0">
      {activeTab === "overview" && (
        <OverviewTab caseData={caseData} phaseStatus={phaseStatus} />
      )}

      {activeTab === "static" && (
        <div className="space-y-4">
          <div className="bg-panel border border-border-subtle p-4">
            <h3 className="font-display font-semibold text-sm mb-3 border-b border-border-subtle pb-2">
              Android Permissions
            </h3>
            <div className="max-h-[400px] overflow-auto">
              <PermissionMatrix permissions={REAL_PERMISSIONS} />
            </div>
          </div>

          <div className="bg-panel border border-border-subtle p-4">
            <h3 className="font-display font-semibold text-sm mb-3 border-b border-border-subtle pb-2">
              YARA Rule Matches
            </h3>
            <div className="space-y-2">
              {REAL_YARA_MATCHES.map((match) => (
                <div
                  key={match.rule_name}
                  className={`p-3 border ${
                    match.severity === "critical"
                      ? "border-red-200 bg-red-50"
                      : match.severity === "high"
                      ? "border-orange-200 bg-orange-50"
                      : "border-yellow-200 bg-yellow-50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-sm font-semibold">{match.rule_name}</span>
                    <span className="text-xs font-mono px-2 py-0.5 bg-white/60 border border-border-subtle">
                      {match.category}
                    </span>
                  </div>
                  <p className="text-xs text-primary/70 mb-2">{match.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {match.strings_matched.map((s) => (
                      <span key={s} className="text-xs font-mono bg-white/60 px-1.5 py-0.5 border border-border-subtle">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-panel border border-border-subtle p-4">
            <h3 className="font-display font-semibold text-sm mb-3 border-b border-border-subtle pb-2">
              Indicators of Compromise (IOCs)
            </h3>
            <IOCTable iocs={REAL_IOCS} />
          </div>
        </div>
      )}

      {activeTab === "dynamic" && (
        <div className="space-y-4">
          {(() => {
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
            const timelineEventsToUse = dynamicEvents || [];

            // Process Suspicious APIs
            const dynamicApis = analysisResults?.dynamic?.behavior_profile?.timeline?.map((evt: any) => {
                let risk = "LOW";
                if (evt.hook === "sms" || evt.event?.includes("exec")) risk = "CRITICAL";
                else if (evt.hook === "device" || evt.hook === "crypto") risk = "HIGH";
                else if (evt.hook === "network") risk = "MEDIUM";
                
                return {
                    api: evt.event || "Unknown",
                    cls: evt.hook || "unknown category",
                    risk
                };
            }).filter((v: any, i: number, a: any[]) => a.findIndex((t: any) => (t.api === v.api)) === i) || [];
            
            const apisToUse = dynamicApis;

            // Process Network Connections
            const dynamicConnections = analysisResults?.dynamic?.steps?.network?.connections?.map((conn: any) => ({
                dest: conn.dst_ip,
                proto: conn.protocol,
                port: String(conn.dst_port),
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
            
            const networkToUse = allNetwork;

            return (
              <>
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
        </>
      );
    })()}
    </div>
    )}

      {activeTab === "c2" && (
        <div className="space-y-4">
          <div className="bg-panel border border-border-subtle" style={{ height: "500px" }}>
            <NetworkGraph
              nodes={REAL_GRAPH_NODES}
              edges={REAL_GRAPH_EDGES}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-panel border border-border-subtle p-4">
              <h3 className="font-display font-semibold text-sm mb-3 border-b border-border-subtle pb-2">
                Malware Family
              </h3>
              <div className="space-y-2">
                <div>
                  <span className="text-xs font-mono text-primary/60 block">Family</span>
                  <span className="text-sm font-semibold">SpyAgent / PhishKing variant</span>
                </div>
                <div>
                  <span className="text-xs font-mono text-primary/60 block">First Seen</span>
                  <span className="text-sm font-mono">2026-01-20</span>
                </div>
                <div>
                  <span className="text-xs font-mono text-primary/60 block">Target Region</span>
                  <span className="text-sm">India — Banking sector users</span>
                </div>
              </div>
            </div>

            <div className="bg-panel border border-border-subtle p-4">
              <h3 className="font-display font-semibold text-sm mb-3 border-b border-border-subtle pb-2">
                Campaign Links
              </h3>
              <div className="space-y-2">
                <div>
                  <span className="text-xs font-mono text-primary/60 block">Campaign</span>
                  <span className="text-sm font-semibold">Operation PhishKing</span>
                </div>
                <div>
                  <span className="text-xs font-mono text-primary/60 block">Threat Actor</span>
                  <span className="text-sm font-mono">APT-IND-07 (Confidence: 65%)</span>
                </div>
                <div>
                  <span className="text-xs font-mono text-primary/60 block">Motivation</span>
                  <span className="text-sm">Financial — Banking credential theft</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "vulns" && (
        <div className="space-y-4">
          <div className="flex gap-4 text-xs font-mono text-primary/60 mb-2">
            <span>
              Total: <strong className="text-primary">{REAL_VULNERABILITIES.length}</strong>
            </span>
            <span className="text-red-600">
              Critical: <strong>{REAL_VULNERABILITIES.filter((v) => v.severity === "critical").length}</strong>
            </span>
            <span className="text-orange-600">
              High: <strong>{REAL_VULNERABILITIES.filter((v) => v.severity === "high").length}</strong>
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {REAL_VULNERABILITIES.map((vuln) => (
              <VulnerabilityCard key={vuln.id} vulnerability={vuln} />
            ))}
          </div>
        </div>
      )}

      {activeTab === "reports" && (
        <ReportsTab caseData={caseData} caseReports={caseReports} />
      )}
    </div>
  );
}
