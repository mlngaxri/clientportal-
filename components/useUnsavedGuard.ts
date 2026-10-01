"use client";
import { useEffect } from "react";
export function useUnsavedGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const close = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const navigate = (e: MouseEvent) => {
      const target =
        e.target instanceof Element
          ? e.target.closest("a, [data-leave-editor]")
          : null;
      if (
        !target ||
        (target instanceof HTMLAnchorElement &&
          (!target.getAttribute("href") ||
            target.getAttribute("href")!.startsWith("#") ||
            target.hasAttribute("download") ||
            target.target === "_blank"))
      )
        return;
      if (!window.confirm("You have unsaved changes. Leave without saving?")) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", close);
    document.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", close);
      document.removeEventListener("click", navigate, true);
    };
  }, [dirty]);
}
