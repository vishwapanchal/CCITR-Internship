"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <main className="flex-1 flex flex-col p-6 md:p-12 lg:px-20 max-w-[1000px] mx-auto w-full pt-20">
      <Link href="/" className="inline-flex items-center gap-2 text-forensic-blue/60 hover:text-forensic-blue mb-8 font-medium transition-colors w-fit">
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>
      
      <h1 className="font-display text-4xl md:text-5xl font-bold text-forensic-blue mb-6">Privacy Policy</h1>
      <div className="w-12 h-1 bg-critical mb-10"></div>
      
      <div className="prose prose-blue max-w-none text-forensic-blue/80">
        <p className="lead text-lg mb-6">Last updated: {new Date().toLocaleDateString()}</p>
        
        <h2 className="font-display text-2xl font-semibold mt-10 mb-4">1. Data Collection and Usage</h2>
        <p className="mb-4">
          APEX-X is designed for forensic analysis of Android applications. Any data, APKs, or memory dumps uploaded to our platform are processed in strictly isolated sandboxes. We collect only the information necessary to provide you with the threat analysis results and Section 65B compliant reporting.
        </p>

        <h2 className="font-display text-2xl font-semibold mt-10 mb-4">2. Retention and Deletion</h2>
        <p className="mb-4">
          Uploaded malware samples and generated reports are retained for the duration of your active investigation session. Once an investigation is closed, or after a period of 30 days of inactivity, all uploaded artifacts and decompiled code are securely purged from our servers to maintain operational security.
        </p>

        <h2 className="font-display text-2xl font-semibold mt-10 mb-4">3. Security Measures</h2>
        <p className="mb-4">
          Our platform utilizes enterprise-grade encryption for all data in transit (TLS 1.3) and at rest (AES-256). Cryptographic hashes (SHA-256) are generated immediately upon file upload to ensure chain of custody integrity for legal compliance.
        </p>
      </div>
    </main>
  );
}
