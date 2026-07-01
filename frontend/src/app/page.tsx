"use client";

import Link from "next/link";
import { ArrowRight, Shield, Activity, Network, TerminalSquare, Cpu, FileSearch } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const [typedText, setTypedText] = useState("");
  
  const fullText = "> APEX-X ENGINE INITIALIZED\n> SCANNING MEMORY DUMP...\n> [OK] 14 IOCS DETECTED\n> ISOLATING C2 COMMUNICATIONS...\n> EXTRACTING PAYLOAD...";

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setTypedText(fullText.slice(0, i));
      i++;
      if (i > fullText.length) clearInterval(interval);
    }, 40);
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
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 80, damping: 15 } },
  };

  return (
    <main className="flex-1 flex flex-col min-h-0 bg-canvas relative">
      {/* Subtle Grid Background */}
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'linear-gradient(#0a2540 1px, transparent 1px), linear-gradient(90deg, #0a2540 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
      </div>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col justify-center p-6 md:p-12 lg:px-20 max-w-[1600px] mx-auto w-full relative z-10 min-h-[calc(100vh-80px)]">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center"
        >
          {/* Left Column: Copy */}
          <div className="flex flex-col items-start text-left pt-10 lg:pt-0">
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 mb-6 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-mono font-bold tracking-widest uppercase rounded-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              v2.0 Active
            </motion.div>
            
            <motion.h1 variants={itemVariants} className="font-display text-5xl md:text-6xl lg:text-[5rem] font-extrabold text-forensic-blue mb-6 tracking-tighter leading-[1.05]">
              Deconstruct <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-forensic-blue via-blue-600 to-blue-400">
                Threats.
              </span>
            </motion.h1>
            
            <motion.p variants={itemVariants} className="text-base md:text-lg text-forensic-blue/70 max-w-xl mb-10 leading-relaxed font-medium">
              An enterprise-grade forensic intelligence platform for isolating Android malware, mapping C2 infrastructure, and automatically compiling Section 65B-compliant court evidence.
            </motion.p>
            
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
              <Link 
                href={isAuthenticated ? "/upload" : "/login"} 
                className="group flex items-center justify-center gap-2 bg-forensic-blue text-white px-8 py-4 font-semibold text-sm hover:bg-forensic-blue/90 transition-all shadow-md hover:shadow-lg rounded-sm"
              >
                Launch Investigation
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link 
                href={isAuthenticated ? "/dashboard" : "/login"} 
                className="flex items-center justify-center gap-2 bg-transparent border-2 border-forensic-blue/20 text-forensic-blue px-8 py-4 font-semibold text-sm hover:bg-forensic-blue/5 hover:border-forensic-blue/50 transition-all rounded-sm"
              >
                Access Dashboard
              </Link>
            </motion.div>
          </div>

          {/* Right Column: Abstract Forensic Graphic */}
          <motion.div variants={itemVariants} className="relative w-full h-[400px] lg:h-[500px] bg-panel border border-border-subtle shadow-2xl rounded-sm overflow-hidden flex flex-col group">
            {/* Mock Window Header */}
            <div className="h-10 bg-canvas border-b border-border-subtle flex items-center px-4 gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400/80"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-400/80"></div>
              <div className="w-3 h-3 rounded-full bg-green-400/80"></div>
              <div className="ml-4 flex items-center gap-2 opacity-50">
                <TerminalSquare className="w-4 h-4" />
                <span className="text-xs font-mono font-medium">apex_analyzer_tty1</span>
              </div>
            </div>
            {/* Terminal Body */}
            <div className="flex-1 bg-forensic-blue p-6 relative overflow-hidden">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-400 via-transparent to-transparent"></div>
              <pre className="font-mono text-sm text-green-400/90 whitespace-pre-wrap relative z-10">
                {typedText}
                <span className="animate-pulse">_</span>
              </pre>

              {/* Decorative nodes */}
              <div className="absolute bottom-6 right-6 flex items-end gap-4 opacity-50 group-hover:opacity-100 transition-opacity duration-500">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 rounded-full border border-blue-400/50 flex items-center justify-center">
                    <Cpu className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="w-px h-12 bg-blue-400/30"></div>
                </div>
                <div className="flex flex-col items-center gap-2 mb-8">
                  <div className="w-8 h-8 rounded-full border border-blue-400/50 flex items-center justify-center">
                    <FileSearch className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="w-px h-6 bg-blue-400/30"></div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="border-t border-border-subtle bg-panel py-20 px-6 md:px-12 relative z-10">
        <motion.div 
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
          className="max-w-[1600px] mx-auto"
        >
          <div className="mb-12">
            <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight">Core Capabilities</h2>
            <div className="w-12 h-1 bg-critical mt-4"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <motion.div variants={itemVariants} className="p-8 border border-border-subtle bg-canvas hover:border-forensic-blue/30 transition-colors group rounded-sm hover:shadow-lg hover:-translate-y-1 duration-300">
              <Shield className="w-8 h-8 text-forensic-blue mb-6 group-hover:text-blue-600 transition-colors" />
              <h3 className="font-display font-semibold text-xl mb-3 tracking-tight">Static & Dynamic Analysis</h3>
              <p className="text-sm text-forensic-blue/70 leading-relaxed font-medium">
                Decompile DEX files, analyze AndroidManifest permissions, and monitor behavioral events in a sandboxed environment to catch evasion techniques.
              </p>
            </motion.div>
            
            <motion.div variants={itemVariants} className="p-8 border border-border-subtle bg-canvas hover:border-forensic-blue/30 transition-colors group rounded-sm hover:shadow-lg hover:-translate-y-1 duration-300">
              <Network className="w-8 h-8 text-forensic-blue mb-6 group-hover:text-blue-600 transition-colors" />
              <h3 className="font-display font-semibold text-xl mb-3 tracking-tight">C2 Graph Explorer</h3>
              <p className="text-sm text-forensic-blue/70 leading-relaxed font-medium">
                Visualize threat infrastructure using React Flow. Connect the dots between IPs, domains, and known threat actor campaigns.
              </p>
            </motion.div>
            
            <motion.div variants={itemVariants} className="p-8 border border-border-subtle bg-canvas hover:border-forensic-blue/30 transition-colors group rounded-sm hover:shadow-lg hover:-translate-y-1 duration-300 lg:col-span-1 md:col-span-2">
              <Activity className="w-8 h-8 text-forensic-blue mb-6 group-hover:text-blue-600 transition-colors" />
              <h3 className="font-display font-semibold text-xl mb-3 tracking-tight">Forensic Reporting</h3>
              <p className="text-sm text-forensic-blue/70 leading-relaxed font-medium">
                Automatically generate multilingual PDF reports and Section 65B compliant evidence packages signed with HMAC algorithms.
              </p>
            </motion.div>
          </div>
        </motion.div>
      </section>
    </main>
  );
}
