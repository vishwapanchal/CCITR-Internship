"use client";

import "./globals.css";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Shield, LogOut, User, Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import Lenis from 'lenis';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, username, loadFromStorage, logout } = useAuth();
  const isLoginPage = pathname === "/login";
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    loadFromStorage();
    const token = localStorage.getItem("apex_token");
    if (!token && pathname !== "/" && pathname !== "/login" && !pathname.startsWith("/legal")) {
      router.push("/");
    }
  }, [loadFromStorage, pathname, router]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

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

  const isLandingPage = pathname === "/";

  const navLinks = [
    ...(isLandingPage ? [] : [{ href: "/", label: "Home" }]),
    ...(isAuthenticated
      ? [
          { href: "/upload", label: "Upload APK" },
          { href: "/dashboard", label: "Results" },
          { href: "/graph", label: "Threat Map" },
          { href: "/copilot", label: "AI Assistant" },
          { href: "/documents", label: "Reports" },
        ]
      : []),
  ];

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
        {!isLoginPage && (
          <div className="fixed top-0 left-0 w-full z-50 flex justify-center px-4 pt-4 pb-2 pointer-events-none">
            <nav className="w-full max-w-5xl bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.08)] rounded-full px-5 py-2.5 flex items-center justify-between pointer-events-auto transition-all relative">
              <Link
                prefetch={false}
                href="/"
                className="flex items-center gap-2 font-display font-bold text-lg tracking-tight text-slate-800 hover:scale-105 transition-transform"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-sky-500 rounded-lg flex items-center justify-center shadow-sm">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <span>APEX-X</span>
              </Link>

              {/* Desktop Nav */}
              <div className="hidden md:flex items-center gap-2">
                {navLinks.map((link) => (
                  <Link
                    prefetch={false}
                    key={link.href}
                    href={link.href}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                      pathname === link.href
                        ? "bg-slate-800 text-white shadow-md hover:shadow-lg hover:scale-105"
                        : "text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/80 hover:scale-105"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              {/* Desktop Auth */}
              <div className="hidden md:flex items-center gap-3">
                {isAuthenticated ? (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-full">
                      <User className="w-3.5 h-3.5" />
                      {username}
                    </div>
                    <button
                      onClick={() => logout()}
                      className="text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors p-2 rounded-full"
                      title="Sign out"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <Link
                    prefetch={false}
                    href="/login"
                    className="text-sm font-semibold bg-gradient-to-r from-indigo-500 to-sky-500 text-white px-5 py-2 rounded-full hover:shadow-lg hover:shadow-indigo-500/30 transition-all hover:scale-105"
                  >
                    Sign In
                  </Link>
                )}
              </div>

              {/* Mobile Menu Toggle */}
              <button
                className="md:hidden p-2 text-slate-500 rounded-full hover:bg-slate-100 transition-colors"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>

              {/* Mobile Menu Floating Dropdown */}
              {isMobileMenuOpen && (
                <div className="absolute top-full left-0 right-0 mt-4 bg-white/90 backdrop-blur-2xl border border-white shadow-2xl rounded-3xl p-4 flex flex-col md:hidden animate-in fade-in slide-in-from-top-4 duration-200">
                  <div className="flex flex-col gap-1 pb-4">
                    {navLinks.map((link) => (
                      <Link
                        prefetch={false}
                        key={link.href}
                        href={link.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`px-5 py-3.5 rounded-2xl text-base font-semibold transition-all ${
                          pathname === link.href
                            ? "bg-indigo-50 text-indigo-600"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>

                  <div className="border-t border-slate-100 pt-4 mt-2">
                    {isAuthenticated ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-center gap-2 text-sm font-medium text-slate-500 bg-slate-50 p-3 rounded-2xl">
                          <User className="w-4 h-4" />
                          Signed in as {username}
                        </div>
                        <button
                          onClick={() => {
                            logout();
                            setIsMobileMenuOpen(false);
                          }}
                          className="flex items-center justify-center gap-2 text-sm font-semibold text-white bg-red-500 p-3 rounded-2xl hover:bg-red-600 transition-colors w-full shadow-sm hover:shadow-md"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    ) : (
                      <Link
                        prefetch={false}
                        href="/login"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center justify-center text-sm font-semibold bg-indigo-600 text-white p-3 rounded-2xl hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg w-full"
                      >
                        Sign In
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </nav>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col relative pt-20">{children}</div>
      </body>
    </html>
  );
}
