"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../lib/AuthContext";
import Navbar from "../components/Navbar";
import StockChart from "../components/StockChart";
import NewsPanel from "../components/NewsPanel";
import WatchlistButton from "../components/WatchlistButton";
import {
  Search, RefreshCw, TrendingUp, TrendingDown,
  Brain, Database, BarChart2, ShieldCheck,
  AlertTriangle, FileText, Sparkles
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const POPULAR = [
  "TCS", "RELIANCE", "INFY", "HDFCBANK",
  "WIPRO", "TATAMOTORS", "ADANIENT", "BAJFINANCE"
];

const AGENT_STEPS = [
  { icon: Brain,       label: "Planner",   desc: "Breaking down analysis tasks"  },
  { icon: Database,    label: "Collector", desc: "Fetching live market data"      },
  { icon: BarChart2,   label: "Analyzer",  desc: "Running technical analysis"     },
  { icon: ShieldCheck, label: "Verifier",  desc: "Cross-checking all data"        },
  { icon: AlertTriangle,label:"Risk Agent",desc: "Evaluating downside risks"      },
  { icon: FileText,    label: "Reporter",  desc: "Generating final report"        },
];

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [symbol, setSymbol] = useState("");
  const [searchedSymbol, setSearchedSymbol] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [result, setResult] = useState<any>(null);
  const [price, setPrice] = useState<any>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  // Handle ?symbol= from URL
  useEffect(() => {
    const sym = searchParams.get("symbol");
    if (sym) {
      setSymbol(sym);
      setSearchedSymbol(sym);
    }
  }, [searchParams]);

  if (loading) return <LoadingScreen />;
  if (!user) return null;

  const analyzeStock = async () => {
    if (!symbol) return;
    setAnalyzing(true);
    setResult(null);
    setCurrentStep(0);
    setSearchedSymbol(symbol);

    // Animate through steps
    for (let i = 0; i < AGENT_STEPS.length; i++) {
      setCurrentStep(i);
      await new Promise((r) => setTimeout(r, 800));
    }

    try {
      const [priceRes, analysisRes] = await Promise.all([
        fetch(`${API}/api/market/price/${symbol}`),
        fetch(`${API}/api/analysis/analyze-sync/${symbol}`, { method: "POST" }),
      ]);
      setPrice(await priceRes.json());
      setResult(await analysisRes.json());
    } catch {
      setResult({ error: "Failed to connect. Make sure backend is running." });
    }

    setCurrentStep(-1);
    setAnalyzing(false);
    const analysisRes = await fetch(
  `${API}/api/analysis/analyze-sync/${symbol}?user_id=${user?.id}`,
  { method: "POST" }
);
  };

  const recColor = (rec: string) => {
    if (!rec) return { color: "var(--text-muted)", glow: "none" };
    if (rec.includes("BUY"))  return { color: "var(--green)",  glow: "var(--glow-green)"  };
    if (rec.includes("SELL")) return { color: "var(--red)",    glow: "var(--glow-red)"    };
    return                           { color: "var(--gold)",   glow: "var(--glow-gold)"   };
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* ── Search Bar ── */}
        <div className="mb-8 animate-fadeIn">
          <div className="relative flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
                      style={{ color: "var(--text-muted)" }} />
              <input
                type="text"
                placeholder="Search NSE/BSE symbol (e.g. TCS, RELIANCE, INFY)"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && analyzeStock()}
                className="input-field pl-12 text-base"
                style={{ paddingRight: "120px" }}
              />
              {symbol && (
                <button
                  onClick={() => setSymbol("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs px-2 py-1 rounded"
                  style={{ color: "var(--text-muted)", background: "var(--bg-elevated)" }}
                >
                  Clear
                </button>
              )}
            </div>
            <button
              onClick={analyzeStock}
              disabled={analyzing || !symbol}
              className="btn-primary px-6 whitespace-nowrap"
            >
              {analyzing
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Analyzing...</>
                : <><Sparkles className="w-4 h-4" /> Analyze</>}
            </button>
          </div>

          {/* Popular stocks */}
          {!searchedSymbol && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                Popular:
              </span>
              {POPULAR.map((s) => (
                <button
                  key={s}
                  onClick={() => setSymbol(s)}
                  className="text-xs px-3 py-1.5 rounded-lg transition-all duration-200 font-medium"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-secondary)",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = "var(--cyan)";
                    e.currentTarget.style.color = "var(--cyan)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = "var(--border-subtle)";
                    e.currentTarget.style.color = "var(--text-secondary)";
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Agent Pipeline ── */}
        {analyzing && (
          <div className="glass p-6 mb-6 animate-fadeIn">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full animate-pulse"
                   style={{ background: "var(--cyan)" }} />
              <span className="text-sm font-semibold text-white">
                AI Agent Pipeline Running
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {AGENT_STEPS.map(({ icon: Icon, label, desc }, i) => {
                const isDone    = i < currentStep;
                const isActive  = i === currentStep;
                const isPending = i > currentStep;
                return (
                  <div
                    key={label}
                    className="rounded-xl p-3 text-center transition-all duration-500"
                    style={{
                      background: isActive
                        ? "rgba(0,212,255,0.08)"
                        : isDone
                        ? "rgba(0,255,136,0.05)"
                        : "var(--bg-elevated)",
                      border: isActive
                        ? "1px solid rgba(0,212,255,0.3)"
                        : isDone
                        ? "1px solid rgba(0,255,136,0.2)"
                        : "1px solid var(--border-subtle)",
                      transform: isActive ? "scale(1.05)" : "scale(1)",
                    }}
                  >
                    <div className="flex justify-center mb-2">
                      {isDone ? (
                        <div className="w-7 h-7 rounded-full flex items-center justify-center"
                             style={{ background: "rgba(0,255,136,0.2)" }}>
                          <span style={{ color: "var(--green)" }} className="text-sm">✓</span>
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-full flex items-center justify-center"
                             style={{
                               background: isActive ? "rgba(0,212,255,0.2)" : "var(--bg-surface)",
                             }}>
                          <Icon className="w-3.5 h-3.5"
                                style={{ color: isActive ? "var(--cyan)" : "var(--text-muted)" }} />
                        </div>
                      )}
                    </div>
                    <p className="text-xs font-semibold"
                       style={{ color: isActive ? "var(--cyan)" : isDone ? "var(--green)" : "var(--text-muted)" }}>
                      {label}
                    </p>
                    {isActive && (
                      <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                        {desc}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Chart ── */}
        {searchedSymbol && !analyzing && (
          <div className="animate-fadeIn">
            <StockChart symbol={searchedSymbol} />
          </div>
        )}

        {/* ── Price Card ── */}
        {price && !price.error && (
          <div className="glass p-5 mb-6 animate-fadeIn"
               style={{ border: "1px solid var(--border-subtle)" }}>
            <div className="flex flex-wrap justify-between items-start gap-4">
              <div>
                <p className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>
                  {price.company_name}
                </p>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-bold text-white number-display">
                    ₹{price.current_price?.toLocaleString("en-IN")}
                  </span>
                  <span className={`flex items-center gap-1 text-sm font-semibold ${
                    price.change_percent >= 0 ? "positive" : "negative"
                  }`}>
                    {price.change_percent >= 0
                      ? <TrendingUp className="w-4 h-4" />
                      : <TrendingDown className="w-4 h-4" />}
                    {price.change_percent >= 0 ? "+" : ""}
                    {Number(price.change_percent).toFixed(2)}% today
                  </span>
                </div>
                <div className="mt-3">
                  <WatchlistButton
                    symbol={searchedSymbol}
                    companyName={price.company_name}
                  />
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                {[
                  { label: "Day High",  value: `₹${price.day_high?.toLocaleString("en-IN")}`  },
                  { label: "Day Low",   value: `₹${price.day_low?.toLocaleString("en-IN")}`   },
                  { label: "52W High",  value: `₹${price["52_week_high"]?.toLocaleString("en-IN")}` },
                  { label: "52W Low",   value: `₹${price["52_week_low"]?.toLocaleString("en-IN")}`  },
                  { label: "Volume",    value: price.volume?.toLocaleString("en-IN")           },
                  { label: "Mkt Cap",   value: price.market_cap
                      ? `₹${(price.market_cap / 1e12).toFixed(2)}T`
                      : "N/A"
                  },
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

        {/* ── News ── */}
        {searchedSymbol && !analyzing && (
          <div className="animate-fadeIn">
            <NewsPanel symbol={searchedSymbol} />
          </div>
        )}

        {/* ── AI Result ── */}
        {result && !result.error && (
          <div className="animate-fadeIn space-y-4">
            {/* Recommendation card */}
            <div
              className="glass p-6"
              style={{
                borderColor: recColor(result.recommendation).color + "40",
                boxShadow: recColor(result.recommendation).glow,
              }}
            >
              <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
                <div>
                  <p className="text-xs uppercase tracking-widest mb-2"
                     style={{ color: "var(--text-muted)" }}>
                    AI Recommendation
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="text-4xl font-bold"
                          style={{ color: recColor(result.recommendation).color }}>
                      {result.recommendation}
                    </span>
                    <div className="px-3 py-1 rounded-full text-xs font-bold"
                         style={{
                           background: recColor(result.recommendation).color + "20",
                           border: `1px solid ${recColor(result.recommendation).color}40`,
                           color: recColor(result.recommendation).color,
                         }}>
                      {result.confidence}% confident
                    </div>
                  </div>
                  {/* Confidence bar */}
                  <div className="mt-3 w-48">
                    <div className="confidence-bar">
                      <div
                        className="confidence-fill"
                        style={{
                          width: `${result.confidence}%`,
                          background: recColor(result.recommendation).color,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Target + Stop Loss */}
                <div className="flex gap-4">
                  <div className="glass p-4 text-center rounded-xl"
                       style={{ minWidth: "120px" }}>
                    <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                      Target Price
                    </p>
                    <p className="text-xl font-bold number-display positive">
                      ₹{result.target_price?.toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="glass p-4 text-center rounded-xl"
                       style={{ minWidth: "120px" }}>
                    <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                      Stop Loss
                    </p>
                    <p className="text-xl font-bold number-display negative">
                      ₹{result.stop_loss?.toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Full report */}
              <div className="rounded-xl p-4"
                   style={{ background: "var(--bg-primary)", border: "1px solid var(--border-subtle)" }}>
                <p className="text-xs font-semibold uppercase tracking-widest mb-3"
                   style={{ color: "var(--text-muted)" }}>
                  Full AI Report
                </p>
                <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed"
                     style={{ color: "var(--text-secondary)" }}>
                  {result.final_report}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {result?.error && (
          <div className="glass p-4 animate-fadeIn"
               style={{ border: "1px solid rgba(255,59,92,0.3)" }}>
            <p style={{ color: "var(--red)" }}>{result.error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center"
         style={{ background: "var(--bg-primary)" }}>
      <div className="text-center">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 animate-pulse-glow"
             style={{ background: "var(--grad-cyan)" }}>
          <TrendingUp className="w-6 h-6 text-black" />
        </div>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading...</p>
      </div>
    </div>
  );
}