"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, User, Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { m, useScroll, useMotionValueEvent, AnimatePresence } from "framer-motion";
import AnimatedLogo from "./AnimatedLogo";

export default function Header() {
  const pathname = usePathname();
  const { isAuthenticated, username, logout } = useAuth();
  const isLoginPage = pathname === "/login";
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Scroll hide/show logic
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious();
    if (previous !== undefined && latest > previous && latest > 150) {
      setHidden(true);
    } else {
      setHidden(false);
    }
  });

  if (isLoginPage) return null;

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
    <m.div 
      variants={{
        visible: { y: 0, opacity: 1 },
        hidden: { y: "-100%", opacity: 0 }
      }}
      animate={hidden ? "hidden" : "visible"}
      transition={{ duration: 0.35, ease: "easeInOut" }}
      className="fixed top-0 left-0 w-full z-50 flex justify-center px-4 pt-4 pb-2 pointer-events-none"
    >
      <nav className="w-full max-w-5xl bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.08)] rounded-full px-5 py-2.5 flex items-center justify-between pointer-events-auto transition-all relative">
        <Link prefetch={false} href="/" className="pointer-events-auto">
          <AnimatedLogo />
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
                type="button"
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
          type="button"
          className="md:hidden p-2 text-slate-800 rounded-full hover:bg-slate-100 transition-colors z-[60]"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <m.div
            animate={{ rotate: isMobileMenuOpen ? 90 : 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 10 }}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </m.div>
        </button>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <m.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="absolute top-full left-0 right-0 mt-4 bg-white/95 backdrop-blur-3xl border border-white/50 shadow-2xl rounded-3xl p-6 flex flex-col md:hidden origin-top"
            >
              <div className="flex flex-col gap-2 pb-6">
                {navLinks.map((link, idx) => (
                  <m.div
                    key={link.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05, type: "spring", stiffness: 300 }}
                  >
                    <Link
                      prefetch={false}
                      href={link.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`block px-5 py-4 rounded-2xl text-lg font-display font-semibold transition-all ${
                        pathname === link.href
                          ? "bg-indigo-50 text-indigo-600 shadow-sm"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      {link.label}
                    </Link>
                  </m.div>
                ))}
              </div>

              <div className="border-t border-slate-100 pt-6">
                {isAuthenticated ? (
                  <m.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-center gap-2 text-sm font-medium text-slate-500 bg-slate-50 p-4 rounded-2xl">
                      <User className="w-4 h-4" />
                      Signed in as {username}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        setIsMobileMenuOpen(false);
                      }}
                      className="flex items-center justify-center gap-2 text-base font-semibold text-white bg-red-500 p-4 rounded-2xl hover:bg-red-600 transition-colors w-full shadow-sm hover:shadow-md"
                    >
                      <LogOut className="w-5 h-5" />
                      Sign Out
                    </button>
                  </m.div>
                ) : (
                  <m.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <Link
                      prefetch={false}
                      href="/login"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center justify-center text-base font-semibold bg-indigo-600 text-white p-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg w-full"
                    >
                      Sign In
                    </Link>
                  </m.div>
                )}
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </nav>
    </m.div>
  );
}
