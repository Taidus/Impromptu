import { describe, expect, it } from "vitest";
import type { Setup } from "./schema";
import { setupReducer } from "./setup-reducer";

const base: Setup = {
  level: "explore",
  performTiming: "either",
  enabledMediums: ["med.writing", "med.drawing"],
  medium: "random",
  skillFocus: "random",
  quickReveal: false,
  sound: false,
  ambientMotion: true,
};

describe("setupReducer", () => {
  it("set_level sets the level and leaves everything else untouched", () => {
    const { setup, notice } = setupReducer(base, { type: "set_level", level: "perform" });
    expect(setup).toEqual({ ...base, level: "perform" });
    expect(notice).toBeUndefined();
  });

  it("set_perform_timing sets the timing choice", () => {
    const { setup } = setupReducer(base, { type: "set_perform_timing", performTiming: "timed" });
    expect(setup.performTiming).toBe("timed");
  });

  it("toggle_medium enables a disabled Medium", () => {
    const { setup, notice } = setupReducer(base, { type: "toggle_medium", mediumId: "med.photography" });
    expect(setup.enabledMediums).toEqual(["med.writing", "med.drawing", "med.photography"]);
    expect(notice).toBeUndefined();
  });

  it("toggle_medium disables an enabled Medium when another stays on", () => {
    const { setup, notice } = setupReducer(base, { type: "toggle_medium", mediumId: "med.drawing" });
    expect(setup.enabledMediums).toEqual(["med.writing"]);
    expect(notice).toBeUndefined();
  });

  it("toggle_medium on the last enabled Medium is a no-op with a last_medium notice", () => {
    const onlyOne: Setup = { ...base, enabledMediums: ["med.writing"] };
    const { setup, notice } = setupReducer(onlyOne, { type: "toggle_medium", mediumId: "med.writing" });
    expect(setup).toBe(onlyOne);
    expect(notice).toBe("last_medium");
  });

  it('toggle_medium falls "This time" back to random when that Medium is disabled', () => {
    const pickedDrawing: Setup = { ...base, medium: "med.drawing" };
    const { setup, notice } = setupReducer(pickedDrawing, { type: "toggle_medium", mediumId: "med.drawing" });
    expect(setup.medium).toBe("random");
    expect(setup.enabledMediums).toEqual(["med.writing"]);
    expect(notice).toBeUndefined();
  });

  it('toggle_medium leaves "This time" alone when a different Medium is disabled', () => {
    const pickedWriting: Setup = { ...base, medium: "med.writing" };
    const { setup } = setupReducer(pickedWriting, { type: "toggle_medium", mediumId: "med.drawing" });
    expect(setup.medium).toBe("med.writing");
  });

  it("choose_medium sets the This-time pick without touching enabledMediums", () => {
    const { setup } = setupReducer(base, { type: "choose_medium", medium: "med.drawing" });
    expect(setup.medium).toBe("med.drawing");
    expect(setup.enabledMediums).toEqual(base.enabledMediums);
  });

  it("choose_medium accepts random", () => {
    const { setup } = setupReducer({ ...base, medium: "med.drawing" }, { type: "choose_medium", medium: "random" });
    expect(setup.medium).toBe("random");
  });

  it("set_skill_focus sets a specific Skill or random", () => {
    expect(setupReducer(base, { type: "set_skill_focus", skillFocus: "skl.observation" }).setup.skillFocus).toBe(
      "skl.observation",
    );
    expect(setupReducer(base, { type: "set_skill_focus", skillFocus: "random" }).setup.skillFocus).toBe("random");
  });

  it("set_quick_reveal sets the preference", () => {
    expect(setupReducer(base, { type: "set_quick_reveal", quickReveal: true }).setup.quickReveal).toBe(true);
  });

  it("set_sound sets the preference", () => {
    expect(setupReducer(base, { type: "set_sound", sound: true }).setup.sound).toBe(true);
  });

  it("is pure: calling it does not throw or need any global the domain core is banned from touching", () => {
    expect(() => setupReducer(base, { type: "set_level", level: "develop" })).not.toThrow();
  });
});
