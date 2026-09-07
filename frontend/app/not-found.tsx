import Link from "next/link";
import { TrendingUp, Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4"
         style={{ background: "var(--bg-primary)" }}>

      {/* Background blobs */}
      <div className="fixed top-1/2 left-1/2 w-96 h-96 rounded-full blur-3xl opacity-5 pointer-events-none"
           style={{ background: "var(--cyan)", transform: "translate(-50%, -50%)" }} />

      <div className="text-center animate-fadeIn">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-12">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
               style={{ background: "var(--grad-cyan)" }}>
            <TrendingUp className="w-4 h-4 text-black" />
          </div>
          <span className="text-xl font-bold text-white">
            Stock<span className="text-gradient-cyan">AI</span> Agent
          </span>
        </div>

        {/* 404 */}
        <div className="mb-6">
          <h1 className="text-8xl font-black text-gradient-cyan mb-2">404</h1>
          <h2 className="text-2xl font-bold text-white mb-3">Page Not Found</h2>
          <p className="text-base" style={{ color: "var(--text-muted)" }}>
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3 mt-8">
          <Link href="/dashboard" className="btn-primary">
            <Home className="w-4 h-4" />
            Go to Dashboard
          </Link>
          <Link href="/screener" className="btn-secondary">
            <Search className="w-4 h-4" />
            Screen Stocks
          </Link>
        </div>
      </div>
    </div>
  );
}