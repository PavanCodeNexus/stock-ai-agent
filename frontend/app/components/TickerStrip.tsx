"use client";
import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const TICKER_STOCKS = [
  "TCS", "RELIANCE", "INFY", "HDFCBANK",
  "WIPRO", "TATAMOTORS", "BAJFINANCE", "ICICIBANK"
];

interface TickerItem {
  symbol: string;
  price: number;
  change_percent: number;
}

export default function TickerStrip() {
  const [items, setItems] = useState<TickerItem[]>([]);
  const [market, setMarket] = useState<any>(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [overviewRes, ...stockRes] = await Promise.all([
        fetch(`${API}/api/market/overview`),
        ...TICKER_STOCKS.map((s) =>
          fetch(`${API}/api/market/price/${s}`)
        ),
      ]);
      const overview = await overviewRes.json();
      setMarket(overview);

      const stocks = await Promise.all(stockRes.map((r) => r.json()));
      setItems(
        stocks
          .filter((s) => !s.error)
          .map((s) => ({
            symbol: s.symbol,
            price: s.current_price,
            change_percent: s.change_percent,
          }))
      );
    } catch {}
  };

  const allItems = [
    ...(market?.nifty50
      ? [{ symbol: "NIFTY 50", price: market.nifty50.value, change_percent: market.nifty50.change_percent }]
      : []),
    ...(market?.sensex
      ? [{ symbol: "SENSEX", price: market.sensex.value, change_percent: market.sensex.change_percent }]
      : []),
    ...items,
  ];

  if (allItems.length === 0) return null;

  const doubled = [...allItems, ...allItems];

  return (
    <div className="ticker-wrap border-b py-2"
         style={{ borderColor: "var(--border-subtle)", background: "var(--bg-surface)" }}>
      <div className="ticker-content">
        {doubled.map((item, i) => (
          <div key={i} className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-xs font-semibold"
                  style={{ color: "var(--text-muted)" }}>
              {item.symbol}
            </span>
            <span className="text-xs font-mono-data text-white font-medium">
              ₹{item.price?.toLocaleString("en-IN")}
            </span>
            <span className={`text-xs font-medium flex items-center gap-0.5 ${
              item.change_percent >= 0 ? "positive" : "negative"
            }`}>
              {item.change_percent >= 0
                ? <TrendingUp className="w-3 h-3" />
                : <TrendingDown className="w-3 h-3" />}
              {item.change_percent >= 0 ? "+" : ""}
              {item.change_percent?.toFixed(2)}%
            </span>
            <span className="mx-4" style={{ color: "var(--border-subtle)" }}>|</span>
          </div>
        ))}
      </div>
    </div>
  );
}