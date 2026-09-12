"use client";
import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabase";
import Navbar from "../components/Navbar";
import StockChart from "../components/StockChart";
import NewsPanel from "../components/NewsPanel";
import WatchlistButton from "../components/WatchlistButton";
import SearchAutocomplete from "../components/SearchAutocomplete";
import {
  RefreshCw, TrendingUp, TrendingDown,
  Brain, Database, BarChart2, ShieldCheck,
  AlertTriangle, FileText, Sparkles, Clock, X
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const POPULAR = [
  "TCS", "RELIANCE", "INFY", "HDFCBANK",
  "WIPRO", "TATAMOTORS", "ADANIENT", "BAJFINANCE", "ITC"
];

const AGENT_STEPS = [
  { icon: Brain,        label: "Planner",    desc: "Breaking down tasks"  },
  { icon: Database,     label: "Collector",  desc: "Fetching live data"   },
  { icon: BarChart2,    label: "Analyzer",   desc: "Technical analysis"   },
  { icon: ShieldCheck,  label: "Verifier",   desc: "Cross-checking data"  },
  { icon: AlertTriangle,label: "Risk Agent", desc: "Evaluating risks"     },
  { icon: FileText,     label: "Reporter",   desc: "Generating report"    },
];

function DashboardContent() {
  const { user, loading, getToken } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [symbol, setSymbol] = useState("");
  const [searchedSymbol, setSearchedSymbol] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [result, setResult] = useState<any>(null);
  const [price, setPrice] = useState<any>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [cancelNotice, setCancelNotice] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const currentAnalysisIdRef = useRef<number>(0);
  const hasHydratedRef = useRef(false);

  // Load recent searches from localStorage
  useEffect(() => {
    if (!user) return;
    try {
      const stored = localStorage.getItem(`stock_ai_recent_${user.id}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRecentSearches(parsed);
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, [user]);

  const saveRecentSearch = useCallback((sym: string) => {
    if (!user || !sym) return;
    const upper = sym.toUpperCase().trim();
    setRecentSearches((prev) => {
      const updated = [upper, ...prev.filter((s) => s !== upper)].slice(0, 8);
      try {
        localStorage.setItem(`stock_ai_recent_${user.id}`, JSON.stringify(updated));
      } catch {
        // Ignore storage errors
      }
      return updated;
    });
  }, [user]);

  const clearRecentSearches = () => {
    if (!user) return;
    setRecentSearches([]);
    try {
      localStorage.removeItem(`stock_ai_recent_${user.id}`);
    } catch {
      // Ignore
    }
  };

  // Auth redirect
  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  // Restore latest analysis from localStorage or Supabase
  useEffect(() => {
    if (!user || hasHydratedRef.current) return;
    hasHydratedRef.current = true;

    const symParam = searchParams.get("symbol");
    if (symParam) {
      const cleanParam = symParam.toUpperCase().trim();
      setSymbol(cleanParam);
      setSearchedSymbol(cleanParam);
      // Trigger analysis for URL parameter
      analyzeStock(cleanParam);
      return;
    }

    // 1. Fast path: check localStorage cache for instant hydration
    try {
      const cached = localStorage.getItem(`stock_ai_latest_analysis_${user.id}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.symbol && parsed?.result) {
          setSymbol(parsed.symbol);
          setSearchedSymbol(parsed.symbol);
          setResult(parsed.result);
          if (parsed.price) setPrice(parsed.price);
          // Refresh price in background
          fetch(`${API}/api/market/price/${parsed.symbol}`)
            .then((r) => r.json())
            .then((pd) => {
              if (pd && !pd.error) setPrice(pd);
            })
            .catch(() => {});
          return;
        }
      }
    } catch {
      // Ignore cache read errors
    }

    // 2. Fallback to Supabase reports table
    const loadFromSupabase = async () => {
      try {
        const { data: latestReport } = await supabase
          .from("reports")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestReport && latestReport.symbol) {
          const sym = latestReport.symbol.toUpperCase();
          const restoredResult = {
            recommendation: latestReport.recommendation,
            confidence: latestReport.confidence,
            target_price: latestReport.target_price,
            stop_loss: latestReport.stop_loss,
            final_report: latestReport.full_report,
          };
          setSymbol(sym);
          setSearchedSymbol(sym);
          setResult(restoredResult);

          // Fetch fresh price
          try {
            const priceRes = await fetch(`${API}/api/market/price/${sym}`);
            if (priceRes.ok) {
              const pd = await priceRes.json();
              if (!pd.error) {
                setPrice(pd);
                try {
                  localStorage.setItem(
                    `stock_ai_latest_analysis_${user.id}`,
                    JSON.stringify({ symbol: sym, result: restoredResult, price: pd })
                  );
                } catch {}
              }
            }
          } catch {}
        }
      } catch (err) {
        console.error("Error restoring latest report:", err);
      }
    };

    loadFromSupabase();
  }, [user, searchParams]);

  // Cancel running analysis
  const cancelAnalysis = useCallback(() => {
    // 1. Invalidate current analysis ID to immediately discard any late-arriving responses
    currentAnalysisIdRef.current += 1;

    // 2. Abort ongoing fetch request via AbortController
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // 3. Stop UI loading and animation
    setAnalyzing(false);
    setCurrentStep(-1);

    // 4. Show small clear message
    setCancelNotice("Analysis cancelled.");

    // 5. Existing completed analysis is preserved intact (result is NOT cleared)
  }, []);

  const analyzeStock = async (stockSymbol?: string) => {
    const raw = (stockSymbol || symbol).trim().toUpperCase();
    if (!raw) return;

    // Normalize symbol: uppercase, strip .NS/.BO suffixes, clean characters
    let sym = raw;
    while (sym.endsWith(".NS") || sym.endsWith(".BO")) {
      sym = sym.slice(0, -3);
    }
    sym = sym.replace(/[^A-Z0-9&]/g, "").trim();
    if (!sym) return;

    // Cancel any previous ongoing request before starting a new one
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create a fresh AbortController for this analysis session
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const analysisId = ++currentAnalysisIdRef.current;

    setCancelNotice(null);
    setSymbol(sym);
    setAnalyzing(true);
    setCurrentStep(0);
    setSearchedSymbol(sym);
    saveRecentSearch(sym);

    // Note: We intentionally preserve `result` here rather than setting it to null immediately,
    // so that if the user cancels this analysis, the previous completed analysis remains visible.

    let fetchedPrice: any = null;

    try {
      // 1. Fetch live market price
      try {
        const priceRes = await fetch(`${API}/api/market/price/${sym}`, {
          signal: controller.signal,
        });
        if (priceRes.ok) {
          const pd = await priceRes.json();
          if (currentAnalysisIdRef.current === analysisId && !pd.error) {
            fetchedPrice = pd;
            setPrice(pd);
          }
        }
      } catch (err: any) {
        if (err?.name === "AbortError" || currentAnalysisIdRef.current !== analysisId) {
          return; // Analysis was cancelled
        }
      }

      // 2. Pipeline steps animation (abort-aware)
      for (let i = 0; i < AGENT_STEPS.length; i++) {
        if (currentAnalysisIdRef.current !== analysisId || controller.signal.aborted) {
          return; // Stop animation immediately on cancel
        }
        setCurrentStep(i);
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(resolve, 600);
          controller.signal.addEventListener(
            "abort",
            () => {
              clearTimeout(timer);
              reject(new DOMException("Aborted", "AbortError"));
            },
            { once: true }
          );
        });
      }

      if (currentAnalysisIdRef.current !== analysisId || controller.signal.aborted) {
        return; // Analysis was cancelled
      }

      // 3. AI analysis request to backend
      setCurrentStep(5);
      const token = await getToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const analysisRes = await fetch(
        `${API}/api/analysis/analyze-sync/${sym}`,
        {
          method: "POST",
          headers,
          signal: controller.signal,
        }
      );

      // Verify analysis was not cancelled while fetch was waiting
      if (currentAnalysisIdRef.current !== analysisId || controller.signal.aborted) {
        return;
      }

      if (analysisRes.ok) {
        const ad = await analysisRes.json();
        // Double-check race condition before setting state
        if (currentAnalysisIdRef.current !== analysisId || controller.signal.aborted) {
          return;
        }
        // ONLY NOW replace previous completed analysis
        setResult(ad);

        // Persist to localStorage for fast reload/navigation
        if (user && !ad.error) {
          try {
            localStorage.setItem(
              `stock_ai_latest_analysis_${user.id}`,
              JSON.stringify({ symbol: sym, result: ad, price: fetchedPrice })
            );
          } catch {}
        }
      } else {
        const errJson = await analysisRes.json().catch(() => null);
        if (currentAnalysisIdRef.current === analysisId && !controller.signal.aborted) {
          setResult({ error: errJson?.detail || "Analysis failed. Please try again." });
        }
      }
    } catch (err: any) {
      if (err?.name === "AbortError" || currentAnalysisIdRef.current !== analysisId || controller.signal.aborted) {
        // Intentionally cancelled by user - do NOT set error result
        return;
      }
      if (currentAnalysisIdRef.current === analysisId) {
        setResult({ error: "Cannot connect to backend. Make sure it is running on port 8000." });
      }
    } finally {
      if (currentAnalysisIdRef.current === analysisId) {
        setAnalyzing(false);
        setCurrentStep(-1);
      }
    }
  };

  const recStyle = (rec: string) => {
    if (!rec) return { color: "var(--text-muted)", border: "var(--border-subtle)", bg: "transparent", glow: "none" };
    if (rec.includes("BUY"))  return { color: "var(--green)",  border: "rgba(0,255,136,0.3)",  bg: "rgba(0,255,136,0.05)",  glow: "0 0 30px rgba(0,255,136,0.15)"  };
    if (rec.includes("SELL")) return { color: "var(--red)",    border: "rgba(255,59,92,0.3)",  bg: "rgba(255,59,92,0.05)",  glow: "0 0 30px rgba(255,59,92,0.15)"  };
    return                           { color: "var(--gold)",   border: "rgba(255,184,0,0.3)",  bg: "rgba(255,184,0,0.05)",  glow: "0 0 30px rgba(255,184,0,0.15)"  };
  };

  const formatMarketCap = (v?: number) => {
    if (!v || v <= 0 || !Number.isFinite(v)) return "N/A";
    if (v >= 1e12) return `₹${(v / 1e12).toFixed(2)}T`;
    if (v >= 1e7)  return `₹${(v / 1e7).toLocaleString("en-IN", { maximumFractionDigits: 1 })}Cr`;
    if (v >= 1e5)  return `₹${(v / 1e5).toLocaleString("en-IN", { maximumFractionDigits: 1 })}L`;
    return `₹${v.toLocaleString("en-IN")}`;
  };

  if (loading) return <LoadingScreen />;
  if (!user) return null;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* Search & Actions */}
        <div className="mb-6 animate-fadeIn relative z-30">
          <div className="flex items-center gap-3 w-full">
            <div className="flex-1 min-w-0">
              <SearchAutocomplete
                value={symbol}
                onChange={setSymbol}
                onSelect={(s) => {
                  setSymbol(s);
                  analyzeStock(s);
                }}
                onSubmit={() => analyzeStock()}
                placeholder="Search NSE/BSE symbol (TCS, RELIANCE, INFY...)"
              />
            </div>
            <button
              onClick={() => analyzeStock()}
              disabled={analyzing || !symbol.trim()}
              className="btn-primary px-5 whitespace-nowrap flex-shrink-0"
            >
              {analyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Analyze
                </>
              )}
            </button>

            {analyzing && (
              <button
                type="button"
                onClick={cancelAnalysis}
                className="btn-secondary px-4 whitespace-nowrap flex-shrink-0 flex items-center gap-1.5 transition-all"
                style={{
                  border: "1px solid rgba(255, 59, 92, 0.4)",
                  background: "rgba(255, 59, 92, 0.08)",
                  color: "var(--red)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255, 59, 92, 0.18)";
                  e.currentTarget.style.borderColor = "var(--red)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 59, 92, 0.08)";
                  e.currentTarget.style.borderColor = "rgba(255, 59, 92, 0.4)";
                }}
              >
                <X className="w-4 h-4" />
                Cancel Analysis
              </button>
            )}
          </div>

          {/* Cancellation Notice */}
          {cancelNotice && (
            <div
              className="mt-3 p-3 rounded-xl flex items-center justify-between text-xs font-medium animate-fadeIn"
              style={{
                background: "rgba(255, 59, 92, 0.08)",
                border: "1px solid rgba(255, 59, 92, 0.3)",
                color: "var(--red)",
              }}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{cancelNotice}</span>
              </div>
              <button
                onClick={() => setCancelNotice(null)}
                className="p-1 rounded hover:text-white transition-colors"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className="text-xs flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                <Clock className="w-3.5 h-3.5" style={{ color: "var(--cyan)" }} />
                Recent:
              </span>
              {recentSearches.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setSymbol(s);
                    analyzeStock(s);
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-secondary)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--cyan)";
                    e.currentTarget.style.color = "var(--cyan)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-subtle)";
                    e.currentTarget.style.color = "var(--text-secondary)";
                  }}
                >
                  {s}
                </button>
              ))}
              <button
                onClick={clearRecentSearches}
                title="Clear recent searches"
                className="text-xs px-2 py-1 rounded transition-colors text-muted hover:text-red-400"
                style={{ color: "var(--text-muted)" }}
              >
                Clear
              </button>
            </div>
          )}

          {/* Popular */}
          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>Popular:</span>
            {POPULAR.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setSymbol(s);
                  analyzeStock(s);
                }}
                className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-secondary)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--cyan)";
                  e.currentTarget.style.color = "var(--cyan)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-subtle)";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Agent Pipeline */}
        {analyzing && (
          <div className="glass p-6 mb-6 animate-fadeIn">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ background: "var(--cyan)" }}
                />
                <span className="text-sm font-semibold text-white">
                  AI Agent Pipeline Running
                </span>
              </div>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                Step {Math.max(0, currentStep + 1)} of {AGENT_STEPS.length}
              </span>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {AGENT_STEPS.map(({ icon: Icon, label, desc }, i) => {
                const isDone   = i < currentStep;
                const isActive = i === currentStep;
                return (
                  <div
                    key={label}
                    className="rounded-xl p-3 text-center transition-all duration-500"
                    style={{
                      background: isActive ? "rgba(0,212,255,0.08)"
                                : isDone   ? "rgba(0,255,136,0.05)"
                                : "var(--bg-elevated)",
                      border: isActive ? "1px solid rgba(0,212,255,0.3)"
                            : isDone   ? "1px solid rgba(0,255,136,0.2)"
                            : "1px solid var(--border-subtle)",
                      transform: isActive ? "scale(1.05)" : "scale(1)",
                    }}
                  >
                    <div className="flex justify-center mb-2">
                      {isDone ? (
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center"
                          style={{ background: "rgba(0,255,136,0.2)" }}
                        >
                          <span style={{ color: "var(--green)" }}>✓</span>
                        </div>
                      ) : (
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center"
                          style={{ background: isActive ? "rgba(0,212,255,0.2)" : "var(--bg-surface)" }}
                        >
                          <Icon
                            className="w-3.5 h-3.5"
                            style={{ color: isActive ? "var(--cyan)" : "var(--text-muted)" }}
                          />
                        </div>
                      )}
                    </div>
                    <p
                      className="text-xs font-semibold"
                      style={{ color: isActive ? "var(--cyan)" : isDone ? "var(--green)" : "var(--text-muted)" }}
                    >
                      {label}
                    </p>
                    {isActive && (
                      <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{desc}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Chart */}
        {searchedSymbol && !analyzing && (
          <div className="animate-fadeIn">
            <StockChart symbol={searchedSymbol} />
          </div>
        )}

        {/* Price Card */}
        {price && !price.error && (
          <div className="glass p-5 mb-6 animate-fadeIn">
            <div className="flex flex-wrap justify-between items-start gap-4">
              <div>
                <p className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>
                  {price.company_name}
                </p>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-bold text-white number-display">
                    ₹{price.current_price?.toLocaleString("en-IN")}
                  </span>
                  <span
                    className={`flex items-center gap-1 text-sm font-semibold ${
                      price.change_percent >= 0 ? "positive" : "negative"
                    }`}
                  >
                    {price.change_percent >= 0 ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    {price.change_percent >= 0 ? "+" : ""}
                    {Number(price.change_percent).toFixed(2)}% today
                  </span>
                </div>
                <div className="mt-3">
                  <WatchlistButton symbol={searchedSymbol} companyName={price.company_name} />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-2 text-sm">
                {[
                  { label: "Day High",  value: `₹${price.day_high?.toLocaleString("en-IN")}` },
                  { label: "Day Low",   value: `₹${price.day_low?.toLocaleString("en-IN")}` },
                  { label: "52W High",  value: `₹${price["52_week_high"]?.toLocaleString("en-IN")}` },
                  { label: "52W Low",   value: `₹${price["52_week_low"]?.toLocaleString("en-IN")}` },
                  { label: "Volume",    value: price.volume?.toLocaleString("en-IN") },
                  { label: "P/E Ratio", value: price.pe_ratio && Number(price.pe_ratio) > 0 ? Number(price.pe_ratio).toFixed(2) : "N/A" },
                  { label: "Mkt Cap",   value: formatMarketCap(price.market_cap) },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <span style={{ color: "var(--text-muted)" }}>{label}: </span>
                    <span className="text-white font-medium number-display">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* News */}
        {searchedSymbol && !analyzing && (
          <div className="animate-fadeIn">
            <NewsPanel symbol={searchedSymbol} />
          </div>
        )}

        {/* AI Result */}
        {result && !result.error && (
          <div className="animate-fadeIn">
            <div
              className="glass p-6"
              style={{
                borderColor: recStyle(result.recommendation).border,
                background:  recStyle(result.recommendation).bg,
                boxShadow:   recStyle(result.recommendation).glow,
              }}
            >
              <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
                <div>
                  <p
                    className="text-xs uppercase tracking-widest mb-2"
                    style={{ color: "var(--text-muted)" }}
                  >
                    AI Recommendation
                  </p>
                  <div className="flex items-center gap-3">
                    <span
                      className="text-4xl font-bold"
                      style={{ color: recStyle(result.recommendation).color }}
                    >
                      {result.recommendation}
                    </span>
                    <div
                      className="px-3 py-1 rounded-full text-xs font-bold"
                      style={{
                        background: recStyle(result.recommendation).bg,
                        border: `1px solid ${recStyle(result.recommendation).border}`,
                        color: recStyle(result.recommendation).color,
                      }}
                    >
                      {result.confidence}% confident
                    </div>
                  </div>
                  <div className="mt-3 w-48">
                    <div className="confidence-bar">
                      <div
                        className="confidence-fill"
                        style={{
                          width: `${result.confidence}%`,
                          background: recStyle(result.recommendation).color,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="glass p-4 text-center rounded-xl" style={{ minWidth: "120px" }}>
                    <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Target Price</p>
                    <p className="text-xl font-bold number-display positive">
                      ₹{result.target_price?.toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="glass p-4 text-center rounded-xl" style={{ minWidth: "120px" }}>
                    <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Stop Loss</p>
                    <p className="text-xl font-bold number-display negative">
                      ₹{result.stop_loss?.toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
              </div>

              <div
                className="rounded-xl p-4"
                style={{ background: "var(--bg-primary)", border: "1px solid var(--border-subtle)" }}
              >
                <p
                  className="text-xs font-semibold uppercase tracking-widest mb-3"
                  style={{ color: "var(--text-muted)" }}
                >
                  Full AI Report
                </p>
                <pre
                  className="text-sm whitespace-pre-wrap font-sans leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {result.final_report}
                </pre>
              </div>
            </div>
          </div>
        )}

        {result?.error && (
          <div
            className="glass p-4 animate-fadeIn"
            style={{ border: "1px solid rgba(255,59,92,0.3)" }}
          >
            <p style={{ color: "var(--red)" }}>{result.error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--bg-primary)" }}
    >
      <div className="text-center">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 animate-pulse-glow"
          style={{ background: "var(--grad-cyan)" }}
        >
          <TrendingUp className="w-6 h-6 text-black" />
        </div>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading...</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <DashboardContent />
    </Suspense>
  );
}