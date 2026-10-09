"use client";

import { useEffect, useSyncExternalStore } from "react";
import { loadGeneratedLibrarySource } from "@/adapters/library";
import { cryptoRandom } from "@/adapters/random";
import { systemClock } from "@/adapters/clock";
import { createRepository } from "@/adapters/storage";
import { createStore, initialState } from "./store";
import type { Store, StoreState } from "./types";

let store: Store | null = null;

/**
 * The one production app store (AD-7), created on first use in the browser -- never at module
 * scope, since a `"use client"` module still evaluates during server prerendering.
 */
export function getAppStore(): Store {
  store ??= createStore({
    repository: createRepository(),
    clock: systemClock,
    random: cryptoRandom,
    librarySource: loadGeneratedLibrarySource,
  });
  return store;
}

const subscribe = (listener: () => void) => getAppStore().subscribe(listener);
const getSnapshot = () => getAppStore().getState();
const getServerSnapshot = () => initialState;

/**
 * Reads the store (AD-10: the server snapshot and the first client render are the neutral
 * `loading` state). Hydration is kicked off from an effect, never during render.
 */
export function useAppStore(): StoreState {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => {
    getAppStore().hydrate();
  }, []);
  return state;
}

export type { Status, Store, StoreCommand, StoreState } from "./types";
