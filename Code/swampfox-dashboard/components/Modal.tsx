"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import clsx from "clsx";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

export default function Modal({
  open, onClose, title, subtitle, children, size = "md",
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const widths: Record<string, string> = {
    sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(10,31,10,0.45)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className={clsx(
          "relative w-full bg-cream-card border border-cream-border rounded-2xl",
          "max-h-[88vh] overflow-y-auto",
          widths[size]
        )}
        style={{
          boxShadow: "0 32px 80px rgba(10,31,10,0.22), 0 4px 16px rgba(10,31,10,0.1)",
          animation: "modalIn 0.18s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-cream-card/95 backdrop-blur-sm border-b border-cream-border px-6 py-4 flex items-start justify-between gap-4 rounded-t-2xl z-10">
          <div>
            <h2 className="text-ink font-bold text-lg leading-tight">{title}</h2>
            {subtitle && <p className="text-ink-muted text-sm mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-cream-hover hover:bg-cream-border flex items-center justify-center shrink-0 transition-colors mt-0.5"
          >
            <X className="w-4 h-4 text-ink-mid" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">{children}</div>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
      `}</style>
    </div>
  );
}
