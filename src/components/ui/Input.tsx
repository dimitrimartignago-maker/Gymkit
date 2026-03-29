"use client";

import { Minus, Plus } from "lucide-react";
import { forwardRef, InputHTMLAttributes, useId } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, id: externalId, className = "", ...props }, ref) => {
    const generatedId = useId();
    const id = externalId ?? generatedId;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={id}
            className="text-sm font-medium text-[var(--color-text)]"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={[
            "h-[var(--input-height)] w-full rounded-[var(--radius-md)] px-4",
            "bg-[var(--color-surface-raised)] text-[var(--color-text)]",
            "border transition-colors duration-150 outline-none",
            "placeholder:text-[var(--color-text-secondary)]",
            error
              ? "border-[var(--color-error)] focus:border-[var(--color-error)]"
              : "border-[var(--color-border)] focus:border-[var(--color-accent)]",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          {...props}
        />
        {error && (
          <p className="text-xs text-[var(--color-error)]">{error}</p>
        )}
        {!error && helperText && (
          <p className="text-xs text-[var(--color-text-secondary)]">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

// ---- NumericInput ----

interface NumericInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  disabled?: boolean;
}

export function NumericInput({
  label,
  error,
  helperText,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  disabled = false,
}: NumericInputProps) {
  const id = useId();

  const decrement = () => {
    const next = value - step;
    if (min === undefined || next >= min) onChange(next);
  };

  const increment = () => {
    const next = value + step;
    if (max === undefined || next <= max) onChange(next);
  };

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-[var(--color-text)]">
          {label}
        </label>
      )}
      <div
        className={[
          "flex items-center h-[var(--input-height)] rounded-[var(--radius-md)]",
          "bg-[var(--color-surface-raised)] border",
          error ? "border-[var(--color-error)]" : "border-[var(--color-border)]",
          disabled ? "opacity-50" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <button
          type="button"
          onClick={decrement}
          disabled={disabled || (min !== undefined && value <= min)}
          className="flex items-center justify-center w-12 h-full text-[var(--color-text-secondary)] hover:text-[var(--color-text)] disabled:opacity-30 transition-colors border-r border-[var(--color-border)]"
        >
          <Minus size={16} />
        </button>

        <div className="flex-1 flex items-center justify-center gap-1">
          <span
            id={id}
            className="font-mono text-xl font-semibold text-[var(--color-text)] min-w-[2.5rem] text-center"
          >
            {value}
          </span>
          {unit && (
            <span className="text-xs text-[var(--color-text-secondary)]">{unit}</span>
          )}
        </div>

        <button
          type="button"
          onClick={increment}
          disabled={disabled || (max !== undefined && value >= max)}
          className="flex items-center justify-center w-12 h-full text-[var(--color-text-secondary)] hover:text-[var(--color-text)] disabled:opacity-30 transition-colors border-l border-[var(--color-border)]"
        >
          <Plus size={16} />
        </button>
      </div>
      {error && <p className="text-xs text-[var(--color-error)]">{error}</p>}
      {!error && helperText && (
        <p className="text-xs text-[var(--color-text-secondary)]">{helperText}</p>
      )}
    </div>
  );
}
