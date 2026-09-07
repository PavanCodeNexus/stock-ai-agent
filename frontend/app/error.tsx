"use client";
import { useEffect } from "react";
import { TrendingUp, RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
         style={{ background: "var(--bg-primary)" }}>
      <div className="text-center animate-fadeIn">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
               style={{ background: "var(--grad-cyan)" }}>
            <TrendingUp className="w-4 h-4 text-black" />
          </div>
          <span className="text-xl font-bold text-white">
            Stock<span className="text-gradient-cyan">AI</span> Agent
          </span>
        </div>

        <div className="glass p-8 max-w-md">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
               style={{ background: "rgba(255,59,92,0.1)", border: "1px solid rgba(255,59,92,0.3)" }}>
            <span style={{ color: "var(--red)" }} className="text-xl">⚠</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
            {error.message || "An unexpected error occurred"}
          </p>
          <button onClick={reset} className="btn-primary w-full justify-center">
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}