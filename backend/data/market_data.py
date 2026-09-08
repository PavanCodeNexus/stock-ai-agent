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


def _get_cache(key: str, ttl: int = 60):
    """Get cached value if it exists and has not expired."""
    if key in _cache:
        created_at = _cache_ttl.get(key, 0)

        if time.time() - created_at < ttl:
            return _cache[key]

        # Remove expired cache
        _cache.pop(key, None)
        _cache_ttl.pop(key, None)

    return None


def _set_cache(key: str, value: Any):
    """Store value in cache with the current timestamp."""
    _cache[key] = value
    _cache_ttl[key] = time.time()


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

        symbol = symbol.strip().upper()

        if not symbol.endswith(".NS") and not symbol.endswith(".BO"):
            return f"{symbol}.NS"

        return symbol

    # --------------------------------------------------------
    # VALUE CLEANING
    # --------------------------------------------------------

    @staticmethod
    def _clean_value(val) -> Optional[float]:
        """Clean a float value and return None if invalid."""

        try:
            f = float(val)

            if math.isnan(f) or math.isinf(f):
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

        Cache:
            60 seconds

        This prevents repeated yfinance requests for
        the same stock within 60 seconds.
        """

        clean_symbol = symbol.strip().upper()

        cache_key = f"price_{clean_symbol}"

        # ----------------------------------------------------
        # CHECK CACHE
        # ----------------------------------------------------

        cached = _get_cache(cache_key, ttl=60)

        if cached is not None:
            return cached

        # ----------------------------------------------------
        # FETCH FROM YFINANCE
        # ----------------------------------------------------

        try:
            ticker = yf.Ticker(MarketData.get_symbol(clean_symbol))

            info = ticker.info

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
                (
                    (current_price - previous_close)
                    / previous_close
                    * 100
                )
                if previous_close
                else 0,
                2,
            )

            # ------------------------------------------------
            # OTHER MARKET VALUES
            # ------------------------------------------------

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

            # ------------------------------------------------
            # RESULT
            # ------------------------------------------------

            result = {
                "symbol": clean_symbol,

                "company_name": info.get(
                    "longName",
                    info.get("shortName", "N/A")
                ),

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

            # ------------------------------------------------
            # SAVE TO CACHE
            # ------------------------------------------------

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
        Get historical OHLCV data.

        Supported combinations:

        1d   / 5m   → intraday 1 day
        5d   / 15m  → intraday 1 week
        1mo  / 1d   → 1 month daily
        3mo  / 1d   → 3 months daily
        6mo  / 1d   → 6 months daily
        1y   / 1d   → 1 year daily
        5y   / 1d   → 5 years daily
        max  / 1d   → maximum daily
        """

        clean_symbol = symbol.strip().upper()

        try:

            ticker = yf.Ticker(
                MarketData.get_symbol(clean_symbol)
            )

            df = ticker.history(
                period=period,
                interval=interval
            )

            if df.empty:

                return {
                    "error": "No data found",
                    "symbol": clean_symbol,
                    "data": [],
                }

            # ------------------------------------------------
            # HANDLE MULTIINDEX
            # ------------------------------------------------

            if hasattr(df.columns, "levels"):

                df.columns = df.columns.get_level_values(0)

            history = []

            seen_times = set()

            # ------------------------------------------------
            # PROCESS EACH CANDLE
            # ------------------------------------------------

            for dt, row in df.iterrows():

                try:

                    open_val = MarketData._clean_value(
                        row.get("Open")
                    )

                    high_val = MarketData._clean_value(
                        row.get("High")
                    )

                    low_val = MarketData._clean_value(
                        row.get("Low")
                    )

                    close_val = MarketData._clean_value(
                        row.get("Close")
                    )

                    vol_val = row.get("Volume", 0)

                    # ----------------------------------------
                    # VALIDATE OHLC
                    # ----------------------------------------

                    if any(
                        v is None
                        for v in [
                            open_val,
                            high_val,
                            low_val,
                            close_val,
                        ]
                    ):
                        continue

                    if any(
                        v <= 0
                        for v in [
                            open_val,
                            high_val,
                            low_val,
                            close_val,
                        ]
                    ):
                        continue

                    if high_val < low_val:
                        continue

                    # ----------------------------------------
                    # TIME FORMAT
                    # ----------------------------------------

                    if interval in (
                        "1m",
                        "2m",
                        "5m",
                        "15m",
                        "30m",
                        "60m",
                        "90m",
                        "1h",
                    ):

                        try:
                            ts = dt.strftime(
                                "%Y-%m-%dT%H:%M:%S"
                            )

                        except Exception:
                            ts = str(dt)

                    else:

                        ts = dt.strftime("%Y-%m-%d")

                    # ----------------------------------------
                    # REMOVE DUPLICATES
                    # ----------------------------------------

                    if ts in seen_times:
                        continue

                    seen_times.add(ts)

                    # ----------------------------------------
                    # VOLUME
                    # ----------------------------------------

                    try:

                        if (
                            vol_val is not None
                            and not math.isnan(float(vol_val))
                        ):
                            vol = int(float(vol_val))

                        else:
                            vol = 0

                    except Exception:

                        vol = 0

                    # ----------------------------------------
                    # ADD CANDLE
                    # ----------------------------------------

                    history.append(
                        {
                            "date": ts,

                            "open": round(
                                open_val,
                                2
                            ),

                            "high": round(
                                high_val,
                                2
                            ),

                            "low": round(
                                low_val,
                                2
                            ),

                            "close": round(
                                close_val,
                                2
                            ),

                            "volume": vol,
                        }
                    )

                except Exception:
                    continue

            # ------------------------------------------------
            # SORT CHRONOLOGICALLY
            # ------------------------------------------------

            history.sort(
                key=lambda x: x["date"]
            )

            return {
                "symbol": clean_symbol,

                "period": period,

                "interval": interval,

                "data": history,

                "total_records": len(history),
            }

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
        """
        Get prices for multiple stocks.

        Individual get_current_price() calls use
        the 60-second cache.
        """

        results = []

        for symbol in symbols:

            data = MarketData.get_current_price(
                symbol
            )

            results.append(data)

        return results

    # ========================================================
    # MARKET OVERVIEW
    # ========================================================

    @staticmethod
    def get_market_overview() -> dict:
        """
        Get NSE market overview.

        Includes:

        - NIFTY 50
        - BSE SENSEX

        Cache:
            60 seconds
        """

        # ----------------------------------------------------
        # CHECK CACHE
        # ----------------------------------------------------

        cached = _get_cache(
            "market_overview",
            ttl=60
        )

        if cached is not None:
            return cached

        # ----------------------------------------------------
        # FETCH DATA
        # ----------------------------------------------------

        try:

            nifty = yf.Ticker("^NSEI")

            sensex = yf.Ticker("^BSESN")

            nifty_info = nifty.info

            sensex_info = sensex.info

            # ------------------------------------------------
            # PRICE
            # ------------------------------------------------

            def get_price(info):

                return (
                    info.get("regularMarketPrice")
                    or info.get("currentPrice")
                    or info.get("previousClose")
                    or 0
                )

            # ------------------------------------------------
            # PREVIOUS CLOSE
            # ------------------------------------------------

            def get_previous(info):

                return (
                    info.get("regularMarketPreviousClose")
                    or info.get("previousClose")
                    or 0
                )

            nifty_price = MarketData._clean_value(
                get_price(nifty_info)
            ) or 0

            nifty_previous = MarketData._clean_value(
                get_previous(nifty_info)
            ) or 0

            sensex_price = MarketData._clean_value(
                get_price(sensex_info)
            ) or 0

            sensex_previous = MarketData._clean_value(
                get_previous(sensex_info)
            ) or 0

            # ------------------------------------------------
            # CHANGE CALCULATION
            # ------------------------------------------------

            def calculate_change(
                price,
                previous
            ):

                change = round(
                    price - previous,
                    2
                )

                change_percent = round(
                    (
                        (price - previous)
                        / previous
                        * 100
                    )
                    if previous
                    else 0,
                    2,
                )

                return change, change_percent

            nifty_change, nifty_change_percent = (
                calculate_change(
                    nifty_price,
                    nifty_previous
                )
            )

            sensex_change, sensex_change_percent = (
                calculate_change(
                    sensex_price,
                    sensex_previous
                )
            )

            # ------------------------------------------------
            # RESULT
            # ------------------------------------------------

            result = {

                "nifty50": {
                    "value": round(
                        nifty_price,
                        2
                    ),

                    "change": nifty_change,

                    "change_percent":
                        nifty_change_percent,
                },

                "sensex": {
                    "value": round(
                        sensex_price,
                        2
                    ),

                    "change": sensex_change,

                    "change_percent":
                        sensex_change_percent,
                },

                "timestamp":
                    datetime.now().isoformat(),
            }

            # ------------------------------------------------
            # SAVE TO CACHE
            # ------------------------------------------------

            _set_cache(
                "market_overview",
                result
            )

            return result

        except Exception as e:

            return {
                "error": str(e)
            }


# ============================================================
# QUICK TEST
# ============================================================

if __name__ == "__main__":

    md = MarketData()

    # --------------------------------------------------------
    # TEST CURRENT PRICE
    # --------------------------------------------------------

    print("=== TCS Price ===")

    p = md.get_current_price("TCS")

    print(
        f"Price: ₹{p.get('current_price')} "
        f"Change: {p.get('change_percent')}%"
    )

    # --------------------------------------------------------
    # TEST CACHE
    # --------------------------------------------------------

    print("\n=== TCS Price Again ===")

    p2 = md.get_current_price("TCS")

    print(
        f"Price: ₹{p2.get('current_price')} "
        f"Change: {p2.get('change_percent')}%"
    )

    print(
        "\nSecond request should come from "
        "the 60-second cache."
    )

    # --------------------------------------------------------
    # TEST HISTORICAL DATA
    # --------------------------------------------------------

    print("\n=== TCS 3M Daily ===")

    h = md.get_historical_data(
        "TCS",
        "3mo",
        "1d"
    )

    print(
        f"Records: {h.get('total_records')}"
    )

    if h.get("data"):

        print(
            "Last:",
            h["data"][-1]
        )

    # --------------------------------------------------------
    # TEST INTRADAY
    # --------------------------------------------------------

    print(
        "\n=== TCS 1D Intraday (5m) ==="
    )

    h2 = md.get_historical_data(
        "TCS",
        "1d",
        "5m"
    )

    print(
        f"Records: {h2.get('total_records')}"
    )

    if h2.get("data"):

        print(
            "First:",
            h2["data"][0]
        )

        print(
            "Last:",
            h2["data"][-1]
        )

    # --------------------------------------------------------
    # TEST MARKET OVERVIEW
    # --------------------------------------------------------

    print(
        "\n=== Market Overview ==="
    )

    overview = md.get_market_overview()

    print(overview)