"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../lib/AuthContext";
import {
  LayoutDashboard, Eye, Briefcase,
  Filter, History
} from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Home",      icon: LayoutDashboard },
  { href: "/watchlist", label: "Watchlist", icon: Eye             },
  { href: "/portfolio", label: "Portfolio", icon: Briefcase       },
  { href: "/trades",    label: "Trades",    icon: History         },
  { href: "/screener",  label: "Screener",  icon: Filter          },
];

export default function MobileNav() {
  const { user } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  return (
    <div className="mobile-nav md:hidden">
      <div className="flex items-center justify-around">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all"
              style={{
                color: active ? "var(--cyan)" : "var(--text-muted)",
                background: active ? "rgba(0,212,255,0.08)" : "transparent",
              }}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}