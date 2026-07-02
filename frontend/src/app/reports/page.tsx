"use client";

import { FileText, Download, FileArchive, Search, FileJson, FileSpreadsheet } from "lucide-react";
import { useState } from "react";
import {
  REAL_REPORTS,
  REAL_CASES,
  REAL_PERMISSIONS,
  REAL_IOCS,
  REAL_VULNERABILITIES,
} from "@/services/realData";

/** Generate a downloadable PDF report for a given case using the browser's print engine. */
function generatePDFReport(caseId: string) {
  const c = REAL_CASES.find((x) => x.id === caseId);
  if (!c) return;

  const perms = REAL_PERMISSIONS.filter((p) => p.case_id === caseId);
  const iocs = REAL_IOCS.filter((i) => i.case_id === caseId);
  const vulns = REAL_VULNERABILITIES.filter((v) => v.case_id === caseId);
  const dangerousPerms = perms.filter((p) => p.protection_level === "dangerous");

  const riskColor =
    c.threat_score > 60 ? "#ef4444" : c.threat_score > 30 ? "#f59e0b" : "#10b981";

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>APEX-X Report — ${c.apk_name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1e293b; line-height: 1.6; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #4f46e5; padding-bottom: 20px; margin-bottom: 30px; }
    .logo { font-size: 28px; font-weight: 800; color: #4f46e5; }
    .logo span { color: #06b6d4; }
    .meta { text-align: right; font-size: 12px; color: #64748b; }
    h2 { font-size: 18px; color: #4f46e5; margin: 25px 0 12px; border-left: 4px solid #4f46e5; padding-left: 12px; }
    .summary-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 25px; }
    .stat-card { background: #f8f9fc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center; }
    .stat-value { font-size: 28px; font-weight: 800; }
    .stat-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0 20px; font-size: 13px; }
    th { background: #f1f5f9; text-align: left; padding: 8px 12px; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; }
    td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
    .severity-critical { color: #ef4444; font-weight: 700; }
    .severity-high { color: #f97316; font-weight: 700; }
    .severity-medium { color: #f59e0b; font-weight: 600; }
    .severity-low { color: #10b981; }
    .risk-high { color: #ef4444; font-weight: 600; }
    .risk-medium { color: #f59e0b; font-weight: 600; }
    .risk-low { color: #10b981; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8; }
    .ioc-value { font-family: 'Consolas', monospace; font-size: 12px; word-break: break-all; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">APEX<span>-X</span></div>
      <div style="font-size:13px;color:#64748b;margin-top:4px;">Android Security Analysis Report</div>
    </div>
    <div class="meta">
      <div><strong>${c.case_number}</strong></div>
      <div>Generated: ${new Date().toLocaleDateString()}</div>
      <div>Status: ${c.status}</div>
    </div>
  </div>

  <div class="summary-grid">
    <div class="stat-card">
      <div class="stat-value" style="color:${riskColor}">${c.threat_score}/100</div>
      <div class="stat-label">Risk Score</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${vulns.length}</div>
      <div class="stat-label">Issues Found</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${iocs.length}</div>
      <div class="stat-label">IOCs Detected</div>
    </div>
  </div>

  <h2>App Details</h2>
  <table>
    <tr><td style="width:200px;font-weight:600;">App Name</td><td>${c.apk_name}</td></tr>
    <tr><td style="font-weight:600;">Package</td><td style="font-family:monospace;">${c.package_name}</td></tr>
    <tr><td style="font-weight:600;">Verdict</td><td>${c.verdict}</td></tr>
    <tr><td style="font-weight:600;">Priority</td><td>${c.priority}</td></tr>
    <tr><td style="font-weight:600;">Analyzed On</td><td>${new Date(c.created_at).toLocaleString()}</td></tr>
  </table>

  <h2>Permissions (${perms.length} total, ${dangerousPerms.length} dangerous)</h2>
  <table>
    <thead><tr><th>Permission</th><th>Risk</th><th>Level</th></tr></thead>
    <tbody>
      ${perms
        .sort((a, b) => {
          const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
          return (order[a.risk] ?? 4) - (order[b.risk] ?? 4);
        })
        .map(
          (p) =>
            `<tr><td>${p.name}</td><td class="risk-${p.risk}">${p.risk}</td><td>${p.protection_level}</td></tr>`
        )
        .join("")}
    </tbody>
  </table>

  <h2>Vulnerabilities & Misconfigurations (${vulns.length})</h2>
  <table>
    <thead><tr><th>Issue</th><th>Severity</th><th>CVSS</th><th>CWE</th><th>OWASP</th></tr></thead>
    <tbody>
      ${vulns
        .map(
          (v) =>
            `<tr><td>${v.title}</td><td class="severity-${v.severity}">${v.severity}</td><td>${v.cvss_score}</td><td>${v.cwe_id}</td><td>${v.owasp_category}</td></tr>`
        )
        .join("")}
    </tbody>
  </table>
  ${vulns.map((v) => `<div style="margin:8px 0;font-size:12px;"><strong>${v.title}:</strong> ${v.description}</div>`).join("")}

  <h2>Indicators of Compromise (${iocs.length})</h2>
  <table>
    <thead><tr><th>Type</th><th>Value</th><th>Found In</th></tr></thead>
    <tbody>
      ${iocs
        .map(
          (i) =>
            `<tr><td>${i.type}</td><td class="ioc-value">${i.value}</td><td style="font-size:11px;color:#64748b;">${i.context || "—"}</td></tr>`
        )
        .join("")}
    </tbody>
  </table>

  <div class="footer">
    <p>Generated by <strong>APEX-X</strong> — Android Security Analysis Platform</p>
    <p>This report is for educational purposes only. CMP311 Professional Project Prototyping.</p>
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, "_blank");
  if (printWindow) {
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        URL.revokeObjectURL(url);
      }, 500);
    };
  }
}

/** Generate a JSON export with all findings. */
function downloadJSON(caseId: string) {
  const c = REAL_CASES.find((x) => x.id === caseId);
  if (!c) return;
  const data = {
    case: c,
    permissions: REAL_PERMISSIONS.filter((p) => p.case_id === caseId),
    iocs: REAL_IOCS.filter((i) => i.case_id === caseId),
    vulnerabilities: REAL_VULNERABILITIES.filter((v) => v.case_id === caseId),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${c.apk_name}_report.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Generate CSV export of IOCs. */
function downloadCSV(caseId: string) {
  const c = REAL_CASES.find((x) => x.id === caseId);
  if (!c) return;
  const iocs = REAL_IOCS.filter((i) => i.case_id === caseId);
  const header = "type,value,context,confidence\n";
  const rows = iocs.map((i) => `${i.type},"${i.value}","${i.context || ""}",${i.confidence}`).join("\n");
  const blob = new Blob([header + rows], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${c.apk_name}_iocs.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const typeIcons: Record<string, typeof FileText> = {
  pdf: FileText,
  json: FileJson,
  csv: FileSpreadsheet,
  stix: FileJson,
  zip: FileArchive,
};

export default function ReportsCenter() {
  const [search, setSearch] = useState("");

  const filteredReports = search
    ? REAL_REPORTS.filter(
        (r) =>
          r.case_number.toLowerCase().includes(search.toLowerCase()) ||
          r.title.toLowerCase().includes(search.toLowerCase())
      )
    : REAL_REPORTS;

  const handleDownload = (report: (typeof REAL_REPORTS)[0]) => {
    if (report.type === "pdf") {
      generatePDFReport(report.case_id);
    } else if (report.type === "json" || report.type === "stix") {
      downloadJSON(report.case_id);
    } else if (report.type === "csv") {
      downloadCSV(report.case_id);
    }
  };

  return (
    <main className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full">
      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-display font-bold text-text mb-2">
          Reports & Downloads
        </h1>
        <p className="text-sm text-text-muted">
          Download analysis reports, IOC exports, and evidence packages for each scanned app.
        </p>
      </header>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-text-muted" />
          <input
            type="text"
            placeholder="Search by app or case ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-border-subtle pl-10 pr-4 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      </div>

      <div className="space-y-3">
        {filteredReports.map((report) => {
          const Icon = typeIcons[report.type] || FileText;
          return (
            <div
              key={report.id}
              className="bg-white border border-border-subtle rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-primary/30 hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-surface rounded-lg flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium bg-surface text-text-muted px-2 py-0.5 rounded-full">
                      {report.case_number}
                    </span>
                    <span className="text-xs text-text-muted uppercase">
                      {report.type}
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm">{report.title}</h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    {new Date(report.generated_at).toLocaleDateString()} ·{" "}
                    {report.size_kb > 1024
                      ? `${(report.size_kb / 1024).toFixed(1)} MB`
                      : `${report.size_kb} KB`}
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleDownload(report)}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-2 text-sm font-medium transition-colors w-full sm:w-auto justify-center rounded-lg"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          );
        })}

        {filteredReports.length === 0 && (
          <div className="text-center py-16 border border-dashed border-border-subtle rounded-xl">
            <p className="text-sm text-text-muted">
              No reports found matching your search.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
