"use client";

import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import LenisProvider from "@/components/LenisProvider";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ShieldAlert, LogOut, User, Menu, X } from "lucide-react";
import CoPilot from "@/components/CoPilot";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import BackendStatus from "@/components/BackendStatus";

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
    // Simple client-side auth guard
    const token = localStorage.getItem("apex_token");
    if (!token && pathname !== "/" && pathname !== "/login") {
      router.push("/");
    }
  }, [loadFromStorage, pathname, router]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const navLinks = [
    { href: "/", label: "Home" },
    ...(isAuthenticated ? [
      { href: "/upload", label: "Upload" },
      { href: "/dashboard", label: "Dashboard" },
      { href: "/graph", label: "Graph Explorer" },
      { href: "/copilot", label: "Co-Pilot" },
      { href: "/reports", label: "Reports" },
    ] : [])
  ];

  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} ${spaceGrotesk.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-canvas text-forensic-blue font-sans">
        <LenisProvider>
          {/* Navigation */}
          {!isLoginPage && (
            <nav className="bg-panel border-b border-border-subtle sticky top-0 z-50 flex items-center justify-between px-4 md:px-6 py-4">
              <Link href="/" className="flex items-center space-x-2 font-display font-bold text-xl tracking-tight text-forensic-blue z-50">
                <ShieldAlert className="w-6 h-6 text-critical" />
                <span>APEX-X</span>
              </Link>
              
              {/* Desktop Nav */}
              <div className="hidden md:flex space-x-6 text-sm font-medium">
                {navLinks.map((link) => (
                  <Link 
                    key={link.href} 
                    href={link.href} 
                    className={`transition-colors hover:text-critical ${
                      pathname === link.href ? "text-critical font-semibold" : "text-forensic-blue/80"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              {/* Desktop Auth */}
              <div className="hidden md:flex items-center gap-4">
                {isAuthenticated ? (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs font-mono font-medium">
                      <User className="w-4 h-4 text-forensic-blue/50" />
                      {username?.toUpperCase()}
                    </div>
                    <button 
                      onClick={() => logout()}
                      className="text-forensic-blue/50 hover:text-critical transition-colors"
                      title="Logout"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <Link 
                    href="/login" 
                    className="text-xs font-mono font-semibold bg-canvas border border-border-subtle px-3 py-1.5 hover:bg-border-subtle/30 transition-colors"
                  >
                    LOGIN
                  </Link>
                )}
              </div>

              {/* Mobile Menu Toggle */}
              <button 
                className="md:hidden p-2 text-forensic-blue z-50 hover:bg-border-subtle/20 rounded transition-colors"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>

              {/* Mobile Full Screen Menu Overlay */}
              {isMobileMenuOpen && (
                <div className="fixed inset-0 bg-panel z-40 flex flex-col pt-20 px-6 overflow-y-auto animate-in slide-in-from-top-2 md:hidden">
                  <div className="flex flex-col gap-6 text-lg font-medium border-b border-border-subtle pb-6 mb-6">
                    {navLinks.map((link) => (
                      <Link 
                        key={link.href} 
                        href={link.href} 
                        className={`transition-colors hover:text-critical ${
                          pathname === link.href ? "text-critical font-semibold" : "text-forensic-blue/80"
                        }`}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                  
                  {/* Mobile Auth Status */}
                  <div>
                    {isAuthenticated ? (
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-2 text-sm font-mono font-medium bg-canvas border border-border-subtle p-3">
                          <User className="w-4 h-4 text-forensic-blue/50" />
                          Logged in as: {username?.toUpperCase()}
                        </div>
                        <button 
                          onClick={() => logout()}
                          className="flex items-center gap-2 text-sm font-semibold bg-red-500/10 text-critical border border-red-500/20 p-3 hover:bg-red-500/20 transition-colors w-full justify-center"
                        >
                          <LogOut className="w-4 h-4" />
                          LOGOUT
                        </button>
                      </div>
                    ) : (
                      <Link 
                        href="/login" 
                        className="flex items-center justify-center text-sm font-mono font-semibold bg-canvas border border-border-subtle p-3 hover:bg-border-subtle/30 transition-colors"
                      >
                        LOGIN
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </nav>
          )}

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col relative">
            {children}
          </div>
          
          {/* Floating CoPilot (only show if logged in and not on full copilot page) */}
          {isAuthenticated && pathname !== "/copilot" && !isLoginPage && <CoPilot />}
          
          <BackendStatus />
        </LenisProvider>
      </body>
    </html>
  );
}
