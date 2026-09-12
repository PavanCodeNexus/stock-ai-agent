"use client";
import { useState, useEffect } from "react";
import { Eye, EyeOff, Check } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";

interface Props {
  symbol: string;
  companyName?: string;
}

export default function WatchlistButton({ symbol, companyName }: Props) {
  const { user } = useAuth();
  const [inWatchlist, setInWatchlist] = useState(false);
  const [loading, setLoading] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  // Normalize symbol (uppercase, strip .NS or .BO suffix)
  const normSymbol = (symbol || "").trim().toUpperCase().replace(/\.(NS|BO)$/, "");

  useEffect(() => {
    if (!user || !normSymbol) return;
    checkWatchlist();
  }, [user, normSymbol]);

  const checkWatchlist = async () => {
    if (!user || !normSymbol) return;
    const { data } = await supabase
      .from("watchlist")
      .select("id")
      .eq("user_id", user?.id)
      .eq("symbol", normSymbol)
      .maybeSingle();
    setInWatchlist(!!data);
  };

  const toggleWatchlist = async () => {
    if (!user || !normSymbol) return;
    setLoading(true);
    if (inWatchlist) {
      await supabase
        .from("watchlist")
        .delete()
        .eq("user_id", user.id)
        .eq("symbol", normSymbol);
      setInWatchlist(false);
    } else {
      await supabase.from("watchlist").insert({
        user_id: user.id,
        symbol: normSymbol,
        company_name: companyName || normSymbol,
      });
      setInWatchlist(true);
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 2000);
    }
    setLoading(false);
  };

  if (!user) return null;

  return (
    <button
      onClick={toggleWatchlist}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300"
      style={{
        background: justAdded
          ? "rgba(0,255,136,0.15)"
          : inWatchlist
          ? "rgba(0,212,255,0.08)"
          : "var(--bg-elevated)",
        border: justAdded
          ? "1px solid rgba(0,255,136,0.4)"
          : inWatchlist
          ? "1px solid rgba(0,212,255,0.3)"
          : "1px solid var(--border-subtle)",
        color: justAdded
          ? "var(--green)"
          : inWatchlist
          ? "var(--cyan)"
          : "var(--text-secondary)",
        transform: loading ? "scale(0.97)" : "scale(1)",
      }}
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
             style={{ borderColor: "var(--cyan)" }} />
      ) : justAdded ? (
        <Check className="w-4 h-4" />
      ) : inWatchlist ? (
        <EyeOff className="w-4 h-4" />
      ) : (
        <Eye className="w-4 h-4" />
      )}
      {justAdded
        ? "Added!"
        : inWatchlist
        ? "Watching"
        : "Add to Watchlist"}
    </button>
  );
}