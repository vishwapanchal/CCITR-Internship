import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import LenisProvider from "@/components/LenisProvider";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import CoPilot from "@/components/CoPilot";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "APEX-X Platform",
  description: "Agentic APK Profiling, Exploitation Intelligence & Threat Attribution",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-canvas text-forensic-blue font-sans">
        <LenisProvider>
          {/* Simple Global Navigation */}
          <nav className="bg-panel border-b border-border-subtle sticky top-0 z-50 flex items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center space-x-2 font-display font-bold text-xl tracking-tight text-forensic-blue">
              <ShieldAlert className="w-6 h-6 text-critical" />
              <span>APEX-X</span>
            </Link>
            <div className="flex space-x-6 text-sm font-medium">
              <Link href="/" className="hover:text-critical transition-colors">Upload</Link>
              <Link href="/dashboard" className="hover:text-critical transition-colors">Dashboard</Link>
              <Link href="/graph" className="hover:text-critical transition-colors">Graph</Link>
              <Link href="/reports" className="hover:text-critical transition-colors">Reports</Link>
            </div>
          </nav>
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col">
            {children}
          </div>
          <CoPilot />
        </LenisProvider>
      </body>
    </html>
  );
}
