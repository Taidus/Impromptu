"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { Component, useEffect, useRef, useState, type ReactNode, type Ref } from "react";
import type { DecorSceneReport } from "./DecorScene";
import { useDecorGate } from "./useDecorGate";

export type DecorSceneName = "hero" | "shuffle";
export type DecorMode = "ambient" | "shuffle" | "frozen";
export type DecorState = "fallback" | "loading" | "running" | "frozen";

export interface DecorProps {
  scene: DecorSceneName;
  mode: DecorMode;
  /** Position and size; Decor never positions itself (same contract as ChromePiece). */
  className: string;
}

// Intrinsic pixel size of the two chrome stills this layer can show, mirroring
// ChromePiece.CHROME_SIZE; src/decor may not import that file (layer boundary).
const FALLBACK = {
  hero: {
    src: "/decor/chrome/chrome-ring.webp",
    width: 631,
    height: 640,
    className: "absolute inset-0 h-full w-full object-contain",
  },
  shuffle: {
    src: "/decor/chrome/chrome-burst.webp",
    width: 612,
    height: 640,
    className: "absolute top-1/2 right-header-inset w-[12vw] -translate-y-1/2",
  },
} as const;

// Declared at module scope: the chunk is only requested when `shouldRequestScene`
// first returns true for a mounted <Decor>, never merely by this file loading.
const DecorScene = dynamic(() => import("./DecorScene"), { ssr: false });

export interface DecorViewProps {
  scene: DecorSceneName;
  state: DecorState;
  className: string;
  children?: ReactNode;
  boxRef?: Ref<HTMLDivElement>;
}

/** Pure markup: the SSR'd fallback still, the shuffle keep-out probe, and (once mounted) the scene. */
export function DecorView({ scene, state, className, children = null, boxRef }: DecorViewProps) {
  const fallback = FALLBACK[scene];
  // Once the scene has painted, the still fades out under the canvas's fade-in.
  const painted = state === "running" || state === "frozen";
  return (
    <div
      ref={boxRef}
      data-decor
      data-decor-scene={scene}
      data-decor-state={state}
      aria-hidden="true"
      className={`pointer-events-none absolute overflow-hidden ${className}`}
    >
      <Image
        src={fallback.src}
        alt=""
        aria-hidden="true"
        width={fallback.width}
        height={fallback.height}
        className={`${fallback.className} transition-opacity duration-(--dur-decor-fade) ${painted ? "opacity-0" : "opacity-100"}`}
      />
      {scene === "shuffle" && (
        <div data-decor-keep-out className="invisible absolute inset-y-0 left-1/2 w-safe-area-width -translate-x-1/2" />
      )}
      {children}
    </div>
  );
}

/**
 * The chunk is requested the first time the layer has something to
 * animate; once requested (`requested` latches true), a Stage opened
 * already held never downloads three again just because the gate flips.
 */
export function shouldRequestScene(requested: boolean, gate: boolean | null, mode: DecorMode): boolean {
  return requested || (gate === true && mode !== "frozen");
}

/**
 * NFR-7: anything the 3D layer throws (chunk load failure, renderer
 * construction, a missing token) renders nothing here and reports once, so
 * Setup is never unmounted by decor.
 */
export class SceneBoundary extends Component<{ onFail: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onFail();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function Decor({ scene, mode, className }: DecorProps) {
  const gate = useDecorGate();

  // A 0x0 box (e.g. the hero aside is display:none below xl) counts as
  // frozen, so phones never fetch three and nothing animates unseen.
  const boxRef = useRef<HTMLDivElement>(null);
  const [hasBox, setHasBox] = useState(false);
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new ResizeObserver(([entry]) => {
      setHasBox(!!entry && entry.contentRect.width > 0 && entry.contentRect.height > 0);
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, []);
  const sceneMode: DecorMode = hasBox ? mode : "frozen";

  // Render-time latch (React's documented "adjust state while rendering"
  // pattern, https://react.dev/reference/react/useState#storing-information-from-previous-renders):
  // bounded to one extra render, never an Effect, so it never trips
  // react-hooks/set-state-in-effect.
  const [requested, setRequested] = useState(false);
  const nextRequested = shouldRequestScene(requested, gate, sceneMode);
  if (nextRequested !== requested) setRequested(nextRequested);

  // Latches: a failed scene is never requested again for this mount.
  const [failed, setFailed] = useState(false);
  const showScene = gate === true && requested && !failed;

  const [sceneState, setSceneState] = useState<"running" | "frozen" | null>(null);
  const [wasShowingScene, setWasShowingScene] = useState(showScene);
  if (showScene !== wasShowingScene) {
    setWasShowingScene(showScene);
    if (!showScene) setSceneState(null);
  }

  const state: DecorState = !showScene ? "fallback" : sceneState === null ? "loading" : sceneState;
  const onState = (report: DecorSceneReport) => {
    if (report === "failed") setFailed(true);
    else setSceneState(report);
  };

  return (
    <DecorView scene={scene} state={state} className={className} boxRef={boxRef}>
      {showScene ? (
        <SceneBoundary onFail={() => setFailed(true)}>
          <DecorScene scene={scene} mode={sceneMode} onState={onState} />
        </SceneBoundary>
      ) : null}
    </DecorView>
  );
}
