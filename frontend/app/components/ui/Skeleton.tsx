interface SkeletonProps {
  width?: string;
  height?: string;
  className?: string;
  rounded?: string;
}

export function Skeleton({
  width = "100%", height = "16px",
  className = "", rounded = "8px"
}: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height, borderRadius: rounded }}
    />
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="glass p-5 space-y-3">
      <Skeleton height="20px" width="40%" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height="14px" width={i === lines - 1 ? "60%" : "100%"} />
      ))}
    </div>
  );
}