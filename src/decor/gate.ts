// Story 8.4: the decor gate. Pure (no three, no DOM globals at module
// scope) so it can be unit-tested with an injected environment and never
// drags the renderer into a path that only needs to decide whether to
// load it. `readDecorEnvironment` is the one browser-only exception.
import { config } from "@/config/app";

// `navigator.deviceMemory` and `navigator.connection` are non-standard
// (absent from lib.dom.d.ts); typed locally instead of reaching for `any`.
interface NavigatorWithDeviceMemory {
  deviceMemory?: number;
}
interface NavigatorWithConnection {
  connection?: { saveData?: boolean };
}

export interface DecorEnvironment {
  webgl2: boolean;
  reducedMotion: boolean;
  motionOff: boolean;
  deviceMemory: number | undefined;
  hardwareConcurrency: number | undefined;
  saveData: boolean;
}

export function isLowPower(
  env: Pick<DecorEnvironment, "deviceMemory" | "hardwareConcurrency" | "saveData">,
  limits: { maxDeviceMemoryGb: number; maxHardwareConcurrency: number } = config.decor.lowPower,
): boolean {
  if (env.deviceMemory !== undefined && env.deviceMemory <= limits.maxDeviceMemoryGb) return true;
  if (env.hardwareConcurrency !== undefined && env.hardwareConcurrency <= limits.maxHardwareConcurrency) return true;
  return env.saveData;
}

export function decorGate(env: DecorEnvironment): boolean {
  return env.webgl2 && !env.reducedMotion && !env.motionOff && !isLowPower(env);
}

function probeWebGL2(): boolean {
  const gl = document.createElement("canvas").getContext("webgl2");
  gl?.getExtension("WEBGL_lose_context")?.loseContext();
  return gl !== null;
}

/**
 * Browser-only: reads the device/motion signals and probes WebGL2. Pass a
 * cached `webgl2` to skip the probe (useDecorGate probes once per mount).
 */
export function readDecorEnvironment(webgl2: boolean = probeWebGL2()): DecorEnvironment {
  const nav = navigator as Navigator & NavigatorWithDeviceMemory & NavigatorWithConnection;

  return {
    webgl2,
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
    motionOff: document.documentElement.dataset.motion === "off",
    deviceMemory: nav.deviceMemory,
    hardwareConcurrency: nav.hardwareConcurrency,
    saveData: nav.connection?.saveData ?? false,
  };
}
