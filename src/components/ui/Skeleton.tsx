import { HTMLAttributes } from "react";

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  height?: string | number;
  width?: string | number;
  rounded?: "sm" | "md" | "lg" | "full";
}

const roundedClasses = {
  sm: "rounded-[var(--radius-sm)]",
  md: "rounded-[var(--radius-md)]",
  lg: "rounded-[var(--radius-lg)]",
  full: "rounded-full",
};

export function Skeleton({
  height,
  width,
  rounded = "md",
  className = "",
  style,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={[
        "animate-pulse bg-[var(--color-surface-raised)]",
        roundedClasses[rounded],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        height: typeof height === "number" ? `${height}px` : height,
        width: typeof width === "number" ? `${width}px` : width,
        ...style,
      }}
      {...props}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-[var(--color-surface)] rounded-[var(--radius-md)] p-4 flex flex-col gap-3">
      <Skeleton height={20} width="60%" />
      <Skeleton height={14} width="90%" />
      <Skeleton height={14} width="75%" />
    </div>
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={14}
          width={i === lines - 1 ? "60%" : "100%"}
        />
      ))}
    </div>
  );
}
