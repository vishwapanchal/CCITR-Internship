"use client";

import { motion } from "framer-motion";
import { ShieldAlert, FileCode2, Key, Activity } from "lucide-react";

export default function MetadataPanel() {
  const metadata = [
    { label: "File Name", value: "com.whatsapp.update.apk", icon: FileCode2 },
    { label: "Package", value: "com.hidden.spyware.v2", icon: Activity },
    { label: "SHA-256", value: "8f4e9a0c2b5d...e3f1", icon: Key },
    { label: "Signature", value: "Untrusted (Debug)", icon: ShieldAlert, critical: true },
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
            <motion.div 
              key={idx}
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
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
