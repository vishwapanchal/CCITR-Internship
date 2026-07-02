"use client";

import { Outfit, JetBrains_Mono, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Shield, LogOut, User, Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import Footer from "@/components/Footer";

const outfit = Outfit({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const bricolage = Bricolage_Grotesque({
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
    const token = localStorage.getItem("apex_token");
    if (!token && pathname !== "/" && pathname !== "/login" && !pathname.startsWith("/legal")) {
      router.push("/");
    }
  }, [loadFromStorage, pathname, router]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const navLinks = [
    { href: "/", label: "Home" },
    ...(isAuthenticated
      ? [
          { href: "/upload", label: "Upload APK" },
          { href: "/dashboard", label: "Results" },
          { href: "/graph", label: "Threat Map" },
          { href: "/copilot", label: "AI Assistant" },
          { href: "/reports", label: "Reports" },
        ]
      : []),
  ];

  return (
    <html
      lang="en"
      className={`${outfit.variable} ${jetbrainsMono.variable} ${bricolage.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <title>APEX-X — Android Security Analysis</title>
        <meta name="description" content="Analyze Android apps for security vulnerabilities, malware, and privacy risks." />
      </head>
      <body className="min-h-full flex flex-col bg-canvas text-text font-sans">
        {/* Navigation */}
        {!isLoginPage && (
          <nav className="bg-white/80 backdrop-blur-md border-b border-border-subtle sticky top-0 z-50 flex items-center justify-between px-4 md:px-6 py-3 shadow-sm">
            <Link
              prefetch={false}
              href="/"
              className="flex items-center gap-2 font-display font-bold text-lg tracking-tight text-primary"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span>APEX-X</span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  prefetch={false}
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname === link.href
                      ? "bg-primary/10 text-primary"
                      : "text-text-muted hover:text-text hover:bg-surface"
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
                  <div className="flex items-center gap-1.5 text-xs font-medium text-text-muted bg-surface px-3 py-1.5 rounded-full">
                    <User className="w-3.5 h-3.5" />
                    {username}
                  </div>
                  <button
                    onClick={() => logout()}
                    className="text-text-muted hover:text-critical transition-colors p-1.5 rounded-lg hover:bg-red-50"
                    title="Sign out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <Link
                  prefetch={false}
                  href="/login"
                  className="text-sm font-medium bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Sign In
                </Link>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <button
              className="md:hidden p-2 text-text rounded-lg hover:bg-surface transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
              <div className="fixed inset-0 bg-white z-40 flex flex-col pt-16 px-4 overflow-y-auto md:hidden">
                <div className="flex flex-col gap-1 py-4">
                  {navLinks.map((link) => (
                    <Link
                      prefetch={false}
                      key={link.href}
                      href={link.href}
                      className={`px-4 py-3 rounded-xl text-base font-medium transition-colors ${
                        pathname === link.href
                          ? "bg-primary/10 text-primary"
                          : "text-text-muted hover:bg-surface"
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>

                <div className="border-t border-border-subtle pt-4 mt-2">
                  {isAuthenticated ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-text-muted bg-surface p-3 rounded-xl">
                        <User className="w-4 h-4" />
                        Signed in as {username}
                      </div>
                      <button
                        onClick={() => logout()}
                        className="flex items-center gap-2 text-sm font-medium text-critical bg-red-50 p-3 rounded-xl hover:bg-red-100 transition-colors w-full justify-center"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  ) : (
                    <Link
                      prefetch={false}
                      href="/login"
                      className="flex items-center justify-center text-sm font-medium bg-primary text-white p-3 rounded-xl hover:bg-primary/90 transition-colors"
                    >
                      Sign In
                    </Link>
                  )}
                </div>
              </div>
            )}
          </nav>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col relative">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
