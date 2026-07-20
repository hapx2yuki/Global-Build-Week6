# CriteriaForge

## One-sentence summary

CriteriaForge helps non-technical product owners turn messy source material into a human-ratified, executable Product Constitution, then checks and repairs Codex-built work without letting AI silently rewrite the intent.

## Inspiration

Codex can build much faster than many product owners can specify or inspect. The dangerous gap is not simply “bad code.” It is the moment when a founder’s explicit promise, exclusion, or unresolved decision becomes indistinguishable from a plausible AI assumption. Re-running an evaluator does not solve that problem if the rules and scores also move.

We wanted a different authority model: the human writes and ratifies the constitution; GPT‑5.6 may propose and apply it at scale, but it cannot silently redefine it.

## What it does

1. CriteriaForge keeps original documents, spreadsheets, images, video metadata, and Git evidence on the user’s Mac, preserving source language, authority, location, and hashes.
2. GPT‑5.6 proposes an eight-section Product Constitution and returns material questions or source conflicts to the human.
3. Five deterministic safeguards must pass before CriteriaForge creates an immutable version.
4. A fixed artifact is evaluated three times against that exact version. The result is shown as Intent, Observed, Evidence, and Gap—not one compensating score.
5. A failed gap can become a bounded Codex repair in a disposable Git worktree. The Constitution hash, exact changed files, approved test commands, patch, and original HEAD are checked before a human may apply it.

The sign-in-free public experience replays three recorded `gpt-5.6-sol` runs on fictional FounderBrief data. It clearly labels the replay and exposes model, Codex version, hashes, run count, citation verification, and source commit.

## How we built it

The interface is Next.js, React, TypeScript, Tailwind CSS, and shadcn/ui. The local edition binds only to a random `127.0.0.1` port and uses a one-time fragment exchange, an HttpOnly SameSite cookie, CSRF proof, origin checks, and CSP.

Private state is stored in SQLite and content-addressed files under macOS Application Support. AI contracts use JSON Schema 2020-12 with undeclared properties rejected. CriteriaForge calls the official Codex CLI through `codex exec`, reuses the existing ChatGPT OAuth login, and never reads the Codex authentication file.

Every AI citation is checked locally against the approved source ID, segment ID, typed locator, and SHA‑256. Invalid citations are dropped; if evidence then falls below the rule’s minimum, the decision becomes undetermined.

The public Vercel build physically omits local API routes and checks the output for SQLite, child-process, and local-session markers.

## How Codex accelerated the work

Codex translated a long product-design dialogue into strict contracts, deterministic evaluation rules, private storage, many evidence parsers, a bounded Git repair mechanism, a seven-stage responsive interface, and executable tests. It also helped trace real failures: a panel-sizing error, a command-dialog composition error, mobile accessible-name gaps, structured-output optional-field incompatibility, and two different sources of evaluation instability.

The human retained the consequential product decisions: absolute rather than relative evaluation, five compile safeguards, source-language authority, per-run disclosure approval, private/shared separation, no user API keys, and the rule that disagreement must stop rather than disappear behind a majority vote.

## How GPT‑5.6 is used

GPT‑5.6 performs the semantic work that deterministic code should not pretend to do: proposing testable criteria from heterogeneous human evidence, identifying material questions and conflicts, and applying an immutable Constitution to observed artifacts.

The FounderBrief record uses `gpt-5.6-sol` three times with one input hash and one schema hash. All three runs reached the same conclusions: two must-pass failures, one insufficient quality criterion, and one good quality criterion. The output hashes differ, so we do not claim deterministic text. We claim that CriteriaForge detects whether the material decision and evidence converge.

## Challenges

The hardest challenge was defining “stable” without pretending an LLM is deterministic. One run initially treated already verified excerpts as unavailable. A later run expressed a quality-only rule as a must-pass result. We clarified the evidence boundary and made quality-only must-pass state deterministic, while preserving genuine disagreement as a blocker.

Another challenge was making a browser-shaped local app safe. We separated public and local builds, made private storage external to the repository, used explicit send confirmation, and constrained repairs to worktrees plus post-run diff verification.

## Accomplishments

- Three real `gpt-5.6-sol` evaluations with the same input and settings converged on the same FounderBrief findings.
- The current automated suite contains 57 unit/integration checks plus four desktop/mobile browser executions.
- Browser checks cover the seven-stage path, keyboard navigation, English/Japanese switching, zero console errors, and zero critical/serious `axe` violations.
- The current dependency audit reports zero vulnerabilities.
- The public build contains no local API routes or forbidden local-runtime markers.

## What we learned

Consistency is not “ask the model three times and vote.” A useful product must define what is allowed to vary, what must agree, and what evidence makes the result adoptable. We also learned that the most important AI safety boundary can be a product-design boundary: Codex may change the artifact, but only a human may change the constitution.

## What’s next

Before claiming the local edition as release-complete, we will connect every advanced local API state to all seven screens, finish browser-side video-frame extraction and approved Web observation capture, run the README on a clean macOS machine, complete human VoiceOver and Safari checks, and record the post-repair GPT‑5.6 result.

## Try it

Use the public FounderBrief replay without signing in, or run the macOS edition with Node.js 20, Git, and an authenticated Codex CLI:

```bash
cd apps/web
npm ci
npm run local
```

The public replay uses fictional data and is not a live GPT‑5.6 endpoint.
