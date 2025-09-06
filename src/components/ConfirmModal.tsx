"use client";
import { AlertTriangle, X } from "lucide-react";

export type ConfirmModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  dangerous?: boolean;
};

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  dangerous = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 cursor-pointer"
        role="button"
        tabIndex={0}
        aria-label="Close dialog"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onClose();
          if (e.key === "Escape") onClose();
        }}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-[color:var(--color-surface)] rounded-lg shadow-lg w-full max-w-md">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[color:var(--color-border)]">
            <div className="flex items-center gap-3">
              {dangerous && (
                <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <AlertTriangle
                    size={16}
                    className="text-red-600 dark:text-red-400"
                  />
                </div>
              )}
              <h2 className="text-lg font-semibold text-[color:var(--color-text)]">
                {title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 hover:bg-[color:var(--color-card)] rounded-lg transition-colors cursor-pointer"
            >
              <X size={16} className="text-[color:var(--color-muted)]" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            <p className="text-[color:var(--color-text)] mb-6">{message}</p>

            {/* Actions */}
            <div className="flex items-center gap-3 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-[color:var(--color-text)] bg-[color:var(--color-card)] border border-[color:var(--color-border)] rounded-lg hover:bg-[color:var(--color-surface)] transition-colors cursor-pointer"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                  dangerous
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-[color:var(--color-primary)] text-[color:var(--color-primary-contrast)] hover:opacity-90"
                }`}
              >
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
