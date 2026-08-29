"use client";

import { useState, useEffect } from "react";
import CaseTabs from "./CaseTabs";
import type { PhaseStatus } from "@/services/realData";
import { getCaseDetail, getCaseResults } from "@/services/api";
import { FileText, Shield, Activity, Network, Bug, FileDown, ArrowLeft } from "lucide-react";
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

const PHASE_LABELS: Record<string, string> = {
  static: "Static Analysis",
  dynamic: "Dynamic Analysis",
  c2_intelligence: "C2 Intelligence",
  vulnerability: "Vulnerability Scan",
};

function derivePhaseStatus(resultsArray: { phase: string; result: any }[], caseStatus: string): PhaseStatus[] {
  const phases = ["static", "dynamic", "c2_intelligence", "vulnerability"];
  return phases.map((phase) => {
    const entry = resultsArray.find((r) => r.phase === phase);
    if (!entry) {
      return {
        phase: PHASE_LABELS[phase],
        status: caseStatus === "analyzing" && phase === "static" ? "running" : "pending",
        progress: 0,
        started_at: null,
        completed_at: null,
      };
    }
    const isPending = entry.result?.status === "pending";
    return {
      phase: PHASE_LABELS[phase],
      status: isPending ? "pending" : "completed",
      progress: isPending ? 0 : 100,
      started_at: null,
      completed_at: entry.result?.completed_at || null,
    };
  });
}

export default function CaseDetailClient({ caseId }: { caseId: string }) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [caseData, setCaseData] = useState<any>(null);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [phaseStatus, setPhaseStatus] = useState<PhaseStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      const resultsArray = resultsData?.results
        ? Object.entries(resultsData.results).map(([phase, result]) => ({ phase, result }))
        : [];
      if (resultsData?.results) {
        setAnalysisResults(resultsArray);

        // Enrich caseData with derived metrics
        const staticResult = resultsArray.find((r: any) => r.phase === "static")?.result as any;
        if (staticResult) {
          const manifest = staticResult.steps?.manifest?.data || {};
          if (manifest.package_name && manifest.package_name !== "unknown") {
            detailData.package_name = manifest.package_name;
          }
          
          if (!detailData.threat_score || detailData.threat_score === 0) {
            let score = 0;
            const dangerousPerms = Object.values(manifest.permissions || {}).filter((v: any) => v.protection_level === "dangerous").length;
            const misconfigs = manifest.misconfigurations?.length || 0;
            const totalIocs = staticResult.steps?.iocs?.data?.total_indicators || 0;
            const yaraHits = staticResult.steps?.yara?.data?.total_matches || 0;
            
            score += dangerousPerms * 3;
            score += misconfigs * 5;
            score += totalIocs * 1;
            
            detailData.threat_score = Math.min(score, 74);
            if (yaraHits > 0) {
              detailData.threat_score = Math.min(score + (yaraHits * 25), 100);
            }
          }
          
          if (!detailData.verdict || detailData.verdict === "completed") {
             if (detailData.threat_score >= 74) detailData.verdict = "High Risk";
             else if (detailData.threat_score >= 40) detailData.verdict = "Medium Risk";
             else detailData.verdict = "Low Risk";
          }
          
          const duration = staticResult.duration_seconds;
          if (typeof duration === "number") {
            detailData.analysis_time = `${duration.toFixed(1)} s`;
          }
          detailData.decompiler = staticResult.steps?.jadx?.status === "success" ? "JADX + Androguard" : "Androguard";
        }
      }

      setCaseData(detailData);
      setPhaseStatus(derivePhaseStatus(resultsArray, detailData.status));

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

  return (
    <main className="flex-1 flex flex-col max-w-7xl mx-auto w-full p-6">
      <Link href="/dashboard" className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors mb-4">
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>
      
      {/* Case Header */}
      <div className="bg-panel border-l-4 border-l-primary shadow-lg p-6 mb-6 relative overflow-hidden group flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="font-pixel text-sm font-bold tracking-widest text-primary bg-primary/10 px-2 py-1 border border-primary/30 shadow-[0_0_15px_rgba(79,70,229,0.2)] group-hover:animate-pulse">
              {caseData.case_number}
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold mb-1 text-transparent bg-clip-text bg-gradient-to-r from-slate-800 to-slate-500">
            {caseData.apk_name}
          </h1>
          <p className="text-sm font-mono text-primary/80 bg-canvas inline-block px-2 py-0.5 border border-border-subtle rounded-sm">
            {caseData.package_name || "N/A"}
          </p>
        </div>
        <div className="relative z-10 flex flex-col md:items-end gap-2">
          <span
            className={`text-sm font-mono font-bold px-3 py-1 flex items-center gap-2 ${
              caseData.status === "completed"
                ? "bg-green-100 text-green-800 border border-green-300"
                : caseData.status === "analyzing"
                ? "bg-blue-100 text-blue-800 border border-blue-300"
                : "bg-gray-100 text-gray-800 border border-gray-300"
            }`}
          >
            {caseData.status === "analyzing" && (
              <svg className="animate-spin h-4 w-4 text-blue-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {caseData.status.toUpperCase()}
          </span>
          {caseData.verdict && (
            <span className={`text-sm font-bold px-3 py-1 border shadow-sm ${
              caseData.verdict === "High Risk" || caseData.verdict === "Critical" ? "bg-red-100 text-red-800 border-red-300" :
              caseData.verdict === "Medium Risk" ? "bg-orange-100 text-orange-800 border-orange-300" :
              "bg-green-100 text-green-800 border-green-300"
            }`}>
              {caseData.verdict.toUpperCase()}
            </span>
          )}
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
        analysisResults={analysisResults}
      />
    </main>
  );
}
