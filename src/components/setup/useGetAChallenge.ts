"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { getAppStore } from "@/store";

/**
 * Every "Get a challenge" entry point (EXPERIENCE.md -> Setup page sections).
 * Composes here, synchronously, and opens `/stage` only once the session
 * holds the new Challenge -- `/stage` then finds it held and does not compose
 * again. On a compose failure it stays put and reports `failed` so the caller
 * can show the inline message. Re-entry is ignored from the first click on
 * (a double click composes once); the guard resets only on failure, since a
 * success navigates away and unmounts the caller.
 */
export function useGetAChallenge(): { getAChallenge: () => void; failed: boolean } {
  const router = useRouter();
  const busy = useRef(false);
  const [failed, setFailed] = useState(false);

  const getAChallenge = useCallback(() => {
    if (busy.current) return;
    busy.current = true;
    const store = getAppStore();
    store.dispatch({ type: "new_challenge" });
    const { session } = store.getState();
    // compose_failed keeps any previously held Challenge but sets lastComposeError; a commit clears it.
    if (session.challenge !== null && session.lastComposeError === null) {
      setFailed(false);
      router.push("/stage");
      return;
    }
    busy.current = false;
    setFailed(true);
  }, [router]);

  return { getAChallenge, failed };
}
