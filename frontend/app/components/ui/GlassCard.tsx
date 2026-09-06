interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: "cyan" | "green" | "red" | "gold" | "purple";
}

export default function GlassCard({
  children, className = "", hover = false, glow
}: GlassCardProps) {
  const glowClass = glow ? `glow-${glow}` : "";
  const hoverClass = hover ? "glass-hover cursor-pointer" : "";
  return (
    <div className={`glass ${glowClass} ${hoverClass} ${className}`}>
      {children}
    </div>
  );
}