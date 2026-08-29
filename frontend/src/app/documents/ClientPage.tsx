"use client";

import { FileText, Download, FileArchive, Search, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getCases, downloadReport, downloadEvidencePackage, CaseResponse } from "@/services/api";

const LANGUAGES = ["English", "Hindi", "Kannada", "Tamil", "Telugu"];

export default function ReportsCenter() {
  const [search, setSearch] = useState("");
  const [cases, setCases] = useState<CaseResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getCases().then(({ data }) => {
      setCases(data || []);
      setIsLoading(false);
    });
  }, []);

  const completedCases = cases.filter((c) => c.status === "completed");

  const filteredCases = search
    ? completedCases.filter(
        (c) =>
          c.case_number?.toLowerCase().includes(search.toLowerCase()) ||
          c.apk_name?.toLowerCase().includes(search.toLowerCase())
      )
    : completedCases;

  return (
    <main className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full relative">
      <Link href="/dashboard" className="absolute top-4 left-4 md:top-8 md:-left-8 xl:-left-24 flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back
      </Link>
      <header className="mb-8 mt-8 md:mt-0">
        <h1 className="text-2xl md:text-3xl font-display font-bold text-text mb-2">
          Reports & Downloads
        </h1>
        <p className="text-sm text-text-muted">
          Generate and download analysis reports and Section 65B evidence packages for each completed case.
        </p>
      </header>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-text-muted" />
          <input
            type="text"
            placeholder="Search by app or case number..."
            aria-label="Search by app or case number"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-border-subtle pl-10 pr-4 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-text-muted text-center py-16">Loading cases...</p>
      ) : (
        <div className="space-y-3">
          {filteredCases.map((c) => (
            <div
              key={c.id}
              className="bg-white border border-border-subtle rounded-xl p-4 flex flex-col gap-4 hover:border-primary/30 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-surface rounded-lg flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium bg-surface text-text-muted px-2 py-0.5 rounded-full">
                      {c.case_number}
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm truncate">{c.apk_name}</h3>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => downloadReport(c.id, lang.toLowerCase())}
                    className="flex items-center gap-1.5 bg-canvas hover:bg-primary/10 text-text px-3 py-1.5 text-xs font-medium transition-colors rounded-lg border border-border-subtle"
                  >
                    <Download className="w-3 h-3" />
                    {lang} PDF
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => downloadEvidencePackage(c.id)}
                  className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white px-3 py-1.5 text-xs font-medium transition-colors rounded-lg"
                >
                  <FileArchive className="w-3 h-3" />
                  Evidence ZIP
                </button>
              </div>
            </div>
          ))}

          {filteredCases.length === 0 && (
            <div className="text-center py-16 border border-dashed border-border-subtle rounded-xl">
              <p className="text-sm text-text-muted">
                {search
                  ? "No completed cases match your search."
                  : "No completed cases yet. Reports become available once analysis finishes."}
              </p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
