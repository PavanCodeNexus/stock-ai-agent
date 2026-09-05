"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabase";
import Navbar from "../components/Navbar";
import {
  Eye, Trash2, TrendingUp, TrendingDown,
  RefreshCw, Search
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
      // Fetch prices for all stocks
      data.forEach((item) => fetchPrice(item.symbol));
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
                loadingPrice: false,
              }
            : item
        )
      );
    } catch {
      setWatchlist((prev) =>
        prev.map((item) =>
          item.symbol === symbol
            ? { ...item, loadingPrice: false }
            : item
        )
      );
    }
  };

  const addToWatchlist = async () => {
    if (!addSymbol.trim() || !user) return;
    setAdding(true);
    setError("");

    const symbol = addSymbol.toUpperCase().trim();

    // Check if already exists
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

    // Verify stock exists
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
        symbol: symbol,
        company_name: data.company_name || symbol,
      });

      setAddSymbol("");
      fetchWatchlist();
    } catch {
      setError("Failed to add stock");
    }

    setAdding(false);
  };

  const removeFromWatchlist = async (id: string, symbol: string) => {
    await supabase.from("watchlist").delete().eq("id", id);
    setWatchlist((prev) => prev.filter((item) => item.id !== id));
  };

  const refreshPrices = () => {
    setWatchlist((prev) =>
      prev.map((item) => ({ ...item, loadingPrice: true }))
    );
    watchlist.forEach((item) => fetchPrice(item.symbol));
  };

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
      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Eye className="text-blue-400 w-6 h-6" />
              My Watchlist
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Track stocks you want to monitor
            </p>
          </div>
          <button
            onClick={refreshPrices}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-400 hover:text-white transition"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Add Stock */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-6">
          <p className="text-sm text-gray-400 mb-3">Add stock to watchlist</p>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Enter symbol (e.g. TCS, RELIANCE)"
              value={addSymbol}
              onChange={(e) => setAddSymbol(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && addToWatchlist()}
              className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
            />
            <button
              onClick={addToWatchlist}
              disabled={adding || !addSymbol}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white rounded-lg text-sm font-medium transition"
            >
              {adding
                ? <RefreshCw className="w-4 h-4 animate-spin" />
                : <Search className="w-4 h-4" />}
              {adding ? "Adding..." : "Add"}
            </button>
          </div>
          {error && (
            <p className="text-red-400 text-sm mt-2">{error}</p>
          )}
        </div>

        {/* Watchlist Table */}
        {fetching ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : watchlist.length === 0 ? (
          <div className="text-center py-20 bg-gray-800 border border-gray-700 rounded-xl">
            <Eye className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">Your watchlist is empty</p>
            <p className="text-gray-600 text-sm mt-1">
              Add stocks above to start monitoring them
            </p>
          </div>
        ) : (
          <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-gray-700 text-xs text-gray-500 font-medium uppercase">
              <div className="col-span-4">Stock</div>
              <div className="col-span-2 text-right">Price</div>
              <div className="col-span-2 text-right">Change</div>
              <div className="col-span-2 text-right">Change %</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            {/* Table Rows */}
            {watchlist.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-12 gap-4 px-4 py-4 border-b border-gray-700/50 last:border-0 hover:bg-gray-700/30 transition items-center"
              >
                {/* Stock name */}
                <div className="col-span-4">
                  <p className="font-semibold text-white">{item.symbol}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {item.company_name}
                  </p>
                </div>

                {/* Price */}
                <div className="col-span-2 text-right">
                  {item.loadingPrice ? (
                    <div className="w-16 h-4 bg-gray-700 rounded animate-pulse ml-auto" />
                  ) : (
                    <p className="font-medium text-white">
                      ₹{item.price?.toLocaleString("en-IN") ?? "N/A"}
                    </p>
                  )}
                </div>

                {/* Change */}
                <div className="col-span-2 text-right">
                  {item.loadingPrice ? (
                    <div className="w-12 h-4 bg-gray-700 rounded animate-pulse ml-auto" />
                  ) : (
                    <p className={`text-sm font-medium ${
                      (item.change ?? 0) >= 0 ? "text-green-400" : "text-red-400"
                    }`}>
                      {(item.change ?? 0) >= 0 ? "+" : ""}
                      {item.change?.toFixed(2) ?? "0"}
                    </p>
                  )}
                </div>

                {/* Change % */}
                <div className="col-span-2 text-right">
                  {item.loadingPrice ? (
                    <div className="w-12 h-4 bg-gray-700 rounded animate-pulse ml-auto" />
                  ) : (
                    <div className={`inline-flex items-center gap-1 text-sm font-medium ${
                      (item.change_percent ?? 0) >= 0 ? "text-green-400" : "text-red-400"
                    }`}>
                      {(item.change_percent ?? 0) >= 0
                        ? <TrendingUp className="w-3 h-3" />
                        : <TrendingDown className="w-3 h-3" />}
                      {Math.abs(item.change_percent ?? 0).toFixed(2)}%
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="col-span-2 flex items-center justify-end gap-2">
                  <button
                    onClick={() => router.push(`/dashboard?symbol=${item.symbol}`)}
                    className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-gray-700 rounded transition"
                    title="Analyze"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeFromWatchlist(item.id, item.symbol)}
                    className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded transition"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        {watchlist.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-white">{watchlist.length}</p>
              <p className="text-xs text-gray-400 mt-1">Stocks Watching</p>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-400">
                {watchlist.filter((i) => (i.change_percent ?? 0) > 0).length}
              </p>
              <p className="text-xs text-gray-400 mt-1">Gainers Today</p>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-red-400">
                {watchlist.filter((i) => (i.change_percent ?? 0) < 0).length}
              </p>
              <p className="text-xs text-gray-400 mt-1">Losers Today</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}