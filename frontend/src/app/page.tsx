"use client";

import Link from "next/link";
import { ArrowRight, Shield, Activity, Network } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

const ACTION_WORDS = ["Threats.", "Malware.", "Campaigns.", "Spyware."];

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % ACTION_WORDS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 70, damping: 15 } },
  };

  return (
    <main className="flex-1 flex flex-col min-h-0 bg-canvas relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-400/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-forensic-blue/5 rounded-full blur-[120px]"></div>
      </div>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 lg:px-20 max-w-[1400px] mx-auto w-full relative z-10 min-h-[calc(100vh-80px)] text-center">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="flex flex-col items-center justify-center w-full"
        >
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 mb-8 px-4 py-1.5 bg-canvas border border-border-subtle text-forensic-blue/80 text-xs font-mono font-bold tracking-widest uppercase rounded-full shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
            </span>
            Agentic AI Engine v2.0
          </motion.div>
          
          <motion.h1 variants={itemVariants} className="font-display text-5xl md:text-7xl lg:text-[8rem] font-extrabold text-forensic-blue mb-8 tracking-tighter leading-[1.1] flex flex-col items-center">
            <span>Deconstruct</span>
            <span className="relative inline-block h-[1.1em] w-[300px] md:w-[500px] lg:w-[650px] overflow-hidden mt-1">
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={wordIndex}
                  initial={{ y: 80, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -80, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 100, damping: 20 }}
                  className="absolute inset-x-0 text-transparent bg-clip-text bg-gradient-to-r from-forensic-blue via-blue-600 to-blue-400"
                >
                  {ACTION_WORDS[wordIndex]}
                </motion.span>
              </AnimatePresence>
            </span>
          </motion.h1>
          
          <motion.p variants={itemVariants} className="text-base md:text-xl text-forensic-blue/70 max-w-2xl mb-12 leading-relaxed font-sans font-medium">
            An enterprise-grade forensic intelligence platform for isolating Android malware, mapping C2 infrastructure, and compiling Section 65B-compliant court evidence.
          </motion.p>
          
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center gap-6 w-full sm:w-auto">
            <Link 
              href={isAuthenticated ? "/upload" : "/login"} 
              className="group flex items-center justify-center gap-3 bg-forensic-blue text-white px-10 py-5 font-semibold text-lg hover:bg-forensic-blue/90 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5 rounded-sm w-full sm:w-auto"
            >
              Launch Investigation
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
            </Link>
            <Link 
              href={isAuthenticated ? "/dashboard" : "/login"} 
              className="flex items-center justify-center gap-3 bg-canvas border-2 border-border-subtle text-forensic-blue px-10 py-5 font-semibold text-lg hover:bg-border-subtle/40 transition-all rounded-sm w-full sm:w-auto"
            >
              Access Dashboard
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="bg-panel border-t border-border-subtle py-24 px-6 md:px-12 relative z-10">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: 0.1 }}
              className="flex flex-col items-center text-center group"
            >
              <div className="w-20 h-20 bg-canvas border border-border-subtle rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-sm">
                <Shield className="w-8 h-8 text-forensic-blue group-hover:text-blue-600 transition-colors" />
              </div>
              <h3 className="font-display font-semibold text-2xl mb-4 tracking-tight">Deep Analysis</h3>
              <p className="text-forensic-blue/70 leading-relaxed font-medium">
                Decompile DEX files and monitor runtime behavior in a sandboxed environment to catch evasion techniques.
              </p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: 0.2 }}
              className="flex flex-col items-center text-center group"
            >
              <div className="w-20 h-20 bg-canvas border border-border-subtle rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-sm">
                <Network className="w-8 h-8 text-forensic-blue group-hover:text-blue-600 transition-colors" />
              </div>
              <h3 className="font-display font-semibold text-2xl mb-4 tracking-tight">Threat Mapping</h3>
              <p className="text-forensic-blue/70 leading-relaxed font-medium">
                Visualize infrastructure using React Flow. Connect the dots between IPs, domains, and known threat campaigns.
              </p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: 0.3 }}
              className="flex flex-col items-center text-center group"
            >
              <div className="w-20 h-20 bg-canvas border border-border-subtle rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-sm">
                <Activity className="w-8 h-8 text-forensic-blue group-hover:text-blue-600 transition-colors" />
              </div>
              <h3 className="font-display font-semibold text-2xl mb-4 tracking-tight">Forensic Reporting</h3>
              <p className="text-forensic-blue/70 leading-relaxed font-medium">
                Generate multilingual PDF reports and Section 65B compliant evidence packages signed with HMAC algorithms.
              </p>
            </motion.div>
          </div>
        </div>
      </section>
    </main>
  );
}
