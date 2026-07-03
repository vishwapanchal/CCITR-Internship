import React from "react";
import PermissionMatrix from "@/components/PermissionMatrix";
import IOCTable from "@/components/IOCTable";
import { REAL_PERMISSIONS, REAL_YARA_MATCHES, REAL_IOCS } from "@/services/realData";

interface StaticTabProps {
  caseData: any;
  analysisResults?: any;
  isMockCase: boolean;
}

export default function StaticTab({ caseData, analysisResults, isMockCase }: StaticTabProps) {
  const permissionsToUse = isMockCase ? REAL_PERMISSIONS.filter((p: any) => p.case_id === caseData?.id) : (analysisResults?.static?.permissions || []);
  const yaraMatchesToUse = isMockCase ? REAL_YARA_MATCHES.filter((y: any) => y.case_id === caseData?.id) : (analysisResults?.static?.yara_matches || []);
  const iocsToUse = isMockCase ? REAL_IOCS.filter((i: any) => i.case_id === caseData?.id) : (analysisResults?.static?.iocs || []);

  return (
    <div className="space-y-4">
      <div className="bg-panel border border-border-subtle p-4">
        <h3 className="font-display font-semibold text-sm mb-3 border-b border-border-subtle pb-2">
          Android Permissions
        </h3>
        <div className="max-h-[400px] overflow-auto">
          <PermissionMatrix permissions={permissionsToUse} />
        </div>
      </div>

      <div className="bg-panel border border-border-subtle p-4">
        <h3 className="font-display font-semibold text-sm mb-3 border-b border-border-subtle pb-2">
          YARA Rule Matches
        </h3>
        <div className="space-y-2">
          {yaraMatchesToUse.length === 0 ? (
            <p className="text-xs text-primary/60 italic">No YARA rules matched.</p>
          ) : (
            yaraMatchesToUse.map((match: any) => (
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
                  {(match.strings_matched || []).map((s: string) => (
                    <span key={s} className="text-xs font-mono bg-white/60 px-1.5 py-0.5 border border-border-subtle">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-panel border border-border-subtle p-4">
        <h3 className="font-display font-semibold text-sm mb-3 border-b border-border-subtle pb-2">
          Indicators of Compromise (IOCs)
        </h3>
        {iocsToUse.length === 0 ? (
          <p className="text-xs text-primary/60 italic">No IOCs detected in static analysis.</p>
        ) : (
          <IOCTable iocs={iocsToUse} />
        )}
      </div>
    </div>
  );
}
