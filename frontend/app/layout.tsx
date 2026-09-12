import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "./lib/AuthContext";
import MobileNav from "./components/MobileNav";

export const metadata: Metadata = {
  title: "Stock AI Agent — AI-Powered Indian Stock Analysis",
  description: "Analyze NSE/BSE stocks with 6 AI agents. Get BUY/SELL/HOLD recommendations with live data.",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased" style={{ paddingBottom: "70px" }}>
        <AuthProvider>
          {children}
          <MobileNav />
        </AuthProvider>
      </body>
    </html>
  );
}
