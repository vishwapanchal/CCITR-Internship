import HeroGauge from "@/components/HeroGauge";
import MetadataPanel from "@/components/MetadataPanel";
import RecentAlerts from "@/components/RecentAlerts";
import VulnerabilityRadar from "@/components/VulnerabilityRadar";
import PhaseProgress from "@/components/PhaseProgress";
import SyndicateAlert from "@/components/SyndicateAlert";
import { AlertTriangle, Info } from "lucide-react";

export default function OverviewTab({ caseData, phaseStatus, analysisResults }: { caseData: any; phaseStatus: any; analysisResults?: any }) {
  // Build findings dynamically from real analysis results
  const findings: { severity: string; title: string; description: string }[] = [];

  if (analysisResults && Array.isArray(analysisResults)) {
    const staticResult = analysisResults.find((r: any) => r.phase === "static");
    if (staticResult?.result) {
      const steps = staticResult.result.steps || {};

      // Permissions
      const manifest = steps.manifest?.data || {};
      const perms = manifest.permissions || {};
      const dangerousPerms = Object.entries(perms).filter(([_, v]: any) => v?.protection_level === "dangerous");
      if (dangerousPerms.length > 0) {
        findings.push({
          severity: dangerousPerms.length > 10 ? "critical" : "warning",
          title: `${dangerousPerms.length} Dangerous Permissions`,
          description: `Including ${dangerousPerms.slice(0, 3).map(([k]) => k.split(".").pop()).join(", ")}${dangerousPerms.length > 3 ? ` and ${dangerousPerms.length - 3} more` : ""}`
        });
      }

      // YARA matches
      const yara = steps.yara?.data || {};
      if (yara.total_matches > 0) {
        findings.push({ severity: "critical", title: `${yara.total_matches} YARA Rule Matches`, description: `Rules: ${(yara.rules_matched || []).join(", ")}` });
      }

      // IOCs
      const iocs = steps.iocs?.data || {};
      if (iocs.total_indicators > 0) {
        findings.push({ severity: "info", title: `${iocs.total_indicators} Network Indicators Found`, description: `${iocs.urls?.length || 0} URLs, ${iocs.ips?.length || 0} IPs, ${iocs.domains?.length || 0} domains` });
      }

      // Misconfigurations
      const misconfigs = manifest.misconfigurations || [];
      if (misconfigs.length > 0) {
        // Handle both string and object misconfigurations
        const descriptions = misconfigs.slice(0, 3).map((m: any) => {
          if (typeof m === "string") return m;
          if (typeof m === "object" && m !== null) return m.title || m.description || m.name || JSON.stringify(m);
          return String(m);
        });
        findings.push({ severity: "warning", title: `${misconfigs.length} Security Misconfigurations`, description: descriptions.join("; ") });
      }
    }

    // C2 results
    const c2Result = analysisResults.find((r: any) => r.phase === "c2_intelligence");
    if (c2Result?.result?.c2_indicators?.length > 0) {
      findings.push({ severity: "critical", title: "C2 Communication Indicators", description: `Found ${c2Result.result.c2_indicators.length} potential C2 indicators` });
    }

    // Vulnerabilities
    const vulnResult = analysisResults.find((r: any) => r.phase === "vulnerability");
    if (vulnResult?.result?.vulnerabilities?.length > 0) {
      const vulns = vulnResult.result.vulnerabilities;
      findings.push({ severity: "critical", title: `${vulns.length} Vulnerabilities Discovered`, description: `${vulns.filter((v: any) => v.severity === "critical" || v.severity === "high").length} high/critical severity` });
    }
  }

  // Status messages if no findings
  if (findings.length === 0) {
    if (caseData.status === "analyzing") {
      findings.push({ severity: "info", title: "Analysis In Progress", description: "Results will appear here once analysis completes. This page auto-refreshes." });
    } else if (caseData.status === "pending" || caseData.status === "pending_manual") {
      findings.push({ severity: "info", title: "Analysis Pending", description: "Analysis has not started yet." });
    } else if (caseData.status === "completed") {
      findings.push({ severity: "info", title: "Analysis Complete", description: "No significant threats detected in this APK." });
    }
  }

  return (
    <>
      {caseData.id && <SyndicateAlert caseId={caseData.id} />}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Hero Score */}
      <div className="bg-panel border border-border-subtle p-6 flex flex-col items-center justify-center md:col-span-4 min-h-[300px]">
        <HeroGauge score={caseData.threat_score || 0} />
        <p className="mt-6 text-sm font-semibold text-center uppercase tracking-wider">{caseData.verdict || caseData.status}</p>
      </div>

      {/* Metadata Panel */}
      <div className="bg-panel border border-border-subtle p-6 md:col-span-4">
        <MetadataPanel caseData={caseData} />
      </div>

      {/* Vulnerability Radar */}
      <div className="bg-panel border border-border-subtle p-6 md:col-span-4 flex flex-col items-center justify-center">
        <VulnerabilityRadar />
      </div>

      {/* Key Findings Summary — DYNAMIC from real analysis */}
      <div className="bg-panel border border-border-subtle p-4 md:col-span-7">
        <h3 className="font-display font-semibold text-sm mb-3 border-b border-border-subtle pb-2">
          Key Findings Summary
        </h3>
        <div className="space-y-2">
          {findings.map((finding, i) => (
            <div key={i} className={`flex items-start gap-2 p-2 hover:scale-[1.01] transition-transform ${
              finding.severity === "critical" ? "bg-red-50 border border-red-200" :
              finding.severity === "warning" ? "bg-orange-50 border border-orange-200" :
              "bg-blue-50 border border-blue-200"
            }`}>
              {finding.severity === "info" ? (
                <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${
                  finding.severity === "critical" ? "text-red-600 animate-pulse" : "text-orange-600"
                }`} />
              )}
              <div>
                <span className={`text-xs font-semibold ${
                  finding.severity === "critical" ? "text-red-700" :
                  finding.severity === "warning" ? "text-orange-700" : "text-blue-700"
                }`}>{finding.title}</span>
                <p className={`text-xs mt-0.5 ${
                  finding.severity === "critical" ? "text-red-600" :
                  finding.severity === "warning" ? "text-orange-600" : "text-blue-600"
                }`}>{finding.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live Behavioral Alerts */}
      <div className="bg-panel border border-border-subtle p-4 md:col-span-5">
        <RecentAlerts analysisResults={analysisResults} />
      </div>

      {/* Progress */}
      <div className="bg-panel border border-border-subtle p-4 md:col-span-12">
        <PhaseProgress phases={phaseStatus} />
      </div>
    </div>
    </>
  );
}
