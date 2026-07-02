"use client";

import Link from "next/link";
import { ArrowRight, Shield, Activity, Network, Search, FileText, Sparkles, Lock, BarChart3 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { motion, Variants } from "framer-motion";

export default function LandingPage() {
  const { isAuthenticated } = useAuth();

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.12 },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 80, damping: 15 } },
  };

  return (
    <main className="flex-1 flex flex-col min-h-0 bg-canvas">
      {/* Hero Section */}
      <section className="flex-1 flex flex-col justify-center items-center px-4 py-16 md:py-24 max-w-5xl mx-auto w-full text-center">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="flex flex-col items-center"
        >
          {/* Badge */}
          <motion.div variants={itemVariants} className="mb-6">
            <span className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-medium px-4 py-1.5 rounded-full">
              <Sparkles className="w-3.5 h-3.5" />
              Built for CMP311 — Professional Project Prototyping
            </span>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="font-display text-4xl md:text-6xl font-extrabold text-text tracking-tight mb-4 leading-tight"
          >
            Understand your Android app&apos;s
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"> security </span>
            in minutes
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-base md:text-lg text-text-muted max-w-2xl mb-10 leading-relaxed"
          >
            Upload any APK file and get a clear, easy-to-read security report. 
            We check for vulnerabilities, risky permissions, hidden network connections, and more — all automatically.
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
          >
            <Link
              prefetch={false}
              href={isAuthenticated ? "/upload" : "/login"}
              className="group flex items-center justify-center gap-2 bg-primary text-white px-8 py-3.5 font-semibold text-base hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 hover:shadow-xl rounded-xl w-full sm:w-auto"
            >
              Start Analyzing
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              prefetch={false}
              href={isAuthenticated ? "/dashboard" : "/login"}
              className="flex items-center justify-center gap-2 bg-white border border-border-subtle text-text px-8 py-3.5 font-semibold text-base hover:bg-surface transition-all rounded-xl w-full sm:w-auto"
            >
              View Sample Results
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="bg-white border-t border-border-subtle py-16 md:py-20 px-4 md:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-text mb-3">
              How it works
            </h2>
            <p className="text-text-muted max-w-lg mx-auto">
              Three simple steps to understand your app&apos;s security posture.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                icon: Search,
                title: "Upload & Scan",
                desc: "Drop your APK file and our engine will decompile it, check permissions, and scan for known threats.",
                color: "from-primary to-primary-light",
              },
              {
                icon: BarChart3,
                title: "Get Clear Results",
                desc: "See a simple risk score, a list of issues found, and plain-English explanations of what they mean.",
                color: "from-accent to-cyan-400",
              },
              {
                icon: FileText,
                title: "Download Reports",
                desc: "Export professional PDF reports with all findings, risk scores, and recommended fixes.",
                color: "from-success to-emerald-400",
              },
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: idx * 0.1 }}
                className="bg-canvas rounded-2xl p-6 border border-border-subtle hover:border-primary/30 hover:shadow-lg transition-all duration-300 group"
              >
                <div
                  className={`w-12 h-12 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                >
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-text-muted text-sm leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="bg-canvas py-10 px-4 border-t border-border-subtle">
        <div className="max-w-5xl mx-auto flex flex-wrap justify-center gap-6 md:gap-12 text-text-muted text-sm">
          {[
            { icon: Shield, text: "OWASP Top 10 Checks" },
            { icon: Lock, text: "No Data Stored" },
            { icon: Activity, text: "Real-time Analysis" },
            { icon: Network, text: "Threat Mapping" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <item.icon className="w-4 h-4 text-primary" />
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
