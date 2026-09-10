# backend/data/market_data.py

import math
import time
from datetime import datetime
from typing import Optional, Dict, Any

import yfinance as yf


# ============================================================
# SIMPLE IN-MEMORY CACHE
# ============================================================

_cache: Dict[str, Any] = {}
_cache_ttl: Dict[str, float] = {}


def _get_cache(key: str, ttl: int = 60) -> Optional[Any]:
    """Get cached value if it exists and has not expired."""
    norm_key = key.strip().upper()
    if norm_key in _cache:
        created_at = _cache_ttl.get(norm_key, 0)
        if time.time() - created_at < ttl:
            return _cache[norm_key]
        # Remove expired cache
        _cache.pop(norm_key, None)
        _cache_ttl.pop(norm_key, None)
    return None


def _set_cache(key: str, value: Any):
    """Store value in cache with the current timestamp."""
    norm_key = key.strip().upper()
    _cache[norm_key] = value
    _cache_ttl[norm_key] = time.time()


# ============================================================
# MARKET DATA
# ============================================================

class MarketData:

    # --------------------------------------------------------
    # SYMBOL
    # --------------------------------------------------------

    @staticmethod
    def get_symbol(symbol: str) -> str:
        """Convert plain symbol to NSE format."""
        sym = symbol.strip().upper()
        if not sym.endswith(".NS") and not sym.endswith(".BO"):
            return f"{sym}.NS"
        return sym

    # --------------------------------------------------------
    # VALUE CLEANING
    # --------------------------------------------------------

    @staticmethod
    def _clean_value(val) -> Optional[float]:
        """Clean a float value and return None if invalid or non-finite."""
        try:
            if val is None:
                return None
            f = float(val)
            if not math.isfinite(f):
                return None
            return f
        except Exception:
            return None

    # ========================================================
    # CURRENT PRICE
    # ========================================================

    @staticmethod
    def get_current_price(symbol: str) -> dict:
        """
        Get current stock price.
        Cache: 60 seconds. Prevents repeated yfinance requests.
        """
        clean_symbol = symbol.strip().upper()
        cache_key = f"price_{clean_symbol}"

        cached = _get_cache(cache_key, ttl=60)
        if cached is not None:
            return cached

        try:
            ticker = yf.Ticker(MarketData.get_symbol(clean_symbol))
            info = ticker.info

            if not isinstance(info, dict):
                info = {}

            # Current price
            current_price = (
                info.get("currentPrice")
                or info.get("regularMarketPrice")
                or info.get("previousClose")
                or 0
            )

            # Previous close
            previous_close = (
                info.get("previousClose")
                or info.get("regularMarketPreviousClose")
                or 0
            )

            # Clean values
            current_price = MarketData._clean_value(current_price) or 0
            previous_close = MarketData._clean_value(previous_close) or 0

            # Change
            change = round(current_price - previous_close, 2)

            # Change %
            change_percent = round(
                ((current_price - previous_close) / previous_close * 100)
                if previous_close
                else 0,
                2,
            )

            open_price = (
                info.get("open")
                or info.get("regularMarketOpen")
                or 0
            )

            day_high = (
                info.get("dayHigh")
                or info.get("regularMarketDayHigh")
                or 0
            )

            day_low = (
                info.get("dayLow")
                or info.get("regularMarketDayLow")
                or 0
            )

            volume = (
                info.get("volume")
                or info.get("regularMarketVolume")
                or 0
            )

            market_cap = info.get("marketCap", 0)
            pe_ratio = info.get("trailingPE", 0)
            week_high = info.get("fiftyTwoWeekHigh", 0)
            week_low = info.get("fiftyTwoWeekLow", 0)

            # Clean numerical values
            open_price = MarketData._clean_value(open_price) or 0
            day_high = MarketData._clean_value(day_high) or 0
            day_low = MarketData._clean_value(day_low) or 0
            market_cap = MarketData._clean_value(market_cap) or 0
            pe_ratio = MarketData._clean_value(pe_ratio) or 0
            week_high = MarketData._clean_value(week_high) or 0
            week_low = MarketData._clean_value(week_low) or 0

            try:
                volume = int(float(volume))
            except Exception:
                volume = 0

            result = {
                "symbol": clean_symbol,
                "company_name": info.get("longName", info.get("shortName", clean_symbol)),
                "current_price": round(current_price, 2),
                "previous_close": round(previous_close, 2),
                "open": round(open_price, 2),
                "day_high": round(day_high, 2),
                "day_low": round(day_low, 2),
                "volume": volume,
                "market_cap": market_cap,
                "pe_ratio": pe_ratio,
                "52_week_high": week_high,
                "52_week_low": week_low,
                "change": change,
                "change_percent": change_percent,
                "timestamp": datetime.now().isoformat(),
            }

            _set_cache(cache_key, result)
            return result

        except Exception as e:
            return {
                "error": str(e),
                "symbol": clean_symbol,
            }

    # ========================================================
    # HISTORICAL DATA
    # ========================================================

    @staticmethod
    def get_historical_data(
        symbol: str,
        period: str = "3mo",
        interval: str = "1d"
    ) -> dict:
        """
        Get historical OHLCV data with 120s cache.
        """
        clean_symbol = symbol.strip().upper()
        cache_key = f"hist_{clean_symbol}_{period}_{interval}"

        cached = _get_cache(cache_key, ttl=120)
        if cached is not None:
            return cached

        try:
            ticker = yf.Ticker(MarketData.get_symbol(clean_symbol))
            df = ticker.history(period=period, interval=interval)

            if df.empty:
                return {
                    "error": "No data found",
                    "symbol": clean_symbol,
                    "data": [],
                }

            if hasattr(df.columns, "levels"):
                df.columns = df.columns.get_level_values(0)

            history = []
            seen_times = set()

            for dt, row in df.iterrows():
                try:
                    open_val = MarketData._clean_value(row.get("Open"))
                    high_val = MarketData._clean_value(row.get("High"))
                    low_val = MarketData._clean_value(row.get("Low"))
                    close_val = MarketData._clean_value(row.get("Close"))
                    vol_val = row.get("Volume", 0)

                    if any(v is None or v <= 0 for v in [open_val, high_val, low_val, close_val]):
                        continue

                    if high_val < low_val:
                        continue

                    if interval in ("1m", "2m", "5m", "15m", "30m", "60m", "90m", "1h"):
                        try:
                            ts = dt.strftime("%Y-%m-%dT%H:%M:%S")
                        except Exception:
                            ts = str(dt)
                    else:
                        ts = dt.strftime("%Y-%m-%d")

                    if ts in seen_times:
                        continue

                    seen_times.add(ts)

                    try:
                        vol = int(float(vol_val)) if vol_val is not None and not math.isnan(float(vol_val)) else 0
                    except Exception:
                        vol = 0

                    history.append({
                        "date": ts,
                        "open": round(open_val, 2),
                        "high": round(high_val, 2),
                        "low": round(low_val, 2),
                        "close": round(close_val, 2),
                        "volume": vol,
                    })
                except Exception:
                    continue

            history.sort(key=lambda x: x["date"])

            result = {
                "symbol": clean_symbol,
                "period": period,
                "interval": interval,
                "data": history,
                "total_records": len(history),
            }

            _set_cache(cache_key, result)
            return result

        except Exception as e:
            return {
                "error": str(e),
                "symbol": clean_symbol,
                "data": [],
            }

    # ========================================================
    # MULTIPLE STOCKS
    # ========================================================

    @staticmethod
    def get_multiple_stocks(symbols: list) -> list:
        """Get prices for multiple stocks using cached calls."""
        results = []
        for symbol in symbols:
            data = MarketData.get_current_price(symbol)
            results.append(data)
        return results

    # ========================================================
    # MARKET OVERVIEW
    # ========================================================

    @staticmethod
    def get_market_overview() -> dict:
        """
        Get NSE market overview (NIFTY 50 and SENSEX) with 60s cache.
        """
        cached = _get_cache("market_overview", ttl=60)
        if cached is not None:
            return cached

        try:
            nifty = yf.Ticker("^NSEI")
            sensex = yf.Ticker("^BSESN")

            nifty_info = nifty.info if isinstance(nifty.info, dict) else {}
            sensex_info = sensex.info if isinstance(sensex.info, dict) else {}

            def get_price(info):
                return (
                    info.get("regularMarketPrice")
                    or info.get("currentPrice")
                    or info.get("previousClose")
                    or 0
                )

            def get_previous(info):
                return (
                    info.get("regularMarketPreviousClose")
                    or info.get("previousClose")
                    or 0
                )

            nifty_price = MarketData._clean_value(get_price(nifty_info)) or 0
            nifty_previous = MarketData._clean_value(get_previous(nifty_info)) or 0

            sensex_price = MarketData._clean_value(get_price(sensex_info)) or 0
            sensex_previous = MarketData._clean_value(get_previous(sensex_info)) or 0

            def calculate_change(price, previous):
                change = round(price - previous, 2)
                change_percent = round(
                    ((price - previous) / previous * 100) if previous else 0,
                    2,
                )
                return change, change_percent

            nifty_change, nifty_change_percent = calculate_change(nifty_price, nifty_previous)
            sensex_change, sensex_change_percent = calculate_change(sensex_price, sensex_previous)

            result = {
                "nifty50": {
                    "value": round(nifty_price, 2),
                    "change": nifty_change,
                    "change_percent": nifty_change_percent,
                },
                "sensex": {
                    "value": round(sensex_price, 2),
                    "change": sensex_change,
                    "change_percent": sensex_change_percent,
                },
                "timestamp": datetime.now().isoformat(),
            }

            _set_cache("market_overview", result)
            return result

        except Exception as e:
            return {"error": str(e)}


if __name__ == "__main__":
    md = MarketData()
    print("=== TCS Price ===")
    p = md.get_current_price("TCS")
    print(f"Price: ₹{p.get('current_price')} Change: {p.get('change_percent')}%")