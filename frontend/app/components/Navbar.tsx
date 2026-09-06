"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TrendingUp, LogOut, User, LayoutDashboard, Eye, Briefcase, Filter } from "lucide-react";   
import { useAuth } from "../lib/AuthContext";

export default function Navbar() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <nav className="bg-gray-900 border-b border-gray-800 px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">

        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <TrendingUp className="text-green-400 w-6 h-6" />
          <span className="font-bold text-white text-lg">Stock AI Agent</span>
        </Link>

        {/* Nav Links */}
        {user && (
          <div className="hidden md:flex items-center gap-1">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 text-sm transition"
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>
            <Link
              href="/watchlist"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 text-sm transition"
            >
              <Eye className="w-4 h-4" />
              Watchlist
            </Link>
            <Link
              href="/portfolio"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 text-sm transition"
            >
              <Briefcase className="w-4 h-4" />
              Portfolio
            </Link>
          <Link
  href="/screener"
  className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 text-sm transition"
>
  <Filter className="w-4 h-4" />
  Screener
</Link>
          </div>
          
        )}

        {/* User section */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-900 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-green-400" />
                </div>
                <span className="text-gray-400 text-sm hidden md:block">
                  {user.email?.split("@")[0]}
                </span>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-gray-800 text-sm transition"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden md:block">Sign Out</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-4 py-2 text-gray-400 hover:text-white text-sm transition"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}