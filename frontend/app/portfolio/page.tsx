"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabase";
import Navbar from "../components/Navbar";
import SearchAutocomplete from "../components/SearchAutocomplete";
import {
  Briefcase, Plus, Trash2, TrendingUp,
  TrendingDown, RefreshCw, X, Sparkles,
  ArrowUpRight, ArrowDownRight, Wallet, Search
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Holding {
  id: string;
  symbol: string;
  company_name: string;
  quantity: number;
  avg_buy_price: number;
  current_price?: number;
  current_value?: number;
  invested_value?: number;
  pnl?: number;
  pnl_percent?: number;
  loadingPrice?: boolean;
}

interface AddForm {
  symbol: string;
  quantity: string;
  buy_price: string;
}

export default function PortfolioPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [fetching, setFetching] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<AddForm>({ symbol: "", quantity: "", buy_price: "" });
  const [adding, setAdding] = useState(false);
  const [formError, setFormError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (user) fetchPortfolio();
  }, [user]);

  const fetchPortfolio = async () => {
    setFetching(true);
    const { data } = await supabase
      .from("portfolio")
      .select("*")
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false });

    if (data) {
      setHoldings(data.map((h) => ({
        ...h,
        loadingPrice: true,
        invested_value: h.quantity * h.avg_buy_price,
      })));
      await Promise.all(
        data.map((h) => fetchLivePrice(h.symbol, h.quantity, h.avg_buy_price))
      );
    }
    setFetching(false);
  };

  const fetchLivePrice = async (
    symbol: string, quantity: number, avgBuyPrice: number
  ) => {
    try {
      const res = await fetch(`${API}/api/market/price/${symbol}`);
      const data = await res.json();
      const cp = data.current_price || 0;
      const cv = cp * quantity;
      const iv = avgBuyPrice * quantity;
      const pnl = cv - iv;
      const pnlPct = iv > 0 ? (pnl / iv) * 100 : 0;
      setHoldings((prev) =>
        prev.map((h) =>
          h.symbol === symbol
            ? { ...h, current_price: cp, current_value: cv,
                invested_value: iv, pnl, pnl_percent: pnlPct, loadingPrice: false }
            : h
        )
      );
    } catch {
      setHoldings((prev) =>
        prev.map((h) => h.symbol === symbol ? { ...h, loadingPrice: false } : h)
      );
    }
  };

  const refreshAll = async () => {
    setRefreshing(true);
    setHoldings((prev) => prev.map((h) => ({ ...h, loadingPrice: true })));
    await Promise.all(
      holdings.map((h) => fetchLivePrice(h.symbol, h.quantity, h.avg_buy_price))
    );
    setRefreshing(false);
  };

  const addHolding = async () => {
    if (!form.symbol || !form.quantity || !form.buy_price || !user) return;
    setAdding(true);
    setFormError("");

    const symbol = form.symbol.toUpperCase().trim();
    const quantity = parseFloat(form.quantity);
    const buyPrice = parseFloat(form.buy_price);

    if (isNaN(quantity) || quantity <= 0) { setFormError("Enter valid quantity"); setAdding(false); return; }
    if (isNaN(buyPrice) || buyPrice <= 0) { setFormError("Enter valid buy price"); setAdding(false); return; }

    try {
      const res = await fetch(`${API}/api/market/price/${symbol}`);
      const data = await res.json();
      if (data.error) { setFormError(`${symbol} not found on NSE`); setAdding(false); return; }

      const { data: existing } = await supabase
        .from("portfolio").select("*")
        .eq("user_id", user.id).eq("symbol", symbol).single();

      if (existing) {
        const totalQty = existing.quantity + quantity;
        const newAvg = ((existing.quantity * existing.avg_buy_price) + (quantity * buyPrice)) / totalQty;
        await supabase.from("portfolio").update({
          quantity: totalQty,
          avg_buy_price: parseFloat(newAvg.toFixed(2)),
          updated_at: new Date().toISOString(),
        }).eq("id", existing.id);
      } else {
        await supabase.from("portfolio").insert({
          user_id: user.id, symbol,
          company_name: data.company_name || symbol,
          quantity, avg_buy_price: buyPrice,
        });
      }

      await supabase.from("trades").insert({
        user_id: user.id, symbol,
        company_name: data.company_name || symbol,
        trade_type: "BUY", quantity, price: buyPrice,
        total_amount: quantity * buyPrice,
      });

      setForm({ symbol: "", quantity: "", buy_price: "" });
      setShowModal(false);
      fetchPortfolio();
    } catch { setFormError("Failed to add holding"); }
    setAdding(false);
  };

  const removeHolding = async (id: string) => {
    await supabase.from("portfolio").delete().eq("id", id);
    setHoldings((prev) => prev.filter((h) => h.id !== id));
  };

  const filteredHoldings = holdings.filter((h) => {
    if (!search.trim()) return true;
    const q = search.toUpperCase().trim();
    return h.symbol.includes(q) || h.company_name?.toLowerCase().includes(search.toLowerCase().trim());
  });

  const totalInvested = holdings.reduce((s, h) => s + (h.invested_value || 0), 0);
  const totalCurrent  = holdings.reduce((s, h) => s + (h.current_value  || 0), 0);
  const totalPnL      = totalCurrent - totalInvested;
  const totalPnLPct   = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;
  const isProfit      = totalPnL >= 0;

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
              <Briefcase className="w-6 h-6" style={{ color: "var(--green)" }} />
              My Portfolio
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              Track your investments and P&L
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={refreshAll} disabled={refreshing} className="btn-secondary">
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button onClick={() => setShowModal(true)} className="btn-primary">
              <Plus className="w-4 h-4" />
              Add Stock
            </button>
          </div>
        </div>

        {/* ── Summary Hero ── */}
        {holdings.length > 0 && (
          <div
            className="glass p-6 mb-6 animate-fadeIn"
            style={{
              background: isProfit
                ? "linear-gradient(135deg, rgba(0,255,136,0.05), rgba(13,20,33,0.8))"
                : "linear-gradient(135deg, rgba(255,59,92,0.05), rgba(13,20,33,0.8))",
              borderColor: isProfit ? "rgba(0,255,136,0.2)" : "rgba(255,59,92,0.2)",
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-6">
              {/* Total P&L */}
              <div>
                <p
                  className="text-xs uppercase tracking-widest mb-2"
                  style={{ color: "var(--text-muted)" }}
                >
                  Total P&L
                </p>
                <div className="flex items-center gap-3">
                  <span className={`text-4xl font-bold number-display ${isProfit ? "positive" : "negative"}`}>
                    {isProfit ? "+" : ""}₹{Math.abs(totalPnL).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </span>
                  <div
                    className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold"
                    style={{
                      background: isProfit ? "rgba(0,255,136,0.1)" : "rgba(255,59,92,0.1)",
                      border: `1px solid ${isProfit ? "rgba(0,255,136,0.3)" : "rgba(255,59,92,0.3)"}`,
                      color: isProfit ? "var(--green)" : "var(--red)",
                    }}
                  >
                    {isProfit ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    {isProfit ? "+" : ""}{totalPnLPct.toFixed(2)}%
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="flex gap-6">
                {[
                  { label: "Invested",      value: `₹${totalInvested.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, icon: Wallet     },
                  { label: "Current Value", value: `₹${totalCurrent.toLocaleString("en-IN",  { maximumFractionDigits: 0 })}`, icon: TrendingUp },
                  { label: "Holdings",      value: holdings.length.toString(),                                                  icon: Briefcase  },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center">
                    <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{label}</p>
                    <p className="text-lg font-bold text-white number-display">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Search / Filter Bar for Holdings ── */}
        {holdings.length > 0 && (
          <div className="flex items-center justify-between gap-4 mb-4 animate-fadeIn">
            <div className="relative flex-1 max-w-sm">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                style={{ color: "var(--text-muted)" }}
              />
              <input
                type="text"
                placeholder="Search holdings..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field text-sm"
                style={{ paddingLeft: "40px", paddingRight: search ? "36px" : "16px" }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted hover:text-white"
                  style={{ color: "var(--text-muted)" }}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Showing {filteredHoldings.length} of {holdings.length} stocks
            </p>
          </div>
        )}

        {/* ── Holdings ── */}
        {fetching ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass p-5">
                <div className="flex justify-between">
                  <div className="space-y-2">
                    <div className="skeleton h-5 w-24" />
                    <div className="skeleton h-3 w-40" />
                  </div>
                  <div className="skeleton h-8 w-32" />
                </div>
              </div>
            ))}
          </div>
        ) : holdings.length === 0 ? (
          <div className="glass p-16 text-center animate-fadeIn">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
            >
              <Briefcase className="w-8 h-8" style={{ color: "var(--text-muted)" }} />
            </div>
            <p className="text-white font-semibold mb-1">No holdings yet</p>
            <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
              Add your first stock to start tracking
            </p>
            <button onClick={() => setShowModal(true)} className="btn-primary">
              <Plus className="w-4 h-4" /> Add Stock
            </button>
          </div>
        ) : filteredHoldings.length === 0 ? (
          <div className="glass p-12 text-center animate-fadeIn">
            <p className="text-white font-medium mb-1">No holdings matched &ldquo;{search}&rdquo;</p>
            <button onClick={() => setSearch("")} className="text-xs mt-2" style={{ color: "var(--cyan)" }}>
              Clear search
            </button>
          </div>
        ) : (
          <div className="glass overflow-hidden animate-fadeIn" style={{ overflowX: "auto" }}>
            <div style={{ minWidth: "700px" }}>
              {/* Table Header */}
              <div
                className="grid grid-cols-12 gap-2 px-5 py-3 text-xs uppercase tracking-widest font-medium border-b"
                style={{ color: "var(--text-muted)", borderColor: "var(--border-subtle)" }}
              >
                <div className="col-span-3">Stock</div>
                <div className="col-span-1 text-right">Qty</div>
                <div className="col-span-2 text-right">Avg Cost</div>
                <div className="col-span-2 text-right">LTP</div>
                <div className="col-span-2 text-right">P&L</div>
                <div className="col-span-1 text-right">Return</div>
                <div className="col-span-1 text-right">Action</div>
              </div>

              {/* Table Rows */}
              {filteredHoldings.map((h) => {
                const isP = (h.pnl ?? 0) >= 0;
                return (
                  <div
                    key={h.id}
                    className="grid grid-cols-12 gap-2 px-5 py-4 border-b items-center table-row"
                    style={{ borderColor: "var(--border-subtle)" }}
                  >
                    <div className="col-span-3">
                      <p className="font-bold text-white text-sm">{h.symbol}</p>
                      <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                        {h.company_name}
                      </p>
                    </div>

                    <div className="col-span-1 text-right">
                      <p className="text-sm text-white number-display">{h.quantity}</p>
                    </div>

                    <div className="col-span-2 text-right">
                      <p className="text-sm text-white number-display">
                        ₹{h.avg_buy_price.toLocaleString("en-IN")}
                      </p>
                    </div>

                    <div className="col-span-2 text-right">
                      {h.loadingPrice ? (
                        <div className="skeleton h-4 w-16 ml-auto" />
                      ) : (
                        <p className="text-sm text-white number-display">
                          ₹{h.current_price?.toLocaleString("en-IN") ?? "N/A"}
                        </p>
                      )}
                    </div>

                    <div className="col-span-2 text-right">
                      {h.loadingPrice ? (
                        <div className="skeleton h-4 w-16 ml-auto" />
                      ) : (
                        <p className={`text-sm font-semibold number-display ${isP ? "positive" : "negative"}`}>
                          {isP ? "+" : ""}₹{Math.abs(h.pnl ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </p>
                      )}
                    </div>

                    <div className="col-span-1 text-right">
                      {h.loadingPrice ? (
                        <div className="skeleton h-4 w-12 ml-auto" />
                      ) : (
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${isP ? "positive" : "negative"}`}
                          style={{ background: isP ? "rgba(0,255,136,0.1)" : "rgba(255,59,92,0.1)" }}
                        >
                          {isP ? "+" : ""}{(h.pnl_percent ?? 0).toFixed(1)}%
                        </span>
                      )}
                    </div>

                    <div className="col-span-1 flex justify-end gap-1">
                      <button
                        onClick={() => router.push(`/dashboard?symbol=${h.symbol}`)}
                        className="p-1.5 rounded-lg transition-all"
                        style={{ color: "var(--text-muted)" }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = "var(--cyan)";
                          e.currentTarget.style.background = "rgba(0,212,255,0.08)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = "var(--text-muted)";
                          e.currentTarget.style.background = "transparent";
                        }}
                        title="Analyze stock"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => removeHolding(h.id)}
                        className="p-1.5 rounded-lg transition-all"
                        style={{ color: "var(--text-muted)" }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = "var(--red)";
                          e.currentTarget.style.background = "rgba(255,59,92,0.08)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = "var(--text-muted)";
                          e.currentTarget.style.background = "transparent";
                        }}
                        title="Remove holding"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Add Modal ── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
        >
          <div className="glass p-6 w-full max-w-md animate-scaleIn relative">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5" style={{ color: "var(--green)" }} />
                Add Stock
              </h2>
              <button
                onClick={() => { setShowModal(false); setFormError(""); }}
                className="p-1.5 rounded-lg transition-all"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "white")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Stock Symbol with Autocomplete */}
              <div className="relative z-30">
                <label
                  className="text-sm font-medium block mb-2"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Stock Symbol
                </label>
                <SearchAutocomplete
                  value={form.symbol}
                  onChange={(val) => setForm({ ...form, symbol: val })}
                  onSelect={(sym) => setForm({ ...form, symbol: sym })}
                  placeholder="e.g. TCS, RELIANCE"
                />
              </div>

              {/* Quantity */}
              <div>
                <label
                  className="text-sm font-medium block mb-2"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Quantity (shares)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 10"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  className="input-field"
                  style={{ paddingLeft: "16px", paddingRight: "16px" }}
                />
              </div>

              {/* Buy Price */}
              <div>
                <label
                  className="text-sm font-medium block mb-2"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Buy Price (₹ per share)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 2200"
                  value={form.buy_price}
                  onChange={(e) => setForm({ ...form, buy_price: e.target.value })}
                  className="input-field"
                  style={{ paddingLeft: "16px", paddingRight: "16px" }}
                />
              </div>

              {/* Total preview */}
              {form.symbol && form.quantity && form.buy_price && (
                <div
                  className="rounded-xl p-4 animate-fadeIn"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
                >
                  <div className="flex justify-between text-sm">
                    <span style={{ color: "var(--text-muted)" }}>Total Investment</span>
                    <span className="text-white font-bold number-display">
                      ₹{(parseFloat(form.quantity) * parseFloat(form.buy_price)).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              )}

              {formError && (
                <p className="text-sm" style={{ color: "var(--red)" }}>{formError}</p>
              )}

              <button
                onClick={addHolding}
                disabled={adding || !form.symbol || !form.quantity || !form.buy_price}
                className="btn-primary w-full justify-center py-3.5"
              >
                {adding ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Adding...
                  </span>
                ) : (
                  "Add to Portfolio →"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
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