# backend/data/financials.py

import math
import time
from typing import Optional, Dict, Any
import yfinance as yf

# ============================================================
# IN-MEMORY TTL CACHE FOR FINANCIALS
# ============================================================

_fin_cache: Dict[str, Any] = {}
_fin_cache_ttl: Dict[str, float] = {}

def _get_fin_cache(key: str, ttl: int = 300) -> Optional[Any]:
    norm_key = key.strip().upper()
    if norm_key in _fin_cache:
        created_at = _fin_cache_ttl.get(norm_key, 0)
        if time.time() - created_at < ttl:
            return _fin_cache[norm_key]
        _fin_cache.pop(norm_key, None)
        _fin_cache_ttl.pop(norm_key, None)
    return None

def _set_fin_cache(key: str, value: Any):
    norm_key = key.strip().upper()
    _fin_cache[norm_key] = value
    _fin_cache_ttl[norm_key] = time.time()


# ============================================================
# SAFE VALUE HELPERS
# ============================================================

def safe_float(value, default=None):
    """
    Convert value to a finite float.
    Prevents NaN, Infinity, and -Infinity from reaching JSON serialization.
    """
    try:
        if value is None:
            return default
        number = float(value)
        if math.isfinite(number):
            return number
        return default
    except (TypeError, ValueError):
        return default


def safe_int(value, default=0):
    """
    Convert value to a safe integer.
    """
    try:
        if value is None:
            return default
        number = float(value)
        if not math.isfinite(number):
            return default
        return int(number)
    except (TypeError, ValueError):
        return default


def safe_string(value, default="N/A"):
    """
    Safely convert a value to string.
    """
    if value is None:
        return default
    try:
        text = str(value).strip()
        if not text:
            return default
        return text
    except Exception:
        return default


# ============================================================
# FINANCIALS
# ============================================================

class Financials:

    # --------------------------------------------------------
    # SYMBOL NORMALIZATION
    # --------------------------------------------------------

    @staticmethod
    def get_symbol(symbol: str) -> str:
        """
        Convert an Indian stock symbol to Yahoo Finance format.
        Example:
            TCS      -> TCS.NS
            RELIANCE -> RELIANCE.NS
            TCS.NS   -> TCS.NS
            TCS.BO   -> TCS.BO
        """
        sym = safe_string(symbol, "").upper()
        if not sym:
            return ""
        if sym.endswith(".NS") or sym.endswith(".BO"):
            return sym
        return f"{sym}.NS"

    # --------------------------------------------------------
    # COMPANY INFORMATION
    # --------------------------------------------------------

    @staticmethod
    def get_company_info(symbol: str) -> dict:
        """
        Get basic company information with 600s cache.
        """
        original_symbol = safe_string(symbol).upper()
        cache_key = f"info_{original_symbol}"
        cached = _get_fin_cache(cache_key, ttl=600)
        if cached is not None:
            return cached

        try:
            yahoo_symbol = Financials.get_symbol(original_symbol)
            ticker = yf.Ticker(yahoo_symbol)
            info = ticker.info

            if not isinstance(info, dict):
                info = {}

            description = safe_string(info.get("longBusinessSummary"))

            result = {
                "symbol": original_symbol,
                "company_name": safe_string(info.get("longName")),
                "sector": safe_string(info.get("sector")),
                "industry": safe_string(info.get("industry")),
                "website": safe_string(info.get("website")),
                "description": description[:300],
                "employees": safe_int(info.get("fullTimeEmployees")),
                "country": safe_string(info.get("country")),
                "founded": safe_int(info.get("founded"), default=0) if info.get("founded") is not None else "N/A"
            }
            _set_fin_cache(cache_key, result)
            return result

        except Exception as e:
            print(f"❌ Company info error for {original_symbol}: {e}")
            return {
                "symbol": original_symbol,
                "company_name": "N/A",
                "sector": "N/A",
                "industry": "N/A",
                "website": "N/A",
                "description": "N/A",
                "employees": 0,
                "country": "N/A",
                "founded": "N/A",
                "error": str(e)
            }

    # --------------------------------------------------------
    # KEY FINANCIAL METRICS
    # --------------------------------------------------------

    @staticmethod
    def get_key_metrics(symbol: str) -> dict:
        """
        Get important financial metrics with 300s cache.
        All numeric values are cleaned so NaN and Infinity
        can never reach the API response.
        """
        original_symbol = safe_string(symbol).upper()
        cache_key = f"metrics_{original_symbol}"
        cached = _get_fin_cache(cache_key, ttl=300)
        if cached is not None:
            return cached

        try:
            yahoo_symbol = Financials.get_symbol(original_symbol)
            ticker = yf.Ticker(yahoo_symbol)
            info = {}
            try:
                raw_info = ticker.info
                if isinstance(raw_info, dict):
                    info = raw_info
            except Exception:
                info = {}

            fi = getattr(ticker, "fast_info", None)

            # Valuation metrics with fallbacks
            market_cap = (
                info.get("marketCap")
                or (getattr(fi, "market_cap", None) if fi else None)
            )
            pe_ratio = (
                info.get("trailingPE")
                or info.get("forwardPE")
            )
            forward_pe = info.get("forwardPE")
            pb_ratio = info.get("priceToBook")
            ev_ebitda = info.get("enterpriseToEbitda")

            # Profitability metrics with fallbacks
            profit_margin = info.get("profitMargins") or info.get("operatingMargins")
            operating_margin = info.get("operatingMargins")
            roe = info.get("returnOnEquity")
            roa = info.get("returnOnAssets")

            # Financials statement fallback for ROE and Margin if missing
            if (roe is None or profit_margin is None) and hasattr(ticker, "financials"):
                try:
                    fin = ticker.financials
                    bs = ticker.balance_sheet
                    if fin is not None and not fin.empty and bs is not None and not bs.empty:
                        net_income = None
                        for k in ["Net Income", "Net Income Common Stockholders"]:
                            if k in fin.index:
                                net_income = float(fin.loc[k].iloc[0])
                                break
                        tot_rev = None
                        for k in ["Total Revenue", "Operating Revenue"]:
                            if k in fin.index:
                                tot_rev = float(fin.loc[k].iloc[0])
                                break
                        equity = None
                        for k in ["Stockholders Equity", "Total Stockholder Equity", "Common Stock Equity"]:
                            if k in bs.index:
                                equity = float(bs.loc[k].iloc[0])
                                break
                        if roe is None and net_income is not None and equity and equity != 0:
                            roe = round(net_income / equity, 4)
                        if profit_margin is None and net_income is not None and tot_rev and tot_rev != 0:
                            profit_margin = round(net_income / tot_rev, 4)
                except Exception:
                    pass

            result = {
                "symbol": original_symbol,
                "valuation": {
                    "market_cap": safe_float(market_cap),
                    "pe_ratio": safe_float(pe_ratio),
                    "forward_pe": safe_float(forward_pe),
                    "pb_ratio": safe_float(pb_ratio),
                    "ev_ebitda": safe_float(ev_ebitda),
                },
                "profitability": {
                    "profit_margin": safe_float(profit_margin),
                    "operating_margin": safe_float(operating_margin),
                    "roe": safe_float(roe),
                    "roa": safe_float(roa),
                },
                "growth": {
                    "revenue_growth": safe_float(info.get("revenueGrowth")),
                    "earnings_growth": safe_float(info.get("earningsGrowth")),
                },
                "dividends": {
                    "dividend_yield": safe_float(info.get("dividendYield")),
                    "payout_ratio": safe_float(info.get("payoutRatio")),
                },
                "debt": {
                    "debt_to_equity": safe_float(info.get("debtToEquity")),
                    "current_ratio": safe_float(info.get("currentRatio")),
                }
            }
            _set_fin_cache(cache_key, result)
            return result

        except Exception as e:
            print(f"❌ Financial metrics error for {original_symbol}: {e}")
            return {
                "symbol": original_symbol,
                "valuation": {},
                "profitability": {},
                "growth": {},
                "dividends": {},
                "debt": {},
                "error": str(e)
            }

    # --------------------------------------------------------
    # INCOME STATEMENT
    # --------------------------------------------------------

    @staticmethod
    def get_income_statement(symbol: str) -> dict:
        """
        Get the latest four years of income statement data with 600s cache.
        """
        original_symbol = safe_string(symbol).upper()
        cache_key = f"income_{original_symbol}"
        cached = _get_fin_cache(cache_key, ttl=600)
        if cached is not None:
            return cached

        try:
            yahoo_symbol = Financials.get_symbol(original_symbol)
            ticker = yf.Ticker(yahoo_symbol)
            income = ticker.financials

            if income is None or income.empty:
                return {
                    "symbol": original_symbol,
                    "income_statement": {},
                    "error": "No income statement data"
                }

            result = {}
            for col in income.columns[:4]:
                try:
                    year = str(col.year)
                except Exception:
                    year = str(col)

                revenue = 0
                gross_profit = 0
                net_income = 0

                if "Total Revenue" in income.index:
                    revenue = safe_int(income.loc["Total Revenue", col])
                if "Gross Profit" in income.index:
                    gross_profit = safe_int(income.loc["Gross Profit", col])
                if "Net Income" in income.index:
                    net_income = safe_int(income.loc["Net Income", col])

                result[year] = {
                    "revenue": revenue,
                    "gross_profit": gross_profit,
                    "net_income": net_income
                }

            out = {
                "symbol": original_symbol,
                "income_statement": result
            }
            _set_fin_cache(cache_key, out)
            return out

        except Exception as e:
            print(f"❌ Income statement error for {original_symbol}: {e}")
            return {
                "symbol": original_symbol,
                "income_statement": {},
                "error": str(e)
            }

    # --------------------------------------------------------
    # COMBINED FINANCIALS
    # --------------------------------------------------------

    @staticmethod
    def get_financials(symbol: str) -> dict:
        """
        Get all financial information in one response with 300s cache.
        """
        original_symbol = safe_string(symbol).upper()
        cache_key = f"combined_{original_symbol}"
        cached = _get_fin_cache(cache_key, ttl=300)
        if cached is not None:
            return cached

        try:
            company_info = Financials.get_company_info(original_symbol)
            key_metrics = Financials.get_key_metrics(original_symbol)
            income_statement = Financials.get_income_statement(original_symbol)

            result = {
                "symbol": original_symbol,
                "company_info": company_info,
                "key_metrics": key_metrics,
                "income_statement": income_statement
            }
            _set_fin_cache(cache_key, result)
            return result

        except Exception as e:
            print(f"❌ Combined financials error for {original_symbol}: {e}")
            return {
                "symbol": original_symbol,
                "company_info": {},
                "key_metrics": {},
                "income_statement": {},
                "error": str(e)
            }


# ============================================================
# TEST
# ============================================================

if __name__ == "__main__":
    print("=" * 60)
    print("Testing Financials")
    print("=" * 60)

    sym = "TCS"
    info = Financials.get_company_info(sym)
    print(f"Company: {info.get('company_name')}")
    metrics = Financials.get_key_metrics(sym)
    print(f"PE Ratio: {metrics.get('valuation', {}).get('pe_ratio')}")