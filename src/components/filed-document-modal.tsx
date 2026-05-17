"use client";

import { useCallback, useEffect } from "react";
import { X } from "lucide-react";
import FiledDocumentViewer, { type Context } from "@/components/filed-document-viewer";

interface FiledDocumentModalProps {
  src: string;
  downloadHref: string;
  context: Context;
  title: string;
  onClose: () => void;
}

/**
 * Renders {@link FiledDocumentViewer} inside the house modal chrome so a filed
 * document can be previewed without navigating away from the list. Mirrors the
 * dialog conventions used by filing-confirmation-dialog: backdrop-click and
 * Escape to dismiss, body scroll lock while open.
 */
export default function FiledDocumentModal({
  src,
  downloadHref,
  context,
  title,
  onClose,
}: FiledDocumentModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-w-[820px] w-full max-h-[calc(100vh-32px)] overflow-y-auto bg-card rounded-xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.18),0_2px_8px_rgba(0,0,0,0.08)] relative">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h2 className="text-[15px] font-semibold text-foreground m-0">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="focus-ring inline-flex items-center justify-center w-7 h-7 rounded-md border border-border text-secondary cursor-pointer transition-colors duration-200 shrink-0"
          >
            <X size={15} strokeWidth={2} />
          </button>
        </div>
        <FiledDocumentViewer
          src={src}
          downloadHref={downloadHref}
          context={context}
          title={title}
        />
      </div>
    </div>
  );
}
