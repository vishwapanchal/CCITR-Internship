"use client";

import Link from "next/link";
import { ShieldAlert, ArrowRight, Shield, Activity, Network } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="flex-1 flex flex-col min-h-0 bg-canvas">
      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center p-8 max-w-5xl mx-auto w-full text-center">
        <div className="inline-flex items-center justify-center gap-2 mb-6 p-4 bg-panel border border-border-subtle rounded-full shadow-sm">
          <ShieldAlert className="w-8 h-8 text-critical" />
          <h1 className="font-display text-2xl font-bold text-forensic-blue tracking-wider">APEX-X</h1>
        </div>
        
        <h2 className="font-display text-4xl md:text-6xl font-extrabold text-forensic-blue mb-6 tracking-tight">
          Agentic APK Profiling &<br />Threat Attribution
        </h2>
        
        <p className="text-lg md:text-xl text-forensic-blue/70 max-w-2xl mx-auto mb-10 leading-relaxed font-sans">
          A powerful forensic intelligence platform for analyzing Android malware, identifying C2 infrastructure, and generating Section 65B compliant court evidence.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link 
            href="/upload" 
            className="flex items-center gap-2 bg-forensic-blue text-white px-8 py-3.5 font-semibold hover:bg-forensic-blue/90 transition-colors shadow-sm"
          >
            Start Investigation
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link 
            href="/dashboard" 
            className="flex items-center gap-2 bg-canvas border border-border-subtle text-forensic-blue px-8 py-3.5 font-semibold hover:bg-border-subtle/30 transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t border-border-subtle bg-panel py-16 px-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 border border-border-subtle bg-canvas">
            <Shield className="w-10 h-10 text-forensic-blue mb-4" />
            <h3 className="font-display font-semibold text-lg mb-2">Static & Dynamic Analysis</h3>
            <p className="text-sm text-forensic-blue/70 leading-relaxed">
              Decompile DEX files, analyze AndroidManifest permissions, and monitor behavioral events in a sandboxed environment to catch evasion techniques.
            </p>
          </div>
          
          <div className="p-6 border border-border-subtle bg-canvas">
            <Network className="w-10 h-10 text-forensic-blue mb-4" />
            <h3 className="font-display font-semibold text-lg mb-2">C2 Graph Explorer</h3>
            <p className="text-sm text-forensic-blue/70 leading-relaxed">
              Visualize threat infrastructure using React Flow. Connect the dots between IPs, domains, and known threat actor campaigns.
            </p>
          </div>
          
          <div className="p-6 border border-border-subtle bg-canvas">
            <Activity className="w-10 h-10 text-forensic-blue mb-4" />
            <h3 className="font-display font-semibold text-lg mb-2">Forensic Reporting</h3>
            <p className="text-sm text-forensic-blue/70 leading-relaxed">
              Automatically generate multilingual PDF reports and Section 65B compliant evidence packages signed with HMAC algorithms.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
