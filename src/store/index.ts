"use client";

import { useEffect, useSyncExternalStore } from "react";
import { loadGeneratedLibrarySource } from "@/adapters/library";
import { cryptoRandom } from "@/adapters/random";
import { systemClock } from "@/adapters/clock";
import { createRepository } from "@/adapters/storage";
import { createStore } from "./store";
import type { StoreState } from "./types";

/** The one production app store (AD-7). Created once per client; never re-instantiated. */
export const store = createStore({
  repository: createRepository(),
  clock: systemClock,
  random: cryptoRandom,
  librarySource: loadGeneratedLibrarySource,
});

/**
 * Reads the store (AD-10: `status`/`libraryStatus` start `'loading'` on first render, including
 * server/static HTML, since `createStore` never touches the Repository until `hydrate()` runs).
 * Hydration is kicked off from an effect, never during render.
 */
export function useAppStore(): StoreState {
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);
  useEffect(() => {
    store.hydrate();
  }, []);
  return state;
}

export type { Status, Store, StoreCommand, StoreState } from "./types";
