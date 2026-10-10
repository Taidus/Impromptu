import { createElement, Fragment, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { config } from "@/config/app";
import { copy } from "@/components/copy";
import { formatCountdown } from "@/domain/timer/timer";
import { announceFor, CountdownAnnouncer } from "./CountdownAnnouncer";
import { Countdown } from "./Countdown";
import { NextSteps } from "./NextSteps";
import { ReflectionPanel } from "./ReflectionPanel";
import { RepDoneStamp } from "./RepDoneStamp";
import { VariationPicker } from "./VariationPicker";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const render = (Component: ComponentType<any>, props: object) => renderToStaticMarkup(createElement(Component, props));
// Copy as it appears in markup (React escapes apostrophes to &#x27;).
const escaped = (text: string) => renderToStaticMarkup(createElement(Fragment, null, text));

describe("Countdown", () => {
  it("shows role=timer, aria-live=off, the formatted digits, and the time-limit caption while running", () => {
    const html = render(Countdown, { remainingSec: 125, timeLimitSec: 300, paused: false, timeUp: false });
    expect(html).toContain('role="timer"');
    expect(html).toContain('aria-live="off"');
    expect(html).toContain(formatCountdown(125));
    expect(html).toContain(copy.stage.countdown.caption(5)); // from the fixed limit, not the remaining time
    expect(html).not.toContain(copy.stage.countdown.caption(3));
  });

  it("puts the stage-meta caption above the digits", () => {
    const html = render(Countdown, { remainingSec: 125, timeLimitSec: 300, paused: false, timeUp: false });
    expect(html).toContain("text-stage-meta");
    expect(html.indexOf(copy.stage.countdown.caption(5))).toBeLessThan(html.indexOf(formatCountdown(125)));
  });

  it("shows the PAUSED caption instead while paused", () => {
    const html = render(Countdown, { remainingSec: 125, timeLimitSec: 300, paused: true, timeUp: false });
    expect(html).toContain(copy.stage.countdown.pausedCaption);
    expect(html).not.toContain(copy.stage.countdown.caption(5));
  });

  it("at zero (timeUp) shows the time's-up message instead of digits, with no failure language", () => {
    const html = render(Countdown, { remainingSec: 0, timeLimitSec: 300, paused: false, timeUp: true });
    expect(html).toContain(escaped(copy.stage.countdown.timesUpTitle));
    expect(html).toContain(escaped(copy.stage.countdown.timesUpBody));
    expect(html).not.toContain(formatCountdown(0));
  });
});

describe("announceFor (CountdownAnnouncer's pure selector)", () => {
  it("announces time's up, taking priority over everything else", () => {
    expect(announceFor({ remainingSec: 0, paused: true, timeUp: true })).toBe(copy.stage.countdown.timeUpAnnounced);
  });

  it("announces paused", () => {
    expect(announceFor({ remainingSec: 90, paused: true, timeUp: false })).toBe(copy.stage.countdown.pausedAnnounced);
  });

  it("announces the 1:00 mark", () => {
    expect(announceFor({ remainingSec: 60, paused: false, timeUp: false })).toBe(copy.stage.countdown.oneMinuteLeftAnnounced);
  });

  it("announces every other minute mark", () => {
    expect(announceFor({ remainingSec: 180, paused: false, timeUp: false })).toBe(copy.stage.countdown.minutesLeftAnnounced(3));
  });

  it("is silent off the marks", () => {
    expect(announceFor({ remainingSec: 95, paused: false, timeUp: false })).toBeNull();
  });
});

describe("CountdownAnnouncer", () => {
  it("is a visually hidden aria-live=polite region", () => {
    const html = render(CountdownAnnouncer, { remainingSec: 95, paused: false, timeUp: false });
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("sr-only");
  });

  it("mounts holding the current instant's phrase when it's announce-worthy", () => {
    const html = render(CountdownAnnouncer, { remainingSec: 60, paused: false, timeUp: false });
    expect(html).toContain(copy.stage.countdown.oneMinuteLeftAnnounced);
  });
});

describe("RepDoneStamp", () => {
  it("is decorative (aria-hidden, data-decor) and shows the stamp text", () => {
    const html = render(RepDoneStamp, {});
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("data-decor");
    expect(html).toContain(copy.stage.repDoneStamp);
  });

  it("tilts the frame 6deg and counter-rotates the lettering level", () => {
    const html = render(RepDoneStamp, {});
    expect(html).toMatch(/data-decor[^>]*style="transform:rotate\(6deg\)"/);
    expect(html).toMatch(/<p style="transform:rotate\(-6deg\)"/);
  });
});

describe("ReflectionPanel", () => {
  const draft = { worked: "", change: "" };

  it("renders both labelled, capped textareas and the Save rep button", () => {
    const html = render(ReflectionPanel, { draft, onChange: () => {}, onSave: () => {} });
    expect(html).toContain(copy.reflection.workedLabel);
    expect(html).toContain(copy.reflection.changeLabel);
    expect(html).toMatch(/<label[^>]*class="text-label/);
    expect(html).toContain(`maxLength="${config.reflection.maxChars}"`);
    expect(html).toContain(copy.button.saveRep);
  });

  it("hides the live counter while far from the cap", () => {
    const html = render(ReflectionPanel, { draft: { worked: "short", change: "" }, onChange: () => {}, onSave: () => {} });
    expect(html).not.toContain("left</p>");
  });

  it("shows '40 left' at 240 characters and nothing at 239", () => {
    const at = (n: number) => render(ReflectionPanel, { draft: { worked: "x".repeat(n), change: "" }, onChange: () => {}, onSave: () => {} });
    expect(at(240)).toContain(copy.reflection.charsLeft(40));
    expect(at(239)).not.toContain(copy.reflection.charsLeft(41));
  });

  it("wires each textarea to its polite live counter", () => {
    const html = render(ReflectionPanel, { draft, onChange: () => {}, onSave: () => {} });
    expect(html).toContain('aria-describedby="reflection-worked-counter"');
    expect(html).toContain('id="reflection-worked-counter" aria-live="polite"');
    expect(html).toContain('aria-describedby="reflection-change-counter"');
  });

  it("clamps the counter at 0 for an over-cap draft", () => {
    const long = "x".repeat(config.reflection.maxChars + 5);
    const html = render(ReflectionPanel, { draft: { worked: long, change: "" }, onChange: () => {}, onSave: () => {} });
    expect(html).toContain(copy.reflection.charsLeft(0));
  });

  it("shows '{n} left' once within the counter window of the cap", () => {
    const long = "x".repeat(config.reflection.maxChars - 10);
    const html = render(ReflectionPanel, { draft: { worked: long, change: "" }, onChange: () => {}, onSave: () => {} });
    expect(html).toContain(copy.reflection.charsLeft(10));
  });

  it("disables Save rep while saving", () => {
    const html = render(ReflectionPanel, { draft, onChange: () => {}, onSave: () => {}, saving: true });
    expect(html).toContain("disabled=\"\"");
  });
});

describe("NextSteps", () => {
  const base = { onVariation: () => {}, onRetry: () => {}, onNew: () => {} };

  it("always shows the three next-step actions", () => {
    const html = render(NextSteps, { ...base, firstSave: false, storageAvailable: true });
    expect(html).toContain(copy.button.tryAnotherVersion);
    expect(html).toContain(copy.button.retry);
    expect(html).toContain(copy.button.getAChallenge);
    expect(html).not.toContain(copy.state.progressSavedInBrowserOnly);
    expect(html).not.toContain(copy.state.repNotKept);
  });

  it("shows the browser-only storage note with a link to Practice on the first save", () => {
    const html = render(NextSteps, { ...base, firstSave: true, storageAvailable: true });
    expect(html).toContain(copy.state.progressSavedInBrowserOnly);
    expect(html).toContain('href="/practice"');
  });

  it("shows the storage-unavailable variant instead when storage isn't available", () => {
    const html = render(NextSteps, { ...base, firstSave: true, storageAvailable: false });
    expect(html).toContain(escaped(copy.state.repNotKept));
    expect(html).not.toContain(copy.state.progressSavedInBrowserOnly);
  });
});

describe("VariationPicker", () => {
  const options = [
    { kind: "topic" as const, label: copy.stage.piece.topic },
    { kind: "style" as const, label: copy.stage.piece.style },
  ];

  it("renders the prompt, a radio group, and a Change option per changeable piece", () => {
    const html = render(VariationPicker, { options, value: null, onChange: () => {}, onConfirm: () => {} });
    expect(html).toContain(copy.stage.variation.prompt);
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain(copy.stage.variation.changeLabel(copy.stage.piece.topic));
    expect(html).toContain(copy.stage.variation.changeLabel(copy.stage.piece.style));
    expect(html).toContain(copy.button.changeIt);
  });

  it("keeps Change it enabled with nothing picked (pressing it shows the nothing-chosen message)", () => {
    const html = render(VariationPicker, { options, value: null, onChange: () => {}, onConfirm: () => {} });
    expect(html).not.toContain('disabled=""');
    expect(html).not.toContain('role="alert"');
  });

  it("labels the radio group by the prompt", () => {
    const html = render(VariationPicker, { options, value: null, onChange: () => {}, onConfirm: () => {} });
    expect(html).toContain(`id="variation-prompt"`);
    expect(html).toContain('role="radiogroup" aria-labelledby="variation-prompt"');
  });

  it("shows the nothing-chosen message in its own alert, keeping the prompt", () => {
    const html = render(VariationPicker, { options, value: null, onChange: () => {}, onConfirm: () => {}, error: "nothing_chosen" });
    expect(html).toContain(`<p role="alert" class="text-body text-plum">${copy.stage.variation.nothingChosen}</p>`);
    expect(html).toContain(copy.stage.variation.prompt);
  });

  it("with no options shows the no-alternative alert and disables Change it", () => {
    const html = render(VariationPicker, { options: [], value: null, onChange: () => {}, onConfirm: () => {} });
    expect(html).toContain('role="alert"');
    expect(html).toContain(escaped(copy.stage.variation.noAlternative));
    expect(html).toContain('disabled=""');
  });

  it("disables Change it for a value the picker doesn't offer", () => {
    const html = render(VariationPicker, { options, value: "medium", onChange: () => {}, onConfirm: () => {} });
    expect(html).toContain('disabled=""');
  });

  it("checks the selected option and enables Change it", () => {
    const html = render(VariationPicker, { options, value: "style", onChange: () => {}, onConfirm: () => {} });
    expect(html).toContain('checked="" value="style"');
    expect(html).not.toContain('disabled=""');
  });

  it("shows the no-alternative message when error is set, and keeps the picker open", () => {
    const html = render(VariationPicker, { options, value: "topic", onChange: () => {}, onConfirm: () => {}, error: "no_alternative" });
    expect(html).toContain(escaped(copy.stage.variation.noAlternative));
    expect(html).toContain('role="alert"');
    expect(html).toContain(copy.stage.variation.prompt);
    expect(html).toContain('role="radiogroup"');
  });
});
