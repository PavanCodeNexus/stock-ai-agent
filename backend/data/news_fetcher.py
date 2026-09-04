# backend/data/news_fetcher.py

import httpx
from datetime import datetime, timedelta, timezone

from core.config import settings


# ============================================================
# NEWS FETCHER
# ============================================================

class NewsFetcher:

    BASE_URL = "https://newsapi.org/v2/everything"

    TIMEOUT = 15.0

    # --------------------------------------------------------
    # SAFE ARTICLE
    # --------------------------------------------------------

    @staticmethod
    def _clean_article(article: dict) -> dict:
        """
        Clean and normalize a NewsAPI article.
        """

        source = article.get("source") or {}

        return {
            "title": article.get("title") or "",
            "description": article.get("description") or "",
            "source": source.get("name") or "",
            "url": article.get("url") or "",
            "published_at": article.get("publishedAt") or "",
            "content": article.get("content") or ""
        }

    # --------------------------------------------------------
    # STOCK NEWS
    # --------------------------------------------------------

    @staticmethod
    async def get_stock_news(
        symbol: str,
        days: int = 7
    ) -> dict:
        """
        Fetch latest news for an Indian stock.

        Example:
            TCS
            RELIANCE
            INFY
            HDFCBANK
        """

        symbol = str(symbol).upper().strip()

        # Remove Yahoo Finance suffix
        clean_symbol = (
            symbol
            .replace(".NS", "")
            .replace(".BO", "")
        )

        try:

            # ------------------------------------------------
            # API KEY CHECK
            # ------------------------------------------------

            api_key = getattr(
                settings,
                "NEWS_API_KEY",
                None
            )

            if not api_key:

                return {
                    "symbol": clean_symbol,
                    "total_articles": 0,
                    "articles": [],
                    "error": (
                        "NEWS_API_KEY is not configured. "
                        "Add NEWS_API_KEY to backend/.env"
                    )
                }

            # ------------------------------------------------
            # VALIDATE DAYS
            # ------------------------------------------------

            try:
                days = int(days)
            except (TypeError, ValueError):
                days = 7

            days = max(
                1,
                min(days, 30)
            )

            # ------------------------------------------------
            # SEARCH QUERY
            # ------------------------------------------------

            query = (
                f"{clean_symbol} "
                f"stock India NSE"
            )

            # ------------------------------------------------
            # DATE RANGE
            # ------------------------------------------------

            from_date = (
                datetime.now(timezone.utc)
                - timedelta(days=days)
            )

            from_str = (
                from_date
                .strftime("%Y-%m-%d")
            )

            # ------------------------------------------------
            # REQUEST PARAMETERS
            # ------------------------------------------------

            params = {
                "q": query,
                "from": from_str,
                "sortBy": "publishedAt",
                "language": "en",
                "pageSize": 10,
                "apiKey": api_key
            }

            print(
                f"📰 Fetching news for "
                f"{clean_symbol}..."
            )

            # ------------------------------------------------
            # API REQUEST
            # ------------------------------------------------

            async with httpx.AsyncClient(
                timeout=NewsFetcher.TIMEOUT
            ) as client:

                response = await client.get(
                    NewsFetcher.BASE_URL,
                    params=params
                )

            # ------------------------------------------------
            # HTTP ERROR
            # ------------------------------------------------

            if response.status_code != 200:

                print(
                    f"❌ NewsAPI HTTP error: "
                    f"{response.status_code}"
                )

                try:
                    error_data = response.json()
                    message = error_data.get(
                        "message",
                        "NewsAPI request failed"
                    )
                except Exception:
                    message = (
                        "NewsAPI request failed"
                    )

                return {
                    "symbol": clean_symbol,
                    "total_articles": 0,
                    "articles": [],
                    "error": message,
                    "status_code":
                        response.status_code
                }

            # ------------------------------------------------
            # JSON RESPONSE
            # ------------------------------------------------

            try:
                data = response.json()

            except Exception:

                return {
                    "symbol": clean_symbol,
                    "total_articles": 0,
                    "articles": [],
                    "error": (
                        "Invalid response "
                        "received from NewsAPI"
                    )
                }

            # ------------------------------------------------
            # NEWSAPI STATUS
            # ------------------------------------------------

            if data.get("status") != "ok":

                message = data.get(
                    "message",
                    "NewsAPI returned an error"
                )

                print(
                    f"❌ NewsAPI error: "
                    f"{message}"
                )

                return {
                    "symbol": clean_symbol,
                    "total_articles": 0,
                    "articles": [],
                    "error": message
                }

            # ------------------------------------------------
            # ARTICLES
            # ------------------------------------------------

            articles = []

            for article in data.get(
                "articles",
                []
            ):

                if not isinstance(
                    article,
                    dict
                ):
                    continue

                cleaned = (
                    NewsFetcher._clean_article(
                        article
                    )
                )

                # Skip completely empty articles
                if not cleaned["title"]:
                    continue

                articles.append(
                    cleaned
                )

            # ------------------------------------------------
            # RESULT
            # ------------------------------------------------

            result = {
                "symbol": clean_symbol,
                "total_articles": len(
                    articles
                ),
                "articles": articles,
                "from_date": from_str,
                "fetched_at":
                    datetime.now(
                        timezone.utc
                    ).isoformat()
            }

            print(
                f"✅ News fetched: "
                f"{len(articles)} articles"
            )

            return result

        # ----------------------------------------------------
        # TIMEOUT
        # ----------------------------------------------------

        except httpx.TimeoutException:

            print(
                f"❌ NewsAPI timeout "
                f"for {clean_symbol}"
            )

            return {
                "symbol": clean_symbol,
                "total_articles": 0,
                "articles": [],
                "error": (
                    "NewsAPI request timed out"
                )
            }

        # ----------------------------------------------------
        # CONNECTION ERROR
        # ----------------------------------------------------

        except httpx.RequestError as e:

            print(
                f"❌ NewsAPI connection error: "
                f"{e}"
            )

            return {
                "symbol": clean_symbol,
                "total_articles": 0,
                "articles": [],
                "error": (
                    "Unable to connect "
                    "to NewsAPI"
                )
            }

        # ----------------------------------------------------
        # GENERAL ERROR
        # ----------------------------------------------------

        except Exception as e:

            print(
                f"❌ News fetch error "
                f"for {clean_symbol}: {e}"
            )

            return {
                "symbol": clean_symbol,
                "total_articles": 0,
                "articles": [],
                "error": str(e)
            }

    # ========================================================
    # GENERAL MARKET NEWS
    # ========================================================

    @staticmethod
    async def get_market_news() -> dict:
        """
        Fetch general Indian stock market news.
        """

        try:

            # ------------------------------------------------
            # API KEY
            # ------------------------------------------------

            api_key = getattr(
                settings,
                "NEWS_API_KEY",
                None
            )

            if not api_key:

                return {
                    "total_articles": 0,
                    "articles": [],
                    "error": (
                        "NEWS_API_KEY is not configured"
                    )
                }

            # ------------------------------------------------
            # SEARCH
            # ------------------------------------------------

            query = (
                "NSE OR BSE OR Nifty OR Sensex "
                "OR Indian stock market"
            )

            # ------------------------------------------------
            # PARAMETERS
            # ------------------------------------------------

            params = {
                "q": query,
                "sortBy": "publishedAt",
                "language": "en",
                "pageSize": 10,
                "apiKey": api_key
            }

            print(
                "📰 Fetching Indian market news..."
            )

            # ------------------------------------------------
            # REQUEST
            # ------------------------------------------------

            async with httpx.AsyncClient(
                timeout=NewsFetcher.TIMEOUT
            ) as client:

                response = await client.get(
                    NewsFetcher.BASE_URL,
                    params=params
                )

            # ------------------------------------------------
            # HTTP ERROR
            # ------------------------------------------------

            if response.status_code != 200:

                try:
                    error_data = response.json()

                    message = error_data.get(
                        "message",
                        "NewsAPI request failed"
                    )

                except Exception:

                    message = (
                        "NewsAPI request failed"
                    )

                return {
                    "total_articles": 0,
                    "articles": [],
                    "error": message,
                    "status_code":
                        response.status_code
                }

            # ------------------------------------------------
            # JSON
            # ------------------------------------------------

            try:
                data = response.json()

            except Exception:

                return {
                    "total_articles": 0,
                    "articles": [],
                    "error": (
                        "Invalid NewsAPI response"
                    )
                }

            # ------------------------------------------------
            # STATUS
            # ------------------------------------------------

            if data.get("status") != "ok":

                return {
                    "total_articles": 0,
                    "articles": [],
                    "error": data.get(
                        "message",
                        "NewsAPI returned an error"
                    )
                }

            # ------------------------------------------------
            # ARTICLES
            # ------------------------------------------------

            articles = []

            for article in data.get(
                "articles",
                []
            ):

                if not isinstance(
                    article,
                    dict
                ):
                    continue

                cleaned = (
                    NewsFetcher._clean_article(
                        article
                    )
                )

                if not cleaned["title"]:
                    continue

                # Market news doesn't need content
                cleaned.pop(
                    "content",
                    None
                )

                articles.append(
                    cleaned
                )

            # ------------------------------------------------
            # RESULT
            # ------------------------------------------------

            print(
                f"✅ Market news fetched: "
                f"{len(articles)} articles"
            )

            return {
                "total_articles":
                    len(articles),

                "articles":
                    articles,

                "fetched_at":
                    datetime.now(
                        timezone.utc
                    ).isoformat()
            }

        # ----------------------------------------------------
        # TIMEOUT
        # ----------------------------------------------------

        except httpx.TimeoutException:

            return {
                "total_articles": 0,
                "articles": [],
                "error": (
                    "NewsAPI request timed out"
                )
            }

        # ----------------------------------------------------
        # CONNECTION ERROR
        # ----------------------------------------------------

        except httpx.RequestError as e:

            return {
                "total_articles": 0,
                "articles": [],
                "error": (
                    "Unable to connect "
                    "to NewsAPI"
                )
            }

        # ----------------------------------------------------
        # GENERAL ERROR
        # ----------------------------------------------------

        except Exception as e:

            print(
                f"❌ Market news error: {e}"
            )

            return {
                "total_articles": 0,
                "articles": [],
                "error": str(e)
            }


# ============================================================
# TEST
# ============================================================

if __name__ == "__main__":

    import asyncio

    async def test():

        print("=" * 60)
        print("Testing News Fetcher")
        print("=" * 60)

        # --------------------------------------------
        # STOCK NEWS
        # --------------------------------------------

        print("\n1. TCS News:")

        news = await NewsFetcher.get_stock_news(
            "TCS",
            days=7
        )

        if "error" in news:

            print(
                f"   Error: "
                f"{news['error']}"
            )

        else:

            print(
                f"   Total articles: "
                f"{news['total_articles']}"
            )

            if news["articles"]:

                print(
                    f"   Latest: "
                    f"{news['articles'][0]['title']}"
                )

        # --------------------------------------------
        # MARKET NEWS
        # --------------------------------------------

        print("\n2. Indian Market News:")

        market_news = (
            await NewsFetcher.get_market_news()
        )

        if "error" in market_news:

            print(
                f"   Error: "
                f"{market_news['error']}"
            )

        else:

            print(
                f"   Total articles: "
                f"{market_news['total_articles']}"
            )

            if market_news["articles"]:

                print(
                    f"   Latest: "
                    f"{market_news['articles'][0]['title']}"
                )

        print("=" * 60)

    asyncio.run(test())