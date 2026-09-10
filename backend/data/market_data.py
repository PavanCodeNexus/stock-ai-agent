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
        if sym.startswith("^"):
            return sym
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
        Robust fallback sequence: info -> fast_info -> history(5d).
        """
        clean_symbol = symbol.strip().upper()
        cache_key = f"price_{clean_symbol}"

        cached = _get_cache(cache_key, ttl=60)
        if cached is not None:
            return cached

        try:
            formatted_sym = MarketData.get_symbol(clean_symbol)
            ticker = yf.Ticker(formatted_sym)
            
            # 1. Try info
            info = {}
            try:
                raw_info = ticker.info
                if isinstance(raw_info, dict):
                    info = raw_info
            except Exception:
                info = {}

            # Extract fields from info
            current_price = (
                info.get("currentPrice")
                or info.get("regularMarketPrice")
                or info.get("previousClose")
            )
            previous_close = (
                info.get("previousClose")
                or info.get("regularMarketPreviousClose")
            )
            open_price = info.get("open") or info.get("regularMarketOpen")
            day_high = info.get("dayHigh") or info.get("regularMarketDayHigh")
            day_low = info.get("dayLow") or info.get("regularMarketDayLow")
            volume = info.get("volume") or info.get("regularMarketVolume")
            market_cap = info.get("marketCap")
            pe_ratio = info.get("trailingPE") or info.get("forwardPE")
            week_high = info.get("fiftyTwoWeekHigh")
            week_low = info.get("fiftyTwoWeekLow")
            company_name = info.get("longName") or info.get("shortName") or clean_symbol

            # 2. Extract fast_info if available for missing fields
            try:
                fi = getattr(ticker, "fast_info", None)
                if fi:
                    current_price = current_price or fi.get("last_price") or fi.get("regular_market_price")
                    previous_close = previous_close or fi.get("previous_close")
                    open_price = open_price or fi.get("open")
                    day_high = day_high or fi.get("day_high")
                    day_low = day_low or fi.get("day_low")
                    volume = volume or fi.get("last_volume")
                    market_cap = market_cap or fi.get("market_cap")
                    week_high = week_high or fi.get("year_high")
                    week_low = week_low or fi.get("year_low")
            except Exception:
                pass

            # 3. Fallback to history OHLCV if price or previous_close is still 0 / None
            if not current_price or not previous_close:
                try:
                    df = ticker.history(period="5d", interval="1d")
                    if not df.empty:
                        df = df.dropna(subset=["Close"])
                        if len(df) >= 1:
                            last_row = df.iloc[-1]
                            current_price = current_price or float(last_row["Close"])
                            day_high = day_high or float(last_row["High"])
                            day_low = day_low or float(last_row["Low"])
                            open_price = open_price or float(last_row["Open"])
                            volume = volume or int(last_row["Volume"])
                        if len(df) >= 2:
                            previous_close = previous_close or float(df.iloc[-2]["Close"])
                        else:
                            previous_close = previous_close or current_price
                except Exception:
                    pass

            # Clean all values
            current_price = MarketData._clean_value(current_price) or 0
            previous_close = MarketData._clean_value(previous_close) or current_price
            open_price = MarketData._clean_value(open_price) or current_price
            day_high = MarketData._clean_value(day_high) or current_price
            day_low = MarketData._clean_value(day_low) or current_price
            market_cap = MarketData._clean_value(market_cap) or 0
            pe_ratio = MarketData._clean_value(pe_ratio) or 0
            week_high = MarketData._clean_value(week_high) or day_high
            week_low = MarketData._clean_value(week_low) or day_low

            try:
                volume = int(float(volume))
            except Exception:
                volume = 0

            # Change calculations
            change = round(current_price - previous_close, 2)
            change_percent = round(
                ((current_price - previous_close) / previous_close * 100)
                if previous_close
                else 0,
                2,
            )

            result = {
                "symbol": clean_symbol,
                "company_name": company_name,
                "current_price": round(current_price, 2),
                "previous_close": round(previous_close, 2),
                "open": round(open_price, 2),
                "day_high": round(day_high, 2),
                "day_low": round(day_low, 2),
                "volume": volume,
                "market_cap": market_cap,
                "pe_ratio": pe_ratio,
                "52_week_high": round(week_high, 2),
                "52_week_low": round(week_low, 2),
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
            def extract_index_data(ticker_symbol: str):
                t = yf.Ticker(ticker_symbol)
                info = {}
                try:
                    if isinstance(t.info, dict):
                        info = t.info
                except Exception:
                    info = {}
                
                price = (
                    info.get("regularMarketPrice")
                    or info.get("currentPrice")
                    or info.get("previousClose")
                )
                prev = (
                    info.get("regularMarketPreviousClose")
                    or info.get("previousClose")
                )

                if not price or not prev:
                    try:
                        fi = getattr(t, "fast_info", None)
                        if fi:
                            price = price or fi.get("last_price") or fi.get("regular_market_price")
                            prev = prev or fi.get("previous_close")
                    except Exception:
                        pass

                if not price or not prev:
                    try:
                        df = t.history(period="5d", interval="1d")
                        if not df.empty:
                            df = df.dropna(subset=["Close"])
                            if len(df) >= 1:
                                price = price or float(df.iloc[-1]["Close"])
                            if len(df) >= 2:
                                prev = prev or float(df.iloc[-2]["Close"])
                            else:
                                prev = prev or price
                    except Exception:
                        pass

                clean_p = MarketData._clean_value(price) or 0
                clean_prev = MarketData._clean_value(prev) or clean_p
                change = round(clean_p - clean_prev, 2)
                change_pct = round(((clean_p - clean_prev) / clean_prev * 100) if clean_prev else 0, 2)
                return {
                    "value": round(clean_p, 2),
                    "change": change,
                    "change_percent": change_pct,
                }

            result = {
                "nifty50": extract_index_data("^NSEI"),
                "sensex": extract_index_data("^BSESN"),
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