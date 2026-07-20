# OpenAI Build Week Preparation Workspace

This repository is the working home for **CriteriaForge**, an OpenAI Build Week submission. CriteriaForge turns a product owner's ambiguous intent into a human-ratified, testable Product Constitution, then evaluates whether a Codex-built product matches that intent.

## Current status

| Item | Status |
| --- | --- |
| Devpost registration | Registered |
| Product concept | CriteriaForge selected |
| Product implementation | Interactive web prototype in `apps/web` |
| GitHub repository | Private during preparation |
| Devpost project | Not created yet |
| Final submission | Incomplete |

The submission deadline shown by Devpost is **July 21, 2026 at 5:00 PM PT**, which is **July 22, 2026 at 9:00 AM JST**. Recheck Devpost before the final submission in case the organizer changes the schedule.

## Submission contract

The final entry must include:

- a working project built with Codex and GPT-5.6;
- one category: Apps for Your Life, Work & Productivity, Developer Tools, or Education;
- an English project description;
- a public YouTube demo with audio that is shorter than three minutes;
- a testable repository with either public licensed access or private reviewer access;
- a Codex Session ID obtained through `/feedback`;
- installation, platform, and test instructions when the entry is a plugin or developer tool.

The repository must remain freely accessible to the judges through the end of judging.

## Prepare this workspace

Requirements: Git, Bash, Make, Node.js 20+, and npm.

```bash
make setup
make preflight
```

`make setup` installs the repository-local pre-commit hook and creates an ignored local submission metadata file when one does not exist. `make preflight` checks the repository structure, shell syntax, and common secret patterns.

To inspect what is still missing from the final submission:

```bash
make submission-check
```

This strict check is expected to fail until the product, demo, repository access, and Devpost draft are complete.

## Repository map

| Path | Purpose |
| --- | --- |
| `docs/requirements.md` | Verified event requirements and conservative decisions |
| `docs/build-log.md` | Record of Codex, GPT-5.6, and human contributions |
| `docs/decision-log.md` | Important product and engineering decisions |
| `docs/evaluation-plan.md` | Test cases, metrics, and result-recording format |
| `docs/screen-design.md` | Screen architecture, responsive behavior, and UI acceptance criteria |
| `docs/ui-component-strategy.md` | shadcn/ui component mapping and interaction rules |
| `docs/security-privacy.md` | Safety, privacy, abuse, and cost review |
| `apps/web/` | Interactive CriteriaForge web prototype |
| `submission/` | Description, video, judging evidence, and release checklist |
| `scripts/` | Local preflight and submission-readiness checks |
| `.github/workflows/` | Continuous integration for every push and pull request |

## Product setup and use

The current prototype uses fictional FounderBrief data and does not require credentials.

```bash
cd apps/web
npm install
npm run dev
```

Open `http://localhost:3000`.

The main review flow is:

1. Read the eight-section Product Constitution.
2. Approve the unresolved governing rule in the question inspector.
3. Review the five compile safeguards and compile version 1.0.
4. Open Evaluation and inspect the intent–reality gap.
5. Compare the original build with the repaired build.

Validation commands:

```bash
cd apps/web
npx tsc --noEmit
npm run lint
npm run build
```

This is an interaction prototype. Local evidence ingestion, Codex authentication, compilation persistence, and live GPT-5.6 evaluation are the next implementation layer.

## Sources of truth

The [Devpost overview](https://openai-build-week.devpost.com/) and [Official Rules](https://openai-build-week.devpost.com/rules) override this repository if they change. Internal preparation details are recorded in `docs/requirements.md`.
