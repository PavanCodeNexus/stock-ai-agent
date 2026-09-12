"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabase";
import Navbar from "../components/Navbar";
import SearchAutocomplete from "../components/SearchAutocomplete";
import {
  Eye, Trash2, TrendingUp, TrendingDown,
  RefreshCw, Plus, Sparkles,
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
  const [selectedCompanyName, setSelectedCompanyName] = useState("");
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
      // Normalize symbol
      let cleanSymbol = symbol.trim().toUpperCase();
      while (cleanSymbol.endsWith(".NS") || cleanSymbol.endsWith(".BO")) {
        cleanSymbol = cleanSymbol.slice(0, -3);
      }
      const res = await fetch(`${API}/api/market/price/${cleanSymbol}`);
      const data = await res.json();
      
      if (data.error || (data.current_price == null && data.price == null)) {
        setWatchlist((prev) =>
          prev.map((item) =>
            item.symbol === symbol ? { ...item, loadingPrice: false } : item
          )
        );
        return;
      }

      const currentPrice = data.current_price ?? data.price;
      const changePercent = data.change_percent ?? data.changePercent;
      const change = data.change;
      const resolvedName = (data.company_name && data.company_name !== cleanSymbol)
        ? data.company_name
        : undefined;

      setWatchlist((prev) =>
        prev.map((item) =>
          item.symbol === symbol
            ? {
                ...item,
                company_name: resolvedName || item.company_name,
                price: typeof currentPrice === "number" ? currentPrice : Number(currentPrice),
                change_percent: typeof changePercent === "number" ? changePercent : Number(changePercent),
                change: typeof change === "number" ? change : Number(change),
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
    const raw = addSymbol.trim();
    if (!raw || !user) return;
    setError("");

    // Normalize symbol: uppercase, strip .NS / .BO suffixes, clean illegal characters
    let symbol = raw.toUpperCase();
    while (symbol.endsWith(".NS") || symbol.endsWith(".BO")) {
      symbol = symbol.slice(0, -3);
    }
    symbol = symbol.replace(/[^A-Z0-9&]/g, "").trim();

    // Prevent incomplete/single-character inputs (NSE symbols have at least 2 characters)
    if (symbol.length < 2) {
      setError(`"${raw}" is not a valid NSE symbol. Please select a stock or enter a valid symbol.`);
      return;
    }

    setAdding(true);

    // Check if already in watchlist
    const { data: existing } = await supabase
      .from("watchlist")
      .select("id")
      .eq("user_id", user.id)
      .eq("symbol", symbol)
      .maybeSingle();

    if (existing) {
      setError(`${symbol} is already in your watchlist`);
      setAdding(false);
      return;
    }

    // Validate with backend market API before saving to Supabase
    try {
      const res = await fetch(`${API}/api/market/price/${symbol}`);
      if (!res.ok) {
        setError(`Failed to validate ${symbol}. Server error.`);
        setAdding(false);
        return;
      }
      const data = await res.json();
      
      const priceVal = data.current_price ?? data.price;
      if (data.error || priceVal == null || Number(priceVal) <= 0) {
        setError(data.error || `Symbol "${symbol}" not found on NSE or market data unavailable.`);
        setAdding(false);
        return;
      }

      // Determine robust company name from response or autocomplete selection
      const resolvedCompanyName = (data.company_name && data.company_name !== symbol)
        ? data.company_name
        : selectedCompanyName || symbol;

      const { error: insertErr } = await supabase.from("watchlist").insert({
        user_id: user.id,
        symbol,
        company_name: resolvedCompanyName,
      });

      if (insertErr) {
        setError(insertErr.message || "Failed to add stock to watchlist");
        setAdding(false);
        return;
      }

      setAddSymbol("");
      setSelectedCompanyName("");
      fetchWatchlist();
    } catch {
      setError("Failed to add stock. Please check your network connection.");
    } finally {
      setAdding(false);
    }
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
                <p
                  className="text-2xl font-bold number-display"
                  style={{ color }}
                >
                  {value}
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Add Stock ── */}
        <div className="glass p-5 mb-6 animate-fadeIn relative z-20">
          <p className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4" style={{ color: "var(--cyan)" }} />
            Add to Watchlist
          </p>
          <div className="flex gap-3">
            <div className="relative flex-1 min-w-0">
              <SearchAutocomplete
                value={addSymbol}
                onChange={(val) => {
                  setAddSymbol(val);
                  setSelectedCompanyName("");
                }}
                onSelect={(sym, name) => {
                  setAddSymbol(sym);
                  if (name) setSelectedCompanyName(name);
                }}
                onSubmit={addToWatchlist}
                placeholder="Enter NSE symbol (TCS, RELIANCE...)"
              />
            </div>
            <button
              onClick={addToWatchlist}
              disabled={adding || !addSymbol.trim()}
              className="btn-primary px-5 whitespace-nowrap flex-shrink-0"
            >
              {adding ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
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
            {[1, 2, 3].map((i) => (
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
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
            >
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
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-white">{item.symbol}</span>
                      <button
                        onClick={() => router.push(`/dashboard?symbol=${item.symbol}`)}
                        className="text-xs px-2.5 py-1 rounded-md flex items-center gap-1 font-medium transition-all"
                        style={{
                          background: "rgba(0,212,255,0.08)",
                          border: "1px solid rgba(0,212,255,0.2)",
                          color: "var(--cyan)",
                        }}
                      >
                        <Sparkles className="w-3 h-3" /> Analyze
                      </button>
                    </div>
                    <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {item.company_name}
                    </p>
                  </div>

                  {/* Price info */}
                  <div className="flex items-center gap-6">
                    {item.loadingPrice ? (
                      <div className="skeleton h-8 w-24" />
                    ) : (item.price !== undefined && item.price !== null && !isNaN(item.price) && item.price > 0) ? (
                      <div className="text-right">
                        <p className="text-lg font-bold text-white number-display">
                          ₹{Number(item.price).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p
                          className={`text-xs font-semibold flex items-center justify-end gap-1 ${
                            (item.change_percent ?? 0) >= 0 ? "positive" : "negative"
                          }`}
                        >
                          {(item.change_percent ?? 0) >= 0 ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          {(item.change_percent ?? 0) >= 0 ? "+" : ""}
                          {Number(item.change_percent).toFixed(2)}%
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        Price unavailable
                      </span>
                    )}

                    <button
                      onClick={() => removeFromWatchlist(item.id)}
                      className="p-2 rounded-lg transition-all"
                      style={{ color: "var(--text-muted)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--red)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                      title="Remove from watchlist"
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
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--bg-primary)" }}
    >
      <div
        className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: "var(--cyan)" }}
      />
    </div>
  );
}