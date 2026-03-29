"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Impedisce la chiusura cliccando fuori */
  persistent?: boolean;
}

export function Modal({ open, onClose, title, children, persistent = false }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Scroll lock
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  // Chiudi con Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !persistent) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose, persistent]);

  if (!open) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (!persistent && e.target === overlayRef.current) onClose();
  };

  return createPortal(
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <div
        role="dialog"
        aria-modal
        aria-labelledby={title ? "modal-title" : undefined}
        className="relative w-full max-w-md rounded-[var(--radius-lg)] bg-[var(--color-surface)] shadow-[var(--shadow-lg)] flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        {(title || !persistent) && (
          <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
            {title && (
              <h2 id="modal-title" className="font-semibold text-[var(--color-text)] text-lg">
                {title}
              </h2>
            )}
            {!persistent && (
              <button
                onClick={onClose}
                className="ml-auto flex items-center justify-center w-8 h-8 rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-overlay-md)] transition-colors"
                aria-label="Chiudi"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="overflow-y-auto px-5 pb-5 flex-1">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
