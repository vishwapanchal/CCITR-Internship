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

    if (!isLogin && !username.endsWith("@cyber.gov")) {
      setLocalError("Only @cyber.gov emails are allowed for registration");
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
          <Link href="/" className="flex items-center text-xs font-mono text-forensic-blue/60 hover:text-forensic-blue transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" />
            BACK TO HOME
          </Link>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center justify-center gap-2 mb-4 hover:opacity-80 transition-opacity">
            <ShieldAlert className="w-10 h-10 text-critical" />
            <h1 className="font-display text-3xl font-bold text-forensic-blue">APEX-X</h1>
          </Link>
          <p className="text-sm text-forensic-blue/60">
            Agentic APK Profiling, Exploitation Intelligence & Threat Attribution
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-panel border border-border-subtle p-6">
          <div className="flex gap-4 mb-6 border-b border-border-subtle pb-2">
            <button 
              className={`font-display font-semibold text-lg pb-2 -mb-2.5 transition-colors ${isLogin ? "border-b-2 border-forensic-blue text-forensic-blue" : "text-forensic-blue/50"}`}
              onClick={() => { setIsLogin(true); setLocalError(""); }}
            >
              Sign In
            </button>
            <button 
              className={`font-display font-semibold text-lg pb-2 -mb-2.5 transition-colors ${!isLogin ? "border-b-2 border-forensic-blue text-forensic-blue" : "text-forensic-blue/50"}`}
              onClick={() => { setIsLogin(false); setLocalError(""); }}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-forensic-blue/60 mb-1">EMAIL (@cyber.gov)</label>
              <input
                type="email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="agent@cyber.gov"
                className="w-full bg-canvas border border-border-subtle px-3 py-2 text-sm font-mono focus:outline-none focus:border-forensic-blue/50"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-forensic-blue/60 mb-1">PASSWORD</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full bg-canvas border border-border-subtle px-3 py-2 text-sm font-mono focus:outline-none focus:border-forensic-blue/50"
                autoComplete={isLogin ? "current-password" : "new-password"}
              />
            </div>
            
            {!isLogin && (
              <div>
                <label className="block text-xs font-mono text-forensic-blue/60 mb-1">CONFIRM PASSWORD</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="w-full bg-canvas border border-border-subtle px-3 py-2 text-sm font-mono focus:outline-none focus:border-forensic-blue/50 transition-colors"
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
              className="w-full bg-forensic-blue text-white py-2.5 font-medium text-sm hover:bg-forensic-blue/90 transition-colors disabled:opacity-50"
            >
              {isLoading ? "Authenticating..." : isLogin ? "Sign In" : "Sign Up"}
            </button>
          </form>

          {/* Toggle Mode */}
          <div className="mt-4 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setLocalError("");
              }}
              className="text-xs text-forensic-blue/70 hover:text-forensic-blue font-medium transition-colors"
            >
              {isLogin ? "Need an account? Sign Up" : "Already have an account? Sign In"}
            </button>
          </div>


        </div>

        <p className="text-center text-xs text-forensic-blue/40 mt-4 font-mono">
          Authorized personnel only. All sessions are logged.
        </p>
      </div>
    </main>
  );
}

