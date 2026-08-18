import { FileText, Download } from "lucide-react";
import IOCTable from "@/components/IOCTable";
import { REAL_IOCS } from "@/services/realData";
import { downloadReport, downloadEvidencePackage } from "@/services/api";

export default function ReportsTab({ caseData, caseReports }: { caseData: any; caseReports: any[] }) {
  return (
    <div className="space-y-4">
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
                  <FileText className="w-5 h-5 text-primary/50" />
                  <div>
                    <span className="text-sm font-medium block">{lang}</span>
                    <span className="text-xs font-mono text-primary/50">
                      {report ? `${(report.size_kb / 1024).toFixed(1)} MB` : "Not generated"}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
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

      <div className="bg-panel border border-border-subtle p-4">
        <h3 className="font-display font-semibold text-sm mb-3 border-b border-border-subtle pb-2">
          Section 65B Evidence Package
        </h3>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border border-border-subtle gap-3">
          <div>
            <span className="text-sm font-medium">Complete Evidence Package</span>
            <p className="text-xs font-mono text-primary/50 mt-0.5">
              Includes: all artifacts, SHA256 manifest, chain of custody, Section 65B certificate
            </p>
          </div>
          <button
            type="button"
            onClick={() => downloadEvidencePackage(caseData.id)}
            className="w-full sm:w-auto flex items-center justify-center gap-1 text-xs font-mono px-3 py-2 bg-primary text-white hover:bg-primary/90 transition-colors shrink-0"
          >
            <Download className="w-3 h-3" />
            Download ZIP
          </button>
        </div>
      </div>

      <div className="bg-panel border border-border-subtle p-4">
        <h3 className="font-display font-semibold text-sm mb-3 border-b border-border-subtle pb-2">
          IOC Exports
        </h3>
        <IOCTable iocs={REAL_IOCS} />
      </div>
    </div>
  );
}
