"use client";
import { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";

interface Props {
  symbol: string;
  companyName?: string;
}

export default function WatchlistButton({ symbol, companyName }: Props) {
  const { user } = useAuth();
  const [inWatchlist, setInWatchlist] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    checkWatchlist();
  }, [user, symbol]);

  const checkWatchlist = async () => {
    const { data } = await supabase
      .from("watchlist")
      .select("id")
      .eq("user_id", user?.id)
      .eq("symbol", symbol)
      .single();
    setInWatchlist(!!data);
  };

  const toggleWatchlist = async () => {
    if (!user) return;
    setLoading(true);

    if (inWatchlist) {
      await supabase
        .from("watchlist")
        .delete()
        .eq("user_id", user.id)
        .eq("symbol", symbol);
      setInWatchlist(false);
    } else {
      await supabase.from("watchlist").insert({
        user_id: user.id,
        symbol: symbol,
        company_name: companyName || symbol,
      });
      setInWatchlist(true);
    }

    setLoading(false);
  };

  if (!user) return null;

  return (
    <button
      onClick={toggleWatchlist}
      disabled={loading}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
        inWatchlist
          ? "bg-blue-900/30 border border-blue-700 text-blue-400 hover:bg-red-900/30 hover:border-red-700 hover:text-red-400"
          : "bg-gray-800 border border-gray-700 text-gray-400 hover:border-blue-500 hover:text-blue-400"
      }`}
    >
      {inWatchlist
        ? <><EyeOff className="w-4 h-4" /> Watching</>
        : <><Eye className="w-4 h-4" /> Add to Watchlist</>
      }
    </button>
  );
}