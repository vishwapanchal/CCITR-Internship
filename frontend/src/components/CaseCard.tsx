"use client";

import Link from "next/link";
import type { CaseResponse } from "@/services/api";
import { ChevronRight } from "lucide-react";

interface CaseCardProps {
  caseData: CaseResponse;
}

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  completed: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Done" },
  analyzing: { bg: "bg-blue-50", text: "text-blue-700", label: "Scanning..." },
  pending: { bg: "bg-gray-50", text: "text-gray-600", label: "Queued" },
  failed: { bg: "bg-red-50", text: "text-red-700", label: "Failed" },
};

function getScoreColor(score: number): string {
  if (score <= 25) return "text-emerald-600 bg-emerald-50";
  if (score <= 50) return "text-amber-600 bg-amber-50";
  if (score <= 75) return "text-orange-600 bg-orange-50";
  return "text-red-600 bg-red-50";
}

function getRiskLabel(score: number): string {
  if (score <= 25) return "Low Risk";
  if (score <= 50) return "Medium Risk";
  if (score <= 75) return "High Risk";
  return "Critical";
}

export default function CaseCard({ caseData }: CaseCardProps) {
  const status = statusConfig[caseData.status] || statusConfig.pending;
  const score = caseData.threat_score || 0;

  return (
    <Link prefetch={false} href={`/cases/${caseData.id}`}>
      <div className="bg-white border border-border-subtle rounded-xl p-4 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-text-muted">
            {caseData.case_number}
          </span>
          <span
            className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${status.bg} ${status.text}`}
          >
            {status.label}
          </span>
        </div>

        <h3 className="font-semibold text-sm mb-0.5 truncate">{caseData.apk_name}</h3>
        <p className="text-xs text-text-muted truncate mb-3">
          {caseData.package_name || "Unknown package"}
        </p>

        <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
          {score > 0 ? (
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${getScoreColor(score)}`}
            >
              {score}/100 · {getRiskLabel(score)}
            </span>
          ) : (
            <span className="text-xs text-text-muted">Not scored yet</span>
          )}
          <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-primary transition-colors" />
        </div>
      </div>
    </Link>
  );
}
