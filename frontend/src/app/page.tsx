"use client";

import Link from "next/link";
import { ArrowRight, Shield, Activity, Network, Search, FileText } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useState, useEffect } from "react";
import CyberGlobe from "@/components/CyberGlobe";
import KarnatakaScribbles from "@/components/KarnatakaScribbles";

const ACTION_WORDS = ["Adversaries.", "Botnets.", "Ransomware.", "C2 Networks.", "Zero-Days."];

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

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 70, damping: 15 } },
  };

  return (
    <main className="flex-1 flex flex-col min-h-0 bg-canvas relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.15, 0.1] }} 
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} 
          className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-400/20 rounded-full blur-[120px]"
        ></motion.div>
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.05, 0.1, 0.05] }} 
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }} 
          className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-forensic-blue/10 rounded-full blur-[120px]"
        ></motion.div>
      </div>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 lg:px-20 max-w-[1400px] mx-auto w-full relative z-10 min-h-[calc(100vh-80px)] text-center overflow-hidden">
        
        {/* Karnataka Theme Scribbles */}
        <KarnatakaScribbles />
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="flex flex-col items-center justify-center w-full"
        >
          <motion.div variants={itemVariants} className="w-full flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 lg:gap-24 mb-10 relative z-20 px-4">
            
            {/* Left: Magnifying Glass Animation */}
            <motion.div 
              className="flex flex-col items-center text-forensic-blue/40 order-2 md:order-1"
              animate={{ y: [0, -15, 0], rotate: [-5, 5, -5] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="relative">
                <Search className="w-16 h-16 md:w-28 md:h-28 text-critical" strokeWidth={1.5} />
                <motion.div 
                  className="absolute inset-0 border-2 border-critical/50 rounded-full"
                  animate={{ scale: [1, 1.4, 1], opacity: [0.8, 0, 0.8] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>
              <span className="mt-4 font-mono text-[10px] md:text-xs tracking-widest font-bold uppercase text-critical">Deep Scan</span>
            </motion.div>

            {/* Center: Globe */}
            <div className="relative order-1 md:order-2">
              <CyberGlobe />
            </div>

            {/* Right: Report Animation */}
            <motion.div 
              className="flex flex-col items-center text-forensic-blue/40 order-3 md:order-3"
              animate={{ y: [0, 15, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            >
              <div className="relative bg-canvas/80 backdrop-blur-sm border-2 border-border-subtle p-4 md:p-6 rounded-2xl shadow-xl overflow-hidden">
                <FileText className="w-12 h-12 md:w-20 md:h-20 text-forensic-blue" strokeWidth={1.5} />
                {/* Scan line */}
                <motion.div 
                  className="absolute left-0 right-0 h-1 bg-emerald-400 shadow-[0_0_12px_#34d399]"
                  animate={{ top: ["10%", "90%", "10%"] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                />
              </div>
              <span className="mt-4 font-mono text-[10px] md:text-xs tracking-widest font-bold text-emerald-600 uppercase">Sec 65B Gen</span>
            </motion.div>

          </motion.div>
          
          <motion.h1 variants={itemVariants} className="font-display text-4xl md:text-6xl font-extrabold text-forensic-blue mb-6 tracking-tighter relative z-10">
            Global Threat Intelligence
          </motion.h1>
          
          <motion.p variants={itemVariants} className="text-base md:text-xl text-forensic-blue/70 max-w-2xl mb-12 leading-relaxed font-sans font-medium">
            An enterprise-grade forensic intelligence platform for isolating Android malware, mapping C2 infrastructure, and compiling Section 65B-compliant court evidence.
          </motion.p>
          
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center gap-6 w-full sm:w-auto">
            <Link prefetch={false} 
              href={isAuthenticated ? "/upload" : "/login"} 
              className="group flex items-center justify-center gap-3 bg-forensic-blue text-white px-10 py-5 font-semibold text-lg hover:bg-forensic-blue/90 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5 rounded-full w-full sm:w-auto"
            >
              Launch Investigation
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
            </Link>
            <Link prefetch={false} 
              href={isAuthenticated ? "/dashboard" : "/login"} 
              className="flex items-center justify-center gap-3 bg-canvas border-2 border-border-subtle text-forensic-blue px-10 py-5 font-semibold text-lg hover:bg-border-subtle/40 transition-all rounded-full w-full sm:w-auto"
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
