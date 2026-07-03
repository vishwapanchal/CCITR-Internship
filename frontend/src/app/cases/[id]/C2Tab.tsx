import React from "react";
import NetworkGraph from "@/components/NetworkGraph";
import { REAL_GRAPH_NODES, REAL_GRAPH_EDGES } from "@/services/realData";

interface C2TabProps {
  caseData: any;
  analysisResults?: any;
  isMockCase: boolean;
}

export default function C2Tab({ caseData, analysisResults, isMockCase }: C2TabProps) {
  const c2NodesToUse = isMockCase ? REAL_GRAPH_NODES : (analysisResults?.c2?.nodes || []);
  const c2EdgesToUse = isMockCase ? REAL_GRAPH_EDGES : (analysisResults?.c2?.edges || []);
  
  return (
    <div className="space-y-4">
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

      {isMockCase && (
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
      )}
    </div>
  );
}
