"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * EXPERIENCE.md -> Focus targets: "Back, Esc, or Discard to Setup -> Setup
 * h1". Mounted once in the root layout (which persists across client
 * navigations), it remembers the previous pathname and, on a /stage -> /
 * transition, focuses the page's h1. No storage flag needed: the layout's
 * own render history is the signal.
 */
export function ReturnFocus() {
  const pathname = usePathname();
  const previous = useRef(pathname);

  useEffect(() => {
    const from = previous.current;
    previous.current = pathname;
    if (from !== "/stage" || pathname !== "/") return;
    const h1 = document.querySelector("h1");
    if (!h1) return;
    h1.tabIndex = -1;
    h1.focus();
  }, [pathname]);

  return null;
}
