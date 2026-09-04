# backend/data/financials.py

import math
import yfinance as yf


# ============================================================
# SAFE VALUE HELPERS
# ============================================================

def safe_float(value, default=None):
    """
    Convert value to a finite float.

    Prevents:
    - NaN
    - Infinity
    - -Infinity

    from reaching FastAPI JSON serialization.
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
    # SYMBOL
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

        symbol = safe_string(
            symbol,
            ""
        ).upper()

        if not symbol:
            return ""

        if (
            symbol.endswith(".NS")
            or symbol.endswith(".BO")
        ):
            return symbol

        return f"{symbol}.NS"

    # --------------------------------------------------------
    # COMPANY INFORMATION
    # --------------------------------------------------------

    @staticmethod
    def get_company_info(symbol: str) -> dict:
        """
        Get basic company information.
        """

        original_symbol = safe_string(
            symbol
        ).upper()

        try:

            yahoo_symbol = Financials.get_symbol(
                original_symbol
            )

            ticker = yf.Ticker(
                yahoo_symbol
            )

            info = ticker.info

            if not isinstance(info, dict):
                info = {}

            description = safe_string(
                info.get(
                    "longBusinessSummary"
                )
            )

            return {
                "symbol": original_symbol,

                "company_name": safe_string(
                    info.get("longName")
                ),

                "sector": safe_string(
                    info.get("sector")
                ),

                "industry": safe_string(
                    info.get("industry")
                ),

                "website": safe_string(
                    info.get("website")
                ),

                "description": description[:300],

                "employees": safe_int(
                    info.get(
                        "fullTimeEmployees"
                    )
                ),

                "country": safe_string(
                    info.get("country")
                ),

                "founded": safe_int(
                    info.get("founded"),
                    default=0
                )
                if info.get("founded") is not None
                else "N/A"
            }

        except Exception as e:

            print(
                f"❌ Company info error "
                f"for {original_symbol}: {e}"
            )

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
        Get important financial metrics.

        All numeric values are cleaned so NaN and Infinity
        can never reach the API response.
        """

        original_symbol = safe_string(
            symbol
        ).upper()

        try:

            yahoo_symbol = Financials.get_symbol(
                original_symbol
            )

            ticker = yf.Ticker(
                yahoo_symbol
            )

            info = ticker.info

            if not isinstance(info, dict):
                info = {}

            return {
                "symbol": original_symbol,

                "valuation": {

                    "market_cap": safe_float(
                        info.get("marketCap")
                    ),

                    "pe_ratio": safe_float(
                        info.get("trailingPE")
                    ),

                    "forward_pe": safe_float(
                        info.get("forwardPE")
                    ),

                    "pb_ratio": safe_float(
                        info.get("priceToBook")
                    ),

                    "ev_ebitda": safe_float(
                        info.get(
                            "enterpriseToEbitda"
                        )
                    ),
                },

                "profitability": {

                    "profit_margin": safe_float(
                        info.get("profitMargins")
                    ),

                    "operating_margin": safe_float(
                        info.get(
                            "operatingMargins"
                        )
                    ),

                    "roe": safe_float(
                        info.get(
                            "returnOnEquity"
                        )
                    ),

                    "roa": safe_float(
                        info.get(
                            "returnOnAssets"
                        )
                    ),
                },

                "growth": {

                    "revenue_growth": safe_float(
                        info.get(
                            "revenueGrowth"
                        )
                    ),

                    "earnings_growth": safe_float(
                        info.get(
                            "earningsGrowth"
                        )
                    ),
                },

                "dividends": {

                    "dividend_yield": safe_float(
                        info.get(
                            "dividendYield"
                        )
                    ),

                    "payout_ratio": safe_float(
                        info.get(
                            "payoutRatio"
                        )
                    ),
                },

                "debt": {

                    "debt_to_equity": safe_float(
                        info.get(
                            "debtToEquity"
                        )
                    ),

                    "current_ratio": safe_float(
                        info.get(
                            "currentRatio"
                        )
                    ),
                }
            }

        except Exception as e:

            print(
                f"❌ Financial metrics error "
                f"for {original_symbol}: {e}"
            )

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
        Get the latest four years of income statement data.
        """

        original_symbol = safe_string(
            symbol
        ).upper()

        try:

            yahoo_symbol = Financials.get_symbol(
                original_symbol
            )

            ticker = yf.Ticker(
                yahoo_symbol
            )

            income = ticker.financials

            if (
                income is None
                or income.empty
            ):

                return {
                    "symbol": original_symbol,
                    "income_statement": {},
                    "error": "No income statement data"
                }

            result = {}

            # Latest 4 available years
            for col in income.columns[:4]:

                try:
                    year = str(col.year)

                except Exception:
                    year = str(col)

                revenue = 0
                gross_profit = 0
                net_income = 0

                if (
                    "Total Revenue"
                    in income.index
                ):

                    revenue = safe_int(
                        income.loc[
                            "Total Revenue",
                            col
                        ]
                    )

                if (
                    "Gross Profit"
                    in income.index
                ):

                    gross_profit = safe_int(
                        income.loc[
                            "Gross Profit",
                            col
                        ]
                    )

                if (
                    "Net Income"
                    in income.index
                ):

                    net_income = safe_int(
                        income.loc[
                            "Net Income",
                            col
                        ]
                    )

                result[year] = {

                    "revenue": revenue,

                    "gross_profit":
                        gross_profit,

                    "net_income":
                        net_income
                }

            return {
                "symbol": original_symbol,
                "income_statement": result
            }

        except Exception as e:

            print(
                f"❌ Income statement error "
                f"for {original_symbol}: {e}"
            )

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
        Get all financial information in one response.

        This method is required by:
            /api/market/financials/{symbol}
        """

        original_symbol = safe_string(
            symbol
        ).upper()

        try:

            company_info = (
                Financials.get_company_info(
                    original_symbol
                )
            )

            key_metrics = (
                Financials.get_key_metrics(
                    original_symbol
                )
            )

            income_statement = (
                Financials.get_income_statement(
                    original_symbol
                )
            )

            return {
                "symbol": original_symbol,

                "company_info":
                    company_info,

                "key_metrics":
                    key_metrics,

                "income_statement":
                    income_statement
            }

        except Exception as e:

            print(
                f"❌ Combined financials error "
                f"for {original_symbol}: {e}"
            )

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

    symbol = "TCS"

    # --------------------------------------------------------
    # 1. COMPANY INFO
    # --------------------------------------------------------

    print(
        "\n1. TCS Company Info:"
    )

    info = Financials.get_company_info(
        symbol
    )

    print(
        f"   Name: "
        f"{info.get('company_name')}"
    )

    print(
        f"   Sector: "
        f"{info.get('sector')}"
    )

    print(
        f"   Industry: "
        f"{info.get('industry')}"
    )

    # --------------------------------------------------------
    # 2. KEY METRICS
    # --------------------------------------------------------

    print(
        "\n2. TCS Key Metrics:"
    )

    metrics = Financials.get_key_metrics(
        symbol
    )

    valuation = metrics.get(
        "valuation",
        {}
    )

    print(
        f"   Market Cap: "
        f"{valuation.get('market_cap')}"
    )

    print(
        f"   PE Ratio: "
        f"{valuation.get('pe_ratio')}"
    )

    print(
        f"   PB Ratio: "
        f"{valuation.get('pb_ratio')}"
    )

    profitability = metrics.get(
        "profitability",
        {}
    )

    print(
        f"   Profit Margin: "
        f"{profitability.get('profit_margin')}"
    )

    print(
        f"   ROE: "
        f"{profitability.get('roe')}"
    )

    # --------------------------------------------------------
    # 3. INCOME STATEMENT
    # --------------------------------------------------------

    print(
        "\n3. TCS Income Statement:"
    )

    income = Financials.get_income_statement(
        symbol
    )

    for year, data in income.get(
        "income_statement",
        {}
    ).items():

        print(
            f"   {year}: "
            f"Revenue ₹"
            f"{data.get('revenue', 0):,}"
        )

    # --------------------------------------------------------
    # 4. COMBINED FINANCIALS
    # --------------------------------------------------------

    print(
        "\n4. Combined Financials:"
    )

    financials = Financials.get_financials(
        symbol
    )

    print(
        f"   Symbol: "
        f"{financials.get('symbol')}"
    )

    print(
        "   Financial data loaded successfully."
    )

    print("=" * 60)