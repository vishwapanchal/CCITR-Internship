"use client";

import { useState } from "react";
import type { TimelineEvent } from "@/services/realData";

interface BehaviorTimelineProps {
  events: TimelineEvent[];
}

const typeColors: Record<string, { bg: string; border: string; text: string }> = {
  network: { bg: "bg-blue-50", border: "border-blue-400", text: "text-blue-700" },
  file_io: { bg: "bg-green-50", border: "border-green-400", text: "text-green-700" },
  api_call: { bg: "bg-orange-50", border: "border-orange-400", text: "text-orange-700" },
  sms: { bg: "bg-red-50", border: "border-red-400", text: "text-red-700" },
  crypto: { bg: "bg-purple-50", border: "border-purple-400", text: "text-purple-700" },
  permission: { bg: "bg-yellow-50", border: "border-yellow-400", text: "text-yellow-700" },
};

const typeLabels: Record<string, string> = {
  network: "Network",
  file_io: "File I/O",
  api_call: "API Call",
  sms: "SMS",
  crypto: "Crypto",
  permission: "Permission",
};

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export default function BehaviorTimeline({ events }: BehaviorTimelineProps) {
  const [filter, setFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredEvents = filter === "all" ? events : events.filter((e) => e.type === filter);
  const eventTypes = ["all", ...Array.from(new Set(events.map((e) => e.type)))];


  return (
    <div className="flex flex-col h-full">
      {/* Filter buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        {eventTypes.map((type) => (
          <button
            type="button"
            key={type}
            onClick={() => setFilter(type)}
            className={`px-3 py-1 text-xs font-mono border transition-colors ${
              filter === type
                ? "bg-primary text-white border-primary"
                : "bg-canvas border-border-subtle hover:border-primary/50"
            }`}
          >
            {type === "all" ? "ALL" : typeLabels[type] || type}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto space-y-1">
        {filteredEvents.map((event) => {
          const colors = typeColors[event.type] || typeColors.network;
          const isExpanded = expandedId === event.id;

          return (
            <button
              type="button"
              key={event.id}
              className={`text-left w-full flex items-start gap-3 p-3 border-l-4 ${colors.border} ${colors.bg} cursor-pointer hover:opacity-90 transition-opacity outline-none focus-visible:ring-2 focus-visible:ring-primary/50`}
              onClick={() => setExpandedId(isExpanded ? null : event.id)}
            >
              {/* Time */}
              <div className="font-mono text-xs text-primary/60 whitespace-nowrap min-w-[70px]">
                {formatTime(event.timestamp)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-mono font-semibold px-1.5 py-0.5 ${colors.text} ${colors.bg} border ${colors.border}`}>
                    {typeLabels[event.type] || event.type}
                  </span>
                  {event.severity === "critical" && (
                    <span className="text-xs font-mono font-bold text-red-600">● CRITICAL</span>
                  )}
                </div>
                <p className="text-sm font-medium mt-1 text-primary">{event.title}</p>
                {isExpanded && (
                  <p className="text-xs text-primary/70 mt-1 font-mono">{event.description}</p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-3 pt-3 border-t border-border-subtle flex justify-between text-xs font-mono text-primary/60">
        <span>{filteredEvents.length} events</span>
        <span>{filteredEvents.filter((e) => e.severity === "critical").length} critical</span>
      </div>
    </div>
  );
}
