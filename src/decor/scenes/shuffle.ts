import * as THREE from "three";
import { config } from "@/config/app";
import { pxToWorld, type SceneContext, type SceneHandle } from "./types";

interface Star {
  mesh: THREE.Mesh;
  yWorld: number;
}

const LIGHT_POSITIONS: readonly [number, number, number][] = [
  [2, 1.5, 2],
  [-2, -1.5, 2],
  [0, 0, 3],
];

/** Stars confined to the two side bands outside the keep-out column (used by 8.5's shuffle). */
export function buildShuffleScene(ctx: SceneContext): SceneHandle {
  const { scene, camera, colors, canvas } = ctx;
  const { shuffle } = config.decor;

  const group = new THREE.Group();
  scene.add(group);

  const geometry = new THREE.OctahedronGeometry(0.22);
  const material = new THREE.MeshStandardMaterial({ metalness: 0.85, roughness: 0.2, color: colors.cream });

  group.add(new THREE.HemisphereLight(colors.grape, colors.lilac, 1.1));
  [colors.foilB, colors.foilC, colors.grape].forEach((color, i) => {
    const light = new THREE.PointLight(color, 3, 0, 0);
    light.position.set(...LIGHT_POSITIONS[i]);
    group.add(light);
  });

  const stars: Star[] = Array.from({ length: shuffle.starCount }, () => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.set(1, 1, 0.3);
    group.add(mesh);
    return { mesh, yWorld: 0 };
  });

  let lastWidth = -1;
  let lastHeight = -1;
  let worldPerPx = 0;
  let heightWorld = 0;

  // Measures the keep-out probe and places every star just outside it, alternating sides.
  function layout(firstRun: boolean) {
    const canvasWidth = canvas.clientWidth;
    const canvasHeight = canvas.clientHeight || 1;
    worldPerPx = pxToWorld(camera, canvasHeight);
    heightWorld = canvasHeight * worldPerPx;

    // No probe means no measured column: show nothing rather than risk 3D under the Brief.
    const keepOut = canvas.parentElement?.closest("[data-decor]")?.querySelector("[data-decor-keep-out]") ?? null;
    group.visible = keepOut !== null;
    const keepOutHalfWidthPx = keepOut ? keepOut.getBoundingClientRect().width / 2 : 0;
    const minXPx = keepOutHalfWidthPx + shuffle.keepOutMarginPx;
    const maxXPx = Math.max(canvasWidth / 2, minXPx);
    const spanPx = Math.max(maxXPx - minXPx, 0);

    stars.forEach((star, i) => {
      const side = i % 2 === 0 ? 1 : -1;
      // Deterministic spread (golden-ratio offsets), not random: a decorative margin scene needs variety, not entropy.
      const xPx = side * (minXPx + ((i * 0.618033) % 1) * spanPx);
      star.mesh.position.x = xPx * worldPerPx;
      if (firstRun) star.yWorld = (i / shuffle.starCount - 0.5) * heightWorld;
      star.mesh.position.y = star.yWorld;
    });

    lastWidth = canvasWidth;
    lastHeight = canvasHeight;
  }

  layout(true);

  return {
    update(dtSec, pointer) {
      void pointer; // the shuffle scene ignores the cursor; only the hero reacts to it.

      if (canvas.clientWidth !== lastWidth || canvas.clientHeight !== lastHeight) layout(false);

      const driftWorld = shuffle.driftPxPerSec * worldPerPx * dtSec;
      const halfHeight = heightWorld / 2;

      for (const star of stars) {
        star.mesh.rotation.y += shuffle.spinRadPerSec * dtSec;
        star.mesh.rotation.x += shuffle.spinRadPerSec * 0.6 * dtSec;
        star.yWorld -= driftWorld;
        if (star.yWorld < -halfHeight) star.yWorld += heightWorld;
        star.mesh.position.y = star.yWorld;
      }
    },
    dispose() {
      scene.remove(group);
      geometry.dispose();
      material.dispose();
    },
  };
}
