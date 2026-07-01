"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { ShieldAlert } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login, register, isLoading, error } = useAuth();
  
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError("");

    if (!username || !password) {
      setLocalError("Username and password are required");
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setLocalError("Passwords do not match");
      return;
    }

    let success = false;
    if (isLogin) {
      success = await login(username, password);
    } else {
      success = await register(username, password);
    }
    
    if (success) {
      router.push("/dashboard");
    }
  }

  // Allow bypassing login for demo/testing when backend is not running
  function handleDemoLogin() {
    if (typeof window !== "undefined") {
      localStorage.setItem("apex_token", "demo_token");
      localStorage.setItem("apex_username", "demo_officer");
      localStorage.setItem("apex_role", "investigator");
    }
    useAuth.setState({
      token: "demo_token",
      username: "demo_officer",
      role: "investigator",
      isAuthenticated: true,
    });
    router.push("/dashboard");
  }

  return (
    <main className="flex-1 flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <ShieldAlert className="w-10 h-10 text-critical" />
            <h1 className="font-display text-3xl font-bold text-forensic-blue">APEX-X</h1>
          </div>
          <p className="text-sm text-forensic-blue/60">
            Agentic APK Profiling, Exploitation Intelligence & Threat Attribution
          </p>
        </div>

        {/* Auth Form */}
        <div className="bg-panel border border-border-subtle p-6 shadow-sm">
          <h2 className="font-display font-semibold text-lg mb-6">
            {isLogin ? "Investigator Login" : "Investigator Registration"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-forensic-blue/60 mb-1">USERNAME</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full bg-canvas border border-border-subtle px-3 py-2 text-sm font-mono focus:outline-none focus:border-forensic-blue/50 transition-colors"
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
                className="w-full bg-canvas border border-border-subtle px-3 py-2 text-sm font-mono focus:outline-none focus:border-forensic-blue/50 transition-colors"
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
              {isLoading ? (isLogin ? "Authenticating..." : "Registering...") : (isLogin ? "Sign In" : "Sign Up")}
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

          {/* Demo login */}
          <div className="mt-4 pt-4 border-t border-border-subtle">
            <button
              onClick={handleDemoLogin}
              className="w-full bg-canvas border border-border-subtle py-2 text-xs font-mono text-forensic-blue/60 hover:border-forensic-blue/30 transition-colors"
            >
              DEMO LOGIN (Skip Authentication)
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

