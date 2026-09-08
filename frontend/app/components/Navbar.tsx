"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  TrendingUp, LayoutDashboard, Eye,
  Briefcase, Filter, LogOut, User,
  Menu, X, ChevronDown , History
} from "lucide-react";

import { useAuth } from "../lib/AuthContext";
import TickerStrip from "./TickerStrip";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/watchlist", label: "Watchlist",  icon: Eye            },
  { href: "/portfolio", label: "Portfolio",  icon: Briefcase      },
   { href: "/trades",    label: "Trades",     icon: History        },
  { href: "/screener",  label: "Screener",   icon: Filter         },
  
];

export default function Navbar() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const isActive = (href: string) => pathname === href;

  return (
    <>
      {/* Main Navbar */}
      <nav style={{
        background: "rgba(13, 20, 33, 0.95)",
        borderBottom: "1px solid var(--border-subtle)",
        backdropFilter: "blur(20px)",
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                   style={{ background: "var(--grad-cyan)" }}>
                <TrendingUp className="w-4 h-4 text-black" />
              </div>
              <div>
                <span className="font-bold text-white text-base">
                  Stock<span className="text-gradient-cyan">AI</span>
                </span>
                <span className="font-bold text-white text-base"> Agent</span>
              </div>
            </Link>

            {/* Desktop Nav Links */}
            {user && (
              <div className="hidden md:flex items-center gap-1">
                {NAV_LINKS.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                    style={{
                      color: isActive(href) ? "var(--cyan)" : "var(--text-secondary)",
                      background: isActive(href) ? "rgba(0,212,255,0.08)" : "transparent",
                    }}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                    {isActive(href) && (
                      <span className="w-1.5 h-1.5 rounded-full"
                            style={{ background: "var(--cyan)" }} />
                    )}
                  </Link>
                ))}
              </div>
            )}

            {/* Right Section */}
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  {/* User Menu */}
                  <div className="relative">
                    <button
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all"
                      style={{ background: userMenuOpen ? "var(--bg-elevated)" : "transparent" }}
                    >
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                           style={{ background: "var(--grad-cyan)", color: "#000" }}>
                        {user.email?.[0].toUpperCase()}
                      </div>
                      <span className="hidden md:block text-sm"
                            style={{ color: "var(--text-secondary)" }}>
                        {user.email?.split("@")[0]}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 hidden md:block"
                                   style={{ color: "var(--text-muted)" }} />
                    </button>

                    {/* Dropdown */}
                    {userMenuOpen && (
                      <div className="absolute right-0 mt-2 w-48 rounded-xl overflow-hidden animate-scaleIn"
                           style={{
                             background: "var(--bg-elevated)",
                             border: "1px solid var(--border-subtle)",
                             boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
                           }}>
                        <div className="px-4 py-3 border-b"
                             style={{ borderColor: "var(--border-subtle)" }}>
                          <p className="text-xs font-medium text-white truncate">
                            {user.email}
                          </p>
                          <p className="text-xs mt-0.5"
                             style={{ color: "var(--text-muted)" }}>
                            Free Plan
                          </p>
                        </div>
                        <button
                          onClick={handleSignOut}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-all"
                          style={{ color: "#FF3B5C" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,59,92,0.08)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Mobile menu button */}
                  <button
                    onClick={() => setMobileOpen(!mobileOpen)}
                    className="md:hidden p-2 rounded-lg"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Link href="/login"
                        className="px-4 py-2 text-sm font-medium transition-all"
                        style={{ color: "var(--text-secondary)" }}>
                    Sign In
                  </Link>
                  <Link href="/signup"
                        className="btn-primary text-sm py-2 px-4">
                    Get Started
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && user && (
          <div className="md:hidden border-t animate-fadeIn"
               style={{ borderColor: "var(--border-subtle)", background: "var(--bg-surface)" }}>
            <div className="px-4 py-3 space-y-1">
              {NAV_LINKS.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all"
                  style={{
                    color: isActive(href) ? "var(--cyan)" : "var(--text-secondary)",
                    background: isActive(href) ? "rgba(0,212,255,0.08)" : "transparent",
                  }}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Ticker Strip (only when logged in) */}
      {user && <TickerStrip />}
    </>
  );
}