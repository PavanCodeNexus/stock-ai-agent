import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "./lib/AuthContext";
import MobileNav from "./components/MobileNav";

export const metadata: Metadata = {
  title: "Stock AI Agent",
  description: "Agentic AI for Indian Stock Market",
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