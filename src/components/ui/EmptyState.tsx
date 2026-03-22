import { LucideIcon } from "lucide-react";
import { Button } from "./Button";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  ctaLabel?: string;
  onCta?: () => void;
  ctaHref?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  ctaLabel,
  onCta,
  ctaHref,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-4 py-16 px-6">
      {Icon && (
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-[var(--color-surface-raised)]">
          <Icon size={28} className="text-[var(--color-text-secondary)]" />
        </div>
      )}
      <div className="flex flex-col gap-1.5 max-w-xs">
        <p className="font-semibold text-[var(--color-text)] text-base">{title}</p>
        {description && (
          <p className="text-sm text-[var(--color-text-secondary)]">{description}</p>
        )}
      </div>
      {ctaLabel && (ctaHref || onCta) && (
        ctaHref ? (
          <a href={ctaHref}>
            <Button variant="primary" size="md">{ctaLabel}</Button>
          </a>
        ) : (
          <Button variant="primary" size="md" onClick={onCta}>
            {ctaLabel}
          </Button>
        )
      )}
    </div>
  );
}
