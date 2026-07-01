import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-panel border-t border-border-subtle py-12 px-6 md:px-12 mt-auto w-full">
      <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-center md:items-start gap-12 md:gap-8">
        <div className="flex flex-col items-center md:items-start gap-4 text-center md:text-left">
          <Link href="/" className="flex items-center space-x-2 font-display font-bold text-xl tracking-tight text-forensic-blue">
            <ShieldAlert className="w-6 h-6 text-critical" />
            <span>APEX-X</span>
          </Link>
          <p className="text-sm font-medium text-forensic-blue/60 max-w-sm">
            Enterprise-grade forensic intelligence for Android malware isolation and Section 65B court evidence compilation.
          </p>
        </div>
        
        <div className="flex flex-wrap justify-center md:justify-end gap-12 text-sm font-medium">
          <div className="flex flex-col gap-3">
            <h4 className="font-display font-semibold text-forensic-blue mb-2">Platform</h4>
            <Link href="/upload" className="text-forensic-blue/60 hover:text-forensic-blue transition-colors">Investigation</Link>
            <Link href="/dashboard" className="text-forensic-blue/60 hover:text-forensic-blue transition-colors">Dashboard</Link>
            <Link href="/graph" className="text-forensic-blue/60 hover:text-forensic-blue transition-colors">C2 Graph Explorer</Link>
          </div>
          
          <div className="flex flex-col gap-3">
            <h4 className="font-display font-semibold text-forensic-blue mb-2">Legal</h4>
            <Link href="#" className="text-forensic-blue/60 hover:text-forensic-blue transition-colors">Privacy Policy</Link>
            <Link href="#" className="text-forensic-blue/60 hover:text-forensic-blue transition-colors">Terms of Service</Link>
            <Link href="#" className="text-forensic-blue/60 hover:text-forensic-blue transition-colors">Section 65B Compliance</Link>
          </div>
        </div>
      </div>
      
      <div className="max-w-[1400px] mx-auto mt-12 pt-8 border-t border-border-subtle flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-mono text-forensic-blue/50">
        <p>© {new Date().getFullYear()} APEX-X Forensics. All rights reserved.</p>
        <div className="flex gap-4">
          <span>v2.0.1</span>
          <span>SYSTEM STATUS: ONLINE</span>
        </div>
      </div>
    </footer>
  );
}
