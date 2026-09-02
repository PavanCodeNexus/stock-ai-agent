"use client";
import { useEffect, useRef, useState } from "react";

interface StockChartProps {
  symbol: string;
}

const PERIODS = [
  { label: "1M", value: "1mo" },
  { label: "3M", value: "3mo" },
  { label: "6M", value: "6mo" },
  { label: "1Y", value: "1y" },
  { label: "2Y", value: "2y" },
  { label: "5Y", value: "5y" },
  { label: "MAX", value: "max" },
];

export default function StockChart({ symbol }: StockChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<any>(null);
  const seriesInstance = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activePeriod, setActivePeriod] = useState("3mo");

  const loadChartData = async (period: string) => {
    if (!symbol || !chartRef.current) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        `http://localhost:8000/api/market/history/${symbol}?period=${period}`
      );
      const data = await res.json();

      if (!data.data || data.data.length === 0) {
        setError("No chart data available");
        setLoading(false);
        return;
      }

      const chartData = data.data
        .map((d: any) => ({
          time: d.date,
          open: Number(d.open),
          high: Number(d.high),
          low: Number(d.low),
          close: Number(d.close),
        }))
        .filter((d: any) =>
          d.open > 0 && d.high > 0 && d.low > 0 && d.close > 0
        )
        .sort((a: any, b: any) => a.time.localeCompare(b.time));

      if (chartInstance.current && seriesInstance.current) {
        // Just update data if chart exists
        seriesInstance.current.setData(chartData);
        chartInstance.current.timeScale().fitContent();
      } else {
        // Create new chart
        const { createChart, ColorType, CandlestickSeries } =
          await import("lightweight-charts");

        chartRef.current!.innerHTML = "";

        const chart = createChart(chartRef.current!, {
          layout: {
            background: { type: ColorType.Solid, color: "#111827" },
            textColor: "#9CA3AF",
          },
          grid: {
            vertLines: { color: "#1F2937" },
            horzLines: { color: "#1F2937" },
          },
          width: chartRef.current!.clientWidth,
          height: 400,
          timeScale: {
            borderColor: "#374151",
            timeVisible: false,
          },
          rightPriceScale: {
            borderColor: "#374151",
          },
          crosshair: {
            vertLine: { color: "#4B5563" },
            horzLine: { color: "#4B5563" },
          },
        });

        const series = chart.addSeries(CandlestickSeries, {
          upColor: "#10B981",
          downColor: "#EF4444",
          borderUpColor: "#10B981",
          borderDownColor: "#EF4444",
          wickUpColor: "#10B981",
          wickDownColor: "#EF4444",
        });

        series.setData(chartData);
        chart.timeScale().fitContent();

        chartInstance.current = chart;
        seriesInstance.current = series;

        // Resize
        const handleResize = () => {
          if (chartRef.current && chartInstance.current) {
            chartInstance.current.applyOptions({
              width: chartRef.current.clientWidth,
            });
          }
        };
        window.addEventListener("resize", handleResize);
      }

      setLoading(false);
    } catch (e) {
      console.error(e);
      setError("Chart failed to load — check backend connection");
      setLoading(false);
    }
  };

  useEffect(() => {
    // Reset chart on symbol change
    chartInstance.current = null;
    seriesInstance.current = null;
    loadChartData(activePeriod);

    return () => {
      if (chartInstance.current) {
        chartInstance.current.remove();
        chartInstance.current = null;
        seriesInstance.current = null;
      }
    };
  }, [symbol]);

  const handlePeriodChange = (period: string) => {
    setActivePeriod(period);
    loadChartData(period);
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <p className="text-sm font-medium text-gray-300">
          📈 {symbol} Price Chart
        </p>
        {/* Period Selector */}
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => handlePeriodChange(p.value)}
              className={`px-2 py-1 rounded text-xs font-medium transition ${
                activePeriod === p.value
                  ? "bg-green-500 text-white"
                  : "bg-gray-700 text-gray-400 hover:bg-gray-600"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="h-[400px] flex items-center justify-center">
          <div className="text-center">
            <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-gray-500 text-sm">Loading chart...</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="h-[400px] flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-400 text-sm mb-2">{error}</p>
            <button
              onClick={() => loadChartData(activePeriod)}
              className="text-xs text-green-400 hover:underline"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Chart */}
      <div
        ref={chartRef}
        className={loading || error ? "hidden" : "block w-full"}
      />
    </div>
  );
}