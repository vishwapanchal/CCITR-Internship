"use client";

import { motion, Variants } from "framer-motion";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ActivitySquare, CheckCircle2, Search, Filter } from "lucide-react";
import CaseCard from "@/components/CaseCard";
import PhaseProgress from "@/components/PhaseProgress";
import { MOCK_ACTIVITY, MOCK_PHASE_STATUS_ANALYZING } from "@/services/mockData";
import { getCases, CaseResponse } from "@/services/api";

export default function Dashboard() {
  const router = useRouter();
  const [cases, setCases] = useState<CaseResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    getCases().then(({ data }) => {
      if (data) {
        setCases(data);
      }
      setIsLoading(false);
    });
  }, []);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } },
  };

  const stats = {
    total: cases.length,
    critical: cases.filter((c) => c.threat_score >= 75).length,
    analyzing: cases.filter((c) => c.status === "analyzing").length,
    completed: cases.filter((c) => c.status === "completed").length,
  };

  return (
    <main className="min-h-screen p-6 md:p-8 max-w-[1600px] mx-auto w-full flex flex-col gap-6">
      <header className="flex items-center justify-between border-b border-border-subtle pb-6">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-wide text-forensic-blue flex items-center">
            <ActivitySquare className="mr-3 w-8 h-8 text-critical" />
            INVESTIGATOR DASHBOARD
          </h1>
          <p className="font-mono text-sm text-forensic-blue/60 mt-2 flex items-center">
            <CheckCircle2 className="w-4 h-4 mr-2 text-success" />
            System nominal. {stats.analyzing} active analysis tasks.
          </p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => router.push("/")}
            className="bg-forensic-blue text-white px-6 py-2.5 font-medium text-sm hover:bg-forensic-blue/90 transition-colors"
          >
            + New Upload
          </button>
        </div>
      </header>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0"
      >
        {/* Left Column: Stats & Queue */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          {/* Quick Stats */}
          <motion.div variants={itemVariants} className="bg-panel border border-border-subtle p-4">
            <h3 className="font-display font-semibold text-sm mb-4 border-b border-border-subtle pb-2">
              Global Statistics
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-canvas p-3 border border-border-subtle">
                <span className="block text-2xl font-display font-bold">{stats.total}</span>
                <span className="text-xs font-mono text-forensic-blue/60 uppercase">Total Cases</span>
              </div>
              <div className="bg-red-50 p-3 border border-red-200">
                <span className="block text-2xl font-display font-bold text-red-700">{stats.critical}</span>
                <span className="text-xs font-mono text-red-600 uppercase">Critical</span>
              </div>
              <div className="bg-blue-50 p-3 border border-blue-200">
                <span className="block text-2xl font-display font-bold text-blue-700">{stats.analyzing}</span>
                <span className="text-xs font-mono text-blue-600 uppercase">Analyzing</span>
              </div>
              <div className="bg-green-50 p-3 border border-green-200">
                <span className="block text-2xl font-display font-bold text-green-700">{stats.completed}</span>
                <span className="text-xs font-mono text-green-600 uppercase">Completed</span>
              </div>
            </div>
          </motion.div>

          {/* Active Analysis Queue */}
          <motion.div variants={itemVariants} className="bg-panel border border-border-subtle p-4 flex-1">
            <h3 className="font-display font-semibold text-sm mb-4 border-b border-border-subtle pb-2">
              Active Analysis Queue
            </h3>
            {stats.analyzing > 0 ? (
              <div className="space-y-4">
                {cases.filter(c => c.status === "analyzing").map(caseItem => (
                  <div key={caseItem.id} className="border border-border-subtle p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-mono text-xs font-semibold">{caseItem.case_number}</span>
                    </div>
                    <p className="text-xs truncate mb-3">{caseItem.apk_name}</p>
                    <PhaseProgress phases={MOCK_PHASE_STATUS_ANALYZING} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <CheckCircle2 className="w-8 h-8 text-forensic-blue/20 mb-2" />
                <span className="text-sm text-forensic-blue/50">Queue is empty</span>
              </div>
            )}
          </motion.div>
        </div>

        {/* Middle Column: Case List */}
        <motion.div variants={itemVariants} className="lg:col-span-2 bg-panel border border-border-subtle p-4 flex flex-col">
          <div className="flex justify-between items-center mb-4 border-b border-border-subtle pb-2">
            <h3 className="font-display font-semibold text-sm">Case Inventory</h3>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-2.5 top-2 text-forensic-blue/40" />
                <input 
                  type="text" 
                  placeholder="Search cases..." 
                  className="bg-canvas border border-border-subtle pl-8 pr-3 py-1.5 text-xs font-mono focus:outline-none focus:border-forensic-blue/50"
                />
              </div>
              <button className="bg-canvas border border-border-subtle p-1.5 hover:bg-border-subtle/50 transition-colors">
                <Filter className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-3">
            {cases.map((caseData) => (
              <CaseCard key={caseData.id} caseData={caseData} />
            ))}
          </div>
        </motion.div>

        {/* Right Column: Activity Feed */}
        <motion.div variants={itemVariants} className="lg:col-span-1 bg-panel border border-border-subtle p-4 flex flex-col">
          <h3 className="font-display font-semibold text-sm mb-4 border-b border-border-subtle pb-2">
            Recent Activity
          </h3>
          <div className="flex-1 overflow-y-auto space-y-4">
            {MOCK_ACTIVITY.map((activity) => (
              <div key={activity.id} className="relative pl-4 border-l border-border-subtle">
                <div className="absolute w-2 h-2 bg-forensic-blue rounded-full -left-[4.5px] top-1" />
                <div className="mb-1">
                  <span className="text-xs font-mono text-forensic-blue/60 mr-2">
                    {new Date(activity.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                  <span className="text-xs font-semibold">{activity.user}</span>
                </div>
                <p className="text-xs font-mono mb-1">{activity.action.replace(/_/g, " ")}</p>
                <div className="bg-canvas border border-border-subtle p-2 text-xs">
                  <span className="font-mono font-semibold block mb-1">{activity.case_number}</span>
                  <span className="text-forensic-blue/80">{activity.details}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

      </motion.div>
    </main>
  );
}
