"use client";

import { FileText, Download, FileArchive, Search, Filter } from "lucide-react";
import { useState } from "react";
import { MOCK_REPORTS } from "@/services/mockData";
import { downloadReport, downloadEvidencePackage } from "@/services/api";

export default function ReportsCenter() {
  const [search, setSearch] = useState("");
  
  const filteredReports = search 
    ? MOCK_REPORTS.filter(r => 
        r.case_number.toLowerCase().includes(search.toLowerCase()) || 
        r.title.toLowerCase().includes(search.toLowerCase())
      )
    : MOCK_REPORTS;

  return (
    <main className="flex-1 p-6 md:p-8 max-w-5xl mx-auto w-full">
      <header className="flex items-center justify-between border-b border-border-subtle pb-6 mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-forensic-blue">
            Forensic Reports & Evidence
          </h1>
          <p className="text-sm text-forensic-blue/60 mt-1">
            Download Section 65B compliant reports and evidence packages
          </p>
        </div>
        
        <div className="flex gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-2 text-forensic-blue/40" />
            <input 
              type="text" 
              placeholder="Search by Case ID..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-canvas border border-border-subtle pl-8 pr-3 py-1.5 text-xs font-mono focus:outline-none focus:border-forensic-blue/50"
            />
          </div>
          <button className="bg-canvas border border-border-subtle p-1.5 hover:bg-border-subtle/50 transition-colors">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </header>
      
      <div className="space-y-4">
        {filteredReports.map((report) => (
          <div key={report.id} className="bg-panel border border-border-subtle p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-forensic-blue/50 transition-colors group">
            <div className="flex items-center space-x-4">
              <div className="bg-canvas p-3 border border-border-subtle group-hover:bg-forensic-blue/5 transition-colors">
                {report.type === "zip" ? (
                  <FileArchive className="w-6 h-6 text-forensic-blue" />
                ) : (
                  <FileText className="w-6 h-6 text-forensic-blue" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold bg-canvas border border-border-subtle px-1.5 py-0.5">
                    {report.case_number}
                  </span>
                  <span className="text-xs font-mono text-forensic-blue/60 uppercase">
                    {report.type}
                  </span>
                </div>
                <h3 className="font-semibold text-base">{report.title}</h3>
                <p className="text-xs text-forensic-blue/60 font-mono mt-1">
                  Language: {report.language} | Generated: {new Date(report.generated_at).toLocaleString()} | {(report.size_kb / 1024).toFixed(1)} MB
                </p>
              </div>
            </div>
            
            <button 
              onClick={() => {
                if (report.type === "zip") {
                  downloadEvidencePackage(report.case_id);
                } else if (report.type === "pdf") {
                  downloadReport(report.case_id, report.language.toLowerCase());
                }
              }}
              className="flex items-center space-x-2 bg-canvas hover:bg-forensic-blue hover:text-white transition-colors border border-border-subtle px-4 py-2 text-sm font-medium w-full sm:w-auto justify-center shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </button>
          </div>
        ))}

        {filteredReports.length === 0 && (
          <div className="text-center py-12 border border-dashed border-border-subtle">
            <p className="text-sm font-mono text-forensic-blue/50">No reports found matching your search.</p>
          </div>
        )}
      </div>
    </main>
  );
}
