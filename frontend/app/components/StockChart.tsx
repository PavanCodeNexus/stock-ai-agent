// app/components/StockChart.tsx
"use client";
import { useEffect, useRef, useState } from "react";

interface StockChartProps {
  symbol: string;
}

export default function StockChart({ symbol }: StockChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!symbol || !chartRef.current) return;

    let chart: any = null;

    const loadChart = async () => {
      try {
        setLoading(true);
        setError("");

        // Fetch historical data
        const res = await fetch(
          `http://localhost:8000/api/market/history/${symbol}?period=3mo`
        );
        const data = await res.json();

        if (data.error) {
          setError("Could not load chart data");
          return;
        }

        // Import lightweight-charts dynamically
        const { createChart, ColorType, CandlestickSeries } = await import("lightweight-charts");

        // Clear previous chart
        chartRef.current!.innerHTML = "";

        // Create chart
        chart = createChart(chartRef.current!, {
          layout: {
            background: { type: ColorType.Solid, color: "#111827" },
            textColor: "#9CA3AF",
          },
          grid: {
            vertLines: { color: "#1F2937" },
            horzLines: { color: "#1F2937" },
          },
          width: chartRef.current!.clientWidth,
          height: 350,
          timeScale: {
            borderColor: "#374151",
            timeVisible: true,
          },
          rightPriceScale: {
            borderColor: "#374151",
          },
        });

        // Add candlestick series
        const candleSeries = chart.addSeries(CandlestickSeries, {
          upColor: "#10B981",
          downColor: "#EF4444",
          borderUpColor: "#10B981",
          borderDownColor: "#EF4444",
          wickUpColor: "#10B981",
          wickDownColor: "#EF4444",
        });

        // Format data for chart
        const chartData = data.data.map((d: any) => ({
          time: d.date,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
        }));

        candleSeries.setData(chartData);
        chart.timeScale().fitContent();
        setLoading(false);

        // Resize handler
        const handleResize = () => {
          if (chartRef.current) {
            chart.applyOptions({
              width: chartRef.current.clientWidth,
            });
          }
        };
        window.addEventListener("resize", handleResize);

        return () => {
          window.removeEventListener("resize", handleResize);
        };

      } catch (e) {
        setError("Chart failed to load");
        setLoading(false);
      }
    };

    loadChart();

    return () => {
      if (chart) chart.remove();
    };
  }, [symbol]);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-6">
      <div className="flex justify-between items-center mb-3">
        <p className="text-sm text-gray-400 font-medium">
          📈 Price Chart — {symbol} (3 Months)
        </p>
        <span className="text-xs text-gray-500">Candlestick</span>
      </div>

      {loading && (
        <div className="h-[350px] flex items-center justify-center">
          <p className="text-gray-500 animate-pulse">Loading chart...</p>
        </div>
      )}

      {error && (
        <div className="h-[350px] flex items-center justify-center">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      <div
        ref={chartRef}
        className={loading || error ? "hidden" : "block"}
      />
    </div>
  );
}