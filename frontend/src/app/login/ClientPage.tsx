"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const { login, signup, isLoading, error } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError("");

    if (!username || !password) {
      setLocalError("Email and password are required");
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setLocalError("Passwords don't match");
      return;
    }

    const success = isLogin 
      ? await login(username, password)
      : await signup(username, password);
      
    if (success) {
      router.push("/dashboard");
    }
  }



  return (
    <main className="flex-1 flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-start">
          <Link prefetch={false} href="/" className="flex items-center text-sm text-text-muted hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to home
          </Link>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <Link prefetch={false} href="/" className="inline-flex items-center justify-center gap-2 mb-4 hover:opacity-80 transition-opacity">
            <ShieldAlert className="w-10 h-10 text-critical" />
            <h1 className="font-display text-3xl font-bold text-primary">APEX-X</h1>
          </Link>
          <p className="text-sm text-text-muted">
            Android Security Analysis Platform
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-panel border border-border-subtle p-6 rounded-2xl shadow-xl">
          <div className="flex gap-4 mb-6 border-b border-border-subtle pb-2">
            <button 
              type="button"
              className={`font-display font-semibold text-lg pb-2 -mb-2.5 transition-colors ${isLogin ? "border-b-2 border-primary text-primary" : "text-primary/50"}`}
              onClick={() => { setIsLogin(true); setLocalError(""); }}
            >
              Sign In
            </button>
            <button 
              type="button"
              className={`font-display font-semibold text-lg pb-2 -mb-2.5 transition-colors ${!isLogin ? "border-b-2 border-primary text-primary" : "text-primary/50"}`}
              onClick={() => { setIsLogin(false); setLocalError(""); }}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm text-text-muted mb-1">Email</label>
              <input
                id="email"
                type="email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-canvas border border-border-subtle px-4 py-3 text-sm font-mono focus:outline-none focus:border-primary/50 rounded-xl"
                autoComplete="username"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm text-text-muted mb-1">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full bg-canvas border border-border-subtle px-4 py-3 text-sm font-mono focus:outline-none focus:border-primary/50 rounded-xl"
                autoComplete={isLogin ? "current-password" : "new-password"}
              />
            </div>
            
            {!isLogin && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm text-text-muted mb-1">Confirm Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="w-full bg-canvas border border-border-subtle px-4 py-3 text-sm font-mono focus:outline-none focus:border-primary/50 transition-colors rounded-xl"
                  autoComplete="new-password"
                />
              </div>
            )}

            {/* Error display */}
            {(error || localError) && (
              <div className="bg-red-50 border border-red-200 p-3 text-xs text-red-700 font-mono">
                {localError || error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary text-white py-3 font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 rounded-xl mt-2"
            >
              {isLoading ? "Authenticating..." : isLogin ? "Sign In" : "Sign Up"}
            </button>
          </form>

          {/* Toggle Mode */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setLocalError("");
              }}
              className="text-xs text-primary/70 hover:text-primary font-medium transition-colors"
            >
              {isLogin ? "Need an account? Sign Up" : "Already have an account? Sign In"}
            </button>
          </div>


        </div>

        <p className="text-center text-xs text-text-muted mt-4">
          Built for CMP311 · Educational purposes only
        </p>
      </div>
    </main>
  );
}

