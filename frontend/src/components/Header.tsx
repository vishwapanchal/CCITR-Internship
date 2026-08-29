"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { m, useScroll, useMotionValueEvent, AnimatePresence } from "framer-motion";
import AnimatedLogo from "./AnimatedLogo";

const TYPEWRITER_PHRASES = ["Analyze APKs securely...", "Discover hidden vulnerabilities...", "Protect your users..."];

export default function Header() {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Typewriter effect state
  const phraseIndex = useRef(0);
  const charIndex = useRef(0);
  const isDeleting = useRef(false);
  const [text, setText] = useState("");

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const tick = () => {
      const currentPhrase = TYPEWRITER_PHRASES[phraseIndex.current];
      const typingSpeed = isDeleting.current ? 30 : 80;

      if (!isDeleting.current && charIndex.current === currentPhrase.length) {
        // Pause before deleting
        timeout = setTimeout(() => {
          isDeleting.current = true;
          tick();
        }, 2000);
      } else if (isDeleting.current && charIndex.current === 0) {
        // Move to next phrase
        isDeleting.current = false;
        phraseIndex.current = (phraseIndex.current + 1) % TYPEWRITER_PHRASES.length;
        timeout = setTimeout(tick, typingSpeed);
      } else {
        // Type or delete character
        charIndex.current = charIndex.current + (isDeleting.current ? -1 : 1);
        setText(currentPhrase.substring(0, charIndex.current));
        timeout = setTimeout(tick, typingSpeed);
      }
    };

    timeout = setTimeout(tick, 80);

    return () => clearTimeout(timeout);
  }, []);
  
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
    { href: "/upload", label: "Upload APK" },
    { href: "/dashboard", label: "Results" },
    { href: "/graph", label: "Threat Map" },
    { href: "/copilot", label: "AI Assistant" },
    { href: "/documents", label: "Reports" },
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

        {/* Desktop Nav / Typewriter */}
        <div className="hidden md:flex items-center gap-2">
          {!isAuthenticated && isLandingPage ? (
            <div className="px-6 py-2 font-mono text-sm text-primary/80 font-medium whitespace-nowrap min-w-[280px]">
              {text}
              <m.span
                animate={{ opacity: [1, 0] }}
                transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                className="inline-block w-1.5 h-4 ml-1 bg-primary align-middle"
              />
            </div>
          ) : (
            navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  prefetch={false}
                  key={link.href}
                  href={link.href}
                  className={`relative px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-300 ${
                    isActive ? "text-indigo-900" : "text-slate-500 hover:text-indigo-600"
                  }`}
                >
                  {isActive && (
                    <m.div
                      layoutId="nav-pill"
                      className="absolute inset-0 bg-indigo-50/80 rounded-full z-[-1] border border-indigo-100"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{link.label}</span>
                </Link>
              );
            })
          )}
        </div>

        {/* Spacer for alignment */}
        <div className="hidden md:block w-4" />

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

            </m.div>
          )}
        </AnimatePresence>
      </nav>
    </m.div>
  );
}
