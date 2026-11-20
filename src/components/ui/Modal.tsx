"use client";

import { useEffect, type ReactNode } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function Modal({ open, onClose, title, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      // REMOVED onClick={onClose} to prevent accidental misclick closes!
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl border border-border bg-surface p-6 shadow-glow"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between shrink-0">
          <h2 className="font-display text-lg font-bold tracking-wide">{title}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-danger transition-colors" aria-label="Close">
            ✕
          </button>
        </div>

        {/* Added overflow-y-auto here to enable scrolling inside the modal */}
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
}