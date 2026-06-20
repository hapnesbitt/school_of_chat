# Mission

## What this is

Claude University (this stack) is a moderated, source-grounded learning space.
Every lesson is anchored to a real source — a news article, a document, a body
of text the student can read. Answers are graded against that source, not
against general knowledge.

## Why

The unmoderated social platforms have collapsed into low-signal noise:
fragmentary takes, epistemic free-for-all, hostile dynamics that don't teach.
The result is a generation of readers who can scroll but can't sustain
attention long enough to learn something true.

This stack is the explicit antidote. Safe by default, moderated by design,
grounded by mechanism.

## The guiding filter

The single test for anything added here:

> *Does this help someone learn something true from a real source?*

If the answer is no, it doesn't belong — no matter how interesting or
technically clever. If the answer is yes, the design question is just
"what's the simplest way to wire it up to a real source."

## How the technical design enforces this

- **Source-grounded generation.** Questions are generated against a specific
  article's text. The text is the source of truth, not the model's training
  data.
- **Graded against the source.** Submitted answers are evaluated by the model
  with the article re-supplied as context. An answer that's correct by general
  knowledge but not supported by the source does not earn full credit.
  "General knowledge won't be enough" is the structural property.
- **Open-response, not multiple-choice.** Distractor-style MC invites
  fabrication. Open answers force the student to actually read.
- **Reuse over invention.** New modules layer on the existing generation +
  grading + caching pattern. Different sources, same engine.

## What "mission-aligned" looks like in practice

A new course or mode belongs here when:

- It teaches something true from a verifiable source.
- The student is engaging with that source directly, not paraphrasing it.
- The grading is mechanically grounded — the source is in the grader's context.

Out of scope:

- Anything where success requires no source.
- Anything that rewards general-knowledge recall over reading comprehension.
- Features that drift toward social mechanics (likes, virality, engagement
  metrics) — those belong to the platforms we're countering.

This file versions the *why* alongside the code. New features should build
toward it.
