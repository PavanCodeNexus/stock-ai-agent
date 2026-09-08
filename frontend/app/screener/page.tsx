"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/AuthContext";
import Navbar from "../components/Navbar";
import {
  Filter, Search, TrendingUp, TrendingDown,
  RefreshCw, Zap, Flame, Gem, Rocket,
  DollarSign, BarChart2, X
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

const NSE_STOCKS = [
  "TCS","RELIANCE","HDFCBANK","INFY","WIPRO",
  "TATAMOTORS","BAJFINANCE","ADANIENT","ICICIBANK",
  "SBIN","HINDUNILVR","KOTAKBANK","LT","AXISBANK",
  "ASIANPAINT","MARUTI","SUNPHARMA","TITAN",
  "ULTRACEMCO","NESTLEIND","POWERGRID","NTPC",
  "ONGC","COALINDIA","BPCL","TECHM","HCLTECH",
  "DIVISLAB","DRREDDY","CIPLA"
];

const PRESETS = [
  {
    name: "Top Gainers",
    icon: Flame,
    color: "#00FF88",
    bg: "rgba(0,255,136,0.08)",
    border: "rgba(0,255,136,0.2)",
    desc: "Up 2%+ today",
    filters: { minPrice:"",maxPrice:"",minPE:"",maxPE:"",minChange:"2",maxChange:"",minROE:"" }
  },
  {
    name: "Top Losers",
    icon: TrendingDown,
    color: "#FF3B5C",
    bg: "rgba(255,59,92,0.08)",
    border: "rgba(255,59,92,0.2)",
    desc: "Down 2%+ today",
    filters: { minPrice:"",maxPrice:"",minPE:"",maxPE:"",minChange:"",maxChange:"-2",minROE:"" }
  },
  {
    name: "Undervalued",
    icon: Gem,
    color: "#00D4FF",
    bg: "rgba(0,212,255,0.08)",
    border: "rgba(0,212,255,0.2)",
    desc: "PE below 15",
    filters: { minPrice:"",maxPrice:"",minPE:"",maxPE:"15",minChange:"",maxChange:"",minROE:"" }
  },
  {
    name: "High ROE",
    icon: Rocket,
    color: "#7B2FFF",
    bg: "rgba(123,47,255,0.08)",
    border: "rgba(123,47,255,0.2)",
    desc: "ROE above 20%",
    filters: { minPrice:"",maxPrice:"",minPE:"",maxPE:"",minChange:"",maxChange:"",minROE:"20" }
  },
  {
    name: "Mid Range",
    icon: DollarSign,
    color: "#FFB800",
    bg: "rgba(255,184,0,0.08)",
    border: "rgba(255,184,0,0.2)",
    desc: "₹500 - ₹2000",
    filters: { minPrice:"500",maxPrice:"2000",minPE:"",maxPE:"",minChange:"",maxChange:"",minROE:"" }
  },
];

export default function ScreenerPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [results, setResults] = useState<StockResult[]>([]);
  const [screening, setScreening] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStock, setCurrentStock] = useState("");
  const [filters, setFilters] = useState<Filters>({
    minPrice:"",maxPrice:"",minPE:"",maxPE:"",
    minChange:"",maxChange:"",minROE:"",
  });
  const [sortBy, setSortBy] = useState<keyof StockResult>("change_percent");
  const [sortDir, setSortDir] = useState<"asc"|"desc">("desc");
  const [activePreset, setActivePreset] = useState<string|null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  const runScreener = async (customFilters?: Filters) => {
    const f = customFilters || filters;
    setScreening(true);
    setResults([]);
    setProgress(0);

    const matched: StockResult[] = [];

    for (let i = 0; i < NSE_STOCKS.length; i++) {
      const symbol = NSE_STOCKS[i];
      setCurrentStock(symbol);
      setProgress(Math.round(((i + 1) / NSE_STOCKS.length) * 100));

      try {
        const [priceRes, finRes] = await Promise.all([
          fetch(`${API}/api/market/price/${symbol}`),
          fetch(`${API}/api/market/financials/${symbol}`),
        ]);

        if (!priceRes.ok || !finRes.ok) continue;

        const price = await priceRes.json();
        const fin   = await finRes.json();

        if (!price || price.error || !price.current_price) continue;

        const stock: StockResult = {
          symbol,
          company_name:  price.company_name || symbol,
          current_price: Number(price.current_price) || 0,
          change_percent:Number(price.change_percent) || 0,
          pe_ratio:      Number(price.pe_ratio) || Number(fin?.valuation?.pe_ratio) || 0,
          market_cap:    Number(price.market_cap) || 0,
          volume:        Number(price.volume) || 0,
          week_52_high:  Number(price["52_week_high"]) || 0,
          week_52_low:   Number(price["52_week_low"]) || 0,
          profit_margin: (Number(fin?.profitability?.profit_margin) || 0) * 100,
          roe:           (Number(fin?.profitability?.roe) || 0) * 100,
        };

        // Apply filters
        if (f.minPrice  && stock.current_price < parseFloat(f.minPrice))  continue;
        if (f.maxPrice  && stock.current_price > parseFloat(f.maxPrice))  continue;
        if (f.minPE     && stock.pe_ratio < parseFloat(f.minPE))          continue;
        if (f.maxPE     && (stock.pe_ratio <= 0 || stock.pe_ratio > parseFloat(f.maxPE))) continue;
        if (f.minChange && stock.change_percent < parseFloat(f.minChange)) continue;
        if (f.maxChange && stock.change_percent > parseFloat(f.maxChange)) continue;
        if (f.minROE    && stock.roe < parseFloat(f.minROE))              continue;

        matched.push(stock);
        setResults([...matched]);
      } catch {
        continue;
      }

      // Small delay to avoid rate limiting
      await new Promise((r) => setTimeout(r, 200));
    }

    setScreening(false);
    setCurrentStock("");
    setProgress(100);
  };

  const handlePreset = (preset: typeof PRESETS[0]) => {
    setActivePreset(preset.name);
    setFilters(preset.filters);
    runScreener(preset.filters);
  };

  const handleSort = (key: keyof StockResult) => {
    if (sortBy === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortBy(key); setSortDir("desc"); }
  };

  const sorted = [...results].sort((a, b) => {
    const av = a[sortBy] as number;
    const bv = b[sortBy] as number;
    return sortDir === "asc" ? av - bv : bv - av;
  });

  const fmtMktCap = (v: number) => {
    if (v >= 1e12) return `₹${(v/1e12).toFixed(1)}T`;
    if (v >= 1e9)  return `₹${(v/1e9).toFixed(1)}B`;
    if (v >= 1e7)  return `₹${(v/1e7).toFixed(1)}Cr`;
    return `₹${v.toLocaleString()}`;
  };

  const SortBtn = ({ col, label }: { col: keyof StockResult; label: string }) => (
    <button onClick={() => handleSort(col)}
            className="flex items-center gap-1 transition-colors hover:text-white">
      {label}
      {sortBy === col && (
        <span style={{ color: "var(--cyan)" }}>{sortDir === "asc" ? "↑" : "↓"}</span>
      )}
    </button>
  );

  if (loading) return <Loader />;
  if (!user) return null;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* Header */}
<div className="flex items-center gap-2 px-5 py-3 text-xs uppercase tracking-widest font-medium border-b"
     style={{ color: "var(--text-muted)", borderColor: "var(--border-subtle)" }}>
  <div style={{ width: "25%" }}>Stock</div>
  <div style={{ width: "15%", textAlign: "right" }}>
    <SortBtn col="current_price" label="Price" />
  </div>
  <div style={{ width: "15%", textAlign: "right" }}>
    <SortBtn col="change_percent" label="Change" />
  </div>
  <div style={{ width: "10%", textAlign: "right" }}>
    <SortBtn col="pe_ratio" label="PE" />
  </div>
  <div style={{ width: "15%", textAlign: "right" }}>
    <SortBtn col="roe" label="ROE %" />
  </div>
  <div style={{ width: "20%", textAlign: "right" }}>
    <SortBtn col="market_cap" label="Mkt Cap" />
  </div>
</div>

{/* Rows */}
{sorted.map((stock) => (
  <div
    key={stock.symbol}
    onClick={() => router.push(`/dashboard?symbol=${stock.symbol}`)}
    className="flex items-center gap-2 px-5 py-3.5 border-b table-row"
    style={{ borderColor: "var(--border-subtle)" }}
  >
    <div style={{ width: "25%" }}>
      <p className="font-bold text-white text-sm">{stock.symbol}</p>
      <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
        {stock.company_name}
      </p>
    </div>
    <div style={{ width: "15%", textAlign: "right" }}>
      <p className="text-sm font-semibold text-white number-display">
        ₹{stock.current_price.toLocaleString("en-IN")}
      </p>
    </div>
    <div style={{ width: "15%", textAlign: "right" }}>
      <span className={`inline-flex items-center justify-end gap-1 text-sm font-semibold ${
        stock.change_percent >= 0 ? "positive" : "negative"
      }`}>
        {stock.change_percent >= 0
          ? <TrendingUp className="w-3 h-3" />
          : <TrendingDown className="w-3 h-3" />}
        {stock.change_percent >= 0 ? "+" : ""}
        {stock.change_percent.toFixed(2)}%
      </span>
    </div>
    <div style={{ width: "10%", textAlign: "right" }}>
      <p className="text-sm number-display"
         style={{
           color: stock.pe_ratio > 0 && stock.pe_ratio < 20
             ? "var(--green)" : "var(--text-secondary)"
         }}>
        {stock.pe_ratio > 0 ? stock.pe_ratio.toFixed(1) : "N/A"}
      </p>
    </div>
    <div style={{ width: "15%", textAlign: "right" }}>
      <span className="text-sm font-semibold number-display"
            style={{
              color: stock.roe > 20 ? "var(--green)"
                   : stock.roe > 10 ? "var(--gold)"
                   : "var(--text-secondary)",
            }}>
        {stock.roe > 0 ? `${stock.roe.toFixed(1)}%` : "N/A"}
      </span>
    </div>
    <div style={{ width: "20%", textAlign: "right" }}>
      <p className="text-sm number-display"
         style={{ color: "var(--text-secondary)" }}>
        {fmtMktCap(stock.market_cap)}
      </p>
    </div>
  </div>
))}

        {/* Preset Cards */}
        <div className="mb-6 animate-fadeIn">
          <p className="text-xs uppercase tracking-widest font-medium mb-3 flex items-center gap-2"
             style={{ color: "var(--text-muted)" }}>
            <Zap className="w-3.5 h-3.5" style={{ color: "var(--gold)" }} />
            Quick Screeners
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {PRESETS.map((preset) => {
              const Icon = preset.icon;
              const isActive = activePreset === preset.name;
              return (
                <button
                  key={preset.name}
                  onClick={() => handlePreset(preset)}
                  disabled={screening}
                  className="p-4 rounded-xl text-left transition-all duration-200"
                  style={{
                    background: isActive ? preset.bg : "var(--bg-surface)",
                    border: `1px solid ${isActive ? preset.border : "var(--border-subtle)"}`,
                    transform: isActive ? "scale(1.02)" : "scale(1)",
                    boxShadow: isActive ? `0 0 20px ${preset.color}20` : "none",
                    opacity: screening && !isActive ? 0.5 : 1,
                  }}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2"
                       style={{ background: preset.bg, border: `1px solid ${preset.border}` }}>
                    <Icon className="w-4 h-4" style={{ color: preset.color }} />
                  </div>
                  <p className="text-sm font-semibold text-white">{preset.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{preset.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Filters */}
        <div className="glass mb-6 animate-fadeIn overflow-hidden">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full flex items-center justify-between px-5 py-4 transition-all"
          >
            <span className="text-sm font-semibold text-white flex items-center gap-2">
              <Filter className="w-4 h-4" style={{ color: "var(--cyan)" }} />
              Custom Filters
            </span>
            <span className="text-xs px-2 py-1 rounded-lg"
                  style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}>
              {showFilters ? "Hide ↑" : "Show ↓"}
            </span>
          </button>

          {showFilters && (
            <div className="px-5 pb-5 border-t animate-fadeIn"
                 style={{ borderColor: "var(--border-subtle)" }}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                {[
                  { label: "Min Price (₹)", key: "minPrice", placeholder: "0"    },
                  { label: "Max Price (₹)", key: "maxPrice", placeholder: "Any"  },
                  { label: "Min PE",        key: "minPE",    placeholder: "0"    },
                  { label: "Max PE",        key: "maxPE",    placeholder: "Any"  },
                  { label: "Min Change %",  key: "minChange",placeholder: "-100" },
                  { label: "Max Change %",  key: "maxChange",placeholder: "100"  },
                  { label: "Min ROE %",     key: "minROE",   placeholder: "0"    },
                ].map(({ label, key, placeholder }) => (
                  <div key={key}>
                    <label className="text-xs font-medium block mb-1.5"
                           style={{ color: "var(--text-muted)" }}>
                      {label}
                    </label>
                    <input
                      type="number"
                      placeholder={placeholder}
                      value={filters[key as keyof Filters]}
                      onChange={(e) => setFilters({ ...filters, [key]: e.target.value })}
                      className="input-field text-sm py-2.5"
                    />
                  </div>
                ))}
                <div className="flex items-end">
                  <button
                    onClick={() => { setActivePreset(null); runScreener(); }}
                    disabled={screening}
                    className="btn-primary w-full justify-center"
                  >
                    {screening
                      ? <><RefreshCw className="w-4 h-4 animate-spin" /> Scanning...</>
                      : <><Search className="w-4 h-4" /> Run</>}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Progress */}
        {screening && (
          <div className="glass p-5 mb-6 animate-fadeIn">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full animate-pulse"
                     style={{ background: "var(--purple)" }} />
                <span className="text-sm font-medium text-white">
                  Scanning {currentStock}...
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold" style={{ color: "var(--cyan)" }}>
                  {results.length} matched
                </span>
                <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                  {progress}%
                </span>
              </div>
            </div>
            <div className="w-full rounded-full h-2" style={{ background: "var(--border-subtle)" }}>
              <div className="h-2 rounded-full transition-all duration-300"
                   style={{ width: `${progress}%`, background: "var(--grad-purple)" }} />
            </div>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="animate-fadeIn">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                <span className="text-white font-bold text-lg">{results.length}</span>
                {" "}stocks matched • click to analyze
              </p>
              <button
                onClick={() => { setResults([]); setProgress(0); setActivePreset(null); }}
                className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all"
                style={{ color: "var(--text-muted)", border: "1px solid var(--border-subtle)" }}
              >
                <X className="w-3 h-3" /> Clear
              </button>
            </div>

            <div className="glass overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-12 gap-2 px-5 py-3 text-xs uppercase tracking-widest font-medium border-b"
                   style={{ color: "var(--text-muted)", borderColor: "var(--border-subtle)" }}>
                <div className="col-span-3">Stock</div>
                <div className="col-span-2 text-right"><SortBtn col="current_price" label="Price" /></div>
                <div className="col-span-2 text-right"><SortBtn col="change_percent" label="Change" /></div>
                <div className="col-span-1 text-right"><SortBtn col="pe_ratio" label="PE" /></div>
                <div className="col-span-2 text-right"><SortBtn col="roe" label="ROE %" /></div>
                <div className="col-span-2 text-right"><SortBtn col="market_cap" label="Mkt Cap" /></div>
              </div>

              {sorted.map((stock, idx) => (
                <div
                  key={stock.symbol}
                  onClick={() => router.push(`/dashboard?symbol=${stock.symbol}`)}
                  className="grid grid-cols-12 gap-2 px-5 py-3.5 border-b table-row items-center"
                  style={{ borderColor: "var(--border-subtle)" }}
                >
                  <div className="col-span-3">
                    <p className="font-bold text-white text-sm">{stock.symbol}</p>
                    <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                      {stock.company_name}
                    </p>
                  </div>
                  <div className="col-span-2 text-right">
                    <p className="text-sm font-semibold text-white number-display">
                      ₹{stock.current_price.toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className={`inline-flex items-center gap-1 text-sm font-semibold ${
                      stock.change_percent >= 0 ? "positive" : "negative"
                    }`}>
                      {stock.change_percent >= 0
                        ? <TrendingUp className="w-3 h-3" />
                        : <TrendingDown className="w-3 h-3" />}
                      {stock.change_percent >= 0 ? "+" : ""}
                      {stock.change_percent.toFixed(2)}%
                    </span>
                  </div>
                  <div className="col-span-1 text-right">
                    <p className="text-sm number-display"
                       style={{ color: stock.pe_ratio > 0 && stock.pe_ratio < 20 ? "var(--green)" : "var(--text-secondary)" }}>
                      {stock.pe_ratio > 0 ? stock.pe_ratio.toFixed(1) : "N/A"}
                    </p>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-sm font-semibold number-display"
                          style={{
                            color: stock.roe > 20 ? "var(--green)"
                                 : stock.roe > 10 ? "var(--gold)"
                                 : "var(--text-secondary)",
                          }}>
                      {stock.roe > 0 ? `${stock.roe.toFixed(1)}%` : "N/A"}
                    </span>
                  </div>
                  <div className="col-span-2 text-right">
                    <p className="text-sm number-display" style={{ color: "var(--text-secondary)" }}>
                      {fmtMktCap(stock.market_cap)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!screening && results.length === 0 && progress === 0 && (
          <div className="glass p-16 text-center animate-fadeIn">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                 style={{ background: "rgba(123,47,255,0.1)", border: "1px solid rgba(123,47,255,0.2)" }}>
              <BarChart2 className="w-8 h-8" style={{ color: "var(--purple)" }} />
            </div>
            <p className="text-white font-semibold mb-1">Ready to screen stocks</p>
            <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
              Pick a quick screener above or set custom filters
            </p>
            <button onClick={() => runScreener()} className="btn-primary">
              <Filter className="w-4 h-4" />
              Screen All {NSE_STOCKS.length} Stocks
            </button>
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
           style={{ borderColor: "var(--purple)" }} />
    </div>
  );
}