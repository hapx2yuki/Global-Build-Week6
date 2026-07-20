import { createHash } from "node:crypto"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { execFileSync } from "node:child_process"

import {
  CONSTITUTION_SECTION_KEYS,
  EvaluationGenerationSchema,
  type Citation,
  type Criterion,
  type EvaluationItem,
  type EvaluationRun,
  type ProductConstitution,
} from "../src/lib/criteriaforge/contracts"
import { CodexRunner } from "../src/lib/criteriaforge/codex-runner"
import { aggregateEvaluationRuns } from "../src/lib/criteriaforge/evaluation"
import { evaluationPrompt, type ApprovedEvidenceExcerpt } from "../src/lib/criteriaforge/prompts"
import { calculateCriterionMeaningHash } from "../src/lib/criteriaforge/semantic-change"

const MODEL = process.env.CRITERIAFORGE_RECORD_MODEL ?? "gpt-5.6-sol"
const REASONING_EFFORT =
  process.env.CRITERIAFORGE_RECORD_REASONING ?? "high"
const HASH = (value: string) =>
  createHash("sha256").update(value, "utf8").digest("hex")
const NOW = new Date().toISOString()

function criterion(
  value: Omit<Criterion, "meaningHash">
): Criterion {
  return {
    ...value,
    meaningHash: calculateCriterionMeaningHash(value),
  }
}

const common = {
  approvalStatus: "approved" as const,
  provenance: "human_approved" as const,
  originalLanguage: "en",
  owner: "FounderBrief product owner",
  authority: {
    rank: 100,
    label: "Owner ratification",
    decidedBy: "human" as const,
  },
}

const criteria: Criterion[] = [
  criterion({
    ...common,
    criterionId: "FR-01",
    name: "Preserve the founder’s stated intent",
    definition:
      "Every material promise and explicit non-goal in the source remains visible in the generated build brief.",
    kind: "must_pass",
    appliesWhen: "FounderBrief generates a build-ready product brief.",
    excludedWhen: "The founder explicitly superseded the source statement.",
    observableExpectation:
      "The generated brief contains a traceable clause for every material promise and non-goal.",
    evidenceRequirement: {
      allowedKinds: ["document", "git"],
      minimumCount: 2,
      missingEvidence: "block",
      contradictoryEvidence: "human_resolves",
    },
    minimumBoundary:
      "No material promise or non-goal is absent from the generated brief.",
    qualityDefinitions: {
      insufficient: "At least one material promise or non-goal is missing.",
      minimum: "Every material promise and non-goal appears.",
      good: "Every clause links to the exact governing source.",
      exceptional: "Exact traceability is protected by acceptance tests.",
    },
    examples: [
      {
        exampleId: "EX-FR-01",
        kind: "bad",
        originalLanguage: "en",
        originalText:
          "The source says not to produce investor material, but the output drops that non-goal.",
        expectedOutcome: "fail",
        ratified: true,
      },
    ],
    dependencies: [],
  }),
  criterion({
    ...common,
    criterionId: "FR-02",
    name: "Ask before making a material assumption",
    definition:
      "FounderBrief asks the founder before choosing an unresolved audience, commercial model, or product boundary.",
    kind: "must_pass",
    appliesWhen:
      "A material product decision is not explicitly settled by an authoritative source.",
    excludedWhen: "The decision is already explicit in a higher-authority source.",
    observableExpectation:
      "Generation stops and asks one plain-language question before emitting the final brief.",
    evidenceRequirement: {
      allowedKinds: ["git", "web", "document"],
      minimumCount: 2,
      missingEvidence: "block",
      contradictoryEvidence: "human_resolves",
    },
    minimumBoundary:
      "No unresolved material decision is presented as a founder decision.",
    qualityDefinitions: {
      insufficient: "An unsupported material assumption is emitted.",
      minimum: "Every material ambiguity stops generation.",
      good: "The highest-impact question is asked first.",
      exceptional: "Question impact and affected clauses are previewed.",
    },
    examples: [
      {
        exampleId: "EX-FR-02",
        kind: "bad",
        originalLanguage: "en",
        originalText:
          "The output introduces team accounts and recurring billing without a question.",
        expectedOutcome: "fail",
        ratified: true,
      },
    ],
    dependencies: [],
  }),
  criterion({
    ...common,
    criterionId: "FR-03",
    name: "Trace each material output claim to an exact source",
    definition:
      "A reviewer can open the exact source line, cell, time range, or code range supporting each material output clause.",
    kind: "quality",
    appliesWhen: "A generated brief contains a material product clause.",
    excludedWhen: "The clause is an explicitly labelled, pending AI proposal.",
    observableExpectation:
      "Each material clause has a segment-level citation, not only a document-level link.",
    evidenceRequirement: {
      allowedKinds: ["git", "document"],
      minimumCount: 1,
      missingEvidence: "block",
      contradictoryEvidence: "human_resolves",
    },
    minimumBoundary: "Every material output clause has a source citation.",
    qualityDefinitions: {
      insufficient: "Material clauses have no citation or only one generic file link.",
      minimum: "Each clause cites a source document.",
      good: "Each clause opens the exact supporting segment.",
      exceptional: "Segment hashes and regression tests protect traceability.",
    },
    examples: [
      {
        exampleId: "EX-FR-03",
        kind: "boundary",
        originalLanguage: "en",
        originalText: "All nine sections cite the same file without a line.",
        expectedOutcome: "insufficient",
        ratified: true,
      },
    ],
    dependencies: ["FR-01"],
  }),
  criterion({
    ...common,
    criterionId: "UX-02",
    name: "Reach a useful first result without setup knowledge",
    definition:
      "A first-time non-technical product owner reaches a useful draft in five minutes without prompt terminology.",
    kind: "quality",
    appliesWhen: "A first-time owner follows the primary path.",
    excludedWhen: "The run is a returning-user edit flow.",
    observableExpectation:
      "The owner completes all required actions within five minutes without recovery assistance.",
    evidenceRequirement: {
      allowedKinds: ["web", "video"],
      minimumCount: 1,
      missingEvidence: "block",
      contradictoryEvidence: "human_resolves",
    },
    minimumBoundary: "A useful draft is reached in at most five minutes.",
    qualityDefinitions: {
      insufficient: "The owner cannot complete the path.",
      minimum: "The owner completes in five minutes with one recovery.",
      good: "The owner completes in five minutes without recovery.",
      exceptional: "The owner completes quickly and correctly explains the result.",
    },
    examples: [
      {
        exampleId: "EX-UX-02",
        kind: "good",
        originalLanguage: "en",
        originalText:
          "A clean-browser run finishes in 3 minutes 42 seconds with 7 of 7 actions.",
        expectedOutcome: "good",
        ratified: true,
      },
    ],
    dependencies: [],
  }),
]

const constitution: ProductConstitution = {
  schemaVersion: "1.0.0",
  constitutionId: "founderbrief-constitution-v1",
  workspaceId: "founderbrief-recorded-demo",
  version: "1.0",
  immutable: true,
  sourceLanguage: "en",
  sections: CONSTITUTION_SECTION_KEYS.map((key, index) => ({
    sectionId: `CF-${String(index + 1).padStart(2, "0")}`,
    key,
    originalLanguage: "en",
    originalText: `Ratified FounderBrief rule for ${key}.`,
    provenance: "human_approved",
    sourceIds: ["founderbrief-owner-decisions"],
    authority: common.authority,
    importance: "material",
    approvalStatus: "approved",
    citationIds: [],
    dependentCriterionIds: criteria.map((item) => item.criterionId),
    meaningHash: HASH(`section:${key}`),
    lastEditedBy: "FounderBrief product owner",
    lastEditedAt: NOW,
  })),
  criteria,
  citations: [],
  contentHash: HASH(JSON.stringify(criteria)),
  createdAt: NOW,
  createdBy: "FounderBrief product owner",
}

function excerpt(
  sourceId: string,
  segmentId: string,
  content: string,
  locator: Record<string, unknown>
): ApprovedEvidenceExcerpt {
  return {
    sourceId,
    segmentId,
    originalLanguage: "en",
    authorityRank: 100,
    locator,
    contentHash: HASH(content),
    content,
  }
}

const excerpts: ApprovedEvidenceExcerpt[] = [
  excerpt(
    "founder-note",
    "founder-note-L14-L16",
    "Do not turn this into investor material. The product should help me produce a build-ready product brief, not a pitch deck.",
    {
      kind: "document",
      startLine: 14,
      endLine: 16,
      startCharacter: 0,
      endCharacter: 120,
      textHash: HASH(
        "Do not turn this into investor material. The product should help me produce a build-ready product brief, not a pitch deck."
      ),
    }
  ),
  excerpt(
    "brief-v0.1",
    "brief-v0.1-L18-L34",
    "FounderBrief generates a structured product brief for independent builders. The output contains audience, problem, feature scope, delivery plan, and success measures. No non-goal about investor materials appears in the generated brief.",
    {
      kind: "git",
      commit: "d9a80f7",
      relativePath: "brief-v0.1.md",
      startLine: 18,
      endLine: 34,
      textHash: HASH(
        "FounderBrief generates a structured product brief for independent builders. The output contains audience, problem, feature scope, delivery plan, and success measures. No non-goal about investor materials appears in the generated brief."
      ),
    }
  ),
  excerpt(
    "brief-v0.1",
    "brief-v0.1-L62-L81",
    "Team accounts use recurring billing. Workspace owners invite collaborators after checkout. Neither account type nor billing appeared in the founder memo.",
    {
      kind: "git",
      commit: "d9a80f7",
      relativePath: "brief-v0.1.md",
      startLine: 62,
      endLine: 81,
      textHash: HASH(
        "Team accounts use recurring billing. Workspace owners invite collaborators after checkout. Neither account type nor billing appeared in the founder memo."
      ),
    }
  ),
  excerpt(
    "browser-trace",
    "browser-trace-step-6",
    "At generation step 6, the product emitted the final brief without asking about account type, collaboration, or billing.",
    {
      kind: "web",
      observationId: "browser-trace-03",
      step: 6,
      url: "http://127.0.0.1:4173/generate",
      element: "Generate final brief button and resulting document",
      screenshotHash: HASH("browser-trace-03-step-6"),
    }
  ),
  excerpt(
    "brief-v0.1",
    "brief-v0.1-citations",
    "All nine generated sections link to founder-note.txt at document level. No citation includes a line, paragraph, or exact excerpt.",
    {
      kind: "git",
      commit: "d9a80f7",
      relativePath: "brief-v0.1.md",
      startLine: 1,
      endLine: 104,
      textHash: HASH(
        "All nine generated sections link to founder-note.txt at document level. No citation includes a line, paragraph, or exact excerpt."
      ),
    }
  ),
  excerpt(
    "usability-run-03",
    "usability-run-03-summary",
    "A clean-browser first-time task finished in 3 minutes 42 seconds. Seven of seven required actions completed without assistance or recovery.",
    {
      kind: "web",
      observationId: "usability-run-03",
      step: 7,
      url: "http://127.0.0.1:4173/result",
      element: "Completed FounderBrief result",
      screenshotHash: HASH("usability-run-03-result"),
    }
  ),
]

function locallyVerify(items: EvaluationItem[]): EvaluationItem[] {
  const bySegment = new Map(
    excerpts.map((item) => [`${item.sourceId}:${item.segmentId}`, item])
  )
  const criterionById = new Map(
    criteria.map((item) => [item.criterionId, item])
  )
  return items.map((item) => {
    const evidence = item.evidence.flatMap((citation) => {
      const excerpt = bySegment.get(
        `${citation.sourceId}:${citation.segmentId}`
      )
      if (
        !excerpt ||
        citation.contentHash !== excerpt.contentHash ||
        JSON.stringify(citation.locator) !== JSON.stringify(excerpt.locator)
      ) {
        return []
      }
      return [
        {
          ...citation,
          verified: true,
          shareable: false,
        } satisfies Citation,
      ]
    })
    const normalizedMustPass =
      criterionById.get(item.criterionId)?.kind === "quality"
        ? "not_applicable"
        : item.mustPass
    if (evidence.length === 0) {
      return {
        ...item,
        evidence,
        evidenceStatus: "missing",
        mustPass:
          criterionById.get(item.criterionId)?.kind === "quality"
            ? "not_applicable"
            : "undetermined",
        uncertainty:
          "No model-provided citation survived local locator and content-hash verification.",
      }
    }
    return { ...item, evidence, mustPass: normalizedMustPass }
  })
}

async function main() {
  const temporaryRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "criteriaforge-founderbrief-record-")
  )
  const runner = new CodexRunner()
  const runs: EvaluationRun[] = []
  const runMetadata: Array<Record<string, unknown>> = []

  try {
  for (let index = 1; index <= 3; index += 1) {
    const cwd = path.join(temporaryRoot, `cwd-${index}`)
    const runRoot = path.join(temporaryRoot, "runs")
    fs.mkdirSync(cwd, { recursive: true, mode: 0o700 })
    fs.mkdirSync(runRoot, { recursive: true, mode: 0o700 })
    const prompt = evaluationPrompt({
      constitution,
      criteria,
      excerpts,
    })
    const result = await runner.runStructured({
      purpose: "evaluation",
      model: MODEL,
      reasoningEffort: REASONING_EFFORT,
      sandbox: "read-only",
      prompt,
      outputSchema: EvaluationGenerationSchema,
      cwd,
      runRoot,
      timeoutMs: 20 * 60 * 1_000,
    })
    const items = locallyVerify(result.value.items)
    runs.push({
      runId: `founderbrief-recorded-${index}`,
      constitutionVersionId: constitution.constitutionId,
      targetSnapshotId: "founderbrief-build-v0.1",
      modelId: MODEL,
      reasoningEffort: REASONING_EFFORT,
      codexVersion: result.codexVersion,
      promptVersion: "founderbrief-evaluation-v1",
      schemaVersion: "1.0.0",
      items,
      startedAt: result.startedAt,
      completedAt: result.completedAt,
    })
    runMetadata.push({
      runId: result.runId,
      inputHash: result.promptHash,
      outputHash: result.outputHash,
      schemaHash: result.schemaHash,
      retryCount: result.retryCount,
      startedAt: result.startedAt,
      completedAt: result.completedAt,
    })
    process.stdout.write(`Recorded run ${index}/3\n`)
  }

  const aggregation = aggregateEvaluationRuns(runs)
  const gitCommit = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: path.resolve(process.cwd(), "../.."),
    encoding: "utf8",
  }).trim()
  const output = {
    schemaVersion: "1.0.0",
    label: "Replay recorded GPT-5.6 evaluation",
    fictionalData: true,
    liveExecution: false,
    recordedAt: new Date().toISOString(),
    modelId: MODEL,
    reasoningEffort: REASONING_EFFORT,
    codexVersion: runs[0].codexVersion,
    constitutionVersion: constitution.version,
    constitutionId: constitution.constitutionId,
    constitutionHash: constitution.contentHash,
    targetVersion: "FounderBrief build 0.1",
    targetSnapshotId: "founderbrief-build-v0.1",
    targetHash: HASH(JSON.stringify(excerpts)),
    runCount: runs.length,
    allCitationsLocallyVerified: runs.every((run) =>
      run.items.every((item) =>
        item.evidence.every((citation) => citation.verified)
      )
    ),
    sourceGitCommit: gitCommit,
    aggregation,
    runs,
    runMetadata,
  }
  const destination = path.resolve(
    process.cwd(),
    "src/fixtures/founderbrief/recorded-evaluations.json"
  )
  fs.mkdirSync(path.dirname(destination), { recursive: true })
  fs.writeFileSync(destination, `${JSON.stringify(output, null, 2)}\n`)
  process.stdout.write(
    `Wrote ${destination}\nAggregation: ${aggregation.status}/${aggregation.overall}\n`
  )
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true })
  }
}

void main().catch((error: unknown) => {
  const detail =
    error && typeof error === "object" && "detail" in error
      ? String(error.detail)
      : ""
  process.stderr.write(
    `${error instanceof Error ? error.stack ?? error.message : String(error)}${
      detail ? `\n${detail}` : ""
    }\n`
  )
  process.exitCode = 1
})
