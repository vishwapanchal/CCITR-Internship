"use client";

import { useState, useMemo, useEffect } from "react";
import ThreatScore from "@/components/ThreatScore";
import BehaviorTimeline from "@/components/BehaviorTimeline";
import NetworkGraph from "@/components/NetworkGraph";
import PermissionMatrix from "@/components/PermissionMatrix";
import IOCTable from "@/components/IOCTable";
import VulnerabilityCard from "@/components/VulnerabilityCard";
import PhaseProgress from "@/components/PhaseProgress";
import CaseTabs from "./CaseTabs";
import {
  REAL_CASES,
  REAL_PERMISSIONS,
  REAL_IOCS,
  REAL_TIMELINE_EVENTS,
  REAL_GRAPH_NODES,
  REAL_GRAPH_EDGES,
  REAL_VULNERABILITIES,
  REAL_YARA_MATCHES,
  REAL_PHASE_STATUS,
  REAL_PHASE_STATUS_ANALYZING,
  REAL_REPORTS,
} from "@/services/realData";
import { downloadReport, downloadEvidencePackage, getCaseDetail, getCaseResults } from "@/services/api";
import { FileText, Download, AlertTriangle, Shield, Activity, Network, Bug, FileDown, ArrowLeft } from "lucide-react";
import Link from "next/link";

const TABS = [
  { id: "overview", label: "Overview", icon: Shield },
  { id: "static", label: "Static Analysis", icon: FileText },
  { id: "dynamic", label: "Dynamic Analysis", icon: Activity },
  { id: "c2", label: "C2 & Attribution", icon: Network },
  { id: "vulns", label: "Vulnerabilities", icon: Bug },
  { id: "reports", label: "Reports", icon: FileDown },
] as const;

type TabId = (typeof TABS)[number]["id"];

function OverviewTab({ caseData, phaseStatus, analysisResults }: { caseData: any; phaseStatus: any; analysisResults: any }) {
  // Build findings dynamically from real analysis results
  const findings: { severity: string; title: string; description: string }[] = [];

  if (analysisResults) {
    // Check static analysis results
    const staticResult = analysisResults.find?.((r: any) => r.phase === "static");
    if (staticResult?.result) {
      const steps = staticResult.result.steps || {};
      
      // Permissions findings
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
        findings.push({
          severity: "critical",
          title: `${yara.total_matches} YARA Rule Matches`,
          description: `Rules matched: ${(yara.rules_matched || []).join(", ")}`
        });
      }

      // IOC findings
      const iocs = steps.iocs?.data || {};
      if (iocs.total_indicators > 0) {
        findings.push({
          severity: "warning",
          title: `${iocs.total_indicators} Indicators of Compromise`,
          description: `Found ${(iocs.urls?.length || 0)} URLs, ${(iocs.ips?.length || 0)} IPs, ${(iocs.domains?.length || 0)} domains`
        });
      }

      // Misconfigurations
      const misconfigs = manifest.misconfigurations || [];
      if (misconfigs.length > 0) {
        findings.push({
          severity: "warning",
          title: `${misconfigs.length} Security Misconfigurations`,
          description: misconfigs.slice(0, 2).join("; ")
        });
      }

      // Risk score
      if (staticResult.result.risk_score != null && staticResult.result.risk_score >= 0) {
        const score = staticResult.result.risk_score;
        findings.push({
          severity: score >= 70 ? "critical" : score >= 40 ? "warning" : "info",
          title: `Risk Score: ${score}/100`,
          description: `Static analysis risk assessment: ${score >= 70 ? "High Risk" : score >= 40 ? "Medium Risk" : "Low Risk"}`
        });
      }
    }

    // Check C2 results
    const c2Result = analysisResults.find?.((r: any) => r.phase === "c2_intelligence");
    if (c2Result?.result) {
      const c2Data = c2Result.result;
      if (c2Data.c2_indicators?.length > 0) {
        findings.push({
          severity: "critical",
          title: "C2 Communication Indicators",
          description: `Found ${c2Data.c2_indicators.length} potential C2 indicators`
        });
      }
    }

    // Check vulnerability results
    const vulnResult = analysisResults.find?.((r: any) => r.phase === "vulnerability");
    if (vulnResult?.result?.vulnerabilities?.length > 0) {
      const vulns = vulnResult.result.vulnerabilities;
      findings.push({
        severity: "critical",
        title: `${vulns.length} Vulnerabilities Discovered`,
        description: `Including ${vulns.filter((v: any) => v.severity === "critical" || v.severity === "high").length} high/critical severity`
      });
    }
  }

  // If no real findings, show a status message
  if (findings.length === 0) {
    if (caseData.status === "analyzing") {
      findings.push({ severity: "info", title: "Analysis In Progress", description: "Results will appear here once analysis completes. This page auto-refreshes." });
    } else if (caseData.status === "pending" || caseData.status === "pending_manual") {
      findings.push({ severity: "info", title: "Analysis Pending", description: "Analysis has not started yet." });
    } else {
      findings.push({ severity: "info", title: "No Findings", description: "No significant findings detected in this APK." });
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-panel border border-border-subtle p-6 flex flex-col items-center justify-center">
        <ThreatScore score={caseData.threat_score || 0} size="lg" />
        <p className="mt-4 text-sm font-semibold text-center">{caseData.verdict || caseData.status}</p>
      </div>

      <div className="bg-panel border border-border-subtle p-4 md:col-span-2">
        <h3 className="font-display font-semibold text-sm mb-3 border-b border-border-subtle pb-2">
          Key Findings Summary
        </h3>
        <div className="space-y-2">
          {findings.map((finding, i) => (
            <div key={i} className={`flex items-start gap-2 p-2 ${
              finding.severity === "critical" ? "bg-red-50 border border-red-200" :
              finding.severity === "warning" ? "bg-orange-50 border border-orange-200" :
              "bg-blue-50 border border-blue-200"
            }`}>
              <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${
                finding.severity === "critical" ? "text-red-600" :
                finding.severity === "warning" ? "text-orange-600" :
                "text-blue-600"
              }`} />
              <div>
                <span className={`text-xs font-semibold ${
                  finding.severity === "critical" ? "text-red-700" :
                  finding.severity === "warning" ? "text-orange-700" :
                  "text-blue-700"
                }`}>{finding.title}</span>
                <p className={`text-xs mt-0.5 ${
                  finding.severity === "critical" ? "text-red-600" :
                  finding.severity === "warning" ? "text-orange-600" :
                  "text-blue-600"
                }`}>{finding.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-panel border border-border-subtle p-4 md:col-span-3">
        <PhaseProgress phases={phaseStatus} />
      </div>
    </div>
  );
}

export default function CaseDetailClient({ caseId }: { caseId: string }) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [caseData, setCaseData] = useState<any>(null);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [caseReports, setCaseReports] = useState<any[]>([]);

  useEffect(() => {
    async function loadData(isInitial = true) {
      if (isInitial) setIsLoading(true);
      
      const { data: detailData, error: detailError } = await getCaseDetail(caseId);
      if (detailError || !detailData) {
        if (isInitial) setError(detailError || "Failed to load case details");
        if (isInitial) setIsLoading(false);
        return;
      }
      
      setCaseData(detailData);
      
      // Fetch analysis results
      const { data: resultsData } = await getCaseResults(caseId);
      if (resultsData?.results) {
        // Convert dict {static: {...}, c2_intelligence: {...}} to array [{phase, result}]
        const resultsArray = Object.entries(resultsData.results).map(([phase, result]) => ({ phase, result }));
        setAnalysisResults(resultsArray);
      }
      
      // Load mock reports for now, since we haven't implemented backend reports endpoint yet
      setCaseReports(REAL_REPORTS.filter((r) => r.case_id === detailData.id));
      
      if (isInitial) setIsLoading(false);
    }
    
    loadData();

    // Setup polling if the case is still analyzing
    const intervalId = setInterval(() => {
      setCaseData((currentCaseData: any) => {
        if (currentCaseData && currentCaseData.status === "analyzing") {
          loadData(false);
        } else if (currentCaseData && currentCaseData.status !== "analyzing") {
          clearInterval(intervalId);
        }
        return currentCaseData;
      });
    }, 5000);

    return () => clearInterval(intervalId);
  }, [caseId]);

  if (isLoading) {
    return <div className="p-8 flex justify-center"><p className="font-mono text-primary">Loading case {caseId}...</p></div>;
  }
  
  if (error || !caseData) {
    return <div className="p-8 flex justify-center"><p className="font-mono text-red-600">{error || "Case not found"}</p></div>;
  }

  const phaseStatus = caseData.status === "analyzing" ? REAL_PHASE_STATUS_ANALYZING : REAL_PHASE_STATUS;

  return (
    <main className="flex-1 flex flex-col max-w-7xl mx-auto w-full p-6">
      <Link href="/dashboard" className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors mb-4">
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>
      
      {/* Case Header */}
      <div className="bg-panel border-l-4 border-l-primary shadow-lg p-6 mb-6 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-4 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
              <span className="font-pixel text-sm font-bold tracking-widest text-primary bg-primary/10 px-2 py-1 border border-primary/30 shadow-[0_0_15px_rgba(79,70,229,0.2)] group-hover:animate-pulse">{caseData.case_number}</span>
              <span
                className={`text-xs font-mono font-semibold px-2 py-1 ${
                  caseData.status === "completed"
                    ? "bg-green-100 text-green-700 border border-green-200"
                    : caseData.status === "analyzing"
                    ? "bg-blue-100 text-blue-700 border border-blue-200"
                    : "bg-gray-100 text-gray-600 border border-gray-200"
                }`}
              >
                {caseData.status.toUpperCase()}
              </span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold mb-2 break-words text-transparent bg-clip-text bg-gradient-to-r from-slate-800 to-slate-500">{caseData.apk_name}</h1>
            <p className="text-sm font-mono text-primary/80 break-all bg-canvas inline-block px-2 py-0.5 border border-border-subtle rounded-sm">{caseData.package_name}</p>
            <p className="text-sm text-text-muted mt-3 font-sans max-w-2xl leading-relaxed">{caseData.description}</p>
          </div>
          <div className="sm:text-right w-full sm:w-auto bg-canvas p-3 border border-border-subtle shadow-inner">
            <span className="text-xs font-display tracking-widest text-primary/50 block mb-1 uppercase">SHA-256</span>
            <span className="text-xs font-mono text-primary/70 break-all sm:max-w-[280px] block">
              {caseData.apk_hash}
            </span>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-border-subtle mb-4 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              type="button"
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-primary/50 hover:text-primary/80"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <CaseTabs
        activeTab={activeTab}
        caseData={caseData}
        phaseStatus={phaseStatus}
        caseReports={caseReports}
        analysisResults={analysisResults}
      />
    </main>
  );
}
