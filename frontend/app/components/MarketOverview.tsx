// app/components/MarketOverview.tsx
"use client";
import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function MarketOverview() {
  const [market, setMarket] = useState<any>(null);

  useEffect(() => {
    const fetchMarket = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/market/overview");
        const data = await res.json();
        setMarket(data);
      } catch (e) {}
    };

    fetchMarket();
    // Refresh every 60 seconds
    const interval = setInterval(fetchMarket, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!market) return null;

  const nifty = market.nifty50;
  const sensex = market.sensex;

  return (
    <div className="grid grid-cols-2 gap-4 mb-6">
      {/* Nifty 50 */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <p className="text-gray-400 text-xs mb-1">NIFTY 50</p>
        <p className="text-xl font-bold">
          {nifty.value?.toLocaleString("en-IN")}
        </p>
        <div className={`flex items-center gap-1 text-sm mt-1 
          ${nifty.change_percent >= 0 ? "text-green-400" : "text-red-400"}`}>
          {nifty.change_percent >= 0
            ? <TrendingUp className="w-3 h-3" />
            : <TrendingDown className="w-3 h-3" />}
          {nifty.change_percent >= 0 ? "+" : ""}
          {nifty.change_percent?.toFixed(2)}%
        </div>
      </div>

      {/* Sensex */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <p className="text-gray-400 text-xs mb-1">BSE SENSEX</p>
        <p className="text-xl font-bold">
          {sensex.value?.toLocaleString("en-IN")}
        </p>
        <div className={`flex items-center gap-1 text-sm mt-1
          ${sensex.change_percent >= 0 ? "text-green-400" : "text-red-400"}`}>
          {sensex.change_percent >= 0
            ? <TrendingUp className="w-3 h-3" />
            : <TrendingDown className="w-3 h-3" />}
          {sensex.change_percent >= 0 ? "+" : ""}
          {sensex.change_percent?.toFixed(2)}%
        </div>
      </div>
    </div>
  );
}