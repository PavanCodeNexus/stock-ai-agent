// app/page.tsx
"use client";
import { useState } from "react";
import { Search, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";

const API = "http://localhost:8000";

export default function Home() {
  const [symbol, setSymbol] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("");
  const [result, setResult] = useState<any>(null);
  const [price, setPrice] = useState<any>(null);

  const analyzeStock = async () => {
    if (!symbol) return;
    setLoading(true);
    setResult(null);

    const steps = [
      "🧠 Planner analyzing query...",
      "📊 Collector fetching data...",
      "🔍 Analyzer running analysis...",
      "✔️ Verifier checking results...",
      "⚠️ Risk Agent evaluating risks...",
      "📋 Reporter generating report...",
    ];

    // Show steps one by one
    for (let i = 0; i < steps.length; i++) {
      setStep(steps[i]);
      await new Promise((r) => setTimeout(r, 1000));
    }

    try {
      // Fetch price
      const priceRes = await fetch(`${API}/api/market/price/${symbol}`);
      const priceData = await priceRes.json();
      setPrice(priceData);

      // Run analysis
      setStep("🤖 AI Agent thinking...");
      const analysisRes = await fetch(
        `${API}/api/analysis/analyze-sync/${symbol}`,
        { method: "POST" }
      );
      const analysisData = await analysisRes.json();
      setResult(analysisData);
    } catch (e) {
      setResult({ error: "Failed to analyze. Make sure backend is running." });
    }

    setLoading(false);
    setStep("");
  };

  const getColor = (rec: string) => {
    if (!rec) return "text-gray-400";
    if (rec.includes("BUY")) return "text-green-400";
    if (rec.includes("SELL")) return "text-red-400";
    return "text-yellow-400";
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      {/* Header */}
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <TrendingUp className="text-green-400 w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">Stock AI Agent</h1>
            <p className="text-gray-400 text-sm">
              Agentic AI for Indian Stock Market
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="flex gap-3 mb-8">
          <input
            type="text"
            placeholder="Enter stock symbol (e.g. TCS, RELIANCE, INFY)"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && analyzeStock()}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
          />
          <button
            onClick={analyzeStock}
            disabled={loading}
            className="bg-green-500 hover:bg-green-600 disabled:bg-gray-600 px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            {loading ? "Analyzing..." : "Analyze"}
          </button>
        </div>

        {/* Agent Progress */}
        {loading && step && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-400 mb-2">Agent Pipeline</p>
            <div className="flex items-center gap-3">
              <RefreshCw className="w-4 h-4 animate-spin text-green-400" />
              <p className="text-green-400 font-medium">{step}</p>
            </div>
          </div>
        )}

        {/* Price Card */}
        {price && !price.error && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-5 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-400 text-sm">{price.company_name}</p>
                <p className="text-3xl font-bold mt-1">
                  ₹{price.current_price}
                </p>
                <p
                  className={`text-sm mt-1 ${price.change_percent >= 0 ? "text-green-400" : "text-red-400"}`}
                >
                  {price.change_percent >= 0 ? "▲" : "▼"}{" "}
                  {Math.abs(price.change_percent)}% today
                </p>
              </div>
              <div className="text-right text-sm text-gray-400 space-y-1">
                <p>High: ₹{price.day_high}</p>
                <p>Low: ₹{price.day_low}</p>
                <p>52W H: ₹{price["52_week_high"]}</p>
                <p>52W L: ₹{price["52_week_low"]}</p>
              </div>
            </div>
          </div>
        )}

        {/* Analysis Result */}
        {result && !result.error && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-5 space-y-4">
            {/* Recommendation */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">AI Recommendation</p>
                <p className={`text-2xl font-bold ${getColor(result.recommendation)}`}>
                  {result.recommendation}
                </p>
              </div>
              <div className="text-right">
                <p className="text-gray-400 text-sm">Confidence</p>
                <p className="text-2xl font-bold text-blue-400">
                  {result.confidence}%
                </p>
              </div>
            </div>

            {/* Targets */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-900 rounded-lg p-3">
                <p className="text-gray-400 text-xs">Target Price</p>
                <p className="text-green-400 font-bold text-lg">
                  ₹{result.target_price}
                </p>
              </div>
              <div className="bg-gray-900 rounded-lg p-3">
                <p className="text-gray-400 text-xs">Stop Loss</p>
                <p className="text-red-400 font-bold text-lg">
                  ₹{result.stop_loss}
                </p>
              </div>
            </div>

            {/* Full Report */}
            <div className="bg-gray-900 rounded-lg p-4">
              <p className="text-gray-400 text-sm mb-2">Full AI Report</p>
              <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans">
                {result.final_report}
              </pre>
            </div>
          </div>
        )}

        {/* Error */}
        {result?.error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
            <p className="text-red-400">{result.error}</p>
          </div>
        )}

        {/* Quick Symbols */}
        {!result && !loading && (
          <div className="mt-6">
            <p className="text-gray-500 text-sm mb-3">Popular stocks:</p>
            <div className="flex gap-2 flex-wrap">
              {["TCS", "RELIANCE", "INFY", "HDFCBANK", "WIPRO", "TATAMOTORS"].map((s) => (
                <button
                  key={s}
                  onClick={() => { setSymbol(s); }}
                  className="bg-gray-800 hover:bg-gray-700 border border-gray-700 px-3 py-1 rounded text-sm transition"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
