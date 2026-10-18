"use client";

import React, { useEffect } from "react";
import { AlertTriangle, Loader2, ShieldCheck } from "lucide-react";

export type ConfirmTone = "danger" | "brand";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

const toneStyles: Record<
  ConfirmTone,
  { icon: React.ReactNode; iconWrap: string; confirm: string }
> = {
  danger: {
    icon: <AlertTriangle className="w-5 h-5" />,
    iconWrap: "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400",
    confirm: "bg-rose-600 hover:bg-rose-700 text-white",
  },
  brand: {
    icon: <ShieldCheck className="w-5 h-5" />,
    iconWrap: "bg-brand/20 text-brand-dark dark:text-brand",
    confirm: "bg-brand hover:bg-brand-hover text-neutral-950",
  },
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Ya, Lanjutkan",
  cancelLabel = "Batal",
  tone = "danger",
  loading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, loading, onClose]);

  if (!open) return null;

  const styles = toneStyles[tone];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby={description ? "confirm-dialog-description" : undefined}
        className="w-full max-w-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-xl"
      >
        <div className="flex items-start gap-3.5">
          <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${styles.iconWrap}`}>
            {styles.icon}
          </div>
          <div className="min-w-0">
            <h3
              id="confirm-dialog-title"
              className="font-bold text-sm text-neutral-900 dark:text-neutral-100 tracking-tight"
            >
              {title}
            </h3>
            {description && (
              <p
                id="confirm-dialog-description"
                className="text-xs text-neutral-500 dark:text-neutral-400 mt-1.5 leading-relaxed"
              >
                {description}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            autoFocus
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg font-semibold text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-xs shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed ${styles.confirm}`}
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
