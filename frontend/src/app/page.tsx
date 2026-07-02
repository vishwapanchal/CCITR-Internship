"use client";

import Link from "next/link";
import { ArrowRight, Shield, Search, FileText, Sparkles, UploadCloud, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { motion, Variants } from "framer-motion";

export default function LandingPage() {
  const { isAuthenticated } = useAuth();

  const bentoVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 80, damping: 20 } },
  };

  return (
    <main className="flex-1 flex flex-col min-h-[calc(100vh-80px)] bg-[#f4f7f9] relative overflow-hidden p-4 md:p-8">
      
      {/* Soft Ambient Background Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-300/30 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-sky-300/30 blur-[100px] pointer-events-none" />
      <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full bg-teal-200/30 blur-[100px] pointer-events-none" />

      {/* Bento Grid Container */}
      <motion.div 
        className="max-w-6xl w-full mx-auto grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 relative z-10 flex-1 my-auto"
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.1 } } }}
      >
        
        {/* Bento Box 1: Hero Text (Spans 2 cols, 2 rows) */}
        <motion.div variants={bentoVariants} className="col-span-1 md:col-span-2 lg:col-span-2 md:row-span-2 bg-white/60 backdrop-blur-xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] p-8 md:p-12 flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="mb-6 z-10">
            <span className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 border border-indigo-100 font-script text-lg px-4 py-1.5 rounded-full shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              Built for CMP311
            </span>
          </div>
          <h1 className="font-pixel text-4xl md:text-5xl lg:text-6xl text-slate-800 tracking-tight mb-4 leading-[1.1] z-10">
            Android Security.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-sky-500">Demystified.</span>
          </h1>
          <p className="text-slate-500 text-base md:text-lg mb-8 max-w-md leading-relaxed z-10 font-medium">
            Upload your APK and receive a comprehensive, easy-to-read security report in minutes. No complex setup required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 z-10">
            <Link
              href={isAuthenticated ? "/upload" : "/login"}
              className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-8 py-3.5 font-semibold text-sm hover:bg-indigo-700 transition-all shadow-md hover:shadow-indigo-500/20 rounded-xl"
            >
              Start Scan
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href={isAuthenticated ? "/dashboard" : "/login"}
              className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 px-8 py-3.5 font-semibold text-sm hover:bg-slate-50 transition-all rounded-xl shadow-sm"
            >
              Sample Report
            </Link>
          </div>
        </motion.div>

        {/* Bento Box 2: Quick Upload Feature */}
        <motion.div variants={bentoVariants} className="col-span-1 lg:col-span-1 bg-white/60 backdrop-blur-xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] p-6 flex flex-col items-center justify-center text-center group hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4 text-indigo-500 group-hover:scale-110 transition-transform duration-300">
            <UploadCloud className="w-8 h-8" />
          </div>
          <h3 className="font-display font-bold text-slate-800 text-lg mb-2">1. Upload APK</h3>
          <p className="text-slate-500 text-sm font-medium">Drop your file. We decompile and prep it instantly.</p>
        </motion.div>

        {/* Bento Box 3: Automated Scanning Feature */}
        <motion.div variants={bentoVariants} className="col-span-1 lg:col-span-1 bg-white/60 backdrop-blur-xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] p-6 flex flex-col items-center justify-center text-center group hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
          <div className="w-16 h-16 bg-sky-50 rounded-2xl flex items-center justify-center mb-4 text-sky-500 group-hover:scale-110 transition-transform duration-300">
            <Search className="w-8 h-8" />
          </div>
          <h3 className="font-display font-bold text-slate-800 text-lg mb-2">2. Deep Scan</h3>
          <p className="text-slate-500 text-sm font-medium">Detecting OWASP Top 10 vulnerabilities & malware.</p>
        </motion.div>

        {/* Bento Box 4: Report Generation Feature */}
        <motion.div variants={bentoVariants} className="col-span-1 md:col-span-2 lg:col-span-1 bg-white/60 backdrop-blur-xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] p-6 flex flex-col items-center justify-center text-center group hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
          <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mb-4 text-teal-500 group-hover:scale-110 transition-transform duration-300">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="font-display font-bold text-slate-800 text-lg mb-2">3. Get Report</h3>
          <p className="text-slate-500 text-sm font-medium">Download a beautiful, court-admissible PDF report.</p>
        </motion.div>

        {/* Bento Box 5: Trust/Score Display (Dark Contrast) */}
        <motion.div variants={bentoVariants} className="col-span-1 md:col-span-1 lg:col-span-1 bg-slate-800 rounded-[2rem] p-6 flex flex-col justify-between text-white shadow-xl relative overflow-hidden group hover:shadow-2xl transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-2xl rounded-full" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-teal-500/20 blur-2xl rounded-full" />
          
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-6">
              <Shield className="w-5 h-5 text-indigo-400" />
              <span className="font-mono text-xs font-bold tracking-widest text-indigo-300 uppercase">Enterprise Grade</span>
            </div>
            
            <div className="space-y-4 mt-auto">
              {[
                "Static Analysis (SAST)",
                "Dynamic Tracking",
                "Sec 65B Compliance",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-teal-400" />
                  <span className="font-medium text-sm text-slate-200">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

      </motion.div>
    </main>
  );
}
