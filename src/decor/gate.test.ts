import { describe, expect, it } from "vitest";
import { decorGate, isLowPower, type DecorEnvironment } from "./gate";

const base: DecorEnvironment = {
  webgl2: true,
  reducedMotion: false,
  motionOff: false,
  deviceMemory: 8,
  hardwareConcurrency: 8,
  saveData: false,
};

describe("decorGate", () => {
  it("passes when everything is good", () => {
    expect(decorGate(base)).toBe(true);
  });

  it("fails with no WebGL2", () => {
    expect(decorGate({ ...base, webgl2: false })).toBe(false);
  });

  it("fails with reduced motion", () => {
    expect(decorGate({ ...base, reducedMotion: true })).toBe(false);
  });

  it("fails when motion is off", () => {
    expect(decorGate({ ...base, motionOff: true })).toBe(false);
  });

  it("fails at deviceMemory 4", () => {
    expect(decorGate({ ...base, deviceMemory: 4 })).toBe(false);
  });

  it("fails at hardwareConcurrency 4", () => {
    expect(decorGate({ ...base, hardwareConcurrency: 4 })).toBe(false);
  });

  it("fails with saveData alone", () => {
    expect(decorGate({ ...base, saveData: true })).toBe(false);
  });

  it("passes at deviceMemory 8", () => {
    expect(decorGate({ ...base, deviceMemory: 8 })).toBe(true);
  });

  it("passes at hardwareConcurrency 8", () => {
    expect(decorGate({ ...base, hardwareConcurrency: 8 })).toBe(true);
  });

  it("does not treat an undefined deviceMemory/hardwareConcurrency as low-power", () => {
    expect(decorGate({ ...base, deviceMemory: undefined, hardwareConcurrency: undefined })).toBe(true);
  });
});

describe("isLowPower", () => {
  const limits = { maxDeviceMemoryGb: 4, maxHardwareConcurrency: 4 };

  it("is inclusive at the boundary 4", () => {
    expect(isLowPower({ deviceMemory: 4, hardwareConcurrency: undefined, saveData: false }, limits)).toBe(true);
    expect(isLowPower({ deviceMemory: undefined, hardwareConcurrency: 4, saveData: false }, limits)).toBe(true);
  });

  it("is false at 5", () => {
    expect(isLowPower({ deviceMemory: 5, hardwareConcurrency: 5, saveData: false }, limits)).toBe(false);
  });

  it("undefined fields never count as low-power", () => {
    expect(isLowPower({ deviceMemory: undefined, hardwareConcurrency: undefined, saveData: false }, limits)).toBe(
      false,
    );
  });

  it("saveData alone is low-power", () => {
    expect(isLowPower({ deviceMemory: undefined, hardwareConcurrency: undefined, saveData: true }, limits)).toBe(
      true,
    );
  });
});
