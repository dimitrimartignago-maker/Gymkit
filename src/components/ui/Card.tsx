import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  raised?: boolean;
}

export function Card({ raised = false, className = "", children, ...props }: CardProps) {
  return (
    <div
      className={[
        "rounded-[var(--radius-md)] p-4 shadow-[var(--shadow-sm)]",
        raised
          ? "bg-[var(--color-surface-raised)]"
          : "bg-[var(--color-surface)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}
