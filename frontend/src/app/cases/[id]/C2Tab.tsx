import React from "react";
import NetworkGraph from "@/components/NetworkGraph";
import { REAL_GRAPH_NODES, REAL_GRAPH_EDGES } from "@/services/realData";

interface C2TabProps {
  caseData: any;
  analysisResults?: any;
  isMockCase: boolean;
}

export default function C2Tab({ caseData, analysisResults, isMockCase }: C2TabProps) {
  // analysisResults is an array of {phase, result} — extract c2_intelligence result
  const c2Result = Array.isArray(analysisResults)
    ? analysisResults.find((r: any) => r.phase === "c2_intelligence")?.result
    : (analysisResults?.c2_intelligence || analysisResults?.c2 || {});
  const c2Data = c2Result || {};
  const c2NodesToUse = isMockCase ? REAL_GRAPH_NODES : (c2Data?.nodes || []);
  const c2EdgesToUse = isMockCase ? REAL_GRAPH_EDGES : (c2Data?.edges || []);
  const attribution = c2Data?.attribution || {};
  const infra = c2Data?.contacted_infrastructure || {};
  const detections = attribution?.top_detections || [];
  const verdicts = attribution?.sandbox_verdicts || [];

  const hasRealData = !isMockCase && (c2NodesToUse.length > 0 || attribution?.malware_family);

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      {hasRealData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-panel border border-border-subtle p-3">
            <div className="text-xs text-primary/50 font-mono uppercase">Detection Rate</div>
            <div className="text-lg font-bold mt-1" style={{ color: (attribution.detection_percentage || 0) > 50 ? '#ef4444' : (attribution.detection_percentage || 0) > 20 ? '#f59e0b' : '#22c55e' }}>
              {attribution.detection_ratio || "N/A"}
            </div>
            <div className="text-xs text-primary/40">{attribution.detection_percentage || 0}% flagged</div>
          </div>
          <div className="bg-panel border border-border-subtle p-3">
            <div className="text-xs text-primary/50 font-mono uppercase">Infrastructure</div>
            <div className="text-lg font-bold mt-1">{(infra.domains?.length || 0) + (infra.ips?.length || 0)}</div>
            <div className="text-xs text-primary/40">{infra.domains?.length || 0} domains, {infra.ips?.length || 0} IPs</div>
          </div>
          <div className="bg-panel border border-border-subtle p-3">
            <div className="text-xs text-primary/50 font-mono uppercase">Confidence</div>
            <div className="text-lg font-bold mt-1 capitalize" style={{ color: attribution.confidence === 'high' ? '#ef4444' : attribution.confidence === 'medium' ? '#f59e0b' : '#22c55e' }}>
              {attribution.confidence || "Low"}
            </div>
            <div className="text-xs text-primary/40">Attribution level</div>
          </div>
          <div className="bg-panel border border-border-subtle p-3">
            <div className="text-xs text-primary/50 font-mono uppercase">Risk Score</div>
            <div className="text-lg font-bold mt-1" style={{ color: (c2Data.risk_score || 0) > 60 ? '#ef4444' : (c2Data.risk_score || 0) > 30 ? '#f59e0b' : '#22c55e' }}>
              {c2Data.risk_score || 0}/100
            </div>
            <div className="text-xs text-primary/40">C2 risk contribution</div>
          </div>
        </div>
      )}

      {/* Network Graph */}
      <div className="bg-panel border border-border-subtle" style={{ height: "500px" }}>
        {c2NodesToUse.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-xs text-primary/60 italic">No network graphs or C2 connections identified.</p>
          </div>
        ) : (
          <NetworkGraph
            nodes={c2NodesToUse}
            edges={c2EdgesToUse}
          />
        )}
      </div>

      {/* Attribution + Detections */}
      {(hasRealData || isMockCase) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Malware Family */}
          <div className="bg-panel border border-border-subtle p-4">
            <h3 className="font-display font-semibold text-sm mb-3 border-b border-border-subtle pb-2">
              Malware Family
            </h3>
            {isMockCase ? (
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
            ) : (
              <div className="space-y-2">
                <div>
                  <span className="text-xs font-mono text-primary/60 block">Family</span>
                  <span className="text-sm font-semibold">{attribution.malware_family || "Unknown"}</span>
                </div>
                {attribution.all_families?.length > 1 && (
                  <div>
                    <span className="text-xs font-mono text-primary/60 block">Also Known As</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {attribution.all_families.slice(0, 8).map((f: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 text-xs font-mono bg-red-500/10 text-red-400 border border-red-500/20 rounded">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <span className="text-xs font-mono text-primary/60 block">Threat Category</span>
                  <span className="text-sm font-semibold" style={{ color: attribution.threat_category === 'Confirmed Malicious' ? '#ef4444' : '#f59e0b' }}>
                    {attribution.threat_category || "Under Investigation"}
                  </span>
                </div>
                <div>
                  <span className="text-xs font-mono text-primary/60 block">Target Region</span>
                  <span className="text-sm">{attribution.target_region || "Unknown"}</span>
                </div>
                <div>
                  <span className="text-xs font-mono text-primary/60 block">Motivation</span>
                  <span className="text-sm">{attribution.motivation || "Unknown"}</span>
                </div>
                {attribution.tags?.length > 0 && (
                  <div>
                    <span className="text-xs font-mono text-primary/60 block">Tags</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {attribution.tags.map((t: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 text-xs font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AV Engine Detections */}
          <div className="bg-panel border border-border-subtle p-4">
            <h3 className="font-display font-semibold text-sm mb-3 border-b border-border-subtle pb-2">
              {isMockCase ? "Campaign Links" : "Engine Detections"}
            </h3>
            {isMockCase ? (
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
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {detections.length === 0 ? (
                  <p className="text-xs text-primary/50 italic">No detections recorded</p>
                ) : (
                  detections.map((d: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-1 border-b border-border-subtle/50">
                      <span className="text-xs font-mono text-primary/70 truncate" style={{ maxWidth: "40%" }}>{d.engine}</span>
                      <span className={`text-xs font-mono px-2 py-0.5 rounded ${d.category === 'malicious' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                        {d.result || d.category}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sandbox Verdicts */}
      {hasRealData && verdicts.length > 0 && (
        <div className="bg-panel border border-border-subtle p-4">
          <h3 className="font-display font-semibold text-sm mb-3 border-b border-border-subtle pb-2">
            Sandbox Verdicts
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {verdicts.map((v: any, i: number) => (
              <div key={i} className="bg-surface/50 border border-border-subtle p-3 rounded">
                <div className="text-xs font-mono text-primary/50">{v.sandbox}</div>
                <div className={`text-sm font-semibold mt-1 ${v.category === 'malicious' ? 'text-red-400' : v.category === 'suspicious' ? 'text-yellow-400' : 'text-green-400'}`}>
                  {v.category}
                </div>
                {v.malware_names?.length > 0 && (
                  <div className="text-xs text-primary/40 mt-1">{v.malware_names.join(", ")}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contacted Infrastructure Table */}
      {hasRealData && (infra.domains?.length > 0 || infra.ips?.length > 0) && (
        <div className="bg-panel border border-border-subtle p-4">
          <h3 className="font-display font-semibold text-sm mb-3 border-b border-border-subtle pb-2">
            Contacted Infrastructure
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {infra.domains?.length > 0 && (
              <div>
                <div className="text-xs font-mono text-primary/50 mb-2 uppercase">Domains ({infra.domains.length})</div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {infra.domains.map((d: string, i: number) => (
                    <div key={i} className="text-xs font-mono text-primary/70 py-1 border-b border-border-subtle/30">{d}</div>
                  ))}
                </div>
              </div>
            )}
            {infra.ips?.length > 0 && (
              <div>
                <div className="text-xs font-mono text-primary/50 mb-2 uppercase">IP Addresses ({infra.ips.length})</div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {infra.ips.map((ip: string, i: number) => (
                    <div key={i} className="text-xs font-mono text-primary/70 py-1 border-b border-border-subtle/30">{ip}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
