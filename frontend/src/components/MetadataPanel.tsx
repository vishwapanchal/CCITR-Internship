"use client";

import { m } from "framer-motion";
import { ShieldAlert, FileCode2, Key, Activity, Clock, Cpu, Code2 } from "lucide-react";

interface MetadataPanelProps {
  caseData?: {
    apk_name?: string;
    package_name?: string;
    apk_hash?: string;
    status?: string;
    analysis_time?: string;
    engine_version?: string;
    decompiler?: string;
  };
}

export default function MetadataPanel({ caseData }: MetadataPanelProps) {
  const metadata = [
    { label: "Status", value: caseData?.status ? caseData.status.charAt(0).toUpperCase() + caseData.status.slice(1) : "N/A", icon: ShieldAlert, critical: caseData?.status === "failed" },
    { label: "Analysis Time", value: caseData?.analysis_time || "N/A", icon: Clock },
    { label: "Engine Version", value: caseData?.engine_version || "APEX-X v2.1", icon: Cpu },
    { label: "Decompiler", value: caseData?.decompiler || "Androguard", icon: Code2 },
  ];

  return (
    <div className="flex flex-col justify-center h-full space-y-4">
      <h3 className="font-display text-lg font-semibold border-b border-border-subtle pb-2 mb-2">
        Execution Metadata
      </h3>
      <div className="space-y-3">
        {metadata.map((item, idx) => {
          const Icon = item.icon;
          return (
            <m.div 
              key={item.label}
              className="flex items-center justify-between group"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + idx * 0.1 }}
            >
              <div className="flex items-center space-x-2">
                <Icon className={`w-4 h-4 ${item.critical ? 'text-critical' : 'text-primary/60'}`} />
                <span className="text-sm font-medium">{item.label}</span>
              </div>
              <span className={`font-mono text-sm tracking-tight bg-canvas px-2 py-0.5 border border-border-subtle group-hover:border-primary/30 transition-colors ${item.critical ? 'text-critical font-semibold' : 'text-primary/80'}`}>
                {item.value}
              </span>
            </m.div>
          );
        })}
      </div>
    </div>
  );
}
