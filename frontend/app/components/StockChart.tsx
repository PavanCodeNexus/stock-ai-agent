"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface ChartStats {
  high: number;
  low: number;
  records: number;
  from: string;
  to: string;
  latestClose: number;
  firstClose: number;
}

interface TooltipData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Period {
  label: string;
  value: string;
}

interface StockChartProps {
  symbol: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PERIODS: Period[] = [
  { label: "1M",  value: "1mo" },
  { label: "3M",  value: "3mo" },
  { label: "6M",  value: "6mo" },
  { label: "1Y",  value: "1y"  },
  { label: "5Y",  value: "5y"  },
  { label: "MAX", value: "max" },
];

const DEFAULT_PERIOD = "6mo";
const API_BASE = "http://localhost:8000";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatINR(val: number): string {
  return "₹" + val.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatVolume(vol: number): string {
  if (vol >= 1_000_000_000) return (vol / 1_000_000_000).toFixed(1) + "B";
  if (vol >= 1_000_000)     return (vol / 1_000_000).toFixed(1) + "M";
  if (vol >= 1_000)         return (vol / 1_000).toFixed(1) + "K";
  return vol.toString();
}

function validateCandle(d: CandleData): boolean {
  const vals = [d.open, d.high, d.low, d.close];
  if (vals.some((v) => !isFinite(v) || v <= 0)) return false;
  if (d.high < d.low) return false;
  return true;
}

function calcEMA(data: CandleData[], period: number): Map<string, number> {
  const result = new Map<string, number>();
  if (data.length < period) return result;
  const k = 2 / (period + 1);
  let ema =
    data.slice(0, period).reduce((s, d) => s + d.close, 0) / period;
  result.set(data[period - 1].time, ema);
  for (let i = period; i < data.length; i++) {
    ema = data[i].close * k + ema * (1 - k);
    result.set(data[i].time, ema);
  }
  return result;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StockChart({ symbol }: StockChartProps) {
  const chartContainerRef  = useRef<HTMLDivElement>(null);
  const chartInstanceRef   = useRef<any>(null);
  const candleSeriesRef    = useRef<any>(null);
  const volumeSeriesRef    = useRef<any>(null);
  const ema20SeriesRef     = useRef<any>(null);
  const ema50SeriesRef     = useRef<any>(null);
  const ema200SeriesRef    = useRef<any>(null);
  const resizeObserverRef  = useRef<ResizeObserver | null>(null);
  const rawDataRef         = useRef<CandleData[]>([]);

  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [activePeriod, setActivePeriod] = useState(DEFAULT_PERIOD);
  const [stats,        setStats]        = useState<ChartStats | null>(null);
  const [tooltip,      setTooltip]      = useState<TooltipData | null>(null);

  const [showVolume,  setShowVolume]  = useState(true);
  const [showEma20,   setShowEma20]   = useState(true);
  const [showEma50,   setShowEma50]   = useState(true);
  const [showEma200,  setShowEma200]  = useState(false);

  // ── Load script (idempotent) ────────────────────────────────────────────────
  const loadScript = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      if ((window as any).LightweightCharts) { resolve(); return; }
      const existing = document.getElementById("lwc-script");
      if (existing) {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () => reject(new Error("Script load failed")));
        return;
      }
      const s = document.createElement("script");
      s.id  = "lwc-script";
      s.src = "https://unpkg.com/lightweight-charts@4.2.0/dist/lightweight-charts.standalone.production.js";
      s.onload  = () => resolve();
      s.onerror = () => reject(new Error("Failed to load chart library"));
      document.head.appendChild(s);
    });
  }, []);

  // ── Fetch data ──────────────────────────────────────────────────────────────
  const fetchCandles = useCallback(async (period: string): Promise<CandleData[]> => {
    const res = await fetch(
      `${API_BASE}/api/market/history/${symbol}?period=${period}`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    if (!Array.isArray(json.data) || json.data.length === 0)
      throw new Error(`No historical data available for ${symbol}.`);

    const cleaned: CandleData[] = json.data
      .map((d: Record<string, unknown>) => ({
        time:   String(d.date ?? ""),
        open:   Number(d.open),
        high:   Number(d.high),
        low:    Number(d.low),
        close:  Number(d.close),
        volume: Number(d.volume ?? 0),
      }))
      .filter(validateCandle)
      .sort((a: CandleData, b: CandleData) => a.time.localeCompare(b.time));

    // Deduplicate
    const seen = new Set<string>();
    return cleaned.filter((d: CandleData) => {
      if (seen.has(d.time)) return false;
      seen.add(d.time);
      return true;
    });
  }, [symbol]);

  // ── Apply EMA visibility ────────────────────────────────────────────────────
  const applyEMA = useCallback((
    data: CandleData[],
    series: any,
    period: number,
    visible: boolean
  ) => {
    if (!series) return;
    if (!visible || data.length < period) {
      series.setData([]);
      return;
    }
    const emaMap = calcEMA(data, period);
    const lineData = Array.from(emaMap.entries()).map(([time, value]) => ({
      time,
      value: parseFloat(value.toFixed(2)),
    }));
    series.setData(lineData);
  }, []);

  // ── Rebuild all indicators from rawDataRef ──────────────────────────────────
  const rebuildIndicators = useCallback(() => {
    const data = rawDataRef.current;
    applyEMA(data, ema20SeriesRef.current,  20,  showEma20);
    applyEMA(data, ema50SeriesRef.current,  50,  showEma50);
    applyEMA(data, ema200SeriesRef.current, 200, showEma200);

    if (volumeSeriesRef.current) {
      if (!showVolume) {
        volumeSeriesRef.current.setData([]);
      } else {
        volumeSeriesRef.current.setData(
          data.map((d) => ({
            time:  d.time,
            value: d.volume,
            color: d.close >= d.open ? "#10B981" : "#EF4444",
          }))
        );
      }
    }
  }, [showEma20, showEma50, showEma200, showVolume, applyEMA]);

  // ── Create chart (once per symbol) ─────────────────────────────────────────
  const createChart = useCallback(() => {
    const LW  = (window as any).LightweightCharts;
    const el  = chartContainerRef.current;
    if (!LW || !el) return;

    // Destroy previous
    if (chartInstanceRef.current) {
      try { chartInstanceRef.current.remove(); } catch {}
      chartInstanceRef.current  = null;
      candleSeriesRef.current   = null;
      volumeSeriesRef.current   = null;
      ema20SeriesRef.current    = null;
      ema50SeriesRef.current    = null;
      ema200SeriesRef.current   = null;
    }

    const chart = LW.createChart(el, {
      width:  el.clientWidth,
      height: 500,
      layout: {
        background: { color: "#0D1117" },
        textColor:  "#8B949E",
        fontSize:   12,
      },
      grid: {
        vertLines: { color: "#161B22", style: 1 },
        horzLines: { color: "#161B22", style: 1 },
      },
      crosshair: {
        mode: 1,
        vertLine: { color: "#4B5563", width: 1, style: 2, labelBackgroundColor: "#1F2937" },
        horzLine: { color: "#4B5563", width: 1, style: 2, labelBackgroundColor: "#1F2937" },
      },
      rightPriceScale: {
        borderColor:    "#21262D",
        textColor:      "#8B949E",
        scaleMargins:   { top: 0.08, bottom: 0.25 },
      },
      timeScale: {
        borderColor:         "#21262D",
        timeVisible:         true,
        secondsVisible:      false,
        rightOffset:         8,
        barSpacing:          8,
        fixLeftEdge:         false,
        fixRightEdge:        false,
        lockVisibleTimeRangeOnResize: true,
      },
      handleScroll:  { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true },
      handleScale:   { mouseWheel: true, pinch: true, axisPressedMouseMove: true },
    });

    // Candlestick series
    const candles = chart.addCandlestickSeries({
      upColor:        "#10B981",
      downColor:      "#EF4444",
      borderUpColor:  "#10B981",
      borderDownColor:"#EF4444",
      wickUpColor:    "#10B981",
      wickDownColor:  "#EF4444",
      priceLineVisible:     true,
      lastValueVisible:     true,
      priceFormat: { type: "price", precision: 2, minMove: 0.05 },
    });

    // Volume series (overlay on separate scale)
    const volume = chart.addHistogramSeries({
      priceFormat:  { type: "volume" },
      priceScaleId: "volume",
      color:        "#10B981",
    });
    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.80, bottom: 0 },
    });

    // EMA series
    const ema20 = chart.addLineSeries({
      color:            "#F59E0B",
      lineWidth:        1.5,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });
    const ema50 = chart.addLineSeries({
      color:            "#3B82F6",
      lineWidth:        1.5,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });
    const ema200 = chart.addLineSeries({
      color:            "#A855F7",
      lineWidth:        1.5,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });

    // Crosshair tooltip
    chart.subscribeCrosshairMove((param: any) => {
      if (!param || !param.time || !param.seriesData) {
        setTooltip(null);
        return;
      }
      const cd = param.seriesData.get(candles);
      const vd = param.seriesData.get(volume);
      if (!cd) { setTooltip(null); return; }
      setTooltip({
        time:   String(param.time),
        open:   cd.open,
        high:   cd.high,
        low:    cd.low,
        close:  cd.close,
        volume: vd?.value ?? 0,
      });
    });

    chartInstanceRef.current  = chart;
    candleSeriesRef.current   = candles;
    volumeSeriesRef.current   = volume;
    ema20SeriesRef.current    = ema20;
    ema50SeriesRef.current    = ema50;
    ema200SeriesRef.current   = ema200;

    // ResizeObserver
    if (resizeObserverRef.current) resizeObserverRef.current.disconnect();
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (chartInstanceRef.current) {
          chartInstanceRef.current.applyOptions({ width: entry.contentRect.width });
        }
      }
    });
    ro.observe(el);
    resizeObserverRef.current = ro;
  }, []);

  // ── Main load ───────────────────────────────────────────────────────────────
  const loadChart = useCallback(async (period: string) => {
    setLoading(true);
    setError("");
    setTooltip(null);

    try {
      await loadScript();
      if (!chartInstanceRef.current) createChart();

      const data = await fetchCandles(period);
      rawDataRef.current = data;

      // Compute stats
      const closes = data.map((d) => d.close);
      const highs  = data.map((d) => d.high);
      const lows   = data.map((d) => d.low);
      setStats({
        high:        Math.max(...highs),
        low:         Math.min(...lows),
        records:     data.length,
        from:        data[0].time,
        to:          data[data.length - 1].time,
        latestClose: closes[closes.length - 1],
        firstClose:  closes[0],
      });

      // Set candle data
      if (candleSeriesRef.current) {
        candleSeriesRef.current.setData(
          data.map((d) => ({
            time:  d.time,
            open:  d.open,
            high:  d.high,
            low:   d.low,
            close: d.close,
          }))
        );
        chartInstanceRef.current?.timeScale().fitContent();
      }

      // Indicators
      rebuildIndicators();
      setLoading(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Chart failed to load";
      setError(msg);
      setLoading(false);
    }
  }, [loadScript, createChart, fetchCandles, rebuildIndicators]);

  // ── Handle period change ────────────────────────────────────────────────────
  const handlePeriod = (period: string) => {
    if (period === activePeriod && !error) return;
    setActivePeriod(period);
    loadChart(period);
  };

  // ── Reset zoom ──────────────────────────────────────────────────────────────
  const resetZoom = () => {
    chartInstanceRef.current?.timeScale().fitContent();
  };

  // ── On symbol change ────────────────────────────────────────────────────────
  useEffect(() => {
    chartInstanceRef.current = null;
    candleSeriesRef.current  = null;
    setActivePeriod(DEFAULT_PERIOD);
    loadChart(DEFAULT_PERIOD);

    return () => {
      resizeObserverRef.current?.disconnect();
      if (chartInstanceRef.current) {
        try { chartInstanceRef.current.remove(); } catch {}
        chartInstanceRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  // ── Re-apply indicators on toggle changes ──────────────────────────────────
  useEffect(() => {
    if (!chartInstanceRef.current) return;
    rebuildIndicators();
  }, [showVolume, showEma20, showEma50, showEma200, rebuildIndicators]);

  // ── Derived display values ──────────────────────────────────────────────────
  const changeAbs  = stats ? stats.latestClose - stats.firstClose : 0;
  const changePct  = stats && stats.firstClose > 0
    ? (changeAbs / stats.firstClose) * 100
    : 0;
  const isPositive = changeAbs >= 0;

  // ── Format tooltip time ─────────────────────────────────────────────────────
  const formatTooltipTime = (t: string): string => {
    if (!t) return "";
    if (t.includes("T")) {
      // Intraday ISO string
      const d = new Date(t);
      return d.toLocaleString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    }
    const d = new Date(t + "T00:00:00");
    return d.toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });
  };

  // ─── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div className="bg-[#0D1117] border border-[#21262D] rounded-xl overflow-hidden mb-6">

      {/* ── Chart Header ───────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-2 border-b border-[#21262D]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          {/* Symbol + price */}
          <div>
            <h2 className="text-lg font-bold text-white">{symbol}</h2>
            {stats && (
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-bold text-white">
                  {formatINR(stats.latestClose)}
                </span>
                <span className={`text-sm font-medium ${isPositive ? "text-green-400" : "text-red-400"}`}>
                  {isPositive ? "+" : ""}{formatINR(Math.abs(changeAbs))}
                  &nbsp;({isPositive ? "+" : ""}{changePct.toFixed(2)}%)
                </span>
              </div>
            )}
            {stats && (
              <div className="flex gap-4 text-xs text-gray-500 mt-1">
                <span>H: <span className="text-green-400">{formatINR(stats.high)}</span></span>
                <span>L: <span className="text-red-400">{formatINR(stats.low)}</span></span>
                <span className="hidden sm:inline">{stats.records} candles • {stats.from} → {stats.to}</span>
              </div>
            )}
          </div>

          {/* Period buttons */}
          <div className="flex flex-wrap gap-1">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => handlePeriod(p.value)}
                disabled={loading}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                  activePeriod === p.value
                    ? "bg-blue-600 text-white"
                    : "bg-[#161B22] text-gray-400 hover:bg-[#21262D] hover:text-white"
                } disabled:opacity-40`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Indicator toggles */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <span className="text-xs text-gray-500">Indicators:</span>
          {[
            { label: "Volume", state: showVolume,  set: setShowVolume,  color: "bg-gray-400"  },
            { label: "EMA 20", state: showEma20,   set: setShowEma20,   color: "bg-yellow-400"},
            { label: "EMA 50", state: showEma50,   set: setShowEma50,   color: "bg-blue-400"  },
            { label: "EMA 200",state: showEma200,  set: setShowEma200,  color: "bg-purple-400"},
          ].map(({ label, state, set, color }) => (
            <button
              key={label}
              onClick={() => set((v) => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border transition-all ${
                state
                  ? "border-[#30363D] text-white bg-[#21262D]"
                  : "border-[#21262D] text-gray-600 bg-transparent"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${state ? color : "bg-gray-700"}`} />
              {label}
            </button>
          ))}

          <button
            onClick={resetZoom}
            className="ml-auto px-2.5 py-1 rounded text-xs font-medium border border-[#21262D] text-gray-400 hover:text-white hover:bg-[#21262D] transition-all"
          >
            Reset Zoom
          </button>
        </div>
      </div>

      {/* ── Tooltip / OHLCV info bar ────────────────────────────────────────── */}
      <div className="px-4 py-2 border-b border-[#21262D] min-h-[36px] flex items-center">
        {tooltip ? (
          <div className="flex flex-wrap gap-4 text-xs font-mono">
            <span className="text-gray-400">{formatTooltipTime(tooltip.time)}</span>
            <span>O: <span className="text-white">{formatINR(tooltip.open)}</span></span>
            <span>H: <span className="text-green-400">{formatINR(tooltip.high)}</span></span>
            <span>L: <span className="text-red-400">{formatINR(tooltip.low)}</span></span>
            <span>C: <span className={tooltip.close >= tooltip.open ? "text-green-400" : "text-red-400"}>
              {formatINR(tooltip.close)}
            </span></span>
            <span>Vol: <span className="text-blue-400">{formatVolume(tooltip.volume)}</span></span>
          </div>
        ) : (
          <span className="text-xs text-gray-600">Hover over a candle to see OHLCV details</span>
        )}
      </div>

      {/* ── Chart area ─────────────────────────────────────────────────────── */}
      <div className="relative">

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0D1117]/90">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-400">Loading {activePeriod.toUpperCase()} data…</p>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {error && !loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0D1117]/90">
            <div className="text-center px-6 py-8 bg-[#161B22] border border-[#21262D] rounded-xl max-w-sm">
              <div className="w-10 h-10 rounded-full bg-red-900/30 flex items-center justify-center mx-auto mb-3">
                <span className="text-red-400 text-lg">⚠</span>
              </div>
              <p className="text-red-400 font-semibold mb-1">Unable to load chart</p>
              <p className="text-gray-500 text-sm mb-4">{error}</p>
              <button
                onClick={() => loadChart(activePeriod)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-all"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Chart container — always mounted, never hidden */}
        <div
          ref={chartContainerRef}
          style={{ height: "500px" }}
          className="w-full"
        />
      </div>

      {/* ── Legend ─────────────────────────────────────────────────────────── */}
      <div className="px-4 py-2 border-t border-[#21262D] flex flex-wrap gap-4 text-xs">
        {showEma20  && <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-yellow-400 inline-block" />EMA 20</span>}
        {showEma50  && <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-blue-400   inline-block" />EMA 50</span>}
        {showEma200 && <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-purple-400 inline-block" />EMA 200</span>}
        <span className="ml-auto text-gray-600">
          Daily candles
        </span>
      </div>
    </div>
  );
}