# OpenAI Build Week Preparation Workspace

This repository is the working home for an OpenAI Build Week submission. It currently contains the submission workflow, evidence templates, and automated checks; the product concept and implementation have not yet been selected.

## Current status

| Item | Status |
| --- | --- |
| Devpost registration | Registered |
| Product concept | Not selected |
| Product implementation | Not started |
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

Requirements: Git, Bash, and Make.

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
| `docs/security-privacy.md` | Safety, privacy, abuse, and cost review |
| `submission/` | Description, video, judging evidence, and release checklist |
| `scripts/` | Local preflight and submission-readiness checks |
| `.github/workflows/` | Continuous integration for every push and pull request |

## Product setup and use

No product runtime exists yet. Once the concept and technology are selected, this section must be replaced with exact installation, configuration, sample-input, run, and test commands that a judge can follow without private knowledge.

## Sources of truth

The [Devpost overview](https://openai-build-week.devpost.com/) and [Official Rules](https://openai-build-week.devpost.com/rules) override this repository if they change. Internal preparation details are recorded in `docs/requirements.md`.

