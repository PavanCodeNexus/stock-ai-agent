"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabase";
import Navbar from "../components/Navbar";
import {
  Eye, Trash2, TrendingUp, TrendingDown,
  RefreshCw, Search, Plus, Sparkles,
  BarChart2
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface WatchItem {
  id: string;
  symbol: string;
  company_name: string;
  added_at: string;
  price?: number;
  change_percent?: number;
  change?: number;
  day_high?: number;
  day_low?: number;
  loadingPrice?: boolean;
}

export default function WatchlistPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [watchlist, setWatchlist] = useState<WatchItem[]>([]);
  const [fetching, setFetching] = useState(true);
  const [addSymbol, setAddSymbol] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (user) fetchWatchlist();
  }, [user]);

  const fetchWatchlist = async () => {
    setFetching(true);
    const { data } = await supabase
      .from("watchlist")
      .select("*")
      .eq("user_id", user?.id)
      .order("added_at", { ascending: false });

    if (data) {
      setWatchlist(data.map((item) => ({ ...item, loadingPrice: true })));
      await Promise.all(data.map((item) => fetchPrice(item.symbol)));
    }
    setFetching(false);
  };

  const fetchPrice = async (symbol: string) => {
    try {
      const res = await fetch(`${API}/api/market/price/${symbol}`);
      const data = await res.json();
      setWatchlist((prev) =>
        prev.map((item) =>
          item.symbol === symbol
            ? {
                ...item,
                price: data.current_price,
                change_percent: data.change_percent,
                change: data.change,
                day_high: data.day_high,
                day_low: data.day_low,
                loadingPrice: false,
              }
            : item
        )
      );
    } catch {
      setWatchlist((prev) =>
        prev.map((item) =>
          item.symbol === symbol ? { ...item, loadingPrice: false } : item
        )
      );
    }
  };

  const refreshAll = async () => {
    setRefreshing(true);
    setWatchlist((prev) => prev.map((item) => ({ ...item, loadingPrice: true })));
    await Promise.all(watchlist.map((item) => fetchPrice(item.symbol)));
    setRefreshing(false);
  };

  const addToWatchlist = async () => {
    if (!addSymbol.trim() || !user) return;
    setAdding(true);
    setError("");
    const symbol = addSymbol.toUpperCase().trim();

    const { data: existing } = await supabase
      .from("watchlist")
      .select("id")
      .eq("user_id", user.id)
      .eq("symbol", symbol)
      .single();

    if (existing) {
      setError(`${symbol} is already in your watchlist`);
      setAdding(false);
      return;
    }

    try {
      const res = await fetch(`${API}/api/market/price/${symbol}`);
      const data = await res.json();
      if (data.error) {
        setError(`${symbol} not found on NSE`);
        setAdding(false);
        return;
      }
      await supabase.from("watchlist").insert({
        user_id: user.id,
        symbol,
        company_name: data.company_name || symbol,
      });
      setAddSymbol("");
      fetchWatchlist();
    } catch {
      setError("Failed to add stock");
    }
    setAdding(false);
  };

  const removeFromWatchlist = async (id: string) => {
    await supabase.from("watchlist").delete().eq("id", id);
    setWatchlist((prev) => prev.filter((item) => item.id !== id));
  };

  // Stats
  const gainers = watchlist.filter((i) => (i.change_percent ?? 0) > 0).length;
  const losers  = watchlist.filter((i) => (i.change_percent ?? 0) < 0).length;

  if (loading) return <Loader />;
  if (!user) return null;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6 animate-fadeIn">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Eye className="w-6 h-6" style={{ color: "var(--cyan)" }} />
              My Watchlist
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              Monitor your favourite stocks in real-time
            </p>
          </div>
          <button
            onClick={refreshAll}
            disabled={refreshing || fetching}
            className="btn-secondary"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* ── Stats Bar ── */}
        {watchlist.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-6 animate-fadeIn">
            {[
              { label: "Watching",      value: watchlist.length, color: "var(--cyan)"  },
              { label: "Gainers Today", value: gainers,          color: "var(--green)" },
              { label: "Losers Today",  value: losers,           color: "var(--red)"   },
            ].map(({ label, value, color }) => (
              <div key={label} className="glass p-4 text-center">
                <p className="text-2xl font-bold number-display"
                   style={{ color }}>{value}</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Add Stock ── */}
        <div className="glass p-5 mb-6 animate-fadeIn">
          <p className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4" style={{ color: "var(--cyan)" }} />
            Add to Watchlist
          </p>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4"
                      style={{ color: "var(--text-muted)" }} />
              <input
                type="text"
                placeholder="Enter NSE symbol (TCS, RELIANCE...)"
                value={addSymbol}
                onChange={(e) => setAddSymbol(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && addToWatchlist()}
                className="input-field pl-11"
              />
            </div>
            <button
              onClick={addToWatchlist}
              disabled={adding || !addSymbol}
              className="btn-primary px-5"
            >
              {adding
                ? <RefreshCw className="w-4 h-4 animate-spin" />
                : <Plus className="w-4 h-4" />}
              {adding ? "Adding..." : "Add"}
            </button>
          </div>
          {error && (
            <p className="text-sm mt-2" style={{ color: "var(--red)" }}>{error}</p>
          )}
        </div>

        {/* ── Watchlist ── */}
        {fetching ? (
          <div className="space-y-3">
            {[1,2,3].map((i) => (
              <div key={i} className="glass p-5">
                <div className="flex justify-between">
                  <div className="space-y-2">
                    <div className="skeleton h-5 w-24" />
                    <div className="skeleton h-3 w-40" />
                  </div>
                  <div className="skeleton h-8 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : watchlist.length === 0 ? (
          <div className="glass p-16 text-center animate-fadeIn">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                 style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
              <Eye className="w-8 h-8" style={{ color: "var(--text-muted)" }} />
            </div>
            <p className="text-white font-semibold mb-1">Your watchlist is empty</p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Add stocks above to start monitoring
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {watchlist.map((item, idx) => (
              <div
                key={item.id}
                className="glass p-5 glass-hover animate-fadeIn"
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <div className="flex items-center justify-between gap-4">

                  {/* Stock info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{item.symbol}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}>
                        NSE
                      </span>
                    </div>
                    <p className="text-xs mt-0.5 truncate"
                       style={{ color: "var(--text-muted)" }}>
                      {item.company_name}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="text-right">
                    {item.loadingPrice ? (
                      <div className="space-y-1">
                        <div className="skeleton h-5 w-20 ml-auto" />
                        <div className="skeleton h-3 w-14 ml-auto" />
                      </div>
                    ) : (
                      <>
                        <p className="text-lg font-bold text-white number-display">
                          ₹{item.price?.toLocaleString("en-IN") ?? "N/A"}
                        </p>
                        <div className={`flex items-center justify-end gap-1 text-sm font-medium ${
                          (item.change_percent ?? 0) >= 0 ? "positive" : "negative"
                        }`}>
                          {(item.change_percent ?? 0) >= 0
                            ? <TrendingUp className="w-3 h-3" />
                            : <TrendingDown className="w-3 h-3" />}
                          {(item.change_percent ?? 0) >= 0 ? "+" : ""}
                          {(item.change_percent ?? 0).toFixed(2)}%
                        </div>
                      </>
                    )}
                  </div>

                  {/* Day range */}
                  {!item.loadingPrice && item.day_high && (
                    <div className="hidden md:block text-xs text-right"
                         style={{ color: "var(--text-muted)" }}>
                      <p>H: <span className="positive">₹{item.day_high.toLocaleString("en-IN")}</span></p>
                      <p>L: <span className="negative">₹{item.day_low?.toLocaleString("en-IN")}</span></p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => router.push(`/dashboard?symbol=${item.symbol}`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{
                        background: "rgba(0,212,255,0.08)",
                        border: "1px solid rgba(0,212,255,0.2)",
                        color: "var(--cyan)",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,212,255,0.15)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "rgba(0,212,255,0.08)")}
                    >
                      <Sparkles className="w-3 h-3" />
                      Analyze
                    </button>
                    <button
                      onClick={() => router.push(`/dashboard?symbol=${item.symbol}`)}
                      className="p-1.5 rounded-lg transition-all"
                      style={{ color: "var(--text-muted)" }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = "rgba(0,212,255,0.08)";
                        e.currentTarget.style.color = "var(--cyan)";
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "var(--text-muted)";
                      }}
                    >
                      <BarChart2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeFromWatchlist(item.id)}
                      className="p-1.5 rounded-lg transition-all"
                      style={{ color: "var(--text-muted)" }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = "rgba(255,59,92,0.08)";
                        e.currentTarget.style.color = "var(--red)";
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "var(--text-muted)";
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Loader() {
  return (
    <div className="min-h-screen flex items-center justify-center"
         style={{ background: "var(--bg-primary)" }}>
      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
           style={{ borderColor: "var(--cyan)" }} />
    </div>
  );
}