"use client";
import { useState, useRef, useEffect } from "react";
import { Search, TrendingUp } from "lucide-react";

const POPULAR_STOCKS = [
  { symbol: "TCS",        name: "Tata Consultancy Services"    },
  { symbol: "RELIANCE",   name: "Reliance Industries"          },
  { symbol: "INFY",       name: "Infosys Limited"              },
  { symbol: "HDFCBANK",   name: "HDFC Bank"                    },
  { symbol: "WIPRO",      name: "Wipro Limited"                },
  { symbol: "TATAMOTORS", name: "Tata Motors"                  },
  { symbol: "BAJFINANCE", name: "Bajaj Finance"                },
  { symbol: "ICICIBANK",  name: "ICICI Bank"                   },
  { symbol: "SBIN",       name: "State Bank of India"          },
  { symbol: "ADANIENT",   name: "Adani Enterprises"            },
  { symbol: "HINDUNILVR", name: "Hindustan Unilever"           },
  { symbol: "KOTAKBANK",  name: "Kotak Mahindra Bank"          },
  { symbol: "LT",         name: "Larsen & Toubro"              },
  { symbol: "AXISBANK",   name: "Axis Bank"                    },
  { symbol: "MARUTI",     name: "Maruti Suzuki"                },
  { symbol: "SUNPHARMA",  name: "Sun Pharmaceutical"           },
  { symbol: "TITAN",      name: "Titan Company"                },
  { symbol: "HCLTECH",    name: "HCL Technologies"             },
  { symbol: "TECHM",      name: "Tech Mahindra"                },
  { symbol: "NESTLEIND",  name: "Nestle India"                 },
  { symbol: "DRREDDY",    name: "Dr Reddy's Laboratories"      },
  { symbol: "CIPLA",      name: "Cipla Limited"                },
  { symbol: "DIVISLAB",   name: "Divi's Laboratories"          },
  { symbol: "ULTRACEMCO", name: "UltraTech Cement"             },
  { symbol: "ASIANPAINT", name: "Asian Paints"                 },
  { symbol: "BAJAJFINSV", name: "Bajaj Finserv"                },
  { symbol: "ONGC",       name: "Oil & Natural Gas Corporation" },
  { symbol: "NTPC",       name: "NTPC Limited"                 },
  { symbol: "POWERGRID",  name: "Power Grid Corporation"       },
  { symbol: "COALINDIA",  name: "Coal India"                   },
  { symbol: "IRCTC",      name: "Indian Railway Catering"      },
  { symbol: "ZOMATO",     name: "Zomato Limited"               },
  { symbol: "NYKAA",      name: "FSN E-Commerce (Nykaa)"       },
  { symbol: "PAYTM",      name: "One97 Communications"         },
];

interface Props {
  value: string;
  onChange: (val: string) => void;
  onSelect: (symbol: string) => void;
  onSubmit: () => void;
  placeholder?: string;
}

export default function SearchAutocomplete({
  value, onChange, onSelect, onSubmit, placeholder
}: Props) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const suggestions = value.length >= 1
    ? POPULAR_STOCKS.filter(
        (s) =>
          s.symbol.startsWith(value.toUpperCase()) ||
          s.name.toLowerCase().includes(value.toLowerCase())
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

  return (
    <div ref={wrapRef} className="relative flex-1">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 z-10"
              style={{ color: focused ? "var(--cyan)" : "var(--text-muted)" }} />
      <input
        type="text"
        placeholder={placeholder || "Search NSE symbol..."}
        value={value}
        onChange={(e) => {
          onChange(e.target.value.toUpperCase());
          setOpen(true);
        }}
        onFocus={() => { setFocused(true); setOpen(true); }}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { setOpen(false); onSubmit(); }
          if (e.key === "Escape") setOpen(false);
        }}
        className="input-field pl-12 text-base w-full"
        style={{
          borderColor: focused ? "var(--cyan)" : undefined,
          boxShadow: focused ? "0 0 0 3px rgba(0,212,255,0.1)" : undefined,
        }}
      />

      {/* Dropdown */}
      {open && suggestions.length > 0 && (
        <div
          className="absolute top-full left-0 right-0 mt-2 rounded-xl overflow-hidden z-50 animate-scaleIn"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-subtle)",
            boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
          }}
        >
          {suggestions.map((s, i) => (
            <button
              key={s.symbol}
              onMouseDown={() => {
                onSelect(s.symbol);
                onChange(s.symbol);
                setOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all"
              style={{ borderBottom: i < suggestions.length - 1 ? "1px solid var(--border-subtle)" : "none" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(0,212,255,0.05)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                   style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
                <TrendingUp className="w-4 h-4" style={{ color: "var(--cyan)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">{s.symbol}</p>
                <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{s.name}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}