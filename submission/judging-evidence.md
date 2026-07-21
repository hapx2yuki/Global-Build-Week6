# Judging Evidence Map

## Gate criteria

| Gate | Evidence | Location |
| --- | --- | --- |
| Fits OpenAI Build Week | A working product for a concrete Codex-era productivity problem | `README.md`, public FounderBrief replay |
| Uses Codex | OAuth reuse, structured `codex exec`, bounded remediation, build record | `apps/web/src/lib/criteriaforge/codex-runner.ts`, `docs/build-log.md` |
| Uses GPT‑5.6 | Three real `gpt-5.6-sol` FounderBrief evaluations | `apps/web/src/fixtures/founderbrief/recorded-evaluations.json` |
| Baseline viability | Static public replay, private local runtime, automated evidence | `apps/web/tests/demo-flow.spec.ts`, `docs/evaluation-plan.md` |

Public proof:

- Demo: [https://criteriaforge.vercel.app](https://criteriaforge.vercel.app)
- Video: [https://youtu.be/Y1xxjB92r7Q](https://youtu.be/Y1xxjB92r7Q) — public, 2:38, audio names Codex and GPT‑5.6
- Repository: [https://github.com/hapx2yuki/Global-Build-Week6](https://github.com/hapx2yuki/Global-Build-Week6)
- Devpost: [https://devpost.com/software/global-build-week-6](https://devpost.com/software/global-build-week-6)
- Final submission Pull Request: [#11](https://github.com/hapx2yuki/Global-Build-Week6/pull/11)

Submission verification:

- Devpost submission ID: `1108857`
- State returned after submission: `Submitted`
- Submitted at: `2026-07-20T21:01:40.531-04:00`
- Devpost project state now includes OpenAI Build Week with a non-null submission timestamp and the public video URL.
- A separate unauthenticated retrieval environment opened the YouTube watch page with the correct title. Anonymous HTTP checks returned 200 for the Vercel demo and Devpost project; the public GitHub page exposed the MIT license and README without sign-in.

## Scored criteria

| Criterion | Strongest verified claim | Visible proof | Limitation | Video |
| --- | --- | --- | --- | --- |
| Technological Implementation | Strict schemas, local citation hashes, five gates, three-run aggregation, immutable SQLite row, bounded Git worktree, split public build | Reproducibility banner; evidence jump; live local calibration/evaluation; repair boundary; tests | A clean-repository live Codex repair has not yet been recorded | 0:40–2:25 |
| Design | A document—not a chat transcript—is the authority; AI proposal, human approval, evidence, and gap have distinct visual states | Eight-section Constitution, one material question, five-gate review, Intent/Observed/Evidence/Gap | Human VoiceOver and Safari verification remain | 0:30–1:55 |
| Potential Impact | A non-technical owner can distinguish plausible AI output from their own intent and reuse one ratified decision system | FounderBrief before/after narrative and exact missing non-goal | One fictional case; no external user study yet | 0:00–0:20, 2:25–2:40 |
| Quality of Idea | CriteriaForge compiles judgment instead of merely scoring; disagreement is itself a failed product condition | Stable/not_met record, blocked-state explanation, immutable authority line | It detects rather than eliminates model variation | Throughout |

## Recorded GPT‑5.6 proof

- Model: `gpt-5.6-sol`
- Codex: `codex-cli 0.145.0-alpha.2`
- Runs: 3
- Shared input hash: `3c8ff4e3eb1d99efc2f942f96a470233343140ebf2d3d0b6ddf953edd8a0ae88`
- Schema hash: `ea3f0da209cd2163a72ac1c61b59436825eebcb052764edaaf8ac3264491878b`
- Aggregation: `stable / not_met`
- Must-pass conclusions: FR-01 fail, FR-02 fail
- Quality conclusions: FR-03 insufficient, UX-02 good
- Structural retries: 0, 0, 0
- Citation adoption: exact locally verified source/segment/locator/hash only

## Live local workflow proof

- Draft: one live `gpt-5.6-terra` structured run, eight sections, three criteria, two material questions
- Calibration: three live runs, `stable / met`
- Immutable version: v1.0, hash `a02e559986895c6af6967c413f4e3be9cacfbb159ddfc76aeddcd2cb71bdc55b`
- Git target: 314 normalized segments from 184 files, commit and dirty-state hash fixed
- Formal evaluation: three live runs, `unstable / blocked`
- Safety behavior: remediation disabled because applicability/evidence sufficiency did not converge
- Recovery: complete application restart restored source, draft, human decisions, version, target, and jobs

## Claims not yet allowed in the final submission

- “The complete local seven-screen journey works on arbitrary private data.”
- “Video audio is automatically understood.”
- “Figma files are directly parsed.”
- “The public demo is live GPT‑5.6.”
- “AI evaluation is deterministic.”
- “The post-repair FounderBrief result has been re-measured.”
- “A live Codex repair was applied and re-evaluated end to end.”
- Any future URL, Session ID, or submission-state claim that has not been independently opened and confirmed.
