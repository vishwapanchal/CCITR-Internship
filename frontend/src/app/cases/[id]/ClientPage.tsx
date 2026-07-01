"use client";

import { useState, useMemo, useEffect } from "react";
import ThreatScore from "@/components/ThreatScore";
import BehaviorTimeline from "@/components/BehaviorTimeline";
import NetworkGraph from "@/components/NetworkGraph";
import PermissionMatrix from "@/components/PermissionMatrix";
import IOCTable from "@/components/IOCTable";
import VulnerabilityCard from "@/components/VulnerabilityCard";
import PhaseProgress from "@/components/PhaseProgress";
import {
  MOCK_CASES,
  MOCK_PERMISSIONS,
  MOCK_IOCS,
  MOCK_TIMELINE_EVENTS,
  MOCK_GRAPH_NODES,
  MOCK_GRAPH_EDGES,
  MOCK_VULNERABILITIES,
  MOCK_YARA_MATCHES,
  MOCK_PHASE_STATUS,
  MOCK_PHASE_STATUS_ANALYZING,
  MOCK_REPORTS,
} from "@/services/mockData";
import { downloadReport, downloadEvidencePackage, getCaseDetail } from "@/services/api";
import { FileText, Download, AlertTriangle, Shield, Activity, Network, Bug, FileDown } from "lucide-react";

const TABS = [
  { id: "overview", label: "Overview", icon: Shield },
  { id: "static", label: "Static Analysis", icon: FileText },
  { id: "dynamic", label: "Dynamic Analysis", icon: Activity },
  { id: "c2", label: "C2 & Attribution", icon: Network },
  { id: "vulns", label: "Vulnerabilities", icon: Bug },
  { id: "reports", label: "Reports", icon: FileDown },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function CaseDetailClient({ caseId }: { caseId: string }) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [caseData, setCaseData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [caseReports, setCaseReports] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      
      const { data: detailData, error: detailError } = await getCaseDetail(caseId);
      if (detailError || !detailData) {
        setError(detailError || "Failed to load case details");
        setIsLoading(false);
        return;
      }
      
      setCaseData(detailData);
      
      // Load mock reports for now, since we haven't implemented backend reports endpoint yet
      setCaseReports(MOCK_REPORTS.filter((r) => r.case_id === detailData.id));
      
      setIsLoading(false);
    }
    
    loadData();
  }, [caseId]);

  if (isLoading) {
    return <div className="p-8 flex justify-center"><p className="font-mono text-forensic-blue">Loading case {caseId}...</p></div>;
  }
  
  if (error || !caseData) {
    return <div className="p-8 flex justify-center"><p className="font-mono text-red-600">{error || "Case not found"}</p></div>;
  }

  const phaseStatus = caseData.status === "analyzing" ? MOCK_PHASE_STATUS_ANALYZING : MOCK_PHASE_STATUS;

  return (
    <main className="flex-1 flex flex-col max-w-7xl mx-auto w-full p-6">
      {/* Case Header */}
      <div className="bg-panel border border-border-subtle p-4 mb-4">
        <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
              <span className="font-mono text-sm font-bold tracking-wider">{caseData.case_number}</span>
              <span
                className={`text-xs font-mono font-semibold px-2 py-0.5 ${
                  caseData.status === "completed"
                    ? "bg-green-100 text-green-700"
                    : caseData.status === "analyzing"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {caseData.status.toUpperCase()}
              </span>
            </div>
            <h1 className="font-display text-xl font-bold mb-1 break-words">{caseData.apk_name}</h1>
            <p className="text-xs font-mono text-forensic-blue/60 break-all">{caseData.package_name}</p>
            <p className="text-xs text-forensic-blue/50 mt-1">{caseData.description}</p>
          </div>
          <div className="sm:text-right w-full sm:w-auto">
            <span className="text-xs font-mono text-forensic-blue/50 block">SHA-256</span>
            <span className="text-xs font-mono text-forensic-blue/70 break-all sm:max-w-[280px] block">
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
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-forensic-blue text-forensic-blue"
                  : "border-transparent text-forensic-blue/50 hover:text-forensic-blue/80"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0">
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Threat Score */}
            <div className="bg-panel border border-border-subtle p-6 flex flex-col items-center justify-center">
              <ThreatScore score={caseData.threat_score} size="lg" />
              <p className="mt-4 text-sm font-semibold text-center">{caseData.verdict}</p>
            </div>

            {/* Key Findings */}
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

            {/* Phase Progress */}
            <div className="bg-panel border border-border-subtle p-4 md:col-span-3">
              <PhaseProgress phases={phaseStatus} />
            </div>
          </div>
        )}

        {activeTab === "static" && (
          <div className="space-y-4">
            {/* Permissions */}
            <div className="bg-panel border border-border-subtle p-4">
              <h3 className="font-display font-semibold text-sm mb-3 border-b border-border-subtle pb-2">
                Android Permissions
              </h3>
              <div className="max-h-[400px] overflow-auto">
                <PermissionMatrix permissions={MOCK_PERMISSIONS} />
              </div>
            </div>

            {/* YARA Matches */}
            <div className="bg-panel border border-border-subtle p-4">
              <h3 className="font-display font-semibold text-sm mb-3 border-b border-border-subtle pb-2">
                YARA Rule Matches
              </h3>
              <div className="space-y-2">
                {MOCK_YARA_MATCHES.map((match, idx) => (
                  <div
                    key={idx}
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
                    <p className="text-xs text-forensic-blue/70 mb-2">{match.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {match.strings_matched.map((s, i) => (
                        <span key={i} className="text-xs font-mono bg-white/60 px-1.5 py-0.5 border border-border-subtle">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* IOC Table */}
            <div className="bg-panel border border-border-subtle p-4">
              <h3 className="font-display font-semibold text-sm mb-3 border-b border-border-subtle pb-2">
                Indicators of Compromise (IOCs)
              </h3>
              <IOCTable iocs={MOCK_IOCS} />
            </div>
          </div>
        )}

        {activeTab === "dynamic" && (
          <div className="space-y-4">
            {/* Behavior Timeline */}
            <div className="bg-panel border border-border-subtle p-4">
              <h3 className="font-display font-semibold text-sm mb-3 border-b border-border-subtle pb-2">
                Behavioral Event Timeline
              </h3>
              <div className="h-[500px]">
                <BehaviorTimeline events={MOCK_TIMELINE_EVENTS} />
              </div>
            </div>

            {/* API Traces */}
            <div className="bg-panel border border-border-subtle p-4 overflow-hidden">
              <h3 className="font-display font-semibold text-sm mb-3 border-b border-border-subtle pb-2">
                Suspicious API Calls
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead>
                    <tr className="border-b border-border-subtle text-left">
                      <th className="pb-2 font-mono text-xs text-forensic-blue/60">API</th>
                      <th className="pb-2 font-mono text-xs text-forensic-blue/60">Class</th>
                      <th className="pb-2 font-mono text-xs text-forensic-blue/60">Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { api: "DexClassLoader()", cls: "dalvik.system", risk: "CRITICAL" },
                      { api: "getLastKnownLocation()", cls: "android.location.LocationManager", risk: "HIGH" },
                      { api: "query(content://sms)", cls: "android.content.ContentResolver", risk: "CRITICAL" },
                      { api: "sendTextMessage()", cls: "android.telephony.SmsManager", risk: "CRITICAL" },
                      { api: "open(CAMERA_FACING_FRONT)", cls: "android.hardware.Camera", risk: "HIGH" },
                      { api: "setActiveAdmin()", cls: "android.app.admin.DevicePolicyManager", risk: "CRITICAL" },
                      { api: "getInstance(AES/CBC)", cls: "javax.crypto.Cipher", risk: "MEDIUM" },
                    ].map((row, idx) => (
                      <tr key={idx} className="border-b border-border-subtle/50">
                        <td className="py-2 font-mono text-xs">{row.api}</td>
                        <td className="py-2 text-xs text-forensic-blue/60 font-mono break-all">{row.cls}</td>
                        <td className="py-2">
                          <span
                            className={`text-xs font-mono font-semibold px-2 py-0.5 ${
                              row.risk === "CRITICAL"
                                ? "bg-red-100 text-red-700"
                                : row.risk === "HIGH"
                                ? "bg-orange-100 text-orange-700"
                                : "bg-yellow-100 text-yellow-700"
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

            {/* Network Activity */}
            <div className="bg-panel border border-border-subtle p-4 overflow-hidden">
              <h3 className="font-display font-semibold text-sm mb-3 border-b border-border-subtle pb-2">
                Network Activity
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead>
                    <tr className="border-b border-border-subtle text-left">
                      <th className="pb-2 font-mono text-xs text-forensic-blue/60">Destination</th>
                      <th className="pb-2 font-mono text-xs text-forensic-blue/60">Protocol</th>
                      <th className="pb-2 font-mono text-xs text-forensic-blue/60">Port</th>
                      <th className="pb-2 font-mono text-xs text-forensic-blue/60">Data Size</th>
                      <th className="pb-2 font-mono text-xs text-forensic-blue/60">Direction</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { dest: "c2.malware-ops.ru", proto: "HTTPS", port: "443", size: "12 KB", dir: "OUTBOUND" },
                      { dest: "91.234.99.18", proto: "HTTPS", port: "443", size: "8 KB", dir: "OUTBOUND" },
                      { dest: "update-service.ddns.net", proto: "DNS", port: "53", size: "128 B", dir: "OUTBOUND" },
                      { dest: "cdn-payload.s3.amazonaws.com", proto: "HTTPS", port: "443", size: "45 KB", dir: "INBOUND" },
                      { dest: "185.220.101.42", proto: "HTTPS", port: "443", size: "256 B", dir: "OUTBOUND" },
                    ].map((row, idx) => (
                      <tr key={idx} className="border-b border-border-subtle/50">
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
        )}

        {activeTab === "c2" && (
          <div className="space-y-4">
            {/* Graph */}
            <div className="bg-panel border border-border-subtle" style={{ height: "500px" }}>
              <NetworkGraph
                nodes={MOCK_GRAPH_NODES}
                edges={MOCK_GRAPH_EDGES}
              />
            </div>

            {/* Attribution Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-panel border border-border-subtle p-4">
                <h3 className="font-display font-semibold text-sm mb-3 border-b border-border-subtle pb-2">
                  Malware Family
                </h3>
                <div className="space-y-2">
                  <div>
                    <span className="text-xs font-mono text-forensic-blue/60 block">Family</span>
                    <span className="text-sm font-semibold">SpyAgent / PhishKing variant</span>
                  </div>
                  <div>
                    <span className="text-xs font-mono text-forensic-blue/60 block">First Seen</span>
                    <span className="text-sm font-mono">2026-01-20</span>
                  </div>
                  <div>
                    <span className="text-xs font-mono text-forensic-blue/60 block">Target Region</span>
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
                    <span className="text-xs font-mono text-forensic-blue/60 block">Campaign</span>
                    <span className="text-sm font-semibold">Operation PhishKing</span>
                  </div>
                  <div>
                    <span className="text-xs font-mono text-forensic-blue/60 block">Threat Actor</span>
                    <span className="text-sm font-mono">APT-IND-07 (Confidence: 65%)</span>
                  </div>
                  <div>
                    <span className="text-xs font-mono text-forensic-blue/60 block">Motivation</span>
                    <span className="text-sm">Financial — Banking credential theft</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "vulns" && (
          <div className="space-y-4">
            <div className="flex gap-4 text-xs font-mono text-forensic-blue/60 mb-2">
              <span>
                Total: <strong className="text-forensic-blue">{MOCK_VULNERABILITIES.length}</strong>
              </span>
              <span className="text-red-600">
                Critical: <strong>{MOCK_VULNERABILITIES.filter((v) => v.severity === "critical").length}</strong>
              </span>
              <span className="text-orange-600">
                High: <strong>{MOCK_VULNERABILITIES.filter((v) => v.severity === "high").length}</strong>
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {MOCK_VULNERABILITIES.map((vuln) => (
                <VulnerabilityCard key={vuln.id} vulnerability={vuln} />
              ))}
            </div>
          </div>
        )}

        {activeTab === "reports" && (
          <div className="space-y-4">
            {/* Language Reports */}
            <div className="bg-panel border border-border-subtle p-4">
              <h3 className="font-display font-semibold text-sm mb-3 border-b border-border-subtle pb-2">
                Investigation Reports
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {["English", "Hindi", "Kannada", "Tamil", "Telugu"].map((lang) => {
                  const report = caseReports.find((r) => r.language === lang && r.type === "pdf");
                  return (
                    <div key={lang} className="border border-border-subtle p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-forensic-blue/50" />
                        <div>
                          <span className="text-sm font-medium block">{lang}</span>
                          <span className="text-xs font-mono text-forensic-blue/50">
                            {report ? `${(report.size_kb / 1024).toFixed(1)} MB` : "Not generated"}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => downloadReport(caseData.id, lang.toLowerCase())}
                        disabled={!report}
                        className="flex items-center gap-1 text-xs font-mono px-2 py-1 border border-border-subtle hover:bg-canvas disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <Download className="w-3 h-3" />
                        PDF
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Evidence Package */}
            <div className="bg-panel border border-border-subtle p-4">
              <h3 className="font-display font-semibold text-sm mb-3 border-b border-border-subtle pb-2">
                Section 65B Evidence Package
              </h3>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border border-border-subtle gap-3">
                <div>
                  <span className="text-sm font-medium">Complete Evidence Package</span>
                  <p className="text-xs font-mono text-forensic-blue/50 mt-0.5">
                    Includes: all artifacts, SHA256 manifest, chain of custody, Section 65B certificate
                  </p>
                </div>
                <button
                  onClick={() => downloadEvidencePackage(caseData.id)}
                  className="w-full sm:w-auto flex items-center justify-center gap-1 text-xs font-mono px-3 py-2 bg-forensic-blue text-white hover:bg-forensic-blue/90 transition-colors shrink-0"
                >
                  <Download className="w-3 h-3" />
                  Download ZIP
                </button>
              </div>
            </div>

            {/* IOC Exports */}
            <div className="bg-panel border border-border-subtle p-4">
              <h3 className="font-display font-semibold text-sm mb-3 border-b border-border-subtle pb-2">
                IOC Exports
              </h3>
              <IOCTable iocs={MOCK_IOCS} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
