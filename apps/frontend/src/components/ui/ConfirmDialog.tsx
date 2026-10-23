"use client";

import React, { useEffect } from "react";
import { AlertTriangle, Loader2, ShieldCheck, X } from "lucide-react";

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
  { icon: React.ReactNode; iconColor: string; confirm: string }
> = {
  danger: {
    icon: <AlertTriangle />,
    iconColor: "var(--app-danger)",
    confirm: "btn btn--danger",
  },
  brand: {
    icon: <ShieldCheck />,
    iconColor: "var(--app-warning)",
    confirm: "btn btn--primary",
  },
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Ya, lanjutkan",
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
      className="modal-backdrop"
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
        className="modal modal--sm"
      >
        <div className="modal__head">
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <span
              style={{
                display: "grid",
                placeItems: "center",
                width: 22,
                height: 22,
                marginTop: 1,
                color: styles.iconColor,
                flex: "none",
              }}
            >
              {styles.icon}
            </span>
            <div>
              <h2 id="confirm-dialog-title" className="modal__title">
                {title}
              </h2>
              {description && (
                <p id="confirm-dialog-description" className="modal__sub">
                  {description}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Tutup dialog"
            className="modal__close"
          >
            <X />
          </button>
        </div>

        <div className="modal__actions" style={{ marginTop: 0, paddingTop: 0, borderTop: 0 }}>
          <button
            type="button"
            autoFocus
            onClick={onClose}
            disabled={loading}
            className="btn btn--secondary"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={styles.confirm}
          >
            {loading && <Loader2 className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
