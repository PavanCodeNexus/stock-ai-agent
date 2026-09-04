# agents/collector.py

import sys
import os
import asyncio

# Add backend directory to Python path
sys.path.append(
    os.path.dirname(
        os.path.dirname(
            os.path.abspath(__file__)
        )
    )
)

from agents.state import AgentState
from data.market_data import MarketData
from data.financials import Financials
from data.news_fetcher import NewsFetcher


# ============================================================
# ASYNC NEWS HELPER
# ============================================================

def fetch_news_sync(
    symbol: str,
    days: int = 7
) -> dict:
    """
    Run the async NewsFetcher from this synchronous
    collector agent.

    This keeps collector_agent() synchronous, which is
    compatible with a normal synchronous LangGraph node.
    """

    try:
        return asyncio.run(
            NewsFetcher.get_stock_news(
                symbol,
                days=days
            )
        )

    except RuntimeError as e:

        # This can happen if an event loop is already running.
        # Try using a separate thread with its own event loop.

        if "already running" not in str(e).lower():
            raise

        import threading

        result = {}
        error = {}

        def runner():

            try:

                result["data"] = asyncio.run(
                    NewsFetcher.get_stock_news(
                        symbol,
                        days=days
                    )
                )

            except Exception as thread_error:

                error["error"] = thread_error

        thread = threading.Thread(
            target=runner
        )

        thread.start()
        thread.join()

        if "error" in error:
            raise error["error"]

        return result.get(
            "data",
            {}
        )


# ============================================================
# COLLECTOR AGENT
# ============================================================

def collector_agent(
    state: AgentState
) -> AgentState:
    """
    Collector Agent

    Fetches:
    1. Current stock price
    2. Historical price data
    3. Financial metrics
    4. Company information
    5. Latest stock news
    """

    # ========================================================
    # SYMBOL
    # ========================================================

    symbol = str(
        state.get("symbol", "")
    ).upper().strip()

    if not symbol:

        state["errors"] = [
            "Stock symbol is missing"
        ]

        state["current_step"] = "error"

        print(
            "❌ COLLECTOR: Stock symbol missing"
        )

        return state


    print(
        f"\n📊 COLLECTOR: "
        f"Fetching data for {symbol}..."
    )


    # ========================================================
    # ERROR LIST
    # ========================================================

    errors = state.get(
        "errors",
        []
    )

    if errors is None:
        errors = []

    if not isinstance(
        errors,
        list
    ):
        errors = []


    # ========================================================
    # 1. CURRENT PRICE + HISTORY
    # ========================================================

    try:

        print(
            "   📈 Fetching price..."
        )

        price_data = (
            MarketData.get_current_price(
                symbol
            )
        )

        if not isinstance(
            price_data,
            dict
        ):
            price_data = {}


        # ----------------------------------------------------
        # Historical data
        # ----------------------------------------------------

        print(
            "   📊 Fetching historical data..."
        )

        history_response = (
            MarketData.get_historical_data(
                symbol,
                "3mo"
            )
        )

        if (
            isinstance(
                history_response,
                dict
            )
            and isinstance(
                history_response.get(
                    "data"
                ),
                list
            )
        ):

            history = (
                history_response.get(
                    "data",
                    []
                )
            )

        else:

            history = []


        price_data["history"] = history

        state["price_data"] = price_data


        # ----------------------------------------------------
        # Correct price key
        # ----------------------------------------------------

        current_price = (
            price_data.get("price")
        )

        if current_price is not None:

            print(
                f"   ✅ Price: "
                f"₹{current_price}"
            )

        else:

            print(
                "   ⚠️ Price unavailable"
            )

            errors.append(
                "Current price unavailable"
            )


        print(
            f"   ✅ History: "
            f"{len(history)} records"
        )


    except Exception as e:

        error_message = (
            f"Price/history fetch error: "
            f"{str(e)}"
        )

        print(
            f"   ❌ {error_message}"
        )

        errors.append(
            error_message
        )

        state["price_data"] = {}


    # ========================================================
    # 2. FINANCIAL DATA
    # ========================================================

    try:

        print(
            "   💰 Fetching financial metrics..."
        )

        financial_data = (
            Financials.get_key_metrics(
                symbol
            )
        )

        if not isinstance(
            financial_data,
            dict
        ):
            financial_data = {}


        state["financial_data"] = (
            financial_data
        )

        if "error" in financial_data:

            print(
                "   ⚠️ Financial data "
                "returned an error"
            )

            errors.append(
                "Financial metrics returned an error"
            )

        else:

            print(
                "   ✅ Financials fetched"
            )


    except Exception as e:

        error_message = (
            f"Financial fetch error: "
            f"{str(e)}"
        )

        print(
            f"   ❌ {error_message}"
        )

        errors.append(
            error_message
        )

        state["financial_data"] = {}


    # ========================================================
    # 3. COMPANY DATA
    # ========================================================

    try:

        print(
            "   🏢 Fetching company information..."
        )

        company_data = (
            Financials.get_company_info(
                symbol
            )
        )

        if not isinstance(
            company_data,
            dict
        ):
            company_data = {}


        state["company_data"] = (
            company_data
        )


        company_name = (
            company_data.get(
                "company_name",
                "N/A"
            )
        )

        if "error" in company_data:

            print(
                "   ⚠️ Company data "
                "returned an error"
            )

            errors.append(
                "Company information returned an error"
            )

        else:

            print(
                f"   ✅ Company: "
                f"{company_name}"
            )


    except Exception as e:

        error_message = (
            f"Company fetch error: "
            f"{str(e)}"
        )

        print(
            f"   ❌ {error_message}"
        )

        errors.append(
            error_message
        )

        state["company_data"] = {}


    # ========================================================
    # 4. NEWS DATA
    # ========================================================

    try:

        print(
            "   📰 Fetching stock news..."
        )

        news = fetch_news_sync(
            symbol,
            days=7
        )

        if not isinstance(
            news,
            dict
        ):
            news = {}


        state["news_data"] = news


        # ----------------------------------------------------
        # News error
        # ----------------------------------------------------

        if "error" in news:

            print(
                f"   ⚠️ News: "
                f"{news.get('error')}"
            )

            errors.append(
                f"News fetch error: "
                f"{news.get('error')}"
            )

        else:

            article_count = (
                news.get(
                    "total_articles",
                    0
                )
            )

            print(
                f"   ✅ News: "
                f"{article_count} articles"
            )


    except Exception as e:

        error_message = (
            f"News fetch error: "
            f"{str(e)}"
        )

        print(
            f"   ❌ {error_message}"
        )

        errors.append(
            error_message
        )

        state["news_data"] = {}


    # ========================================================
    # SAVE ERRORS
    # ========================================================

    state["errors"] = errors


    # ========================================================
    # NEXT AGENT
    # ========================================================

    state["current_step"] = "analyzer"


    # ========================================================
    # FINAL LOG
    # ========================================================

    print(
        "\n✅ COLLECTOR: "
        "All data collection completed!"
    )

    if errors:

        print(
            f"⚠️ COLLECTOR: "
            f"{len(errors)} issue(s) detected"
        )

        for error in errors:

            print(
                f"   - {error}"
            )

    else:

        print(
            "   No collection errors."
        )


    return state