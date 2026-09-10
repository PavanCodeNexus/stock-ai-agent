"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabase";
import Navbar from "../components/Navbar";
import {
  History, TrendingUp, TrendingDown,
  ArrowUpRight, ArrowDownRight, Search, X
} from "lucide-react";

interface Trade {
  id: string;
  symbol: string;
  company_name: string;
  trade_type: "BUY" | "SELL";
  quantity: number;
  price: number;
  total_amount: number;
  trade_date: string;
}

export default function TradesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [fetching, setFetching] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "BUY" | "SELL">("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (user) fetchTrades();
  }, [user]);

  const fetchTrades = async () => {
    setFetching(true);
    const { data } = await supabase
      .from("trades")
      .select("*")
      .eq("user_id", user?.id)
      .order("trade_date", { ascending: false });
    if (data) setTrades(data);
    setFetching(false);
  };

  const filtered = trades.filter((t) => {
    const matchFilter = filter === "ALL" || t.trade_type === filter;
    const matchSearch =
      t.symbol.includes(search.toUpperCase().trim()) ||
      t.company_name?.toLowerCase().includes(search.toLowerCase().trim());
    return matchFilter && matchSearch;
  });

  const totalBought = trades
    .filter((t) => t.trade_type === "BUY")
    .reduce((s, t) => s + t.total_amount, 0);

  const totalSold = trades
    .filter((t) => t.trade_type === "SELL")
    .reduce((s, t) => s + t.total_amount, 0);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  if (loading) return <Loader />;
  if (!user) return null;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="mb-6 animate-fadeIn">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <History className="w-6 h-6" style={{ color: "var(--gold)" }} />
            Trade History
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            All your buy and sell transactions
          </p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6 animate-fadeIn">
          {[
            { label: "Total Trades",  value: trades.length.toString(),  color: "var(--cyan)"  },
            { label: "Total Bought",  value: `₹${totalBought.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, color: "var(--green)" },
            { label: "Total Sold",    value: `₹${totalSold.toLocaleString("en-IN",   { maximumFractionDigits: 0 })}`, color: "var(--red)"   },
          ].map(({ label, value, color }) => (
            <div key={label} className="glass p-4 text-center">
              <p className="text-xl font-bold number-display" style={{ color }}>{value}</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-5 animate-fadeIn relative z-20">
          <div className="relative flex-1 min-w-48">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
              style={{ color: "var(--text-muted)" }}
            />
            <input
              type="text"
              placeholder="Search symbol or company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field text-sm"
              style={{
                paddingLeft: "40px",
                paddingRight: search ? "36px" : "16px",
                paddingTop: "10px",
                paddingBottom: "10px",
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted hover:text-white"
                style={{ color: "var(--text-muted)" }}
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex gap-2">
            {(["ALL", "BUY", "SELL"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: filter === f
                    ? f === "BUY" ? "rgba(0,255,136,0.15)"
                    : f === "SELL" ? "rgba(255,59,92,0.15)"
                    : "rgba(0,212,255,0.15)"
                    : "var(--bg-elevated)",
                  border: `1px solid ${filter === f
                    ? f === "BUY" ? "rgba(0,255,136,0.4)"
                    : f === "SELL" ? "rgba(255,59,92,0.4)"
                    : "rgba(0,212,255,0.4)"
                    : "var(--border-subtle)"}`,
                  color: filter === f
                    ? f === "BUY" ? "var(--green)"
                    : f === "SELL" ? "var(--red)"
                    : "var(--cyan)"
                    : "var(--text-muted)",
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Trades List */}
        {fetching ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="glass p-5">
                <div className="flex justify-between">
                  <div className="space-y-2">
                    <div className="skeleton h-5 w-24" />
                    <div className="skeleton h-3 w-40" />
                  </div>
                  <div className="skeleton h-8 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass p-16 text-center animate-fadeIn">
            <History className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
            <p className="text-white font-semibold mb-1">No trades found</p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {trades.length === 0
                ? "Add stocks to portfolio to see trade history"
                : "No trades match your filter"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((trade, idx) => (
              <div
                key={trade.id}
                className="glass p-4 glass-hover animate-fadeIn"
                style={{ animationDelay: `${idx * 0.04}s` }}
                onClick={() => router.push(`/dashboard?symbol=${trade.symbol}`)}
              >
                <div className="flex items-center justify-between gap-4">
                  {/* Left */}
                  <div className="flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: trade.trade_type === "BUY"
                          ? "rgba(0,255,136,0.1)" : "rgba(255,59,92,0.1)",
                        border: `1px solid ${trade.trade_type === "BUY"
                          ? "rgba(0,255,136,0.3)" : "rgba(255,59,92,0.3)"}`,
                      }}
                    >
                      {trade.trade_type === "BUY" ? (
                        <ArrowUpRight className="w-5 h-5" style={{ color: "var(--green)" }} />
                      ) : (
                        <ArrowDownRight className="w-5 h-5" style={{ color: "var(--red)" }} />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{trade.symbol}</span>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-semibold"
                          style={{
                            background: trade.trade_type === "BUY"
                              ? "rgba(0,255,136,0.1)" : "rgba(255,59,92,0.1)",
                            color: trade.trade_type === "BUY" ? "var(--green)" : "var(--red)",
                          }}
                        >
                          {trade.trade_type}
                        </span>
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {trade.quantity} shares @ ₹{trade.price.toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>

                  {/* Right */}
                  <div className="text-right">
                    <p className="font-bold text-white number-display">
                      ₹{trade.total_amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {formatDate(trade.trade_date)}
                    </p>
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
           style={{ borderColor: "var(--gold)" }} />
    </div>
  );
}