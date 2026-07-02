"use client";

import Link from "next/link";
import { Shield, Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-border-subtle py-8 md:py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 md:px-6 flex flex-col md:flex-row justify-between items-center md:items-start gap-8">
        
        <div className="flex flex-col items-center md:items-start max-w-sm text-center md:text-left">
          <Link href="/" className="flex items-center gap-2 font-display font-bold text-lg text-slate-800 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-sky-500 rounded-lg flex items-center justify-center shadow-sm">
              <Shield className="w-4 h-4 text-white" />
            </div>
            APEX-X
          </Link>
          <p className="text-sm text-slate-500 leading-relaxed">
            Professional Android Security & Malware Forensics. Built for CMP311 — Professional Project Prototyping.
          </p>
        </div>

        <div className="flex gap-12 text-center md:text-left">
          <div className="flex flex-col gap-3">
            <h4 className="font-semibold text-slate-800 text-sm">Product</h4>
            <Link href="/upload" className="text-sm text-slate-500 hover:text-indigo-600 transition-colors">Scan APK</Link>
            <Link href="/dashboard" className="text-sm text-slate-500 hover:text-indigo-600 transition-colors">Results</Link>
            <Link href="/reports" className="text-sm text-slate-500 hover:text-indigo-600 transition-colors">Reports</Link>
          </div>
          
          <div className="flex flex-col gap-3">
            <h4 className="font-semibold text-slate-800 text-sm">Legal</h4>
            <Link href="/legal/privacy" className="text-sm text-slate-500 hover:text-indigo-600 transition-colors">Privacy</Link>
            <Link href="/legal/terms" className="text-sm text-slate-500 hover:text-indigo-600 transition-colors">Terms</Link>
            <Link href="/legal/compliance" className="text-sm text-slate-500 hover:text-indigo-600 transition-colors">Compliance</Link>
          </div>
        </div>

      </div>
      
      <div className="max-w-7xl mx-auto px-4 md:px-6 mt-12 pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-xs text-slate-400">
          &copy; {new Date().getFullYear()} APEX-X. All rights reserved. Not for commercial use.
        </p>
        <div className="flex items-center gap-4 text-slate-400">
          <a href="#" className="hover:text-indigo-500 transition-colors"><Mail className="w-4 h-4" /></a>
        </div>
      </div>
    </footer>
  );
}
