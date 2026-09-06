import { ReactNode } from "react";

interface GlowButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
  className?: string;
  type?: "button" | "submit";
}

export default function GlowButton({
  children, onClick, disabled,
  variant = "primary", className = "", type = "button"
}: GlowButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`btn-${variant} ${className}`}
    >
      {children}
    </button>
  );
}