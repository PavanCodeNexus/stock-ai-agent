# data/market_data.py

import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
from typing import Optional

class MarketData:

    @staticmethod
    def get_symbol(symbol: str) -> str:
        """Convert plain symbol to NSE format"""
        # TCS → TCS.NS (NSE)
        # RELIANCE → RELIANCE.NS
        if not symbol.endswith(".NS") and not symbol.endswith(".BO"):
            return f"{symbol.upper()}.NS"
        return symbol.upper()

    @staticmethod
    def get_current_price(symbol: str) -> dict:
        """Get current live price of a stock"""
        try:
            ticker = yf.Ticker(MarketData.get_symbol(symbol))
            info = ticker.info

            return {
                "symbol": symbol.upper(),
                "company_name": info.get("longName", "N/A"),
                "current_price": info.get("currentPrice", 0),
                "previous_close": info.get("previousClose", 0),
                "open": info.get("open", 0),
                "day_high": info.get("dayHigh", 0),
                "day_low": info.get("dayLow", 0),
                "volume": info.get("volume", 0),
                "market_cap": info.get("marketCap", 0),
                "pe_ratio": info.get("trailingPE", 0),
                "52_week_high": info.get("fiftyTwoWeekHigh", 0),
                "52_week_low": info.get("fiftyTwoWeekLow", 0),
                "change": round(
                    info.get("currentPrice", 0) -
                    info.get("previousClose", 0), 2
                ),
                "change_percent": round(
                    ((info.get("currentPrice", 0) -
                      info.get("previousClose", 0)) /
                     info.get("previousClose", 1)) * 100, 2
                ),
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            return {"error": str(e), "symbol": symbol}

    @staticmethod
    def get_historical_data(
        symbol: str,
        period: str = "3mo"
    ) -> dict:
        """
        Get historical price data
        period: 1d, 5d, 1mo, 3mo, 6mo, 1y
        """
        try:
            ticker = yf.Ticker(MarketData.get_symbol(symbol))
            df = ticker.history(period=period)

            if df.empty:
                return {"error": "No data found", "symbol": symbol}

            # Format for frontend charts
            history = []
            for date, row in df.iterrows():
                history.append({
                    "date": date.strftime("%Y-%m-%d"),
                    "open": round(row["Open"], 2),
                    "high": round(row["High"], 2),
                    "low": round(row["Low"], 2),
                    "close": round(row["Close"], 2),
                    "volume": int(row["Volume"])
                })

            return {
                "symbol": symbol.upper(),
                "period": period,
                "data": history,
                "total_records": len(history)
            }

        except Exception as e:
            return {"error": str(e), "symbol": symbol}

    @staticmethod
    def get_multiple_stocks(symbols: list) -> list:
        """Get current price for multiple stocks at once"""
        results = []
        for symbol in symbols:
            data = MarketData.get_current_price(symbol)
            results.append(data)
        return results

    @staticmethod
    def get_market_overview() -> dict:
        """Get NSE market overview - Nifty 50 and Sensex"""
        try:
            nifty = yf.Ticker("^NSEI")
            sensex = yf.Ticker("^BSESN")

            nifty_info = nifty.info
            sensex_info = sensex.info

            return {
                "nifty50": {
                    "value": nifty_info.get("regularMarketPrice", 0),
                    "change": nifty_info.get("regularMarketChange", 0),
                    "change_percent": round(
                        nifty_info.get("regularMarketChangePercent", 0), 2
                    )
                },
                "sensex": {
                    "value": sensex_info.get("regularMarketPrice", 0),
                    "change": sensex_info.get("regularMarketChange", 0),
                    "change_percent": round(
                        sensex_info.get("regularMarketChangePercent", 0), 2
                    )
                },
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            return {"error": str(e)}


# Test
if __name__ == "__main__":
    md = MarketData()

    print("=" * 50)
    print("Testing Market Data")
    print("=" * 50)

    # Test 1 - Current price
    print("\n1. TCS Current Price:")
    price = md.get_current_price("TCS")
    print(f"   Price: ₹{price.get('current_price')}")
    print(f"   Change: {price.get('change_percent')}%")
    print(f"   Company: {price.get('company_name')}")

    # Test 2 - Historical data
    print("\n2. TCS Historical (1 month):")
    history = md.get_historical_data("TCS", "1mo")
    print(f"   Records: {history.get('total_records')}")
    print(f"   Latest: {history['data'][-1]}")

    # Test 3 - Market overview
    print("\n3. Market Overview:")
    overview = md.get_market_overview()
    print(f"   Nifty 50: {overview['nifty50']['value']}")
    print(f"   Sensex: {overview['sensex']['value']}")