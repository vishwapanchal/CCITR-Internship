"use client";

import { motion } from "framer-motion";
import HeroGauge from "@/components/HeroGauge";
import MetadataPanel from "@/components/MetadataPanel";
import VulnerabilityRadar from "@/components/VulnerabilityRadar";
import RecentAlerts from "@/components/RecentAlerts";
import { ActivitySquare, CheckCircle2 } from "lucide-react";

export default function Dashboard() {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } },
  };

  return (
    <main className="min-h-screen p-8 md:p-12 lg:p-16 max-w-7xl mx-auto w-full">
      <header className="mb-10 flex items-center justify-between border-b border-border-subtle pb-6">
        <div>
          <h1 className="text-3xl font-display font-bold uppercase tracking-wide text-forensic-blue flex items-center">
            <ActivitySquare className="mr-3 w-8 h-8 text-critical" />
            APEX-X <span className="font-light ml-2">Command Center</span>
          </h1>
          <p className="font-mono text-sm text-forensic-blue/60 mt-2 flex items-center">
            <CheckCircle2 className="w-4 h-4 mr-2 text-success" />
            Static extraction complete. Sandbox monitoring active.
          </p>
        </div>
        <div className="text-right">
          <div className="font-mono text-xs text-forensic-blue/50 mb-1">CASE ID</div>
          <div className="font-mono font-semibold tracking-wider bg-canvas px-3 py-1 border border-border-subtle">
            CID-2026-X89
          </div>
        </div>
      </header>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[240px]"
      >
        {/* Top Left: Hero Gauge */}
        <motion.div
          variants={itemVariants}
          className="col-span-1 bg-panel border border-border-subtle p-6 flex flex-col justify-center items-center shadow-sm"
        >
          <HeroGauge score={87} />
        </motion.div>

        {/* Top Right: Metadata (Takes up 2 columns) */}
        <motion.div
          variants={itemVariants}
          className="col-span-1 md:col-span-2 bg-panel border border-border-subtle p-6 shadow-sm"
        >
          <MetadataPanel />
        </motion.div>

        {/* Middle Left: Radar Chart */}
        <motion.div
          variants={itemVariants}
          className="col-span-1 bg-panel border border-border-subtle p-6 shadow-sm"
        >
          <VulnerabilityRadar />
        </motion.div>

        {/* Middle Right: Live Alerts (Takes up 2 columns) */}
        <motion.div
          variants={itemVariants}
          className="col-span-1 md:col-span-2 bg-panel border border-border-subtle p-6 shadow-sm"
        >
          <RecentAlerts />
        </motion.div>
        
        {/* Bottom Full Row: Placeholder for Timeline/Graph */}
        <motion.div
          variants={itemVariants}
          className="col-span-1 md:col-span-3 bg-panel border border-border-subtle p-6 shadow-sm flex items-center justify-center min-h-[300px]"
        >
          <div className="text-center">
            <h3 className="font-display text-xl font-semibold mb-2">Behavioral Timeline & C2 Graph</h3>
            <p className="text-sm font-mono text-forensic-blue/60">Scroll down to view detailed forensic execution traces...</p>
          </div>
        </motion.div>
      </motion.div>
    </main>
  );
}
