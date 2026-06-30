"use client";

import { motion } from "framer-motion";
import { UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function IntakePage() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    startScan();
  };

  const startScan = () => {
    setIsScanning(true);
    // Simulate scan delay before routing to dashboard
    setTimeout(() => {
      router.push("/dashboard");
    }, 1500);
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-8 w-full max-w-4xl mx-auto">
      
      <div className="text-center mb-8">
        <h1 className="font-display text-3xl font-bold text-forensic-blue mb-2">New Investigation</h1>
        <p className="text-forensic-blue/70">Upload a suspicious APK for full-spectrum analysis.</p>
      </div>

      <motion.div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={startScan}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`w-full max-w-2xl h-80 border-2 border-dashed flex flex-col items-center justify-center p-10 cursor-pointer transition-colors ${
          isDragging ? "border-critical bg-critical/5" : "border-border-subtle bg-panel hover:border-forensic-blue/50"
        }`}
      >
        {isScanning ? (
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin w-10 h-10 border-4 border-forensic-blue border-t-transparent rounded-full" />
            <p className="font-mono text-sm text-forensic-blue font-semibold tracking-wider">
              EXTRACTING MANIFEST...
            </p>
          </div>
        ) : (
          <>
            <UploadCloud className={`w-16 h-16 mb-4 ${isDragging ? "text-critical" : "text-forensic-blue/40"}`} />
            <h2 className="font-semibold text-lg text-forensic-blue mb-1">
              Drag & Drop APK File
            </h2>
            <p className="text-sm text-forensic-blue/60 mb-6">
              or click to browse local files
            </p>
            <div className="bg-forensic-blue text-white px-6 py-2 font-medium text-sm">
              Select File
            </div>
          </>
        )}
      </motion.div>
      
    </main>
  );
}
