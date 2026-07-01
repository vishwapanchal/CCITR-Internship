"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsOfService() {
  return (
    <main className="flex-1 flex flex-col p-6 md:p-12 lg:px-20 max-w-[1000px] mx-auto w-full pt-20">
      <Link prefetch={false} href="/" className="inline-flex items-center gap-2 text-forensic-blue/60 hover:text-forensic-blue mb-8 font-medium transition-colors w-fit">
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>
      
      <h1 className="font-display text-4xl md:text-5xl font-bold text-forensic-blue mb-6">Terms of Service</h1>
      <div className="w-12 h-1 bg-critical mb-10"></div>
      
      <div className="prose prose-blue max-w-none text-forensic-blue/80">
        <p className="lead text-lg mb-6">Last updated: {new Date().toLocaleDateString()}</p>
        
        <h2 className="font-display text-2xl font-semibold mt-10 mb-4">1. Acceptance of Terms</h2>
        <p className="mb-4">
          By accessing and utilizing the APEX-X platform, you represent that you are an authorized investigator, security researcher, or legal professional. Access requires a valid access token and adherence to all local cybersecurity and digital evidence laws.
        </p>

        <h2 className="font-display text-2xl font-semibold mt-10 mb-4">2. Permitted Use</h2>
        <p className="mb-4">
          APEX-X is provided strictly for defensive security research, malware analysis, and forensic intelligence gathering. You may not use this platform to weaponize exploits, coordinate attacks, or analyze proprietary software without explicit authorization from the software owner.
        </p>

        <h2 className="font-display text-2xl font-semibold mt-10 mb-4">3. Liability</h2>
        <p className="mb-4">
          While we strive for 100% accuracy in our C2 mapping and forensic artifact generation, APEX-X does not accept liability for actions taken based on our automated intelligence reports. It remains the responsibility of the investigator to manually verify IOCs (Indicators of Compromise) before court submission.
        </p>
      </div>
    </main>
  );
}
