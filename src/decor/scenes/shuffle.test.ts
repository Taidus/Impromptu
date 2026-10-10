import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { config } from "@/config/app";
import { buildShuffleScene } from "./shuffle";
import { pxToWorld, type DecorColors } from "./types";

const colors = Object.fromEntries(
  ["foilA", "foilB", "foilC", "foilD", "cream", "night", "grape", "lilac"].map((k) => [k, new THREE.Color()]),
) as DecorColors;

/** A 1280x800 canvas whose Decor box holds a keep-out probe `keepOutWidthPx` wide (or none). */
function build(keepOutWidthPx: number | null) {
  const probe = keepOutWidthPx === null ? null : { getBoundingClientRect: () => ({ width: keepOutWidthPx }) };
  const box = { querySelector: () => probe };
  const canvas = { clientWidth: 1280, clientHeight: 800, parentElement: { closest: () => box } } as unknown as HTMLCanvasElement;
  const camera = new THREE.PerspectiveCamera(35, 1280 / 800, 0.1, 50);
  camera.position.z = 6;
  const scene = new THREE.Scene();
  buildShuffleScene({ scene, camera, colors, canvas });
  const stars: THREE.Mesh[] = [];
  scene.traverse((o) => {
    if (o instanceof THREE.Mesh) stars.push(o);
  });
  return { scene, camera, stars };
}

describe("buildShuffleScene", () => {
  it("places starCount stars, every one outside the keep-out plus margin", () => {
    const { camera, stars } = build(640);
    expect(stars).toHaveLength(config.decor.shuffle.starCount);
    const worldPerPx = pxToWorld(camera, 800);
    for (const star of stars) {
      expect(Math.abs(star.position.x) / worldPerPx).toBeGreaterThanOrEqual(320 + config.decor.shuffle.keepOutMarginPx - 1e-6);
    }
  });

  it("hides every star when there is no keep-out probe", () => {
    const { stars } = build(null);
    for (const star of stars) {
      let visible = true;
      star.traverseAncestors((a) => {
        if (!a.visible) visible = false;
      });
      expect(visible && star.visible).toBe(false);
    }
  });
});

describe("pxToWorld", () => {
  it("is the frustum height at the camera distance over the canvas height", () => {
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
    camera.position.z = 6;
    expect(pxToWorld(camera, 800)).toBeCloseTo((12 * Math.tan((17.5 * Math.PI) / 180)) / 800, 10);
    expect(pxToWorld(camera, 800)).toBeCloseTo(0.0047295, 6);
  });
});
