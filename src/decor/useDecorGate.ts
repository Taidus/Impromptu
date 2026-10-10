"use client";

import { useEffect, useState } from "react";
import { decorGate, readDecorEnvironment } from "./gate";

/**
 * `null` until a verdict exists, then `decorGate(env)`. Undecided (null)
 * while `html[data-motion]` is absent: `MotionSync` only writes it once the
 * store is ready (a stored `ambientMotion:false` arrives that way), so the
 * MutationObserver delivers the first verdict instead of a race with store
 * hydration. Re-evaluates on the reduced-motion `change` event and on every
 * `data-motion` mutation; this hook never reads the store. The WebGL2 probe
 * runs once per mount, on the first decided evaluation.
 */
export function useDecorGate(): boolean | null {
  const [gate, setGate] = useState<boolean | null>(null);

  useEffect(() => {
    let webgl2: boolean | undefined;
    const reducedMotionQuery = matchMedia("(prefers-reduced-motion: reduce)");

    const evaluate = () => {
      if (document.documentElement.dataset.motion === undefined) {
        setGate(null);
        return;
      }
      const env = readDecorEnvironment(webgl2);
      webgl2 = env.webgl2;
      setGate(decorGate(env));
    };

    // A microtask, not a synchronous call: the attribute may already be set
    // (client navigation back to /), and setState directly in the effect body
    // trips react-hooks/set-state-in-effect.
    queueMicrotask(evaluate);

    reducedMotionQuery.addEventListener("change", evaluate);
    const observer = new MutationObserver(evaluate);
    observer.observe(document.documentElement, { attributeFilter: ["data-motion"] });

    return () => {
      reducedMotionQuery.removeEventListener("change", evaluate);
      observer.disconnect();
    };
  }, []);

  return gate;
}
