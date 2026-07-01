"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function Compliance() {
  return (
    <main className="flex-1 flex flex-col p-6 md:p-12 lg:px-20 max-w-[1000px] mx-auto w-full pt-20">
      <Link href="/" className="inline-flex items-center gap-2 text-forensic-blue/60 hover:text-forensic-blue mb-8 font-medium transition-colors w-fit">
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>
      
      <h1 className="font-display text-4xl md:text-5xl font-bold text-forensic-blue mb-6">Section 65B Compliance</h1>
      <div className="w-12 h-1 bg-critical mb-10"></div>
      
      <div className="prose prose-blue max-w-none text-forensic-blue/80">
        <p className="lead text-lg mb-6">Admissibility of Electronic Records</p>
        
        <h2 className="font-display text-2xl font-semibold mt-10 mb-4">Evidentiary Standards</h2>
        <p className="mb-4">
          Under the provisions of Section 65B of the Indian Evidence Act, 1872 (and corresponding laws globally), electronic records must be accompanied by a certificate verifying the integrity and operational state of the computer system that generated them.
        </p>

        <h2 className="font-display text-2xl font-semibold mt-10 mb-4">How APEX-X Automates Compliance</h2>
        <p className="mb-4">
          APEX-X automatically appends a cryptographic hash (SHA-256 / MD5) to all generated PDF reports. The reports contain a verifiable timestamp, details of the processing engine, and a digital signature ensuring that the decompiled data has not been tampered with since extraction from the uploaded APK.
        </p>

        <h2 className="font-display text-2xl font-semibold mt-10 mb-4">Investigator Responsibilities</h2>
        <p className="mb-4">
          While our platform generates the technical artifacts required for a 65B certificate, the investigating officer or forensic analyst must digitally or physically sign the final affidavit affirming that they had lawful custody of the device during the memory dump or APK extraction.
        </p>
      </div>
    </main>
  );
}
