import { FileText, Download } from "lucide-react";

export default function ReportsCenter() {
  const reports = [
    { id: 1, title: "Investigation Report - CID-2026-X89", type: "PDF", lang: "English", date: "Just now" },
    { id: 2, title: "Section 65B Evidence Package", type: "ZIP", lang: "N/A", date: "Just now" },
  ];

  return (
    <main className="flex-1 p-8 max-w-5xl mx-auto w-full">
      <h1 className="text-3xl font-display font-bold text-forensic-blue mb-8">
        Forensic Reports & Evidence
      </h1>
      
      <div className="grid gap-4">
        {reports.map((report) => (
          <div key={report.id} className="bg-panel border border-border-subtle p-4 flex items-center justify-between hover:border-forensic-blue/50 transition-colors">
            <div className="flex items-center space-x-4">
              <div className="bg-canvas p-3 border border-border-subtle">
                <FileText className="w-6 h-6 text-forensic-blue" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{report.title}</h3>
                <p className="text-sm text-forensic-blue/60 font-mono">
                  {report.type} | Language: {report.lang} | Generated: {report.date}
                </p>
              </div>
            </div>
            <button className="flex items-center space-x-2 bg-canvas hover:bg-forensic-blue hover:text-white transition-colors border border-border-subtle px-4 py-2 font-medium">
              <Download className="w-4 h-4" />
              <span>Download</span>
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
