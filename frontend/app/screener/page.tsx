"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/AuthContext";
import Navbar from "../components/Navbar";
import {
  Filter, Search, TrendingUp, TrendingDown,
  RefreshCw, Zap
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface StockResult {
  symbol: string;
  company_name: string;
  current_price: number;
  change_percent: number;
  pe_ratio: number;
  market_cap: number;
  volume: number;
  week_52_high: number;
  week_52_low: number;
  profit_margin: number;
  roe: number;
}

interface Filters {
  minPrice: string;
  maxPrice: string;
  minPE: string;
  maxPE: string;
  minChange: string;
  maxChange: string;
  minROE: string;
}

// Popular NSE stocks to screen
const NSE_STOCKS = [
  "TCS", "RELIANCE", "HDFCBANK", "INFY", "WIPRO",
  "TATAMOTORS", "BAJFINANCE", "ADANIENT", "ICICIBANK",
  "SBIN", "HINDUNILVR", "KOTAKBANK", "LT", "AXISBANK",
  "ASIANPAINT", "MARUTI", "SUNPHARMA", "TITAN",
  "ULTRACEMCO", "NESTLEIND", "POWERGRID", "NTPC",
  "ONGC", "COALINDIA", "BPCL", "TECHM", "HCLTECH",
  "DIVISLAB", "DRREDDY", "CIPLA"
];

// Preset screeners
const PRESETS = [
  {
    name: "🔥 Top Gainers",
    description: "Stocks up more than 2% today",
    filters: { minPrice: "", maxPrice: "", minPE: "", maxPE: "", minChange: "2", maxChange: "", minROE: "" }
  },
  {
    name: "📉 Top Losers",
    description: "Stocks down more than 2% today",
    filters: { minPrice: "", maxPrice: "", minPE: "", maxPE: "", minChange: "", maxChange: "-2", minROE: "" }
  },
  {
    name: "💎 Undervalued",
    description: "Low PE ratio stocks (PE < 15)",
    filters: { minPrice: "", maxPrice: "", minPE: "", maxPE: "15", minChange: "", maxChange: "", minROE: "" }
  },
  {
    name: "🚀 High ROE",
    description: "Strong return on equity (ROE > 20%)",
    filters: { minPrice: "", maxPrice: "", minPE: "", maxPE: "", minChange: "", maxChange: "", minROE: "20" }
  },
  {
    name: "💰 Mid Price",
    description: "Stocks between ₹500-₹2000",
    filters: { minPrice: "500", maxPrice: "2000", minPE: "", maxPE: "", minChange: "", maxChange: "", minROE: "" }
  },
];

export default function ScreenerPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [results, setResults] = useState<StockResult[]>([]);
  const [screening, setScreening] = useState(false);
  const [progress, setProgress] = useState(0);
  const [filters, setFilters] = useState<Filters>({
    minPrice: "", maxPrice: "",
    minPE: "", maxPE: "",
    minChange: "", maxChange: "",
    minROE: "",
  });
  const [sortBy, setSortBy] = useState<keyof StockResult>("change_percent");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [activePreset, setActivePreset] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  const runScreener = async (customFilters?: Filters) => {
    const activeFilters = customFilters || filters;
    setScreening(true);
    setResults([]);
    setProgress(0);

    const matched: StockResult[] = [];

    for (let i = 0; i < NSE_STOCKS.length; i++) {
      const symbol = NSE_STOCKS[i];
      setProgress(Math.round(((i + 1) / NSE_STOCKS.length) * 100));

      try {
        const [priceRes, finRes] = await Promise.all([
          fetch(`${API}/api/market/price/${symbol}`),
          fetch(`${API}/api/market/financials/${symbol}`),
        ]);

        const price = await priceRes.json();
        const fin = await finRes.json();

        if (price.error) continue;

        const stock: StockResult = {
          symbol,
          company_name: price.company_name || symbol,
          current_price: price.current_price || 0,
          change_percent: price.change_percent || 0,
          pe_ratio: price.pe_ratio || fin?.valuation?.pe_ratio || 0,
          market_cap: price.market_cap || 0,
          volume: price.volume || 0,
          week_52_high: price["52_week_high"] || 0,
          week_52_low: price["52_week_low"] || 0,
          profit_margin: (fin?.profitability?.profit_margin || 0) * 100,
          roe: (fin?.profitability?.roe || 0) * 100,
        };

        // Apply filters
        if (activeFilters.minPrice && stock.current_price < parseFloat(activeFilters.minPrice)) continue;
        if (activeFilters.maxPrice && stock.current_price > parseFloat(activeFilters.maxPrice)) continue;
        if (activeFilters.minPE && stock.pe_ratio < parseFloat(activeFilters.minPE)) continue;
        if (activeFilters.maxPE && (stock.pe_ratio <= 0 || stock.pe_ratio > parseFloat(activeFilters.maxPE))) continue;
        if (activeFilters.minChange && stock.change_percent < parseFloat(activeFilters.minChange)) continue;
        if (activeFilters.maxChange && stock.change_percent > parseFloat(activeFilters.maxChange)) continue;
        if (activeFilters.minROE && stock.roe < parseFloat(activeFilters.minROE)) continue;

        matched.push(stock);
        setResults([...matched]);
      } catch {
        continue;
      }
    }

    setScreening(false);
    setProgress(100);
  };

  const handlePreset = (preset: typeof PRESETS[0]) => {
    setActivePreset(preset.name);
    setFilters(preset.filters);
    runScreener(preset.filters);
  };

  const handleSort = (key: keyof StockResult) => {
    if (sortBy === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortDir("desc");
    }
  };

  const sorted = [...results].sort((a, b) => {
    const aVal = a[sortBy] as number;
    const bVal = b[sortBy] as number;
    return sortDir === "asc" ? aVal - bVal : bVal - aVal;
  });

  const formatMarketCap = (val: number) => {
    if (val >= 1e12) return `₹${(val / 1e12).toFixed(1)}T`;
    if (val >= 1e9)  return `₹${(val / 1e9).toFixed(1)}B`;
    if (val >= 1e7)  return `₹${(val / 1e7).toFixed(1)}Cr`;
    return `₹${val.toLocaleString()}`;
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

      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Filter className="text-purple-400 w-6 h-6" />
            Stock Screener
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Filter {NSE_STOCKS.length} NSE stocks based on your criteria
          </p>
        </div>

        {/* Preset Screeners */}
        <div className="mb-6">
          <p className="text-sm text-gray-400 mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            Quick Screeners
          </p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => handlePreset(preset)}
                disabled={screening}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition border ${
                  activePreset === preset.name
                    ? "bg-purple-900/30 border-purple-600 text-purple-300"
                    : "bg-gray-800 border-gray-700 text-gray-300 hover:border-purple-500 hover:text-white"
                } disabled:opacity-50`}
                title={preset.description}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Filters */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 mb-6">
          <p className="text-sm font-medium text-gray-300 mb-4">
            Custom Filters
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {/* Price Range */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Min Price (₹)</label>
              <input
                type="number"
                placeholder="0"
                value={filters.minPrice}
                onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Max Price (₹)</label>
              <input
                type="number"
                placeholder="Any"
                value={filters.maxPrice}
                onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* PE Ratio */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Min PE</label>
              <input
                type="number"
                placeholder="0"
                value={filters.minPE}
                onChange={(e) => setFilters({ ...filters, minPE: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Max PE</label>
              <input
                type="number"
                placeholder="Any"
                value={filters.maxPE}
                onChange={(e) => setFilters({ ...filters, maxPE: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Change % */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Min Change %</label>
              <input
                type="number"
                placeholder="-100"
                value={filters.minChange}
                onChange={(e) => setFilters({ ...filters, minChange: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Max Change %</label>
              <input
                type="number"
                placeholder="100"
                value={filters.maxChange}
                onChange={(e) => setFilters({ ...filters, maxChange: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* ROE */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Min ROE %</label>
              <input
                type="number"
                placeholder="0"
                value={filters.minROE}
                onChange={(e) => setFilters({ ...filters, minROE: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Run Button */}
            <div className="flex items-end">
              <button
                onClick={() => { setActivePreset(null); runScreener(); }}
                disabled={screening}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white rounded-lg text-sm font-medium transition"
              >
                {screening
                  ? <RefreshCw className="w-4 h-4 animate-spin" />
                  : <Search className="w-4 h-4" />}
                {screening ? "Screening..." : "Run Screener"}
              </button>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {screening && (
          <div className="mb-6">
            <div className="flex justify-between text-xs text-gray-400 mb-2">
              <span>Scanning stocks...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div
                className="bg-purple-500 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {results.length} stocks matched so far
            </p>
          </div>
        )}

        {/* Results */}
        {(results.length > 0 || (!screening && progress === 100)) && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-400">
                <span className="text-white font-semibold">{results.length}</span> stocks matched
              </p>
              <p className="text-xs text-gray-500">
                Click column headers to sort
              </p>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-gray-700 text-xs text-gray-500 font-medium uppercase">
                <div className="col-span-3">Stock</div>
                <button
                  className="col-span-2 text-right hover:text-white transition"
                  onClick={() => handleSort("current_price")}
                >
                  Price {sortBy === "current_price" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                </button>
                <button
                  className="col-span-2 text-right hover:text-white transition"
                  onClick={() => handleSort("change_percent")}
                >
                  Change {sortBy === "change_percent" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                </button>
                <button
                  className="col-span-1 text-right hover:text-white transition"
                  onClick={() => handleSort("pe_ratio")}
                >
                  PE {sortBy === "pe_ratio" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                </button>
                <button
                  className="col-span-2 text-right hover:text-white transition"
                  onClick={() => handleSort("roe")}
                >
                  ROE% {sortBy === "roe" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                </button>
                <button
                  className="col-span-2 text-right hover:text-white transition"
                  onClick={() => handleSort("market_cap")}
                >
                  Mkt Cap {sortBy === "market_cap" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                </button>
              </div>

              {/* Rows */}
              {sorted.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400">No stocks matched your filters</p>
                  <p className="text-gray-600 text-sm mt-1">Try adjusting your criteria</p>
                </div>
              ) : (
                sorted.map((stock) => (
                  <div
                    key={stock.symbol}
                    onClick={() => router.push(`/dashboard?symbol=${stock.symbol}`)}
                    className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-gray-700/50 last:border-0 hover:bg-gray-700/30 transition items-center cursor-pointer"
                  >
                    <div className="col-span-3">
                      <p className="font-semibold text-white text-sm">{stock.symbol}</p>
                      <p className="text-xs text-gray-500 truncate">{stock.company_name}</p>
                    </div>

                    <div className="col-span-2 text-right">
                      <p className="text-sm text-white font-medium">
                        ₹{stock.current_price.toLocaleString("en-IN")}
                      </p>
                    </div>

                    <div className="col-span-2 text-right">
                      <div className={`inline-flex items-center gap-1 text-sm font-medium ${
                        stock.change_percent >= 0 ? "text-green-400" : "text-red-400"
                      }`}>
                        {stock.change_percent >= 0
                          ? <TrendingUp className="w-3 h-3" />
                          : <TrendingDown className="w-3 h-3" />}
                        {stock.change_percent >= 0 ? "+" : ""}
                        {stock.change_percent.toFixed(2)}%
                      </div>
                    </div>

                    <div className="col-span-1 text-right">
                      <p className="text-sm text-gray-300">
                        {stock.pe_ratio > 0 ? stock.pe_ratio.toFixed(1) : "N/A"}
                      </p>
                    </div>

                    <div className="col-span-2 text-right">
                      <p className={`text-sm font-medium ${
                        stock.roe > 20 ? "text-green-400" :
                        stock.roe > 10 ? "text-yellow-400" : "text-gray-400"
                      }`}>
                        {stock.roe > 0 ? `${stock.roe.toFixed(1)}%` : "N/A"}
                      </p>
                    </div>

                    <div className="col-span-2 text-right">
                      <p className="text-sm text-gray-300">
                        {formatMarketCap(stock.market_cap)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!screening && results.length === 0 && progress === 0 && (
          <div className="text-center py-20 bg-gray-800 border border-gray-700 rounded-xl">
            <Filter className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">Ready to screen stocks</p>
            <p className="text-gray-600 text-sm mt-1 mb-4">
              Use quick screeners or set custom filters above
            </p>
            <button
              onClick={() => runScreener()}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition"
            >
              Screen All Stocks
            </button>
          </div>
        )}
      </div>
    </div>
  );
}