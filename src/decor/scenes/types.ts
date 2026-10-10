import * as THREE from "three";

export interface SceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  colors: DecorColors;
  canvas: HTMLCanvasElement;
}

export interface SceneHandle {
  update(dtSec: number, pointer: { x: number; y: number }): void;
  dispose(): void;
}

export type DecorColors = Record<"foilA" | "foilB" | "foilC" | "foilD" | "cream" | "night" | "grape" | "lilac", THREE.Color>;

const TOKEN_NAMES: Record<keyof DecorColors, string> = {
  foilA: "--color-foil-a",
  foilB: "--color-foil-b",
  foilC: "--color-foil-c",
  foilD: "--color-foil-d",
  cream: "--color-cream",
  night: "--color-night",
  grape: "--color-grape",
  lilac: "--color-lilac",
};

/**
 * Reads chrome's palette off the live CSS custom properties — tokens stay the
 * single source; no hex literals in src/decor. Throws on a missing token
 * (three would silently render it white); Decor turns the throw into the fallback still.
 */
export function readDecorColors(): DecorColors {
  const style = getComputedStyle(document.documentElement);
  const read = (name: string) => {
    const value = style.getPropertyValue(name).trim();
    if (!value) throw new Error(`Decor: CSS token ${name} is empty`);
    return new THREE.Color(value);
  };
  return {
    foilA: read(TOKEN_NAMES.foilA),
    foilB: read(TOKEN_NAMES.foilB),
    foilC: read(TOKEN_NAMES.foilC),
    foilD: read(TOKEN_NAMES.foilD),
    cream: read(TOKEN_NAMES.cream),
    night: read(TOKEN_NAMES.night),
    grape: read(TOKEN_NAMES.grape),
    lilac: read(TOKEN_NAMES.lilac),
  };
}

/** World units per CSS pixel at the camera's current distance/FOV, for placing and sizing objects from on-screen measurements. */
export function pxToWorld(camera: THREE.PerspectiveCamera, canvasHeightPx: number): number {
  return (2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / canvasHeightPx;
}
