"use client";
import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function MarketOverview() {
  const [market, setMarket] = useState<any>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchMarket = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/market/overview");
        const data = await res.json();
        if (data && data.nifty50 && data.sensex) {
          setMarket(data);
        }
      } catch (e) {
        setError(true);
      }
    };

    fetchMarket();
    const interval = setInterval(fetchMarket, 60000);
    return () => clearInterval(interval);
  }, []);

  if (error || !market) return null;

  const nifty = market.nifty50 || {};
  const sensex = market.sensex || {};

  const niftyValue = nifty.value ?? 0;
  const niftyChange = nifty.change_percent ?? 0;
  const sensexValue = sensex.value ?? 0;
  const sensexChange = sensex.change_percent ?? 0;

  return (
    <div className="grid grid-cols-2 gap-4 mb-6">
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <p className="text-gray-400 text-xs mb-1">NIFTY 50</p>
        <p className="text-xl font-bold">
          {niftyValue.toLocaleString("en-IN")}
        </p>
        <div className={`flex items-center gap-1 text-sm mt-1 
          ${niftyChange >= 0 ? "text-green-400" : "text-red-400"}`}>
          {niftyChange >= 0
            ? <TrendingUp className="w-3 h-3" />
            : <TrendingDown className="w-3 h-3" />}
          {niftyChange >= 0 ? "+" : ""}
          {niftyChange.toFixed(2)}%
        </div>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <p className="text-gray-400 text-xs mb-1">BSE SENSEX</p>
        <p className="text-xl font-bold">
          {sensexValue.toLocaleString("en-IN")}
        </p>
        <div className={`flex items-center gap-1 text-sm mt-1
          ${sensexChange >= 0 ? "text-green-400" : "text-red-400"}`}>
          {sensexChange >= 0
            ? <TrendingUp className="w-3 h-3" />
            : <TrendingDown className="w-3 h-3" />}
          {sensexChange >= 0 ? "+" : ""}
          {sensexChange.toFixed(2)}%
        </div>
      </div>
    </div>
  );
}