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

function OverviewTab({ caseData, phaseStatus }: { caseData: any; phaseStatus: any }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-panel border border-border-subtle p-6 flex flex-col items-center justify-center">
        <ThreatScore score={caseData.threat_score} size="lg" />
        <p className="mt-4 text-sm font-semibold text-center">{caseData.verdict}</p>
      </div>

      <div className="bg-panel border border-border-subtle p-4 md:col-span-2">
        <h3 className="font-display font-semibold text-sm mb-3 border-b border-border-subtle pb-2">
          Key Findings Summary
        </h3>
        <div className="space-y-2">
          <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200">
            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
            <div>
              <span className="text-xs font-semibold text-red-700">C2 Communication Detected</span>
              <p className="text-xs text-red-600 mt-0.5">Active beacon to c2.malware-ops.ru every 30 seconds</p>
            </div>
          </div>
          <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200">
            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
            <div>
              <span className="text-xs font-semibold text-red-700">Data Exfiltration</span>
              <p className="text-xs text-red-600 mt-0.5">SMS messages and contacts exfiltrated to external server</p>
            </div>
          </div>
          <div className="flex items-start gap-2 p-2 bg-orange-50 border border-orange-200">
            <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />
            <div>
              <span className="text-xs font-semibold text-orange-700">Dynamic Code Loading</span>
              <p className="text-xs text-orange-600 mt-0.5">Loads encrypted DEX payload at runtime via DexClassLoader</p>
            </div>
          </div>
          <div className="flex items-start gap-2 p-2 bg-orange-50 border border-orange-200">
            <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />
            <div>
              <span className="text-xs font-semibold text-orange-700">14 Dangerous Permissions</span>
              <p className="text-xs text-orange-600 mt-0.5">Including READ_SMS, CAMERA, RECORD_AUDIO, ACCESSIBILITY</p>
            </div>
          </div>
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
        setAnalysisResults(resultsData.results);
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
