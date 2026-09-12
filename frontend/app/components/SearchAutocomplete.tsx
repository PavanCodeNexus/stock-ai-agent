"use client";
import { useState, useRef, useEffect } from "react";
import { Search, TrendingUp, X } from "lucide-react";

const POPULAR_STOCKS = [
  { symbol: "TCS",        name: "Tata Consultancy Services"     },
  { symbol: "RELIANCE",   name: "Reliance Industries"           },
  { symbol: "INFY",       name: "Infosys Limited"               },
  { symbol: "HDFCBANK",   name: "HDFC Bank"                     },
  { symbol: "ICICIBANK",  name: "ICICI Bank"                    },
  { symbol: "SBIN",       name: "State Bank of India"           },
  { symbol: "ITC",        name: "ITC Limited"                   },
  { symbol: "WIPRO",      name: "Wipro Limited"                 },
  { symbol: "TATAMOTORS", name: "Tata Motors"                   },
  { symbol: "BAJFINANCE", name: "Bajaj Finance"                 },
  { symbol: "BHARTIARTL", name: "Bharti Airtel"                 },
  { symbol: "ADANIENT",   name: "Adani Enterprises"             },
  { symbol: "HINDUNILVR", name: "Hindustan Unilever"            },
  { symbol: "KOTAKBANK",  name: "Kotak Mahindra Bank"           },
  { symbol: "LT",         name: "Larsen & Toubro"               },
  { symbol: "AXISBANK",   name: "Axis Bank"                     },
  { symbol: "MARUTI",     name: "Maruti Suzuki"                 },
  { symbol: "SUNPHARMA",  name: "Sun Pharmaceutical"            },
  { symbol: "TITAN",      name: "Titan Company"                 },
  { symbol: "HCLTECH",    name: "HCL Technologies"              },
  { symbol: "TECHM",      name: "Tech Mahindra"                 },
  { symbol: "NESTLEIND",  name: "Nestle India"                  },
  { symbol: "DRREDDY",    name: "Dr Reddy's Laboratories"       },
  { symbol: "CIPLA",      name: "Cipla Limited"                 },
  { symbol: "DIVISLAB",   name: "Divi's Laboratories"           },
  { symbol: "ULTRACEMCO", name: "UltraTech Cement"              },
  { symbol: "ASIANPAINT", name: "Asian Paints"                  },
  { symbol: "BAJAJFINSV", name: "Bajaj Finserv"                 },
  { symbol: "ONGC",       name: "Oil & Natural Gas Corporation" },
  { symbol: "NTPC",       name: "NTPC Limited"                  },
  { symbol: "POWERGRID",  name: "Power Grid Corporation"        },
  { symbol: "COALINDIA",  name: "Coal India"                    },
  { symbol: "IRCTC",      name: "Indian Railway Catering"       },
  { symbol: "ZOMATO",     name: "Zomato Limited"                },
  { symbol: "NYKAA",      name: "FSN E-Commerce (Nykaa)"        },
  { symbol: "PAYTM",      name: "One97 Communications"          },
];

interface Props {
  value: string;
  onChange: (val: string) => void;
  onSelect: (symbol: string, companyName?: string) => void;
  onSubmit?: (symbol?: string, companyName?: string) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchAutocomplete({
  value,
  onChange,
  onSelect,
  onSubmit,
  placeholder,
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const cleanQuery = value.trim().toUpperCase();
  const suggestions = cleanQuery.length >= 1
    ? POPULAR_STOCKS.filter(
        (s) =>
          s.symbol.startsWith(cleanQuery) ||
          s.name.toLowerCase().includes(value.toLowerCase().trim())
      ).slice(0, 6)
    : [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [value]);

  const handleSelect = (symbol: string, name?: string) => {
    onSelect(symbol, name);
    onChange(symbol);
    setOpen(false);
    if (onSubmit) {
      onSubmit(symbol, name);
    }
  };

  return (
    <div ref={wrapRef} className={`relative flex-1 ${className}`} style={{ zIndex: open ? 50 : "auto" }}>
      {/* Search Icon with pointer-events-none so it never blocks clicks */}
      <Search
        className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none z-10 transition-colors"
        style={{ color: focused ? "var(--cyan)" : "var(--text-muted)" }}
      />

      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder || "Search NSE symbol..."}
        value={value}
        onChange={(e) => {
          onChange(e.target.value.toUpperCase());
          setOpen(true);
        }}
        onFocus={() => {
          setFocused(true);
          setOpen(true);
        }}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            if (suggestions.length > 0) {
              setSelectedIndex((prev) => (prev + 1) % suggestions.length);
            }
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            if (suggestions.length > 0) {
              setSelectedIndex((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
            }
          } else if (e.key === "Enter") {
            if (selectedIndex >= 0 && suggestions[selectedIndex]) {
              e.preventDefault();
              handleSelect(suggestions[selectedIndex].symbol, suggestions[selectedIndex].name);
            } else {
              setOpen(false);
              if (onSubmit) {
                const clean = value.trim().toUpperCase();
                if (clean) onSubmit(clean);
              }
            }
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className="input-field pl-12 pr-10 text-base w-full"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="characters"
        spellCheck={false}
        style={{
          paddingLeft: "48px",
          paddingRight: value ? "42px" : "16px",
          borderColor: focused ? "var(--cyan)" : undefined,
          boxShadow: focused ? "0 0 0 3px rgba(0,212,255,0.1)" : undefined,
          color: "white",
          caretColor: "var(--cyan)",
        }}
      />

      {/* Clear Button */}
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange("");
            setOpen(false);
            inputRef.current?.focus();
          }}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors z-10"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "white")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
          aria-label="Clear input"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Dropdown */}
      {open && suggestions.length > 0 && (
        <div
          className="absolute top-full left-0 right-0 mt-2 rounded-xl overflow-hidden z-50 animate-scaleIn shadow-2xl"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-subtle)",
            boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
            maxHeight: "320px",
            overflowY: "auto",
          }}
        >
          {suggestions.map((s, i) => {
            const isHighlighted = i === selectedIndex;
            return (
              <button
                key={s.symbol}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(s.symbol, s.name);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all"
                style={{
                  borderBottom: i < suggestions.length - 1 ? "1px solid var(--border-subtle)" : "none",
                  background: isHighlighted ? "rgba(0,212,255,0.08)" : "transparent",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,212,255,0.08)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = isHighlighted ? "rgba(0,212,255,0.08)" : "transparent")}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
                >
                  <TrendingUp className="w-4 h-4" style={{ color: "var(--cyan)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white">{s.symbol}</p>
                  <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{s.name}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}