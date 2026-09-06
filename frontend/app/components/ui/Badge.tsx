type BadgeVariant = "buy" | "sell" | "hold" | "cyan" | "purple";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export default function Badge({
  children, variant = "cyan", className = ""
}: BadgeProps) {
  const styles: Record<BadgeVariant, string> = {
    buy:    "badge-buy",
    sell:   "badge-sell",
    hold:   "badge-hold",
    cyan:   "bg-cyan/10 border border-cyan/30 text-cyan text-xs font-semibold px-3 py-1 rounded-full",
    purple: "bg-purple/10 border border-purple/30 text-purple text-xs font-semibold px-3 py-1 rounded-full",
  };
  return (
    <span className={`${styles[variant]} ${className}`}>
      {children}
    </span>
  );
}