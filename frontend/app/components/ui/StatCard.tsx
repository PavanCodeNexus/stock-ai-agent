import { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | ReactNode;
  icon?: ReactNode;
  change?: number;
  className?: string;
  gradient?: boolean;
}

export default function StatCard({
  label, value, icon, change, className = "", gradient = false
}: StatCardProps) {
  return (
    <div className={`stat-card ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium uppercase tracking-widest"
           style={{ color: "var(--text-muted)" }}>
          {label}
        </p>
        {icon && (
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
               style={{ background: "var(--bg-elevated)" }}>
            {icon}
          </div>
        )}
      </div>
      <div className={`text-2xl font-bold number-display ${gradient ? "text-gradient-cyan" : "text-white"}`}>
        {value}
      </div>
      {change !== undefined && (
        <p className={`text-xs mt-2 font-medium ${change >= 0 ? "positive" : "negative"}`}>
          {change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(2)}%
        </p>
      )}
    </div>
  );
}