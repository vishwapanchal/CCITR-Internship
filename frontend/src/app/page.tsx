"use client";

import Link from "next/link";
import { ShieldAlert, ArrowRight, Shield, Activity, Network } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { motion, Variants } from "framer-motion";

export default function LandingPage() {
  const { isAuthenticated } = useAuth();

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15 },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 80, damping: 15 } },
  };

  return (
    <main className="flex-1 flex flex-col min-h-0 bg-canvas">
      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 max-w-5xl mx-auto w-full text-center overflow-hidden">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="flex flex-col items-center"
        >
          <motion.div variants={itemVariants} className="inline-flex items-center justify-center gap-2 mb-8 p-3 md:p-4 bg-panel border border-border-subtle rounded-full shadow-sm hover:shadow-md transition-shadow">
            <ShieldAlert className="w-6 h-6 md:w-8 md:h-8 text-critical" />
            <h1 className="font-display text-xl md:text-2xl font-bold text-forensic-blue tracking-wider">APEX-X</h1>
          </motion.div>
          
          <motion.h2 variants={itemVariants} className="font-display text-4xl md:text-6xl lg:text-7xl font-extrabold text-forensic-blue mb-6 tracking-tighter leading-[1.1]">
            Agentic APK Profiling &<br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-forensic-blue to-blue-500"> Threat Attribution</span>
          </motion.h2>
          
          <motion.p variants={itemVariants} className="text-base md:text-lg lg:text-xl text-forensic-blue/70 max-w-2xl mx-auto mb-10 leading-relaxed font-sans font-medium px-4 md:px-0">
            A powerful forensic intelligence platform for analyzing Android malware, identifying C2 infrastructure, and generating Section 65B compliant court evidence.
          </motion.p>
          
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto px-4 sm:px-0">
            <Link 
              href={isAuthenticated ? "/upload" : "/login"} 
              className="group flex items-center justify-center gap-2 bg-forensic-blue text-white px-8 py-4 font-semibold text-sm md:text-base hover:bg-forensic-blue/90 transition-all shadow-sm rounded-sm hover:shadow-md active:scale-[0.98]"
            >
              Start Investigation
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link 
              href={isAuthenticated ? "/dashboard" : "/login"} 
              className="flex items-center justify-center gap-2 bg-canvas border-2 border-border-subtle text-forensic-blue px-8 py-4 font-semibold text-sm md:text-base hover:bg-border-subtle/30 hover:border-forensic-blue/30 transition-all rounded-sm active:scale-[0.98]"
            >
              Go to Dashboard
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="border-t border-border-subtle bg-panel py-16 md:py-24 px-6 md:px-12 relative overflow-hidden">
        <motion.div 
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
          className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10"
        >
          <motion.div variants={itemVariants} className="p-8 border border-border-subtle bg-canvas hover:border-forensic-blue/30 transition-colors group rounded-sm shadow-sm hover:shadow-md">
            <Shield className="w-10 h-10 text-forensic-blue mb-6 group-hover:scale-110 transition-transform duration-300" />
            <h3 className="font-display font-semibold text-xl mb-3 tracking-tight">Static & Dynamic Analysis</h3>
            <p className="text-sm md:text-base text-forensic-blue/70 leading-relaxed font-medium">
              Decompile DEX files, analyze AndroidManifest permissions, and monitor behavioral events in a sandboxed environment to catch evasion techniques.
            </p>
          </motion.div>
          
          <motion.div variants={itemVariants} className="p-8 border border-border-subtle bg-canvas hover:border-forensic-blue/30 transition-colors group rounded-sm shadow-sm hover:shadow-md">
            <Network className="w-10 h-10 text-forensic-blue mb-6 group-hover:scale-110 transition-transform duration-300" />
            <h3 className="font-display font-semibold text-xl mb-3 tracking-tight">C2 Graph Explorer</h3>
            <p className="text-sm md:text-base text-forensic-blue/70 leading-relaxed font-medium">
              Visualize threat infrastructure using React Flow. Connect the dots between IPs, domains, and known threat actor campaigns.
            </p>
          </motion.div>
          
          <motion.div variants={itemVariants} className="p-8 border border-border-subtle bg-canvas hover:border-forensic-blue/30 transition-colors group rounded-sm shadow-sm hover:shadow-md">
            <Activity className="w-10 h-10 text-forensic-blue mb-6 group-hover:scale-110 transition-transform duration-300" />
            <h3 className="font-display font-semibold text-xl mb-3 tracking-tight">Forensic Reporting</h3>
            <p className="text-sm md:text-base text-forensic-blue/70 leading-relaxed font-medium">
              Automatically generate multilingual PDF reports and Section 65B compliant evidence packages signed with HMAC algorithms.
            </p>
          </motion.div>
        </motion.div>
      </section>
    </main>
  );
}
