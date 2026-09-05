"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabase";
import Navbar from "../components/Navbar";
import {
  Briefcase, Plus, Trash2, TrendingUp,
  TrendingDown, RefreshCw, X
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

interface AddTradeForm {
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
  const [form, setForm] = useState<AddTradeForm>({
    symbol: "", quantity: "", buy_price: ""
  });
  const [adding, setAdding] = useState(false);
  const [formError, setFormError] = useState("");

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
      data.forEach((h) => fetchLivePrice(h.symbol, h.quantity, h.avg_buy_price));
    }
    setFetching(false);
  };

  const fetchLivePrice = async (
    symbol: string,
    quantity: number,
    avgBuyPrice: number
  ) => {
    try {
      const res = await fetch(`${API}/api/market/price/${symbol}`);
      const data = await res.json();
      const currentPrice = data.current_price || 0;
      const currentValue = currentPrice * quantity;
      const investedValue = avgBuyPrice * quantity;
      const pnl = currentValue - investedValue;
      const pnlPercent = investedValue > 0 ? (pnl / investedValue) * 100 : 0;

      setHoldings((prev) =>
        prev.map((h) =>
          h.symbol === symbol
            ? {
                ...h,
                current_price: currentPrice,
                current_value: currentValue,
                invested_value: investedValue,
                pnl: pnl,
                pnl_percent: pnlPercent,
                loadingPrice: false,
              }
            : h
        )
      );
    } catch {
      setHoldings((prev) =>
        prev.map((h) =>
          h.symbol === symbol ? { ...h, loadingPrice: false } : h
        )
      );
    }
  };

  const addHolding = async () => {
    if (!form.symbol || !form.quantity || !form.buy_price || !user) return;
    setAdding(true);
    setFormError("");

    const symbol = form.symbol.toUpperCase().trim();
    const quantity = parseFloat(form.quantity);
    const buyPrice = parseFloat(form.buy_price);

    if (isNaN(quantity) || quantity <= 0) {
      setFormError("Enter valid quantity");
      setAdding(false);
      return;
    }
    if (isNaN(buyPrice) || buyPrice <= 0) {
      setFormError("Enter valid buy price");
      setAdding(false);
      return;
    }

    // Verify stock exists
    try {
      const res = await fetch(`${API}/api/market/price/${symbol}`);
      const data = await res.json();
      if (data.error) {
        setFormError(`${symbol} not found on NSE`);
        setAdding(false);
        return;
      }

      // Check if holding exists — update quantity
      const { data: existing } = await supabase
        .from("portfolio")
        .select("*")
        .eq("user_id", user.id)
        .eq("symbol", symbol)
        .single();

      if (existing) {
        // Calculate new average
        const totalQty = existing.quantity + quantity;
        const newAvg = (
          (existing.quantity * existing.avg_buy_price + quantity * buyPrice) /
          totalQty
        );

        await supabase
          .from("portfolio")
          .update({
            quantity: totalQty,
            avg_buy_price: parseFloat(newAvg.toFixed(2)),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("portfolio").insert({
          user_id: user.id,
          symbol: symbol,
          company_name: data.company_name || symbol,
          quantity: quantity,
          avg_buy_price: buyPrice,
        });
      }

      // Add to trades history
      await supabase.from("trades").insert({
        user_id: user.id,
        symbol: symbol,
        company_name: data.company_name || symbol,
        trade_type: "BUY",
        quantity: quantity,
        price: buyPrice,
        total_amount: quantity * buyPrice,
      });

      setForm({ symbol: "", quantity: "", buy_price: "" });
      setShowModal(false);
      fetchPortfolio();
    } catch {
      setFormError("Failed to add holding");
    }

    setAdding(false);
  };

  const removeHolding = async (id: string) => {
    await supabase.from("portfolio").delete().eq("id", id);
    setHoldings((prev) => prev.filter((h) => h.id !== id));
  };

  // Portfolio summary
  const totalInvested = holdings.reduce(
    (s, h) => s + (h.invested_value || 0), 0
  );
  const totalCurrent = holdings.reduce(
    (s, h) => s + (h.current_value || 0), 0
  );
  const totalPnL = totalCurrent - totalInvested;
  const totalPnLPct = totalInvested > 0
    ? (totalPnL / totalInvested) * 100
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Briefcase className="text-green-400 w-6 h-6" />
              My Portfolio
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Track your stock investments
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchPortfolio}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-400 hover:text-white transition"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg text-sm font-medium text-white transition"
            >
              <Plus className="w-4 h-4" />
              Add Stock
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Total Invested</p>
            <p className="text-lg font-bold text-white">
              ₹{totalInvested.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Current Value</p>
            <p className="text-lg font-bold text-white">
              ₹{totalCurrent.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Total P&L</p>
            <p className={`text-lg font-bold ${totalPnL >= 0 ? "text-green-400" : "text-red-400"}`}>
              {totalPnL >= 0 ? "+" : ""}₹{Math.abs(totalPnL).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Returns</p>
            <p className={`text-lg font-bold flex items-center gap-1 ${totalPnLPct >= 0 ? "text-green-400" : "text-red-400"}`}>
              {totalPnLPct >= 0
                ? <TrendingUp className="w-4 h-4" />
                : <TrendingDown className="w-4 h-4" />}
              {totalPnLPct >= 0 ? "+" : ""}{totalPnLPct.toFixed(2)}%
            </p>
          </div>
        </div>

        {/* Holdings Table */}
        {fetching ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : holdings.length === 0 ? (
          <div className="text-center py-20 bg-gray-800 border border-gray-700 rounded-xl">
            <Briefcase className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No holdings yet</p>
            <p className="text-gray-600 text-sm mt-1 mb-4">
              Add your first stock to start tracking
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg text-sm font-medium transition"
            >
              Add Stock
            </button>
          </div>
        ) : (
          <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-gray-700 text-xs text-gray-500 font-medium uppercase">
              <div className="col-span-3">Stock</div>
              <div className="col-span-1 text-right">Qty</div>
              <div className="col-span-2 text-right">Avg Cost</div>
              <div className="col-span-2 text-right">LTP</div>
              <div className="col-span-2 text-right">P&L</div>
              <div className="col-span-1 text-right">Return</div>
              <div className="col-span-1 text-right">Action</div>
            </div>

            {/* Rows */}
            {holdings.map((h) => (
              <div
                key={h.id}
                className="grid grid-cols-12 gap-2 px-4 py-4 border-b border-gray-700/50 last:border-0 hover:bg-gray-700/30 transition items-center"
              >
                <div className="col-span-3">
                  <p className="font-semibold text-white text-sm">{h.symbol}</p>
                  <p className="text-xs text-gray-500 truncate">{h.company_name}</p>
                </div>

                <div className="col-span-1 text-right">
                  <p className="text-sm text-white">{h.quantity}</p>
                </div>

                <div className="col-span-2 text-right">
                  <p className="text-sm text-white">
                    ₹{h.avg_buy_price.toLocaleString("en-IN")}
                  </p>
                </div>

                <div className="col-span-2 text-right">
                  {h.loadingPrice ? (
                    <div className="w-16 h-4 bg-gray-700 rounded animate-pulse ml-auto" />
                  ) : (
                    <p className="text-sm text-white">
                      ₹{h.current_price?.toLocaleString("en-IN") ?? "N/A"}
                    </p>
                  )}
                </div>

                <div className="col-span-2 text-right">
                  {h.loadingPrice ? (
                    <div className="w-16 h-4 bg-gray-700 rounded animate-pulse ml-auto" />
                  ) : (
                    <p className={`text-sm font-medium ${(h.pnl ?? 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {(h.pnl ?? 0) >= 0 ? "+" : ""}
                      ₹{Math.abs(h.pnl ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </p>
                  )}
                </div>

                <div className="col-span-1 text-right">
                  {h.loadingPrice ? (
                    <div className="w-12 h-4 bg-gray-700 rounded animate-pulse ml-auto" />
                  ) : (
                    <p className={`text-xs font-medium ${(h.pnl_percent ?? 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {(h.pnl_percent ?? 0) >= 0 ? "+" : ""}
                      {(h.pnl_percent ?? 0).toFixed(1)}%
                    </p>
                  )}
                </div>

                <div className="col-span-1 flex justify-end">
                  <button
                    onClick={() => removeHolding(h.id)}
                    className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-700 rounded transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Stock Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">Add Stock</h2>
              <button
                onClick={() => { setShowModal(false); setFormError(""); }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">
                  Stock Symbol
                </label>
                <input
                  type="text"
                  placeholder="e.g. TCS, RELIANCE"
                  value={form.symbol}
                  onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 text-sm"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1 block">
                  Quantity (shares)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 10"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 text-sm"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1 block">
                  Buy Price (₹ per share)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 2200"
                  value={form.buy_price}
                  onChange={(e) => setForm({ ...form, buy_price: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 text-sm"
                />
              </div>

              {form.symbol && form.quantity && form.buy_price && (
                <div className="bg-gray-800 rounded-lg p-3 text-sm">
                  <div className="flex justify-between text-gray-400">
                    <span>Total Investment</span>
                    <span className="text-white font-medium">
                      ₹{(parseFloat(form.quantity) * parseFloat(form.buy_price)).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              )}

              {formError && (
                <p className="text-red-400 text-sm">{formError}</p>
              )}

              <button
                onClick={addHolding}
                disabled={adding || !form.symbol || !form.quantity || !form.buy_price}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-700 text-white font-semibold py-3 rounded-lg transition"
              >
                {adding ? "Adding..." : "Add to Portfolio"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}