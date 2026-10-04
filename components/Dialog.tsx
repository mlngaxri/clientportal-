"use client";
import { useEffect, useId, useRef } from "react";
export default function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const previousFocus = useRef<HTMLElement | null>(typeof document === "undefined" ? null : document.activeElement as HTMLElement | null);
  const titleId = useId();
  useEffect(() => {
    const el = ref.current;
    if (el && !el.open) el.showModal();
    return () => {
      el?.close();
      if (previousFocus.current?.isConnected) previousFocus.current.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="ff-dialog"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="dialog-close"
        onClick={onClose}
        aria-label={`Close ${title}`}
      >
        ×
      </button>
      <h2 id={titleId}>{title}</h2>
      {children}
    </dialog>
  );
}
