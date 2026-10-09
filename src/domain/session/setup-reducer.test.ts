import { describe, expect, it } from "vitest";
import { baseSetup } from "./setup-fixture";
import type { SetupEvent } from "./setup-reducer";
import { setupReducer } from "./setup-reducer";

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

describe("setupReducer", () => {
  it("set_level sets the level and leaves everything else untouched", () => {
    const { setup, notice } = setupReducer(baseSetup, { type: "set_level", level: "perform" });
    expect(setup).toEqual({ ...baseSetup, level: "perform" });
    expect(notice).toBeUndefined();
  });

  it("set_perform_timing sets the timing choice", () => {
    const { setup } = setupReducer(baseSetup, { type: "set_perform_timing", performTiming: "timed" });
    expect(setup.performTiming).toBe("timed");
  });

  it("toggle_medium enables a disabled Medium", () => {
    const { setup, notice } = setupReducer(baseSetup, { type: "toggle_medium", mediumId: "med.photography" });
    expect(setup.enabledMediums).toEqual(["med.writing", "med.drawing", "med.photography"]);
    expect(notice).toBeUndefined();
  });

  it("toggle_medium with a single enabled Medium, enabling another leaves both enabled with no notice", () => {
    const onlyOne = { ...baseSetup, enabledMediums: ["med.writing"] };
    const { setup, notice } = setupReducer(onlyOne, { type: "toggle_medium", mediumId: "med.drawing" });
    expect(setup.enabledMediums).toEqual(["med.writing", "med.drawing"]);
    expect(notice).toBeUndefined();
  });

  it("toggle_medium disables an enabled Medium when another stays on", () => {
    const { setup, notice } = setupReducer(baseSetup, { type: "toggle_medium", mediumId: "med.drawing" });
    expect(setup.enabledMediums).toEqual(["med.writing"]);
    expect(notice).toBeUndefined();
  });

  it("toggle_medium on the last enabled Medium is a no-op with a last_medium notice", () => {
    const onlyOne = { ...baseSetup, enabledMediums: ["med.writing"] };
    const { setup, notice } = setupReducer(onlyOne, { type: "toggle_medium", mediumId: "med.writing" });
    expect(setup).toBe(onlyOne);
    expect(notice).toBe("last_medium");
  });

  it("toggle_medium guards against emptying even if enabledMediums holds a duplicate (defense in depth)", () => {
    const duplicated = { ...baseSetup, enabledMediums: ["med.writing", "med.writing"] };
    const { setup, notice } = setupReducer(duplicated, { type: "toggle_medium", mediumId: "med.writing" });
    expect(setup).toBe(duplicated);
    expect(notice).toBe("last_medium");
  });

  it('toggle_medium falls "This time" back to random when that Medium is disabled', () => {
    const pickedDrawing = { ...baseSetup, medium: "med.drawing" as const };
    const { setup, notice } = setupReducer(pickedDrawing, { type: "toggle_medium", mediumId: "med.drawing" });
    expect(setup.medium).toBe("random");
    expect(setup.enabledMediums).toEqual(["med.writing"]);
    expect(notice).toBeUndefined();
  });

  it('toggle_medium leaves "This time" alone when a different Medium is disabled', () => {
    const pickedWriting = { ...baseSetup, medium: "med.writing" as const };
    const { setup } = setupReducer(pickedWriting, { type: "toggle_medium", mediumId: "med.drawing" });
    expect(setup.medium).toBe("med.writing");
  });

  it("choose_medium sets the This-time pick without touching enabledMediums", () => {
    const { setup } = setupReducer(baseSetup, { type: "choose_medium", medium: "med.drawing" });
    expect(setup.medium).toBe("med.drawing");
    expect(setup.enabledMediums).toEqual(baseSetup.enabledMediums);
  });

  it("choose_medium accepts random", () => {
    const picked = { ...baseSetup, medium: "med.drawing" as const };
    const { setup } = setupReducer(picked, { type: "choose_medium", medium: "random" });
    expect(setup.medium).toBe("random");
  });

  it("choose_medium is a no-op when the Medium is not enabled (FR-2 impossible state)", () => {
    const { setup, notice } = setupReducer(baseSetup, { type: "choose_medium", medium: "med.photography" });
    expect(setup).toBe(baseSetup);
    expect(setup.medium).toBe(baseSetup.medium);
    expect(notice).toBeUndefined();
  });

  it("set_skill_focus sets a specific Skill or random", () => {
    expect(setupReducer(baseSetup, { type: "set_skill_focus", skillFocus: "skl.observation" }).setup.skillFocus).toBe(
      "skl.observation",
    );
    expect(setupReducer(baseSetup, { type: "set_skill_focus", skillFocus: "random" }).setup.skillFocus).toBe(
      "random",
    );
  });

  it("set_quick_reveal sets the preference true and back to false", () => {
    const on = setupReducer(baseSetup, { type: "set_quick_reveal", quickReveal: true });
    expect(on.setup.quickReveal).toBe(true);
    const off = setupReducer(on.setup, { type: "set_quick_reveal", quickReveal: false });
    expect(off.setup.quickReveal).toBe(false);
  });

  it("set_sound sets the preference true and back to false", () => {
    const on = setupReducer(baseSetup, { type: "set_sound", sound: true });
    expect(on.setup.sound).toBe(true);
    const off = setupReducer(on.setup, { type: "set_sound", sound: false });
    expect(off.setup.sound).toBe(false);
  });

  it("set_ambient_motion sets the Motion toggle true and back to false (Cross-Document Resolution 5, Story 8.3)", () => {
    const off = setupReducer(baseSetup, { type: "set_ambient_motion", ambientMotion: false });
    expect(off.setup.ambientMotion).toBe(false);
    const on = setupReducer(off.setup, { type: "set_ambient_motion", ambientMotion: true });
    expect(on.setup.ambientMotion).toBe(true);
  });

  it("an unknown runtime event is a no-op and never returns undefined", () => {
    const bogus = { type: "not_a_real_event" } as unknown as SetupEvent;
    const result = setupReducer(baseSetup, bogus);
    expect(result).toEqual({ setup: baseSetup });
  });

  const everyEvent: SetupEvent[] = [
    { type: "set_level", level: "perform" },
    { type: "set_perform_timing", performTiming: "timed" },
    { type: "toggle_medium", mediumId: "med.photography" },
    { type: "toggle_medium", mediumId: "med.writing" },
    { type: "choose_medium", medium: "med.drawing" },
    { type: "choose_medium", medium: "random" },
    { type: "set_skill_focus", skillFocus: "skl.observation" },
    { type: "set_quick_reveal", quickReveal: true },
    { type: "set_sound", sound: true },
    { type: "set_ambient_motion", ambientMotion: false },
  ];

  it.each(everyEvent.map((event) => [event.type, event] as const))(
    "is pure for %s: a deep-frozen input never throws and is never mutated",
    (_label, event) => {
      const frozenInput = deepFreeze(structuredClone(baseSetup));
      expect(() => setupReducer(frozenInput, event)).not.toThrow();
      expect(frozenInput).toEqual(baseSetup);
    },
  );
});
