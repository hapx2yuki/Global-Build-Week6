import { describe, expect, it } from "vitest"

import { buildCalibrationRun } from "@/lib/criteriaforge/calibration"
import type {
  CalibrationGeneration,
  Criterion,
} from "@/lib/criteriaforge/contracts"

const hash = "a".repeat(64)

function criterion(kind: "must_pass" | "quality"): Criterion {
  return {
    criterionId: kind === "must_pass" ? "MUST-1" : "QUALITY-1",
    name: "Clear boundary",
    definition: "A test criterion",
    kind,
    appliesWhen: "Always",
    excludedWhen: "Never",
    observableExpectation: "Examples are classified by the ratified boundary.",
    evidenceRequirement: {
      allowedKinds: ["document"],
      minimumCount: 1,
      missingEvidence: "block",
      contradictoryEvidence: "block",
    },
    minimumBoundary: "Good examples pass and bad examples fail.",
    qualityDefinitions: {
      insufficient: "Wrong",
      minimum: "Barely right",
      good: "Right",
      exceptional: "Right with unusual clarity",
    },
    examples: [
      {
        exampleId: `${kind}-good`,
        kind: "good",
        originalLanguage: "en",
        originalText: "A good example",
        expectedOutcome: "Classify as good",
        ratified: true,
      },
      {
        exampleId: `${kind}-bad`,
        kind: "bad",
        originalLanguage: "en",
        originalText: "A bad example",
        expectedOutcome: "Classify as bad",
        ratified: true,
      },
    ],
    owner: "Owner",
    approvalStatus: "approved",
    provenance: "human_approved",
    dependencies: [],
    originalLanguage: "en",
    authority: { rank: 100, label: "Owner", decidedBy: "human" },
    meaningHash: hash,
  }
}

function generation(criteria: Criterion[]): CalibrationGeneration {
  return {
    cases: criteria.flatMap((item) =>
      item.examples.map((example) => ({
        criterionId: item.criterionId,
        exampleId: example.exampleId,
        predictedKind: example.kind,
        explanation: "Matches the ratified boundary.",
        uncertainty: "",
      }))
    ),
  }
}

function run(
  criteria: Criterion[],
  generated = generation(criteria)
) {
  return buildCalibrationRun({
    generated,
    criteria,
    metadata: {
      runId: "run-1",
      constitutionVersionId: "draft:draft-1",
      targetSnapshotId: "calibration:target-1",
      modelId: "gpt-5.6-sol",
      reasoningEffort: "high",
      codexVersion: "codex-cli 1.0.0",
      promptVersion: "calibration-1.0.0",
      schemaVersion: "1.0.0",
      startedAt: "2026-07-21T00:00:00.000Z",
      completedAt: "2026-07-21T00:01:00.000Z",
    },
  })
}

describe("buildCalibrationRun", () => {
  it("turns exact example classifications into criterion-level results", () => {
    const criteria = [criterion("must_pass"), criterion("quality")]
    const result = run(criteria)
    expect(result.items).toHaveLength(2)
    expect(result.items[0]?.mustPass).toBe("pass")
    expect(result.items[1]?.mustPass).toBe("not_applicable")
    expect(result.items[1]?.qualityLevel).toBe("good")
  })

  it("keeps a stable wrong classification visible as a failed calibration", () => {
    const criteria = [criterion("must_pass")]
    const generated = generation(criteria)
    generated.cases[0]!.predictedKind = "boundary"
    const result = run(criteria, generated)
    expect(result.items[0]?.mustPass).toBe("fail")
    expect(result.items[0]?.gap).toContain("must_pass-good")
  })

  it("rejects omitted and invented cases", () => {
    const criteria = [criterion("must_pass")]
    expect(() =>
      run(criteria, { cases: generation(criteria).cases.slice(1) })
    ).toThrow("omitted cases")
    expect(() =>
      run(criteria, {
        cases: [
          ...generation(criteria).cases,
          {
            criterionId: "MUST-1",
            exampleId: "invented",
            predictedKind: "good",
            explanation: "Invented",
            uncertainty: "",
          },
        ],
      })
    ).toThrow("unknown case")
  })
})
