---
title: "Product Brief: Impromptu"
status: draft
created: 2026-10-08
updated: 2026-10-08
---

# Product Brief: Impromptu

## Executive Summary

Impromptu is a website that gives creatives a randomized challenge worth making and worth filming. Each challenge combines a skill to practice, a topic, a medium, a style, and a constraint. Together they form one clear brief with a clear deliverable. A staged reveal shows it, designed to look good on a phone camera. The user makes the work in their own tools, marks the rep complete, reflects briefly, and can try a variation.

Spin-the-wheel art challenges are already an established video format. Creators run them on generic spinners that produce random word mashups, with no creative purpose and no visual identity. Practice apps offer more substance, but they cover one medium, depend on streaks, and aren't built to be filmed. Impromptu closes that gap. Every challenge exercises a specific skill, the reveal is the show, and progress comes from reps and reflection, not streak pressure.

Version 1 is a polished web experience with no account required. Progress is stored in the browser, and challenges come from a generated, tagged library rather than an AI service.

## The Problem

Creatives who share their process online already film themselves taking random challenges: "letting the wheel decide what I draw" is an established TikTok format. The tools they use weren't built for it. Generic spinners combine random words that have no creative purpose, and the reveal looks like a utility widget, not part of the show. Apps built for practice have the opposite problem. They cover one medium, run on streaks and reminders, and aren't designed to be seen on camera.

The result: a creative who wants a challenge worth making *and* worth filming has to assemble both halves themselves.

## The Solution

**The loop:** choose a focus → reveal a challenge → create (in your own tools) → finish the rep → reflect → try another version.

- **Challenges with a purpose.** Each challenge emphasizes one of six skills: observation, idea generation, connection, perspective, expression, or revision. It always ends in a deliverable you can act on, such as "Take two photos of coming home. Make one feel comforting and the other lonely. Keep people out of both." A compatibility-aware generator prevents contradictions, avoids recent repeats, and supports locking some inputs while rerolling the rest. It can also retry the exact same challenge.
- **The reveal as spectacle.** Inputs arrive one at a time as collage pieces: the topic on torn paper, the style as a glossy sticker, the constraint stamped onto a card. The user advances each step at their own pace. A quick reveal serves everyday practice. The complete challenge then holds still, so it reads clearly on camera.
- **A Challenge Stage built for filming.** The Reveal and the challenge get their own clean page. Text is large and centered, survives a vertical crop, and carries a small brand mark. Mute and back are always visible. Motion stops once the challenge is held.
- **Levels as a practice arc.** The four levels are Explore, Experiment, Develop, and Perform. Each one raises the creative decisions required, not just the topic, and timed challenges appear at Perform. **All levels are open from the start.** Rep counts are a record and a suggestion, never a gate.
- **History without guilt.** Saved reps include the challenge, skill, date, optional reflection ("What worked?" / "What would you change?"), and links between variations. There are no streaks and no penalties for rerolling or abandoning a challenge. Export is available.

**Visual identity:** bright Y2K graphics (electric purple, saturated yellow-orange, chrome, starbursts, orbital lines) layered with tactile editorial collage (cutout photography, paper textures, layered objects). Decoration lives around the edges. Instructions stay horizontal, high-contrast, and unobstructed.

## What Makes This Different

- **Purpose plus spectacle in one place.** Generic spinners offer spectacle with no substance. Practice apps offer substance with no spectacle. No product we found owns the filmed-challenge format.
- **Built for every medium, on the web.** The closest structural comparable, Scritch, is iPad-only and drawing-only. Impromptu covers writing, drawing, photography, and spoken storytelling with no install or account.
- **Generated, not hand-written, but validated.** The library is generated ahead of time and checked by an automated validator. Every challenge has a skill purpose and a deliverable. No AI runs live in the product.
- **Honest moat:** none in technology. The advantage is taste: the quality of the challenge library and the craft of the reveal. Both can be copied, so speed and distinct identity matter.

## Who This Serves

**Primary: creatives who film their process.** Illustrators, writers, photographers, and storytellers posting to TikTok, Reels, and Shorts, typically with small-to-mid audiences. They need a repeatable content format that looks good on camera, challenges that produce interesting work, and a series arc they can return to ("Level 4: timed"). Success for them is a challenge their viewers understand within seconds and an attempt worth posting.

**Secondary: private practicers.** People who want regular creative reps without filming. They are served by quick reveal, history, and reflection. They are often a filmed video's audience before they become users.

## Success Criteria

Version 1 has no analytics by design. Practice data stays in the browser. The only data collected is an optional email signup through Resend. Early signals come from testing, observation, and the signup list. `[ASSUMPTION]` Stakes: passion project aimed at a public launch, with no revenue goal in v1.

- **Comprehension:** a first-time visitor reveals their first challenge within 60 seconds without explanation.
- **Readability on camera:** in a reduced-size or recorded view of the Challenge Stage, a viewer can say what the person was challenged to make within 3 seconds.
- **Deliverable clarity:** in a library audit, 100% of generated briefs name a concrete output and a completion condition.
- **Return:** testers come back for a second session and save at least one reflection.
- **Interest:** visitors opt in to email updates, which is the one durable channel for reaching users again.

## Scope

**In (v1):** challenge setup with medium enable/choose/randomize and an optional skill focus; compatible randomization with locks, rerolls, and exact retry; sequential and quick reveals; level-based exercise rules; timed Perform challenges, where the timer starts only on "Start creating"; a dedicated Challenge Stage page designed for filming; completion and optional reflection; local history with export; an optional email signup via Resend that never gates challenges; responsive, keyboard-accessible, reduced-motion-safe, and mute-able throughout.

**Out (deferred):** accounts and sync, product analytics, social feeds, leaderboards, automated artistic scoring, subscriptions, media upload and hosting, and AI-generated challenges.

## Key Assumptions and Open Questions

- `[ASSUMPTION]` **Progress means breadth and depth.** That is: skills practiced, mediums tried, variations made, and reflections written, shown as a practice map plus a level arc creators can film as a series. It never means quality.
- **The library is generated, not hand-written.** It is produced in batches during development and gated by automated validation. The content risk shifts from authoring effort to generation quality.
- `[ASSUMPTION]` "Impromptu" is the working name.
- **Assets:** the cutout photography must be legally usable (for example, public-domain or CC0 collections, or original shoots). The reference posters guide style only.
- **Reference images** have not been supplied yet. The visual direction above comes from written descriptions alone.
- **Email via Resend:** the Resend API key must stay on the server, so v1 needs one small serverless endpoint, a narrow exception to "no backend." `[ASSUMPTION]` The signup is offered after a finished rep and in the footer, with plain consent copy. It needs an unsubscribe path and a privacy note before launch.
- **Accepted blind spot:** with no analytics, how often people return and finish reps is known only through testing and email replies. This is a deliberate trade for privacy and simplicity.

## Vision

If creators adopt the reveal as their challenge format, Impromptu becomes the recognizable "brand" of the filmed creative challenge. Viewers could suggest topics for a creator's next challenge, creators could run themed challenge packs, and there could be optional sync so a practice history follows the user across devices. Throughout, it stays human-written, free of penalties, and focused on making things rather than scoring them.
