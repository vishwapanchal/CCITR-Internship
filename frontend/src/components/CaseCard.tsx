"use client";

import Link from "next/link";
import type { CaseResponse } from "@/services/api";

interface CaseCardProps {
  caseData: CaseResponse;
}

const statusColors: Record<string, { bg: string; text: string }> = {
  completed: { bg: "bg-green-100", text: "text-green-700" },
  analyzing: { bg: "bg-blue-100", text: "text-blue-700" },
  pending: { bg: "bg-gray-100", text: "text-gray-600" },
  failed: { bg: "bg-red-100", text: "text-red-700" },
};

const priorityColors: Record<string, string> = {
  low: "text-green-600",
  medium: "text-yellow-600",
  high: "text-orange-600",
  critical: "text-red-600",
};

function getScoreColor(score: number): string {
  if (score <= 25) return "text-green-600";
  if (score <= 50) return "text-yellow-600";
  if (score <= 75) return "text-orange-600";
  return "text-red-600";
}

export default function CaseCard({ caseData }: CaseCardProps) {
  const statusStyle = statusColors[caseData.status] || statusColors.pending;

  return (
    <Link prefetch={false} href={`/cases/${caseData.id}`}>
      <div className="bg-panel border border-border-subtle p-4 hover:border-forensic-blue/30 transition-colors cursor-pointer">
        {/* Header row */}
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-xs font-semibold tracking-wider">{caseData.case_number}</span>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-mono ${priorityColors[caseData.priority || "medium"]} `}>
              {(caseData.priority || "medium").toUpperCase()}
            </span>
            <span className={`text-xs font-mono font-semibold px-2 py-0.5 ${statusStyle.bg} ${statusStyle.text}`}>
              {caseData.status.toUpperCase()}
            </span>
          </div>
        </div>

        {/* APK name */}
        <h3 className="font-medium text-sm mb-1 truncate">{caseData.apk_name}</h3>
        <p className="text-xs text-forensic-blue/60 font-mono truncate mb-3">{caseData.package_name || "Unknown package"}</p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border-subtle/50">
          {(caseData.threat_score || 0) > 0 ? (
            <span className={`text-sm font-bold font-mono ${getScoreColor(caseData.threat_score || 0)}`}>
              Score: {caseData.threat_score}/100
            </span>
          ) : (
            <span className="text-xs font-mono text-forensic-blue/40">Score: —</span>
          )}
          <span className="text-xs font-mono text-forensic-blue/50">
            {new Date(caseData.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>
    </Link>
  );
}
