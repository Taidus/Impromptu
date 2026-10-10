"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { config } from "@/config/app";
import type { DecorMode, DecorSceneName } from "./Decor";
import { buildHeroScene } from "./scenes/hero";
import { buildShuffleScene } from "./scenes/shuffle";
import { readDecorColors, type SceneContext, type SceneHandle } from "./scenes/types";

// The only React file (besides src/decor/scenes/*) that imports three.
const SCENES: Record<DecorSceneName, (ctx: SceneContext) => SceneHandle> = {
  hero: buildHeroScene,
  shuffle: buildShuffleScene,
};

const MAX_DT_SEC = 0.1;
const FOV_DEG = 35;
// World-space radius every scene keeps inside the box: the hero's outer ring
// (1.7 + tube) plus room for the cursor-depth shift.
const FIT_RADIUS_WORLD = 2;
const CANVAS_CLASS = "absolute inset-0 h-full w-full transition-opacity duration-(--dur-decor-fade)";

export type DecorSceneReport = "running" | "frozen" | "failed";

export interface DecorSceneProps {
  scene: DecorSceneName;
  mode: DecorMode;
  onState: (state: DecorSceneReport) => void;
}

export default function DecorScene({ scene, mode, onState }: DecorSceneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onStateRef = useRef(onState);
  const setModeRef = useRef<((mode: DecorMode) => void) | null>(null);

  useEffect(() => {
    onStateRef.current = onState;
  }, [onState]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const report = (state: DecorSceneReport) => onStateRef.current(state);

    // A fresh canvas per mount: Strict Mode's mount -> cleanup -> mount would
    // otherwise build a second renderer on a canvas whose context the first
    // cleanup force-lost (THREE throws reading `precision` of null).
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.className = `${CANVAS_CLASS} opacity-0`;
    container.append(canvas);

    const threeScene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(FOV_DEG, 1, 0.1, 50);
    camera.position.z = 6;

    let renderer: THREE.WebGLRenderer | null = null;
    let handle: SceneHandle;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
      renderer.setClearAlpha(0);
      handle = SCENES[scene]({ scene: threeScene, camera, colors: readDecorColors(), canvas });
    } catch {
      // NFR-7: the 3D layer never takes Setup down; Decor keeps the still and never retries this mount.
      renderer?.dispose();
      canvas.remove();
      report("failed");
      return;
    }
    const gl = renderer;

    const pointer = { x: 0, y: 0 };
    let lastTimeMs: number | null = null;
    let looping = false;
    let contextLost = false;
    let currentMode: DecorMode | null = null;
    let reportRunning = true;

    const paint = (dtSec: number) => {
      handle.update(dtSec, pointer);
      gl.render(threeScene, camera);
      canvas.className = `${CANVAS_CLASS} opacity-100`;
    };
    const fail = () => {
      gl.setAnimationLoop(null);
      looping = false;
      report("failed");
    };
    const tick = (timeMs: number) => {
      const dtSec = lastTimeMs === null ? 0 : Math.min((timeMs - lastTimeMs) / 1000, MAX_DT_SEC);
      lastTimeMs = timeMs;
      try {
        paint(dtSec);
      } catch {
        fail();
        return;
      }
      // "running" only once a frame is actually on the canvas.
      if (reportRunning) {
        reportRunning = false;
        report("running");
      }
    };
    // One frame while the loop is stopped (frozen start, resize while frozen or hidden).
    const paintStill = () => {
      if (contextLost) return;
      try {
        paint(0);
      } catch {
        fail();
      }
    };
    const sync = () => {
      const run = currentMode !== null && currentMode !== "frozen" && !document.hidden && !contextLost;
      if (run === looping) return;
      looping = run;
      if (run) {
        lastTimeMs = null;
        gl.setAnimationLoop(tick);
      } else {
        gl.setAnimationLoop(null);
      }
    };
    const setMode = (next: DecorMode) => {
      if (next === currentMode) return;
      currentMode = next;
      if (next === "frozen") {
        sync();
        paintStill();
        report("frozen");
      } else {
        reportRunning = true;
        sync();
      }
    };

    const resize = (width: number, height: number) => {
      if (width <= 0 || height <= 0) return;
      gl.setPixelRatio(Math.min(window.devicePixelRatio, config.decor.maxPixelRatio));
      gl.setSize(width, height, false);
      camera.aspect = width / height;
      // Fit a FIT_RADIUS_WORLD sphere into the narrower of the two fields of view.
      camera.position.z =
        FIT_RADIUS_WORLD / Math.sin(THREE.MathUtils.degToRad(FOV_DEG / 2)) / Math.min(1, camera.aspect);
      camera.updateProjectionMatrix();
      if (!looping && currentMode !== null) paintStill();
    };
    resize(container.clientWidth, container.clientHeight);
    const resizeObserver = new ResizeObserver(([entry]) => {
      if (entry) resize(entry.contentRect.width, entry.contentRect.height);
    });
    resizeObserver.observe(container);

    const onPointerMove =
      scene === "hero"
        ? (event: PointerEvent) => {
            pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
            pointer.y = -((event.clientY / window.innerHeight) * 2 - 1);
          }
        : null;
    if (onPointerMove) window.addEventListener("pointermove", onPointerMove, { passive: true });

    // THREE's own listeners preventDefault the loss so a restore can follow.
    const onContextLost = () => {
      contextLost = true;
      sync();
    };
    const onContextRestored = () => {
      contextLost = false;
      sync();
      if (!looping) paintStill();
    };
    canvas.addEventListener("webglcontextlost", onContextLost);
    canvas.addEventListener("webglcontextrestored", onContextRestored);
    document.addEventListener("visibilitychange", sync);

    setModeRef.current = setMode;
    setMode(mode);

    return () => {
      setModeRef.current = null;
      document.removeEventListener("visibilitychange", sync);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      if (onPointerMove) window.removeEventListener("pointermove", onPointerMove);
      resizeObserver.disconnect();
      gl.setAnimationLoop(null);
      handle.dispose();
      gl.dispose();
      gl.forceContextLoss();
      canvas.remove();
    };
    // The scene mounts once per <DecorScene> instance with the mode it has at
    // mount; later `mode` changes go through setModeRef in the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  useEffect(() => {
    setModeRef.current?.(mode);
  }, [mode]);

  return <div ref={containerRef} className="absolute inset-0" />;
}
