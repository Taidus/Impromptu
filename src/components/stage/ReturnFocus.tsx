"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * EXPERIENCE.md -> Focus targets: "Back, Esc, or Discard to Setup -> Setup
 * h1 (or the notice banner when one is shown)". Mounted once in the root layout (which persists across client
 * navigations), it remembers the previous pathname and, on a /stage -> /
 * transition, focuses the first Notice banner, else the page's h1. No storage flag needed: the layout's
 * own render history is the signal.
 */
export function ReturnFocus() {
  const pathname = usePathname();
  const previous = useRef(pathname);

  useEffect(() => {
    const from = previous.current;
    previous.current = pathname;
    if (from !== "/stage" || pathname !== "/") return;
    const target = document.querySelector<HTMLElement>("[data-notice-banner]") ?? document.querySelector("h1");
    if (!target) return;
    target.tabIndex = -1;
    target.focus();
  }, [pathname]);

  return null;
}
