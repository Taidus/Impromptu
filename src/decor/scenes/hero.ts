import * as THREE from "three";
import { config } from "@/config/app";
import { pxToWorld, type SceneContext, type SceneHandle } from "./types";

const RING_RADII = [1.0, 1.35, 1.7] as const;
// Distinct axes so the three rings read as independent chrome loops, not one flat stack.
const RING_AXES: readonly THREE.Vector3[] = [
  new THREE.Vector3(1, 0.3, 0).normalize(),
  new THREE.Vector3(0.2, 1, 0.4).normalize(),
  new THREE.Vector3(0.5, -0.4, 1).normalize(),
];
const POINT_LIGHT_INTENSITY = 3;
const POINT_LIGHT_POSITIONS: readonly [number, number, number][] = [
  [2.5, 1.5, 2],
  [-2.5, -1, 1.5],
  [0, 2.2, -1.5],
];

/** The hero chrome rings-and-blob, with cursor depth (SetupHero's desktop art column). */
export function buildHeroScene(ctx: SceneContext): SceneHandle {
  const { scene, camera, colors } = ctx;
  const { hero } = config.decor;

  const group = new THREE.Group();
  // Not metalness 1: with no environment map a full metal has no diffuse term
  // and reads black between highlights.
  const material = new THREE.MeshStandardMaterial({ metalness: 0.85, roughness: 0.2, color: colors.cream });

  const rings = RING_RADII.map((radius, i) => {
    const geometry = new THREE.TorusGeometry(radius, 0.045, 24, 96);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.axis = RING_AXES[i];
    group.add(mesh);
    return mesh;
  });

  const blobGeometry = new THREE.IcosahedronGeometry(0.55, 3);
  const blob = new THREE.Mesh(blobGeometry, material);
  group.add(blob);

  const hemiLight = new THREE.HemisphereLight(colors.cream, colors.night, 1.2);
  group.add(hemiLight);

  [colors.foilA, colors.foilB, colors.foilD].forEach((color, i) => {
    // decay 0: under physical decay a few-unit-away light of this intensity is near black.
    const light = new THREE.PointLight(color, POINT_LIGHT_INTENSITY, 0, 0);
    light.position.set(...POINT_LIGHT_POSITIONS[i]);
    group.add(light);
  });

  scene.add(group);

  const targetPosition = new THREE.Vector3();

  return {
    update(dtSec, pointer) {
      for (const ring of rings) {
        const axis = ring.userData.axis as THREE.Vector3;
        ring.rotateOnAxis(axis, hero.spinRadPerSec * dtSec);
      }

      const worldPerPx = pxToWorld(camera, ctx.canvas.clientHeight || 1);
      targetPosition.set(pointer.x * hero.depthPx * worldPerPx, pointer.y * hero.depthPx * worldPerPx, 0);
      const factor = 1 - Math.exp((-dtSec * 1000) / hero.depthEaseMs);
      group.position.lerp(targetPosition, factor);
    },
    dispose() {
      scene.remove(group);
      for (const ring of rings) ring.geometry.dispose();
      blobGeometry.dispose();
      material.dispose();
    },
  };
}
