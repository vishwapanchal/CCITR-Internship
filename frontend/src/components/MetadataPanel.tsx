"use client";

import { m } from "framer-motion";
import { ShieldAlert, FileCode2, Key, Activity } from "lucide-react";

interface MetadataPanelProps {
  caseData?: {
    apk_name?: string;
    package_name?: string;
    apk_hash?: string;
    status?: string;
  };
}

export default function MetadataPanel({ caseData }: MetadataPanelProps) {
  const metadata = [
    { label: "File Name", value: caseData?.apk_name || "N/A", icon: FileCode2 },
    { label: "Package", value: caseData?.package_name || "N/A", icon: Activity },
    { label: "SHA-256", value: caseData?.apk_hash ? `${caseData.apk_hash.slice(0, 14)}...${caseData.apk_hash.slice(-4)}` : "N/A", icon: Key },
    { label: "Status", value: caseData?.status?.toUpperCase() || "N/A", icon: ShieldAlert, critical: caseData?.status === "failed" },
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
