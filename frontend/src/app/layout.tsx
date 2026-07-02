"use client";

import "./globals.css";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Shield, LogOut, User, Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import Lenis from 'lenis';
import Header from "@/components/Header";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, username, loadFromStorage, logout } = useAuth();
  const isLoginPage = pathname === "/login";

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);



  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);



  return (
    <html
      lang="en"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <head>
        <title>APEX-X — Android Security Analysis</title>
        <meta name="description" content="Analyze Android apps for security vulnerabilities, malware, and privacy risks." />
      </head>
      <body className="min-h-full flex flex-col bg-canvas text-text font-sans">
        {/* Navigation */}
        <Header />

        {/* Main Content */}
        <div className="flex-1 flex flex-col relative pt-20">{children}</div>
      </body>
    </html>
  );
}
