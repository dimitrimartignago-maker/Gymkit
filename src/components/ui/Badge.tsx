type BadgeVariant =
  | "active"
  | "draft"
  | "archived"
  | "confirmed"
  | "waitlist"
  | "cancelled"
  | "no_show";

interface BadgeProps {
  variant: BadgeVariant;
  label?: string;
  className?: string;
}

const variantConfig: Record<BadgeVariant, { label: string; classes: string }> = {
  active: {
    label: "Attivo",
    classes: "bg-[var(--color-success)]/15 text-[var(--color-success)]",
  },
  draft: {
    label: "Bozza",
    classes: "bg-[var(--color-warning)]/15 text-[var(--color-warning)]",
  },
  archived: {
    label: "Archiviato",
    classes: "bg-white/10 text-[var(--color-text-secondary)]",
  },
  confirmed: {
    label: "Confermato",
    classes: "bg-[var(--color-success)]/15 text-[var(--color-success)]",
  },
  waitlist: {
    label: "Lista d'attesa",
    classes: "bg-[var(--color-warning)]/15 text-[var(--color-warning)]",
  },
  cancelled: {
    label: "Cancellato",
    classes: "bg-[var(--color-error)]/15 text-[var(--color-error)]",
  },
  no_show: {
    label: "No Show",
    classes: "bg-[var(--color-error)]/10 text-[var(--color-error)]/70",
  },
};

export function Badge({ variant, label, className = "" }: BadgeProps) {
  const config = variantConfig[variant];
  return (
    <span
      className={[
        "inline-flex items-center px-2 py-0.5 rounded-[var(--radius-sm)] text-xs font-medium",
        config.classes,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {label ?? config.label}
    </span>
  );
}
