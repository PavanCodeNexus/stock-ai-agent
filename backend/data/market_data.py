# data/market_data.py

import yfinance as yf
import math
from datetime import datetime
from typing import Optional


class MarketData:

    @staticmethod
    def get_symbol(symbol: str) -> str:
        """Convert plain symbol to NSE format"""
        if not symbol.endswith(".NS") and not symbol.endswith(".BO"):
            return f"{symbol.upper()}.NS"
        return symbol.upper()

    @staticmethod
    def _clean_value(val) -> Optional[float]:
        """Clean a float value - return None if invalid"""
        try:
            f = float(val)
            if math.isnan(f) or math.isinf(f):
                return None
            return f
        except Exception:
            return None

    @staticmethod
    def get_current_price(symbol: str) -> dict:
        """Get current live price of a stock"""
        try:
            ticker = yf.Ticker(MarketData.get_symbol(symbol))
            info = ticker.info

            current_price = (
                info.get("currentPrice") or
                info.get("regularMarketPrice") or
                info.get("previousClose") or 0
            )
            previous_close = (
                info.get("previousClose") or
                info.get("regularMarketPreviousClose") or 0
            )

            change = round(current_price - previous_close, 2)
            change_percent = round(
                ((current_price - previous_close) / previous_close * 100)
                if previous_close else 0, 2
            )

            return {
                "symbol": symbol.upper(),
                "company_name": info.get("longName", "N/A"),
                "current_price": current_price,
                "previous_close": previous_close,
                "open": info.get("open") or info.get("regularMarketOpen", 0),
                "day_high": info.get("dayHigh") or info.get("regularMarketDayHigh", 0),
                "day_low": info.get("dayLow") or info.get("regularMarketDayLow", 0),
                "volume": info.get("volume") or info.get("regularMarketVolume", 0),
                "market_cap": info.get("marketCap", 0),
                "pe_ratio": info.get("trailingPE", 0),
                "52_week_high": info.get("fiftyTwoWeekHigh", 0),
                "52_week_low": info.get("fiftyTwoWeekLow", 0),
                "change": change,
                "change_percent": change_percent,
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            return {"error": str(e), "symbol": symbol}

    @staticmethod
    def get_historical_data(
        symbol: str,
        period: str = "3mo",
        interval: str = "1d"
    ) -> dict:
        """
        Get historical OHLCV data.
        Supports intraday intervals for 1D and 1W periods.

        Valid combinations:
        1d   / 5m   → intraday 1 day
        5d   / 15m  → intraday 1 week
        1mo  / 1d   → 1 month daily
        3mo  / 1d   → 3 months daily
        6mo  / 1d   → 6 months daily
        1y   / 1d   → 1 year daily
        5y   / 1d   → 5 years daily
        max  / 1d   → max daily
        """
        try:
            ticker = yf.Ticker(MarketData.get_symbol(symbol))
            df = ticker.history(period=period, interval=interval)

            if df.empty:
                return {"error": "No data found", "symbol": symbol, "data": []}

            # Handle MultiIndex columns (yfinance sometimes returns these)
            if hasattr(df.columns, 'levels'):
                df.columns = df.columns.get_level_values(0)

            history = []
            seen_times = set()

            for dt, row in df.iterrows():
                try:
                    open_val  = MarketData._clean_value(row.get("Open"))
                    high_val  = MarketData._clean_value(row.get("High"))
                    low_val   = MarketData._clean_value(row.get("Low"))
                    close_val = MarketData._clean_value(row.get("Close"))
                    vol_val   = row.get("Volume", 0)

                    # Skip invalid OHLCV
                    if any(v is None for v in [open_val, high_val, low_val, close_val]):
                        continue
                    if any(v <= 0 for v in [open_val, high_val, low_val, close_val]):
                        continue
                    if high_val < low_val:
                        continue

                    # Format time string
                    if interval in ("1m", "2m", "5m", "15m", "30m", "60m", "90m", "1h"):
                        # Intraday: use ISO datetime string
                        try:
                            # Convert to IST-aware string
                            ts = dt.strftime("%Y-%m-%dT%H:%M:%S")
                        except Exception:
                            ts = str(dt)
                    else:
                        ts = dt.strftime("%Y-%m-%d")

                    # Remove duplicates
                    if ts in seen_times:
                        continue
                    seen_times.add(ts)

                    try:
                        vol = int(vol_val) if vol_val and not math.isnan(float(vol_val)) else 0
                    except Exception:
                        vol = 0

                    history.append({
                        "date": ts,
                        "open":   round(open_val,  2),
                        "high":   round(high_val,  2),
                        "low":    round(low_val,   2),
                        "close":  round(close_val, 2),
                        "volume": vol,
                    })
                except Exception:
                    continue

            # Sort chronologically
            history.sort(key=lambda x: x["date"])

            return {
                "symbol":        symbol.upper(),
                "period":        period,
                "interval":      interval,
                "data":          history,
                "total_records": len(history),
            }

        except Exception as e:
            return {"error": str(e), "symbol": symbol, "data": []}

    @staticmethod
    def get_multiple_stocks(symbols: list) -> list:
        results = []
        for symbol in symbols:
            data = MarketData.get_current_price(symbol)
            results.append(data)
        return results

    @staticmethod
    def get_market_overview() -> dict:
        try:
            nifty  = yf.Ticker("^NSEI")
            sensex = yf.Ticker("^BSESN")

            ni = nifty.info
            se = sensex.info

            def price(info):
                return (info.get("regularMarketPrice") or
                        info.get("currentPrice") or
                        info.get("previousClose") or 0)

            def prev(info):
                return (info.get("regularMarketPreviousClose") or
                        info.get("previousClose") or 0)

            np_ = price(ni); nv = prev(ni)
            sp_ = price(se); sv = prev(se)

            def chg(p, v):
                c = round(p - v, 2)
                cp = round(((p - v) / v * 100) if v else 0, 2)
                return c, cp

            nc, ncp = chg(np_, nv)
            sc, scp = chg(sp_, sv)

            return {
                "nifty50": {"value": np_, "change": nc, "change_percent": ncp},
                "sensex":  {"value": sp_, "change": sc, "change_percent": scp},
                "timestamp": datetime.now().isoformat(),
            }
        except Exception as e:
            return {"error": str(e)}


# Quick test
if __name__ == "__main__":
    md = MarketData()
    print("=== TCS Price ===")
    p = md.get_current_price("TCS")
    print(f"Price: ₹{p.get('current_price')}  Change: {p.get('change_percent')}%")

    print("\n=== TCS 3M Daily ===")
    h = md.get_historical_data("TCS", "3mo", "1d")
    print(f"Records: {h.get('total_records')}")
    if h.get("data"):
        print("Last:", h["data"][-1])

    print("\n=== TCS 1D Intraday (5m) ===")
    h2 = md.get_historical_data("TCS", "1d", "5m")
    print(f"Records: {h2.get('total_records')}")
    if h2.get("data"):
        print("First:", h2["data"][0])
        print("Last: ", h2["data"][-1])
