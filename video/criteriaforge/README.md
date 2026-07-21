# CriteriaForge Remotion film

This folder contains the versioned Remotion source for the OpenAI Build Week demo film.

The film uses only captured CriteriaForge screens, the creator-approved final English narration, and locally generated captions. It does not claim a live model call where the public product replays recorded results. The creator approved the current narration for the submission on July 21, 2026.

## Render

```bash
cd video/criteriaforge
npm install
npm run check
npm run render
```

`npm run assets` copies the reviewed local captures from `output/criteriaforge-demo/` into the ignored `public/` folder. The rendered H.264 file is written to:

```text
output/criteriaforge-demo/criteriaforge-remotion.mp4
```

Use `npm run studio` for a frame-accurate preview and `npm run render:still` for the poster frame.

`npm run render:thumbnail` writes the deterministic 1280×720 YouTube thumbnail to `output/criteriaforge-demo/criteriaforge-youtube-thumbnail.jpg`. The thumbnail uses the same product screen, palette, editorial type, and human-authority visual grammar as the film.

The captured screens, narration master, and rendered output intentionally stay in the ignored local `output/` area. A clean clone therefore needs those reviewed local inputs before it can render the film; the repository does not present the film as self-contained from source alone.

Remotion 4.0.495 uses its own license rather than the repository's MIT License. `npm run license:check` verifies the reviewed version and the installed individual Free License wording. Reassess eligibility if the submitter type or Remotion version changes.

## Visual grammar

- Paper and editorial typography represent human-authored intent.
- Blue identifies GPT‑5.6 proposals and verified citations.
- Green identifies human ratification and completed deterministic checks.
- Ember identifies consequential decisions and immutable boundaries.
- Dark, dashed worktree frames separate Codex repair authority from the Constitution.
- Three parallel run rails show agreement; a blocked state remains visible when runs disagree.

All animation is driven by Remotion frames rather than CSS transitions, so preview and render remain deterministic.
