"use client";
import { useEffect, useState } from "react";
import { Newspaper, ExternalLink } from "lucide-react";

interface NewsPanelProps {
  symbol: string;
}

interface Article {
  title: string;
  source: string;
  url: string;
  published_at: string;
}

export default function NewsPanel({ symbol }: NewsPanelProps) {
  const [news, setNews] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!symbol) return;
    const fetchNews = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `http://localhost:8000/api/market/news/${symbol}`
        );
        const data = await res.json();
        setNews(data.articles || []);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchNews();
  }, [symbol]);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Newspaper className="w-4 h-4 text-blue-400" />
        <p className="text-sm font-medium text-gray-300">
          Latest News — {symbol}
        </p>
      </div>

      {loading && (
        <p className="text-gray-500 text-sm animate-pulse">Fetching news...</p>
      )}

      <div className="space-y-3">
        {news.slice(0, 4).map((article, i) => (
          <div key={i} className="border-b border-gray-700 pb-3 last:border-0">
            <a href={article.url} target="_blank" rel="noopener noreferrer">
              <p className="text-sm text-gray-200 hover:text-blue-400 transition">
                {article.title}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500">{article.source}</span>
                <ExternalLink className="w-3 h-3 text-gray-600" />
              </div>
            </a>
          </div>
        ))}
      </div>

      {news.length === 0 && !loading && (
        <p className="text-gray-500 text-sm">No news available</p>
      )}
    </div>
  );
}