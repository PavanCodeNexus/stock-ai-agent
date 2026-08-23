# data/news_fetcher.py

import httpx
from datetime import datetime, timedelta
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from core.config import settings

class NewsFetcher:

    @staticmethod
    async def get_stock_news(symbol: str, days: int = 7) -> dict:
        """Fetch latest news for a stock"""
        try:
            # Clean symbol name for search
            clean_symbol = symbol.replace(".NS", "").replace(".BO", "")

            # Search query
            query = f"{clean_symbol} stock India NSE"

            # Date range
            from_date = (datetime.now() - timedelta(days=days))
            from_str = from_date.strftime("%Y-%m-%d")

            url = "https://newsapi.org/v2/everything"
            params = {
                "q": query,
                "from": from_str,
                "sortBy": "publishedAt",
                "language": "en",
                "pageSize": 10,
                "apiKey": settings.NEWS_API_KEY
            }

            async with httpx.AsyncClient() as client:
                response = await client.get(url, params=params)
                data = response.json()

            if data.get("status") != "ok":
                return {"error": data.get("message"), "symbol": symbol}

            articles = []
            for article in data.get("articles", []):
                articles.append({
                    "title": article.get("title", ""),
                    "description": article.get("description", ""),
                    "source": article.get("source", {}).get("name", ""),
                    "url": article.get("url", ""),
                    "published_at": article.get("publishedAt", ""),
                    "content": article.get("content", "")
                })

            return {
                "symbol": clean_symbol,
                "total_articles": len(articles),
                "articles": articles,
                "from_date": from_str,
                "fetched_at": datetime.now().isoformat()
            }

        except Exception as e:
            return {"error": str(e), "symbol": symbol}

    @staticmethod
    async def get_market_news() -> dict:
        """Fetch general Indian market news"""
        try:
            url = "https://newsapi.org/v2/everything"
            params = {
                "q": "NSE BSE Nifty Sensex Indian stock market",
                "sortBy": "publishedAt",
                "language": "en",
                "pageSize": 10,
                "apiKey": settings.NEWS_API_KEY
            }

            async with httpx.AsyncClient() as client:
                response = await client.get(url, params=params)
                data = response.json()

            articles = []
            for article in data.get("articles", []):
                articles.append({
                    "title": article.get("title", ""),
                    "description": article.get("description", ""),
                    "source": article.get("source", {}).get("name", ""),
                    "url": article.get("url", ""),
                    "published_at": article.get("publishedAt", "")
                })

            return {
                "total_articles": len(articles),
                "articles": articles,
                "fetched_at": datetime.now().isoformat()
            }

        except Exception as e:
            return {"error": str(e)}


# Test
if __name__ == "__main__":
    import asyncio

    async def test():
        nf = NewsFetcher()

        print("=" * 50)
        print("Testing News Fetcher")
        print("=" * 50)

        print("\n1. TCS News:")
        news = await nf.get_stock_news("TCS", days=7)

        if "error" in news:
            print(f"   Error: {news['error']}")
            print("   → Add NEWS_API_KEY to .env file")
        else:
            print(f"   Total articles: {news['total_articles']}")
            if news['articles']:
                print(f"   Latest: {news['articles'][0]['title']}")

    asyncio.run(test())