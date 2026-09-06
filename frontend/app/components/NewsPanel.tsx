"use client";

import { useEffect, useState } from "react";
import { Newspaper, ExternalLink, Clock } from "lucide-react";

interface NewsPanelProps {
  symbol: string;
}

interface Article {
  title: string;
  source: string;
  url: string;
  published_at: string;
  description?: string;
}

export default function NewsPanel({ symbol }: NewsPanelProps) {
  const [news, setNews] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!symbol) {
      setNews([]);
      return;
    }

    setLoading(true);

    fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/market/news/${symbol}`
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch news");
        }

        return response.json();
      })
      .then((data) => {
        setNews(Array.isArray(data.articles) ? data.articles : []);
      })
      .catch(() => {
        setNews([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [symbol]);

  const timeAgo = (dateStr: string) => {
    const timestamp = new Date(dateStr).getTime();

    if (Number.isNaN(timestamp)) {
      return "Unknown time";
    }

    const diff = Math.max(0, Date.now() - timestamp);

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (hours < 1) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;

    return `${days}d ago`;
  };

  return (
    <div className="glass mb-6 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-2 px-5 py-4 border-b"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <Newspaper
          className="w-4 h-4"
          style={{ color: "var(--cyan)" }}
        />

        <span className="text-sm font-semibold text-white">
          Latest News
        </span>

        <span
          className="text-xs px-2 py-0.5 rounded-full ml-1"
          style={{
            background: "var(--bg-elevated)",
            color: "var(--text-muted)",
          }}
        >
          {symbol}
        </span>
      </div>

      {/* Loading */}
      {loading && (
        <div className="p-5 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="skeleton h-4 w-3/4" />
              <div className="skeleton h-3 w-1/4" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && news.length === 0 && (
        <div className="px-5 py-8 text-center">
          <Newspaper
            className="w-8 h-8 mx-auto mb-2"
            style={{ color: "var(--text-muted)" }}
          />

          <p
            className="text-sm"
            style={{ color: "var(--text-muted)" }}
          >
            No news available
          </p>
        </div>
      )}

      {/* News list */}
      {!loading && news.length > 0 && (
        <div
          className="divide-y"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          {news.slice(0, 5).map((article, i) => (
            <a
              key={`${article.url}-${i}`}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-4 px-5 py-4 transition-all group"
              onMouseEnter={(e) => {
                e.currentTarget.style.background =
                  "rgba(0,212,255,0.03)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              {/* Article content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white leading-snug group-hover:text-[#00D4FF] transition-colors line-clamp-2">
                  {article.title}
                </p>

                <div className="flex items-center gap-3 mt-1.5">
                  <span
                    className="text-xs font-medium"
                    style={{ color: "var(--cyan)" }}
                  >
                    {article.source}
                  </span>

                  <span
                    className="flex items-center gap-1 text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <Clock className="w-3 h-3" />

                    {timeAgo(article.published_at)}
                  </span>
                </div>
              </div>

              {/* External link icon */}
              <ExternalLink
                className="w-4 h-4 flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: "var(--text-muted)" }}
              />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}