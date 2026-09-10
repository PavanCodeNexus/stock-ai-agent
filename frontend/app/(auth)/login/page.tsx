"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import {
  TrendingUp, Mail, Lock, Eye, EyeOff,
  BarChart2, Shield, Zap, Brain
} from "lucide-react";

const FEATURES = [
  {
    icon: Brain,
    color: "#00D4FF",
    title: "AI-Powered Analysis",
    desc: "6 specialized agents analyze every stock"
  },
  {
    icon: BarChart2,
    color: "#00FF88",
    title: "Live NSE/BSE Data",
    desc: "Real-time prices, charts & indicators"
  },
  {
    icon: Shield,
    color: "#FFB800",
    title: "Smart Risk Management",
    desc: "Auto stop-loss & position sizing"
  },
  {
    icon: Zap,
    color: "#7B2FFF",
    title: "Instant Screening",
    desc: "Filter 100+ stocks in seconds"
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); }
    else router.push("/dashboard");
  };

  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg-primary)" }}>

      {/* ── Left Panel ── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0"
             style={{ background: "linear-gradient(135deg, #050A0E 0%, #0A1628 50%, #050A0E 100%)" }} />
        <div className="absolute top-0 left-0 w-96 h-96 rounded-full blur-3xl opacity-10"
             style={{ background: "var(--cyan)", transform: "translate(-50%, -50%)" }} />
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-10"
             style={{ background: "var(--purple)", transform: "translate(50%, 50%)" }} />

        {/* Content */}
        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                 style={{ background: "var(--grad-cyan)" }}>
              <TrendingUp className="w-5 h-5 text-black" />
            </div>
            <span className="text-xl font-bold text-white">
              Stock<span className="text-gradient-cyan">AI</span> Agent
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Invest smarter with
            <span className="text-gradient-cyan block">AI-powered</span>
            stock analysis
          </h1>
          <p className="text-base mb-12" style={{ color: "var(--text-secondary)" }}>
            Get institutional-grade analysis for Indian markets.
            Powered by LangGraph AI agents.
          </p>

          {/* Features */}
          <div className="space-y-5">
            {FEATURES.map(({ icon: Icon, color, title, desc }) => (
              <div key={title} className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                     style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom stats */}
        <div className="relative z-10 grid grid-cols-3 gap-4">
          {[
            { value: "100+", label: "NSE Stocks" },
            { value: "6",    label: "AI Agents"  },
            { value: "Live", label: "Market Data" },
          ].map(({ value, label }) => (
            <div key={label} className="glass p-4 text-center">
              <p className="text-xl font-bold text-gradient-cyan">{value}</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right Panel ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md animate-fadeIn">

          {/* Mobile Logo */}
          <div className="flex items-center justify-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                 style={{ background: "var(--grad-cyan)" }}>
              <TrendingUp className="w-4 h-4 text-black" />
            </div>
            <span className="text-lg font-bold text-white">
              Stock<span className="text-gradient-cyan">AI</span> Agent
            </span>
          </div>

          {/* Card */}
          <div className="glass p-8 lg:p-10">
            <h2 className="text-2xl font-bold text-white mb-1">Welcome back</h2>
            <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>
              Sign in to your account
            </p>

            <form onSubmit={handleLogin} className="space-y-6">
  {/* Email */}
  <div>
    <label className="text-sm font-medium block mb-2"
           style={{ color: "var(--text-secondary)" }}>
      Email address
    </label>
    <div className="relative">
      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: "var(--text-muted)" }} />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        required
        autoComplete="email"
        className="input-field pl-11"
      />
    </div>
  </div>

  {/* Password */}
  <div>
    <div className="flex items-center justify-between mb-2">
      <label className="text-sm font-medium"
             style={{ color: "var(--text-secondary)" }}>
        Password
      </label>
    </div>
    <div className="relative">
      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: "var(--text-muted)" }} />
      <input
        type={showPass ? "text" : "password"}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
        required
        autoComplete="current-password"
        className="input-field pl-11 pr-11"
        style={{ color: "white", caretColor: "var(--cyan)" }}
      />
      <button
        type="button"
        onClick={() => setShowPass(!showPass)}
        className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
        style={{ color: "var(--text-muted)" }}
      >
        {showPass
          ? <EyeOff className="w-4 h-4" />
          : <Eye className="w-4 h-4" />}
      </button>
    </div>
  </div>

              {/* Error */}
              {error && (
                <div className="rounded-xl px-4 py-3 animate-fadeIn"
                     style={{ background: "rgba(255,59,92,0.1)", border: "1px solid rgba(255,59,92,0.3)" }}>
                  <p className="text-sm" style={{ color: "var(--red)" }}>{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center py-3.5 text-sm"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : "Sign In →"}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px" style={{ background: "var(--border-subtle)" }} />
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>or</span>
              <div className="flex-1 h-px" style={{ background: "var(--border-subtle)" }} />
            </div>

            <p className="text-center text-sm" style={{ color: "var(--text-muted)" }}>
              Don't have an account?{" "}
              <Link href="/signup"
                    className="font-semibold transition-colors"
                    style={{ color: "var(--cyan)" }}>
                Sign up free →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
