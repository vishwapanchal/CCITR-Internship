"use client";

import type { PhaseStatus } from "@/services/realData";

interface PhaseProgressProps {
  phases: PhaseStatus[];
}

const statusColors: Record<string, { bg: string; bar: string; text: string }> = {
  completed: { bg: "bg-green-100", bar: "bg-green-500", text: "text-green-700" },
  running: { bg: "bg-blue-100", bar: "bg-blue-500", text: "text-blue-700" },
  pending: { bg: "bg-gray-100", bar: "bg-gray-300", text: "text-gray-500" },
  failed: { bg: "bg-red-100", bar: "bg-red-500", text: "text-red-700" },
};

export default function PhaseProgress({ phases }: PhaseProgressProps) {
  const completedCount = phases.filter((p) => p.status === "completed").length;
  const overallProgress = phases.length === 0 ? 0 : Math.round(
    phases.reduce((sum, p) => sum + p.progress, 0) / phases.length
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-display font-semibold text-sm">Analysis Progress</h4>
        <span className="text-xs font-mono text-primary/60">
          {completedCount}/{phases.length} phases • {overallProgress}%
        </span>
      </div>

      {/* Phase list */}
      <div className="space-y-3 flex-1">
        {phases.map((phase) => {
          const colors = statusColors[phase.status] || statusColors.pending;

          return (
            <div key={phase.phase}>
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-2">
                  {/* Status indicator */}
                  <div
                    className={`w-2 h-2 rounded-full ${
                      phase.status === "running" ? "animate-pulse" : ""
                    } ${colors.bar}`}
                  />
                  <span className="text-xs font-medium">{phase.phase}</span>
                </div>
                <span className={`text-xs font-mono ${colors.text}`}>
                  {phase.status === "running"
                    ? `${phase.progress}%`
                    : phase.status.toUpperCase()}
                </span>
              </div>

              {/* Progress bar */}
              <div className={`h-1.5 w-full ${colors.bg} overflow-hidden`}>
                <div
                  className={`h-full ${colors.bar} transition-all duration-500 ${
                    phase.status === "running" ? "animate-pulse" : ""
                  }`}
                  style={{ width: `${phase.progress}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
