"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import {
  TrendingUp, Mail, Lock, User,
  Eye, EyeOff, CheckCircle2, Circle
} from "lucide-react";

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "At least 6 characters", pass: password.length >= 6 },
    { label: "Contains a number",     pass: /\d/.test(password)  },
    { label: "Contains a letter",     pass: /[a-zA-Z]/.test(password) },
  ];
  const score = checks.filter((c) => c.pass).length;
  const colors = ["#FF3B5C", "#FFB800", "#00FF88"];
  const labels = ["Weak", "Fair", "Strong"];

  if (!password) return null;

  return (
    <div className="mt-2 animate-fadeIn">
      <div className="flex gap-1 mb-1.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex-1 h-1 rounded-full transition-all duration-300"
               style={{ background: i < score ? colors[score - 1] : "var(--border-subtle)" }} />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: score > 0 ? colors[score - 1] : "var(--text-muted)" }}>
          {score > 0 ? labels[score - 1] : ""}
        </span>
        <div className="flex gap-3">
          {checks.map(({ label, pass }) => (
            <span key={label} className="flex items-center gap-1 text-xs"
                  style={{ color: pass ? "#00FF88" : "var(--text-muted)" }}>
              {pass
                ? <CheckCircle2 className="w-3 h-3" />
                : <Circle className="w-3 h-3" />}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } }
    });
    if (error) { setError(error.message); setLoading(false); }
    else { setSuccess(true); setLoading(false); }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6"
           style={{ background: "var(--bg-primary)" }}>
        <div className="glass p-10 max-w-md w-full text-center animate-scaleIn">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
               style={{ background: "rgba(0,255,136,0.1)", border: "1px solid rgba(0,255,136,0.3)" }}>
            <CheckCircle2 className="w-8 h-8" style={{ color: "var(--green)" }} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Check your email!</h2>
          <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
            We sent a confirmation link to{" "}
            <span className="text-white font-medium">{email}</span>.
            Click it to activate your account.
          </p>
          <Link href="/login" className="btn-primary inline-flex">
            Go to Login →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
         style={{ background: "var(--bg-primary)" }}>

      {/* Background blobs */}
      <div className="fixed top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-5 pointer-events-none"
           style={{ background: "var(--cyan)", transform: "translate(30%, -30%)" }} />
      <div className="fixed bottom-0 left-0 w-96 h-96 rounded-full blur-3xl opacity-5 pointer-events-none"
           style={{ background: "var(--purple)", transform: "translate(-30%, 30%)" }} />

      <div className="w-full max-w-md animate-fadeIn">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
               style={{ background: "var(--grad-cyan)" }}>
            <TrendingUp className="w-4 h-4 text-black" />
          </div>
          <span className="text-xl font-bold text-white">
            Stock<span className="text-gradient-cyan">AI</span> Agent
          </span>
        </div>

        {/* Card */}
        <div className="glass p-8 lg:p-10">
          <h2 className="text-2xl font-bold text-white mb-1">Create account</h2>
          <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>
            Start analyzing Indian stocks with AI — free forever
          </p>

          <form onSubmit={handleSignup} className="space-y-5">
            {/* Name */}
            <div>
              <label className="text-sm font-medium block mb-2"
                     style={{ color: "var(--text-secondary)" }}>
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4"
                      style={{ color: "var(--text-muted)" }} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                  className="input-field pl-11"
                />
              </div>
            </div>

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
                  className="input-field pl-11"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-sm font-medium block mb-2"
                     style={{ color: "var(--text-secondary)" }}>
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4"
                      style={{ color: "var(--text-muted)" }} />
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  required
                  className="input-field pl-11 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--text-muted)" }}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <PasswordStrength password={password} />
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
                  Creating account...
                </span>
              ) : "Create Account →"}
            </button>

            <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
              By signing up you agree to our Terms of Service
            </p>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px" style={{ background: "var(--border-subtle)" }} />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>or</span>
            <div className="flex-1 h-px" style={{ background: "var(--border-subtle)" }} />
          </div>

          <p className="text-center text-sm" style={{ color: "var(--text-muted)" }}>
            Already have an account?{" "}
            <Link href="/login"
                  className="font-semibold"
                  style={{ color: "var(--cyan)" }}>
              Sign in →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}