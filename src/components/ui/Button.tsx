"use client";

import { Loader2 } from "lucide-react";
import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-[var(--color-accent)] text-white hover:opacity-90 active:opacity-80 disabled:opacity-40",
  secondary:
    "bg-[var(--color-surface-raised)] text-[var(--color-text)] border border-white/10 hover:bg-white/10 active:bg-white/5 disabled:opacity-40",
  ghost:
    "bg-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-white/5 active:bg-white/10 disabled:opacity-40",
  danger:
    "bg-[var(--color-error)] text-white hover:opacity-90 active:opacity-80 disabled:opacity-40",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-[var(--button-height-sm)] px-3 text-sm rounded-[var(--radius-sm)] gap-1.5",
  md: "h-[var(--button-height-md)] px-4 text-base rounded-[var(--radius-md)] gap-2",
  lg: "h-[var(--button-height-lg)] px-5 text-base font-semibold rounded-[var(--radius-md)] gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      fullWidth = false,
      disabled,
      className = "",
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={[
          "inline-flex items-center justify-center font-medium transition-all duration-150 select-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]",
          variantClasses[variant],
          sizeClasses[size],
          fullWidth ? "w-full" : "",
          loading ? "cursor-not-allowed" : "cursor-pointer",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 size={size === "sm" ? 14 : 16} className="animate-spin shrink-0" />
            {children}
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
