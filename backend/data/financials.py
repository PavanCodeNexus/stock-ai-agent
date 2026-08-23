# data/financials.py

import yfinance as yf
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

class Financials:

    @staticmethod
    def get_symbol(symbol: str) -> str:
        if not symbol.endswith(".NS") and not symbol.endswith(".BO"):
            return f"{symbol.upper()}.NS"
        return symbol.upper()

    @staticmethod
    def get_company_info(symbol: str) -> dict:
        """Get basic company information"""
        try:
            ticker = yf.Ticker(Financials.get_symbol(symbol))
            info = ticker.info

            return {
                "symbol": symbol.upper(),
                "company_name": info.get("longName", "N/A"),
                "sector": info.get("sector", "N/A"),
                "industry": info.get("industry", "N/A"),
                "website": info.get("website", "N/A"),
                "description": info.get("longBusinessSummary", "N/A")[:300],
                "employees": info.get("fullTimeEmployees", 0),
                "country": info.get("country", "N/A"),
                "founded": info.get("founded", "N/A")
            }
        except Exception as e:
            return {"error": str(e), "symbol": symbol}

    @staticmethod
    def get_key_metrics(symbol: str) -> dict:
        """Get key financial metrics"""
        try:
            ticker = yf.Ticker(Financials.get_symbol(symbol))
            info = ticker.info

            return {
                "symbol": symbol.upper(),
                "valuation": {
                    "market_cap": info.get("marketCap", 0),
                    "pe_ratio": info.get("trailingPE", 0),
                    "forward_pe": info.get("forwardPE", 0),
                    "pb_ratio": info.get("priceToBook", 0),
                    "ev_ebitda": info.get("enterpriseToEbitda", 0),
                },
                "profitability": {
                    "profit_margin": info.get("profitMargins", 0),
                    "operating_margin": info.get("operatingMargins", 0),
                    "roe": info.get("returnOnEquity", 0),
                    "roa": info.get("returnOnAssets", 0),
                },
                "growth": {
                    "revenue_growth": info.get("revenueGrowth", 0),
                    "earnings_growth": info.get("earningsGrowth", 0),
                },
                "dividends": {
                    "dividend_yield": info.get("dividendYield", 0),
                    "payout_ratio": info.get("payoutRatio", 0),
                },
                "debt": {
                    "debt_to_equity": info.get("debtToEquity", 0),
                    "current_ratio": info.get("currentRatio", 0),
                }
            }
        except Exception as e:
            return {"error": str(e), "symbol": symbol}

    @staticmethod
    def get_income_statement(symbol: str) -> dict:
        """Get income statement data"""
        try:
            ticker = yf.Ticker(Financials.get_symbol(symbol))
            income = ticker.financials

            if income is None or income.empty:
                return {"error": "No data", "symbol": symbol}

            result = {}
            for col in income.columns[:4]:  # Last 4 years
                year = str(col.year)
                result[year] = {
                    "revenue": int(income.loc["Total Revenue", col])
                        if "Total Revenue" in income.index else 0,
                    "gross_profit": int(income.loc["Gross Profit", col])
                        if "Gross Profit" in income.index else 0,
                    "net_income": int(income.loc["Net Income", col])
                        if "Net Income" in income.index else 0,
                }

            return {
                "symbol": symbol.upper(),
                "income_statement": result
            }
        except Exception as e:
            return {"error": str(e), "symbol": symbol}


# Test
if __name__ == "__main__":
    f = Financials()

    print("=" * 50)
    print("Testing Financials")
    print("=" * 50)

    print("\n1. TCS Company Info:")
    info = f.get_company_info("TCS")
    print(f"   Name: {info.get('company_name')}")
    print(f"   Sector: {info.get('sector')}")
    print(f"   Industry: {info.get('industry')}")

    print("\n2. TCS Key Metrics:")
    metrics = f.get_key_metrics("TCS")
    val = metrics.get("valuation", {})
    print(f"   PE Ratio: {val.get('pe_ratio')}")
    print(f"   PB Ratio: {val.get('pb_ratio')}")
    prof = metrics.get("profitability", {})
    print(f"   Profit Margin: {prof.get('profit_margin')}")
    print(f"   ROE: {prof.get('roe')}")

    print("\n3. TCS Income Statement:")
    income = f.get_income_statement("TCS")
    for year, data in income.get("income_statement", {}).items():
        print(f"   {year}: Revenue ₹{data.get('revenue'):,}")