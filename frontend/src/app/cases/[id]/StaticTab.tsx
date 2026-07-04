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
  // Extract real data from analysis results array
  const staticResult = Array.isArray(analysisResults)
    ? analysisResults.find((r: any) => r.phase === "static")?.result
    : null;

  // Build permissions from real data
  let permissionsToUse: any[] = [];
  if (isMockCase) {
    permissionsToUse = REAL_PERMISSIONS.filter((p: any) => p.case_id === caseData?.id);
  } else if (staticResult) {
    const steps = staticResult.steps || {};
    // Try manifest data first, then androguard
    const manifestPerms = steps.manifest?.data?.permissions || {};
    const agPerms = steps.androguard?.data?.permissions || {};

    if (Object.keys(manifestPerms).length > 0) {
      permissionsToUse = Object.entries(manifestPerms).map(([name, info]: any) => ({
        name,
        protection_level: info.protection_level || "normal",
        description: info.description || name.split(".").pop(),
        risk: info.protection_level === "dangerous" ? "high" : "low",
        granted: true,
      }));
    } else if (agPerms.all?.length > 0) {
      permissionsToUse = agPerms.all.map((p: string) => ({
        name: p,
        protection_level: agPerms.dangerous?.includes(p) ? "dangerous" : "normal",
        description: p.split(".").pop(),
        risk: agPerms.dangerous?.includes(p) ? "high" : "low",
        granted: true,
      }));
    }
  }

  // Build YARA matches from real data
  let yaraMatchesToUse: any[] = [];
  if (isMockCase) {
    yaraMatchesToUse = REAL_YARA_MATCHES.filter((y: any) => y.case_id === caseData?.id);
  } else if (staticResult?.steps?.yara?.data?.matches) {
    yaraMatchesToUse = staticResult.steps.yara.data.matches.map((m: any) => ({
      rule_name: m.rule,
      category: m.namespace || "general",
      description: m.meta?.description || `Matched in ${m.file || "APK"}`,
      severity: m.meta?.severity || "medium",
      strings_matched: m.strings || [],
    }));
  }

  // Build IOCs from real data
  let iocsToUse: any[] = [];
  if (isMockCase) {
    iocsToUse = REAL_IOCS.filter((i: any) => i.case_id === caseData?.id);
  } else if (staticResult?.steps?.iocs?.data) {
    const iocData = staticResult.steps.iocs.data;
    const allIocs: any[] = [];
    for (const url of iocData.urls || []) {
      allIocs.push({ type: "url", value: url, context: "Extracted from decompiled source", confidence: 80 });
    }
    for (const ip of iocData.ips || []) {
      allIocs.push({ type: "ip", value: ip, context: "IP address found in code", confidence: 70 });
    }
    for (const domain of iocData.domains || []) {
      allIocs.push({ type: "domain", value: domain, context: "Domain reference found", confidence: 75 });
    }
    for (const email of iocData.emails || []) {
      allIocs.push({ type: "email", value: email, context: "Email address found", confidence: 60 });
    }
    iocsToUse = allIocs;
  }

  const dangerousCount = permissionsToUse.filter((p) => p.protection_level === "dangerous").length;
  const criticalCount = permissionsToUse.filter((p) => p.risk === "critical").length;

  return (
    <div className="space-y-4">
      <div className="bg-panel border border-border-subtle p-4">
        <h3 className="font-display font-semibold text-sm mb-3 border-b border-border-subtle pb-2">
          Android Permissions
          <span className="ml-2 text-xs font-mono text-primary/60">
            Total: {permissionsToUse.length} | Dangerous: {dangerousCount} | Critical Risk: {criticalCount}
          </span>
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
