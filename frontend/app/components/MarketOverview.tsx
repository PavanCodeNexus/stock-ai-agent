"use client";
import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function MarketOverview() {
  const [market, setMarket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    fetchMarket();
    const interval = setInterval(fetchMarket, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchMarket = async () => {
    try {
      const res = await fetch(`${API}/api/market/overview`);
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.nifty50 && data.sensex && !data.error) {
        setMarket(data);
        setLastUpdated(new Date());
      }
    } catch {}
    finally { setLoading(false); }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 mb-6">
        {[1,2].map((i) => (
          <div key={i} className="glass p-4">
            <div className="skeleton h-3 w-20 mb-3" />
            <div className="skeleton h-7 w-32 mb-2" />
            <div className="skeleton h-3 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (!market) return null;

  const nifty  = market.nifty50 || {};
  const sensex = market.sensex  || {};

  const IndexCard = ({
    name, value, change, changePct
  }: {
    name: string; value: number;
    change: number; changePct: number;
  }) => {
    const isPos = changePct >= 0;
    return (
      <div className="glass p-4 lift-hover">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-widest"
             style={{ color: "var(--text-muted)" }}>
            {name}
          </p>
          <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
            isPos ? "positive" : "negative"
          }`}
               style={{
                 background: isPos ? "rgba(0,255,136,0.1)" : "rgba(255,59,92,0.1)",
               }}>
            {isPos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {isPos ? "+" : ""}{changePct.toFixed(2)}%
          </div>
        </div>
        <p className="text-2xl font-bold text-white number-display">
          {value.toLocaleString("en-IN")}
        </p>
        <p className={`text-xs mt-1 font-medium ${isPos ? "positive" : "negative"}`}>
          {isPos ? "+" : ""}{change.toFixed(2)} pts
        </p>
      </div>
    );
  };

  return (
    <div className="mb-6 animate-fadeIn">
      <div className="grid grid-cols-2 gap-4">
        <IndexCard
          name="NIFTY 50"
          value={nifty.value ?? 0}
          change={nifty.change ?? 0}
          changePct={nifty.change_percent ?? 0}
        />
        <IndexCard
          name="BSE SENSEX"
          value={sensex.value ?? 0}
          change={sensex.change ?? 0}
          changePct={sensex.change_percent ?? 0}
        />
      </div>
      {lastUpdated && (
        <p className="text-xs mt-2 text-right flex items-center justify-end gap-1"
           style={{ color: "var(--text-muted)" }}>
          <RefreshCw className="w-3 h-3" />
          Updated {lastUpdated.toLocaleTimeString("en-IN")}
        </p>
      )}
    </div>
  );
}