"use client";

import { useEffect, useSyncExternalStore } from "react";
import { getAppStore, useAppStore } from "@/store";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

let mediaQuery: MediaQueryList | undefined;
const reducedMotionQuery = () => (mediaQuery ??= window.matchMedia(REDUCED_MOTION_QUERY));

function subscribe(listener: () => void): () => void {
  const query = reducedMotionQuery();
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

function getSnapshot(): boolean {
  return reducedMotionQuery().matches;
}

function getServerSnapshot(): boolean {
  return false;
}

/** `matchMedia("(prefers-reduced-motion: reduce)")`; the server snapshot is `false` (AD-10: no branching before the client can read the system setting). */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Pure: reduced motion always wins over the stored toggle (AD-19). */
export function effectiveMotion(ambientMotion: boolean, reduced: boolean): boolean {
  return ambientMotion && !reduced;
}

export interface AmbientMotion {
  /** The stored `setup.ambientMotion`, or `true` before the store is ready (AD-10's neutral default). */
  ambientMotion: boolean;
  /** `effectiveMotion(ambientMotion, reduced)` -- what actually plays. */
  effective: boolean;
  reduced: boolean;
  /** The store is ready with a Setup loaded. */
  ready: boolean;
  set: (ambientMotion: boolean) => void;
}

/**
 * Resolves the effective ambient-motion value and mirrors it as
 * `data-motion="on"|"off"` on `<html>` in an effect. While the store is
 * not ready the attribute is removed, so motion keeps running -- today's behaviour (the CSS `:root[data-motion="off"]`
 * rule in tokens.css never matches an absent attribute).
 */
export function useAmbientMotion(): AmbientMotion {
  const state = useAppStore();
  const reduced = usePrefersReducedMotion();
  const setup = state.status === "ready" ? state.setup : null;
  const ready = setup !== null;
  const ambientMotion = setup?.ambientMotion ?? true;
  const effective = effectiveMotion(ambientMotion, reduced);

  useEffect(() => {
    if (!ready) delete document.documentElement.dataset.motion;
    else document.documentElement.dataset.motion = effective ? "on" : "off";
  }, [ready, effective]);

  return {
    ambientMotion,
    effective,
    reduced,
    ready,
    set: (value) => getAppStore().dispatchSetup({ type: "set_ambient_motion", ambientMotion: value }),
  };
}

/** Mounted once in the root layout so every page (including /stage) mirrors `data-motion`. */
export function MotionSync() {
  useAmbientMotion();
  return null;
}
