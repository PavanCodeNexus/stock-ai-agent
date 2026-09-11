"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/AuthContext";
import Navbar from "../components/Navbar";
import {
  Filter, Search, TrendingUp, TrendingDown,
  RefreshCw, Zap, Flame, Gem, Rocket,
  DollarSign, BarChart2, X, Square
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
  "TCS", "RELIANCE", "HDFCBANK", "INFY", "WIPRO",
  "BAJFINANCE", "ADANIENT", "ICICIBANK", "SBIN",
  "HINDUNILVR", "KOTAKBANK", "LT", "AXISBANK",
  "ASIANPAINT", "MARUTI", "SUNPHARMA", "TITAN",
  "ULTRACEMCO", "NESTLEIND", "POWERGRID", "NTPC",
  "ONGC", "COALINDIA", "BPCL", "TECHM", "HCLTECH",
  "DIVISLAB", "DRREDDY", "CIPLA", "BAJAJFINSV",
  "BRITANNIA", "DABUR", "HAVELLS", "TATASTEEL",
  "JSWSTEEL", "M&M", "INDUSINDBK", "IRCTC"
];

const PRESETS = [
  {
    name: "Top Gainers",
    icon: Flame,
    color: "#00FF88",
    bg: "rgba(0,255,136,0.08)",
    border: "rgba(0,255,136,0.2)",
    desc: "Up 2%+ today",
    filters: { minPrice: "", maxPrice: "", minPE: "", maxPE: "", minChange: "2", maxChange: "", minROE: "" },
  },
  {
    name: "Top Losers",
    icon: TrendingDown,
    color: "#FF3B5C",
    bg: "rgba(255,59,92,0.08)",
    border: "rgba(255,59,92,0.2)",
    desc: "Down 2%+ today",
    filters: { minPrice: "", maxPrice: "", minPE: "", maxPE: "", minChange: "", maxChange: "-2", minROE: "" },
  },
  {
    name: "Undervalued",
    icon: Gem,
    color: "#00D4FF",
    bg: "rgba(0,212,255,0.08)",
    border: "rgba(0,212,255,0.2)",
    desc: "PE below 15",
    filters: { minPrice: "", maxPrice: "", minPE: "", maxPE: "15", minChange: "", maxChange: "", minROE: "" },
  },
  {
    name: "High ROE",
    icon: Rocket,
    color: "#7B2FFF",
    bg: "rgba(123,47,255,0.08)",
    border: "rgba(123,47,255,0.2)",
    desc: "ROE above 20%",
    filters: { minPrice: "", maxPrice: "", minPE: "", maxPE: "", minChange: "", maxChange: "", minROE: "20" },
  },
  {
    name: "Mid Range",
    icon: DollarSign,
    color: "#FFB800",
    bg: "rgba(255,184,0,0.08)",
    border: "rgba(255,184,0,0.2)",
    desc: "₹500 – ₹2000",
    filters: { minPrice: "500", maxPrice: "2000", minPE: "", maxPE: "", minChange: "", maxChange: "", minROE: "" },
  },
];

export default function ScreenerPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [results, setResults]           = useState<StockResult[]>([]);
  const [screening, setScreening]       = useState(false);
  const [progress, setProgress]         = useState(0);
  const [currentStock, setCurrentStock] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [filters, setFilters]           = useState<Filters>({
    minPrice: "", maxPrice: "",
    minPE: "",    maxPE: "",
    minChange: "", maxChange: "",
    minROE: "",
  });
  const [sortBy, setSortBy]             = useState<keyof StockResult>("change_percent");
  const [sortDir, setSortDir]           = useState<"asc" | "desc">("desc");
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [showFilters, setShowFilters]   = useState(false);

  // Cancellation and race condition tracking
  const abortControllerRef = useRef<AbortController | null>(null);
  const scanIdRef = useRef<number>(0);
  const isCancelledRef = useRef<boolean>(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      isCancelledRef.current = true;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Complete cancellation and clear handler
  const handleClearOrStop = useCallback(() => {
    isCancelledRef.current = true;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    scanIdRef.current += 1;
    setScreening(false);
    setResults([]);
    setProgress(0);
    setCurrentStock("");
    setActivePreset(null);
    setSearchFilter("");
  }, []);

  const runScreener = async (customFilters?: Filters) => {
    // 1. Cancel any active scan
    isCancelledRef.current = true;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 2. Setup new scan token and AbortController
    const currentScanId = ++scanIdRef.current;
    const controller = new AbortController();
    abortControllerRef.current = controller;
    isCancelledRef.current = false;

    const f = customFilters || filters;
    setScreening(true);
    setResults([]);
    setProgress(0);

    const matched: StockResult[] = [];
    const BATCH_SIZE = 4;

    for (let i = 0; i < NSE_STOCKS.length; i += BATCH_SIZE) {
      if (isCancelledRef.current || controller.signal.aborted || scanIdRef.current !== currentScanId) {
        return;
      }

      const chunk = NSE_STOCKS.slice(i, i + BATCH_SIZE);
      setCurrentStock(chunk.join(", "));
      setProgress(Math.round(((i + chunk.length) / NSE_STOCKS.length) * 100));

      const chunkPromises = chunk.map(async (symbol) => {
        try {
          if (isCancelledRef.current || controller.signal.aborted || scanIdRef.current !== currentScanId) {
            return null;
          }

          const [priceRes, finRes] = await Promise.all([
            fetch(`${API}/api/market/price/${symbol}`, { signal: controller.signal }),
            fetch(`${API}/api/market/financials/${symbol}`, { signal: controller.signal }),
          ]);

          if (isCancelledRef.current || controller.signal.aborted || scanIdRef.current !== currentScanId) {
            return null;
          }

          const price = priceRes.ok ? await priceRes.json().catch(() => null) : null;
          const fin   = finRes.ok ? await finRes.json().catch(() => null) : null;

          if (isCancelledRef.current || controller.signal.aborted || scanIdRef.current !== currentScanId) {
            return null;
          }

          if (!price || price.error || !price.current_price) return null;

          const stock: StockResult = {
            symbol,
            company_name:   price.company_name  || symbol,
            current_price:  Number(price.current_price)  || 0,
            change_percent: Number(price.change_percent) || 0,
            pe_ratio:       Number(price.pe_ratio) || Number(fin?.valuation?.pe_ratio) || 0,
            market_cap:     Number(price.market_cap) || Number(fin?.valuation?.market_cap) || 0,
            volume:         Number(price.volume)     || 0,
            week_52_high:   Number(price["52_week_high"]) || 0,
            week_52_low:    Number(price["52_week_low"])  || 0,
            profit_margin:  (Number(fin?.profitability?.profit_margin) || 0) * 100,
            roe:            (Number(fin?.profitability?.roe) || 0) * 100,
          };

          if (f.minPrice  && stock.current_price  < parseFloat(f.minPrice))  return null;
          if (f.maxPrice  && stock.current_price  > parseFloat(f.maxPrice))  return null;
          if (f.minPE     && stock.pe_ratio       < parseFloat(f.minPE))     return null;
          if (f.maxPE     && (stock.pe_ratio <= 0 || stock.pe_ratio > parseFloat(f.maxPE))) return null;
          if (f.minChange && stock.change_percent < parseFloat(f.minChange)) return null;
          if (f.maxChange && stock.change_percent > parseFloat(f.maxChange)) return null;
          if (f.minROE    && stock.roe            < parseFloat(f.minROE))    return null;

          return stock;
        } catch (err: any) {
          return null;
        }
      });

      const chunkResults = await Promise.all(chunkPromises);

      if (isCancelledRef.current || controller.signal.aborted || scanIdRef.current !== currentScanId) {
        return;
      }

      const validStocks = chunkResults.filter((s): s is StockResult => s !== null);
      if (validStocks.length > 0) {
        matched.push(...validStocks);
        setResults([...matched]);
      }
    }

    if (scanIdRef.current === currentScanId && !isCancelledRef.current && !controller.signal.aborted) {
      setScreening(false);
      setCurrentStock("");
      setProgress(100);
    }
  };

  const handlePreset = (preset: (typeof PRESETS)[0]) => {
    setActivePreset(preset.name);
    setFilters(preset.filters);
    runScreener(preset.filters);
  };

  const handleSort = (key: keyof StockResult) => {
    if (sortBy === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortBy(key); setSortDir("desc"); }
  };

  const filteredResults = results.filter((stock) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toUpperCase().trim();
    return stock.symbol.includes(q) || stock.company_name?.toLowerCase().includes(searchFilter.toLowerCase().trim());
  });

  const sorted = [...filteredResults].sort((a, b) => {
    const av = a[sortBy] as number;
    const bv = b[sortBy] as number;
    return sortDir === "asc" ? av - bv : bv - av;
  });

  const fmtMktCap = (v: number) => {
    if (!v || v <= 0 || !Number.isFinite(v)) return "N/A";
    if (v >= 1e12) return `₹${(v / 1e12).toFixed(2)}T`;
    if (v >= 1e7)  return `₹${(v / 1e7).toLocaleString("en-IN", { maximumFractionDigits: 1 })}Cr`;
    if (v >= 1e5)  return `₹${(v / 1e5).toLocaleString("en-IN", { maximumFractionDigits: 1 })}L`;
    return `₹${v.toLocaleString("en-IN")}`;
  };

  const ColHead = ({
    label, col, align = "right",
  }: {
    label: string;
    col: keyof StockResult | null;
    align?: "left" | "right";
  }) => (
    <th
      style={{
        padding: "12px 16px",
        textAlign: align,
        fontSize: "11px",
        fontWeight: 600,
        letterSpacing: "0.07em",
        textTransform: "uppercase",
        color: col && sortBy === col ? "var(--cyan)" : "var(--text-muted)",
        whiteSpace: "nowrap",
        userSelect: "none",
        cursor: col ? "pointer" : "default",
      }}
      onClick={() => col && handleSort(col)}
    >
      {label}
      {col && sortBy === col && (
        <span style={{ marginLeft: 4 }}>{sortDir === "asc" ? "↑" : "↓"}</span>
      )}
    </th>
  );

  if (loading) return <Loader />;
  if (!user)   return null;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* ── Header ── */}
        <div className="mb-6 animate-fadeIn">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Filter className="w-6 h-6" style={{ color: "var(--purple)" }} />
            Stock Screener
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Filter {NSE_STOCKS.length} NSE stocks with custom criteria
          </p>
        </div>

        {/* ── Preset Cards ── */}
        <div className="mb-6 animate-fadeIn">
          <p
            className="text-xs uppercase tracking-widest font-medium mb-3 flex items-center gap-2"
            style={{ color: "var(--text-muted)" }}
          >
            <Zap className="w-3.5 h-3.5" style={{ color: "var(--gold)" }} />
            Quick Screeners
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {PRESETS.map((preset) => {
              const Icon     = preset.icon;
              const isActive = activePreset === preset.name;
              return (
                <button
                  key={preset.name}
                  onClick={() => handlePreset(preset)}
                  disabled={screening}
                  className="p-4 rounded-xl text-left transition-all duration-200"
                  style={{
                    background:  isActive ? preset.bg   : "var(--bg-surface)",
                    border:      `1px solid ${isActive ? preset.border : "var(--border-subtle)"}`,
                    transform:   isActive ? "scale(1.02)" : "scale(1)",
                    boxShadow:   isActive ? `0 0 20px ${preset.color}20` : "none",
                    opacity:     screening && !isActive ? 0.5 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.borderColor = preset.border;
                      e.currentTarget.style.background  = preset.bg;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.borderColor = "var(--border-subtle)";
                      e.currentTarget.style.background  = "var(--bg-surface)";
                    }
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center mb-2"
                    style={{ background: preset.bg, border: `1px solid ${preset.border}` }}
                  >
                    <Icon className="w-4 h-4" style={{ color: preset.color }} />
                  </div>
                  <p className="text-sm font-semibold text-white">{preset.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {preset.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Custom Filters ── */}
        <div className="glass mb-6 animate-fadeIn overflow-hidden">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full flex items-center justify-between px-5 py-4 transition-all"
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(0,212,255,0.03)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <span className="text-sm font-semibold text-white flex items-center gap-2">
              <Filter className="w-4 h-4" style={{ color: "var(--cyan)" }} />
              Custom Filters
            </span>
            <span
              className="text-xs px-2 py-1 rounded-lg"
              style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}
            >
              {showFilters ? "Hide ↑" : "Show ↓"}
            </span>
          </button>

          {showFilters && (
            <div
              className="px-5 pb-5 border-t animate-fadeIn"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                {[
                  { label: "Min Price (₹)", key: "minPrice",  placeholder: "0"    },
                  { label: "Max Price (₹)", key: "maxPrice",  placeholder: "Any"  },
                  { label: "Min PE",        key: "minPE",     placeholder: "0"    },
                  { label: "Max PE",        key: "maxPE",     placeholder: "Any"  },
                  { label: "Min Change %",  key: "minChange", placeholder: "-100" },
                  { label: "Max Change %",  key: "maxChange", placeholder: "100"  },
                  { label: "Min ROE %",     key: "minROE",    placeholder: "0"    },
                ].map(({ label, key, placeholder }) => (
                  <div key={key}>
                    <label
                      className="text-xs font-medium block mb-1.5"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {label}
                    </label>
                    <input
                      type="number"
                      placeholder={placeholder}
                      value={filters[key as keyof Filters]}
                      onChange={(e) =>
                        setFilters({ ...filters, [key]: e.target.value })
                      }
                      className="input-field text-sm py-2.5"
                      style={{ color: "white", paddingLeft: "16px", paddingRight: "16px" }}
                    />
                  </div>
                ))}
                <div className="flex items-end">
                  <button
                    onClick={() => { setActivePreset(null); runScreener(); }}
                    disabled={screening}
                    className="btn-primary w-full justify-center"
                  >
                    {screening ? (
                      <><RefreshCw className="w-4 h-4 animate-spin" /> Scanning...</>
                    ) : (
                      <><Search className="w-4 h-4" /> Run</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Scanning Progress Bar ── */}
        {screening && (
          <div className="glass p-5 mb-6 animate-fadeIn">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ background: "var(--purple)" }}
                />
                <span className="text-sm font-medium text-white">
                  Scanning {currentStock}…
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold" style={{ color: "var(--cyan)" }}>
                  {results.length} matched
                </span>
                <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                  {progress}%
                </span>
                <button
                  onClick={handleClearOrStop}
                  className="btn-danger flex items-center gap-1.5 py-1 px-3 text-xs"
                  title="Cancel scan"
                >
                  <Square className="w-3 h-3 fill-current" /> Stop Scan
                </button>
              </div>
            </div>
            <div
              className="w-full rounded-full h-2"
              style={{ background: "var(--border-subtle)" }}
            >
              <div
                className="h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%`, background: "var(--grad-purple)" }}
              />
            </div>
          </div>
        )}

        {/* ── Results Table ── */}
        {results.length > 0 && (
          <div className="animate-fadeIn">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  <span className="text-white font-bold text-lg">{results.length}</span>
                  {" "}stocks matched • click any row to analyze
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Search / Filter results input */}
                <div className="relative min-w-44">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
                    style={{ color: "var(--text-muted)" }}
                  />
                  <input
                    type="text"
                    placeholder="Filter results..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="input-field text-xs py-1.5"
                    style={{ paddingLeft: "32px", paddingRight: searchFilter ? "28px" : "12px" }}
                  />
                  {searchFilter && (
                    <button
                      onClick={() => setSearchFilter("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-white"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <button
                  onClick={handleClearOrStop}
                  className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all"
                  style={{
                    color: "var(--text-muted)",
                    border: "1px solid var(--border-subtle)",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "var(--red)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "var(--text-muted)")
                  }
                  title="Clear results and cancel scan"
                >
                  <X className="w-3 h-3" /> Clear
                </button>
              </div>
            </div>

            {/* Scrollable table wrapper */}
            <div
              className="glass overflow-hidden"
              style={{ overflowX: "auto" }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: "720px",
                }}
              >
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <ColHead label="Stock"   col={null}             align="left"  />
                    <ColHead label="Price"   col="current_price"   align="right" />
                    <ColHead label="Change"  col="change_percent"  align="right" />
                    <ColHead label="PE"      col="pe_ratio"        align="right" />
                    <ColHead label="ROE %"   col="roe"             align="right" />
                    <ColHead label="Mkt Cap" col="market_cap"      align="right" />
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((stock) => (
                    <tr
                      key={stock.symbol}
                      onClick={() =>
                        router.push(`/dashboard?symbol=${stock.symbol}`)
                      }
                      className="table-row"
                      style={{
                        borderBottom: "1px solid var(--border-subtle)",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(0,212,255,0.03)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      {/* Stock */}
                      <td style={{ padding: "14px 16px", minWidth: "180px" }}>
                        <p className="font-bold text-white text-sm">
                          {stock.symbol}
                        </p>
                        <p
                          className="text-xs mt-0.5"
                          style={{
                            color: "var(--text-muted)",
                            maxWidth: "200px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {stock.company_name}
                        </p>
                      </td>

                      {/* Price */}
                      <td
                        style={{
                          padding: "14px 16px",
                          textAlign: "right",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <p className="text-sm font-semibold text-white number-display">
                          ₹{stock.current_price.toLocaleString("en-IN")}
                        </p>
                      </td>

                      {/* Change */}
                      <td
                        style={{
                          padding: "14px 16px",
                          textAlign: "right",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <span
                          className={`inline-flex items-center justify-end gap-1 text-sm font-semibold ${
                            stock.change_percent >= 0 ? "positive" : "negative"
                          }`}
                        >
                          {stock.change_percent >= 0 ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          {stock.change_percent >= 0 ? "+" : ""}
                          {stock.change_percent.toFixed(2)}%
                        </span>
                      </td>

                      {/* PE */}
                      <td
                        style={{
                          padding: "14px 16px",
                          textAlign: "right",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <p
                          className="text-sm number-display"
                          style={{
                            color:
                              stock.pe_ratio > 0 && stock.pe_ratio < 20
                                ? "var(--green)"
                                : "var(--text-secondary)",
                          }}
                        >
                          {stock.pe_ratio > 0
                            ? stock.pe_ratio.toFixed(1)
                            : "N/A"}
                        </p>
                      </td>

                      {/* ROE */}
                      <td
                        style={{
                          padding: "14px 16px",
                          textAlign: "right",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <p
                          className="text-sm font-semibold number-display"
                          style={{
                            color:
                              stock.roe > 20
                                ? "var(--green)"
                                : stock.roe > 10
                                ? "var(--gold)"
                                : "var(--text-secondary)",
                          }}
                        >
                          {stock.roe > 0 ? `${stock.roe.toFixed(1)}%` : "N/A"}
                        </p>
                      </td>

                      {/* Mkt Cap */}
                      <td
                        style={{
                          padding: "14px 16px",
                          textAlign: "right",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <p
                          className="text-sm number-display"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {fmtMktCap(stock.market_cap)}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Empty State ── */}
        {!screening && results.length === 0 && progress === 0 && (
          <div className="glass p-16 text-center animate-fadeIn">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{
                background: "rgba(123,47,255,0.1)",
                border: "1px solid rgba(123,47,255,0.2)",
              }}
            >
              <BarChart2 className="w-8 h-8" style={{ color: "var(--purple)" }} />
            </div>
            <p className="text-white font-semibold mb-1">
              Ready to screen stocks
            </p>
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
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--bg-primary)" }}
    >
      <div
        className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: "var(--purple)" }}
      />
    </div>
  );
}
