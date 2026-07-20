import { describe, expect, it } from "vitest"

import {
  CONSTITUTION_SECTION_KEYS,
  ProductConstitutionSchema,
  type Citation,
  type Criterion,
  type EvaluationItem,
  type EvaluationRun,
  type ProductConstitution,
} from "@/lib/criteriaforge/contracts"
import {
  canCompile,
  evaluateCompileReadiness,
  type CompileReadinessInput,
} from "@/lib/criteriaforge/compile-readiness"
import {
  compileConstitution,
  ConstitutionCompileError,
  type CompilableDraft,
} from "@/lib/criteriaforge/constitution"
import { aggregateEvaluationRuns } from "@/lib/criteriaforge/evaluation"
import {
  calculateCriterionMeaningHash,
  classifyCriterionChange,
} from "@/lib/criteriaforge/semantic-change"
import { validateSchema } from "@/lib/criteriaforge/validation"

const HASH_A = "a".repeat(64)
const HASH_B = "b".repeat(64)
const NOW = "2026-07-21T00:00:00.000Z"

function makeCitation(overrides: Partial<Citation> = {}): Citation {
  return {
    citationId: "citation-1",
    sourceId: "source-1",
    segmentId: "segment-1",
    locator: {
      kind: "document",
      startLine: 1,
      endLine: 2,
      textHash: HASH_A,
    },
    contentHash: HASH_A,
    verified: true,
    shareable: false,
    ...overrides,
  }
}

function makeCriterion(overrides: Partial<Criterion> = {}): Criterion {
  const withoutHash: Omit<Criterion, "meaningHash"> = {
    criterionId: "FR-01",
    name: "Preserve explicit intent",
    definition: "Every material promise remains observable in the result.",
    kind: "must_pass",
    appliesWhen: "A product brief is generated.",
    excludedWhen: "The source explicitly marks the promise as superseded.",
    observableExpectation: "Every source promise has a matching output clause.",
    evidenceRequirement: {
      allowedKinds: ["document", "git"],
      minimumCount: 1,
      missingEvidence: "block",
      contradictoryEvidence: "human_resolves",
    },
    minimumBoundary: "No material source promise is missing.",
    qualityDefinitions: {
      insufficient: "A material promise is missing.",
      minimum: "All material promises are present.",
      good: "Promises are present and precisely traceable.",
      exceptional: "Promises are traceable and protected by regression tests.",
    },
    examples: [
      {
        exampleId: "example-1",
        kind: "good",
        originalLanguage: "en",
        originalText: "The non-goal remains in the generated brief.",
        expectedOutcome: "pass",
        ratified: true,
      },
    ],
    owner: "Product owner",
    approvalStatus: "approved",
    provenance: "human_approved",
    dependencies: [],
    originalLanguage: "en",
    authority: {
      rank: 100,
      label: "Owner ratification",
      decidedBy: "human",
    },
    ...Object.fromEntries(
      Object.entries(overrides).filter(([key]) => key !== "meaningHash")
    ),
  } as Omit<Criterion, "meaningHash">
  return {
    ...withoutHash,
    meaningHash:
      overrides.meaningHash ??
      calculateCriterionMeaningHash(withoutHash),
  }
}

function makeConstitution(
  criterionOverrides: Partial<Criterion> = {}
): ProductConstitution {
  const criterion = makeCriterion(criterionOverrides)
  return {
    schemaVersion: "1.0.0",
    constitutionId: "constitution-1",
    workspaceId: "workspace-1",
    version: "1.0",
    immutable: true,
    sourceLanguage: "en",
    sections: CONSTITUTION_SECTION_KEYS.map((key, index) => ({
      sectionId: `section-${index + 1}`,
      key,
      originalLanguage: "en",
      originalText: `Ratified content for ${key}`,
      provenance: "human_approved",
      sourceIds: ["source-1"],
      authority: {
        rank: 100,
        label: "Owner ratification",
        decidedBy: "human",
      },
      importance: "material",
      approvalStatus: "approved",
      citationIds: ["citation-1"],
      dependentCriterionIds: ["FR-01"],
      meaningHash: HASH_A,
      lastEditedBy: "Product owner",
      lastEditedAt: NOW,
    })),
    criteria: [criterion],
    citations: [makeCitation()],
    contentHash: HASH_A,
    createdAt: NOW,
    createdBy: "Product owner",
  }
}

function makeItem(
  overrides: Partial<EvaluationItem> = {}
): EvaluationItem {
  return {
    criterionId: "FR-01",
    intent: "Preserve every material promise.",
    observed: "Every promise remains visible.",
    evidence: [makeCitation()],
    gap: "No material gap.",
    applicability: "applicable",
    applicabilityReason: "The target is a generated product brief.",
    evidenceStatus: "sufficient",
    mustPass: "pass",
    qualityLevel: "good",
    uncertainty: "",
    remediationPriority: "none",
    ...overrides,
  }
}

function makeRun(
  runIndex: number,
  itemOverrides: Partial<EvaluationItem> = {}
): EvaluationRun {
  return {
    runId: `run-${runIndex}`,
    constitutionVersionId: "constitution-v1",
    targetSnapshotId: "target-v1",
    modelId: "gpt-5.6-sol",
    reasoningEffort: "high",
    codexVersion: "0.1.0",
    promptVersion: "1.0.0",
    schemaVersion: "1.0.0",
    items: [makeItem(itemOverrides)],
    startedAt: NOW,
    completedAt: NOW,
  }
}

function makeReadinessInput(): CompileReadinessInput {
  const full = makeConstitution()
  const constitution: CompileReadinessInput["constitution"] = {
    schemaVersion: full.schemaVersion,
    constitutionId: full.constitutionId,
    workspaceId: full.workspaceId,
    version: full.version,
    sourceLanguage: full.sourceLanguage,
    sections: full.sections,
    criteria: full.criteria,
    citations: full.citations,
    parentVersionId: full.parentVersionId,
    createdAt: full.createdAt,
    createdBy: full.createdBy,
  }
  return {
    constitution,
    openQuestions: [],
    contradictions: [],
    scopeConflict: false,
    calibrationRuns: [makeRun(1), makeRun(2), makeRun(3)],
  }
}

describe("Product Constitution contract", () => {
  it("accepts a complete eight-section immutable constitution", () => {
    const result = validateSchema<ProductConstitution>(
      ProductConstitutionSchema,
      makeConstitution()
    )
    expect(result.success).toBe(true)
  })

  it("rejects undeclared AI output fields", () => {
    const value = {
      ...makeConstitution(),
      hiddenModelOpinion: "This must never be silently persisted.",
    }
    const result = validateSchema<ProductConstitution>(
      ProductConstitutionSchema,
      value
    )
    expect(result.success).toBe(false)
  })

  it("requires each of the fixed section keys exactly once", () => {
    const input = makeReadinessInput()
    input.constitution.sections[7] = {
      ...input.constitution.sections[7],
      key: "purpose",
    }
    const consistent = evaluateCompileReadiness(input).find(
      (gate) => gate.key === "consistent"
    )
    expect(consistent?.passed).toBe(false)
  })
})

describe("five compile safeguards", () => {
  it("allows compilation only when all five safeguards pass", () => {
    const results = evaluateCompileReadiness(makeReadinessInput())
    expect(results).toHaveLength(5)
    expect(canCompile(results)).toBe(true)
  })

  it("blocks unresolved material questions", () => {
    const input = makeReadinessInput()
    input.openQuestions.push({
      questionId: "question-1",
      material: true,
      status: "open",
    })
    const gate = evaluateCompileReadiness(input).find(
      (result) => result.key === "intent_complete"
    )
    expect(gate?.passed).toBe(false)
  })

  it("blocks an unratified must-pass rule", () => {
    const input = makeReadinessInput()
    input.constitution.criteria[0] = makeCriterion({
      approvalStatus: "pending",
      provenance: "ai_proposed",
    })
    const gate = evaluateCompileReadiness(input).find(
      (result) => result.key === "ratified"
    )
    expect(gate?.passed).toBe(false)
  })

  it("blocks a criterion without an observable boundary", () => {
    const input = makeReadinessInput()
    input.constitution.criteria[0] = makeCriterion({
      observableExpectation: "",
    })
    const gate = evaluateCompileReadiness(input).find(
      (result) => result.key === "evaluable"
    )
    expect(gate?.passed).toBe(false)
  })

  it("blocks unresolved conflicts between equally authoritative sources", () => {
    const input = makeReadinessInput()
    input.contradictions.push({
      contradictionId: "conflict-1",
      material: true,
      equalAuthority: true,
      resolvedByHuman: false,
    })
    const gate = evaluateCompileReadiness(input).find(
      (result) => result.key === "consistent"
    )
    expect(gate?.passed).toBe(false)
  })

  it("does not hide calibration disagreement behind a majority vote", () => {
    const input = makeReadinessInput()
    input.calibrationRuns[2] = makeRun(3, { mustPass: "fail" })
    const gate = evaluateCompileReadiness(input).find(
      (result) => result.key === "stable"
    )
    expect(gate?.passed).toBe(false)
    expect(canCompile(evaluateCompileReadiness(input))).toBe(false)
  })
})

describe("immutable constitution compilation", () => {
  it("creates a content-addressed version only after every gate passes", () => {
    const input = makeReadinessInput()
    const draft: CompilableDraft = {
      schemaVersion: "1.0.0",
      sections: input.constitution.sections,
      criteria: input.constitution.criteria,
      citations: input.constitution.citations,
      openQuestions: [],
      contradictions: [],
    }
    const result = compileConstitution({
      draft,
      workspaceId: "workspace-1",
      sourceLanguage: "en",
      version: "1.0",
      createdBy: "Product owner",
      constitutionId: "constitution-compiled",
      createdAt: NOW,
      calibrationRuns: input.calibrationRuns,
      scopeConflict: false,
    })
    expect(result.gates.every((gate) => gate.passed)).toBe(true)
    expect(result.constitution).toMatchObject({
      immutable: true,
      constitutionId: "constitution-compiled",
      version: "1.0",
    })
    expect(result.constitution.contentHash).toMatch(/^[a-f0-9]{64}$/)
  })

  it("refuses to create a version when calibration is unstable", () => {
    const input = makeReadinessInput()
    input.calibrationRuns[2] = makeRun(3, { mustPass: "fail" })
    expect(() =>
      compileConstitution({
        draft: {
          schemaVersion: "1.0.0",
          sections: input.constitution.sections,
          criteria: input.constitution.criteria,
          citations: input.constitution.citations,
          openQuestions: [],
          contradictions: [],
        },
        workspaceId: "workspace-1",
        sourceLanguage: "en",
        version: "1.0",
        createdBy: "Product owner",
        calibrationRuns: input.calibrationRuns,
        scopeConflict: false,
      })
    ).toThrow(ConstitutionCompileError)
  })
})

describe("four-layer evaluation aggregation", () => {
  it("returns met when every applicable must-pass result is stably satisfied", () => {
    const result = aggregateEvaluationRuns([
      makeRun(1),
      makeRun(2),
      makeRun(3),
    ])
    expect(result.status).toBe("stable")
    expect(result.overall).toBe("met")
  })

  it("returns not_met for a stable must-pass failure", () => {
    const result = aggregateEvaluationRuns([
      makeRun(1, { mustPass: "fail" }),
      makeRun(2, { mustPass: "fail" }),
      makeRun(3, { mustPass: "fail" }),
    ])
    expect(result.status).toBe("stable")
    expect(result.overall).toBe("not_met")
  })

  it("returns blocked when a decisive citation is not verified", () => {
    const unavailable = {
      evidenceStatus: "missing" as const,
      mustPass: "undetermined" as const,
      evidence: [],
    }
    const result = aggregateEvaluationRuns([
      makeRun(1, unavailable),
      makeRun(2, unavailable),
      makeRun(3, unavailable),
    ])
    expect(result.status).toBe("stable")
    expect(result.overall).toBe("blocked")
  })

  it("returns blocked when quality levels differ by more than one tier", () => {
    const result = aggregateEvaluationRuns([
      makeRun(1, { qualityLevel: "insufficient" }),
      makeRun(2, { qualityLevel: "good" }),
      makeRun(3, { qualityLevel: "good" }),
    ])
    expect(result.status).toBe("unstable")
    expect(result.overall).toBe("blocked")
  })

  it("requires all reproducibility settings to match", () => {
    const mismatched = makeRun(3)
    mismatched.modelId = "gpt-5.6-terra"
    const result = aggregateEvaluationRuns([
      makeRun(1),
      makeRun(2),
      mismatched,
    ])
    expect(result.status).toBe("unstable")
    expect(result.overall).toBe("blocked")
  })
})

describe("semantic invalidation", () => {
  it("does not invalidate evaluation for display name and translation changes", () => {
    const before = makeCriterion()
    const after = {
      ...before,
      name: "Keep the founder intent",
      examples: before.examples.map((example) => ({
        ...example,
        referenceTranslation: "参考訳のみ変更",
      })),
    }
    after.meaningHash = calculateCriterionMeaningHash(after)
    const change = classifyCriterionChange(before, after, new Map())
    expect(change.changed).toBe(false)
    expect(after.meaningHash).toBe(before.meaningHash)
  })

  it("does not change meaning when only ratification metadata changes", () => {
    const before = makeCriterion()
    const after = {
      ...before,
      approvalStatus: "pending" as const,
      provenance: "ai_proposed" as const,
      examples: before.examples.map((example) => ({
        ...example,
        ratified: false,
      })),
    }
    expect(calculateCriterionMeaningHash(before)).toBe(
      calculateCriterionMeaningHash(after)
    )
  })

  it("invalidates only the changed criterion and its dependency descendants", () => {
    const before = makeCriterion()
    const after = {
      ...before,
      definition: "Every promise and explicit non-goal remains observable.",
    }
    after.meaningHash = calculateCriterionMeaningHash(after)
    const dependents = new Map<string, readonly string[]>([
      ["FR-01", ["CAL-01", "EVA-01"]],
      ["EVA-01", ["REM-01"]],
    ])
    const change = classifyCriterionChange(before, after, dependents)
    expect(change.changed).toBe(true)
    expect(change.changedFields).toContain("definition")
    expect(change.affectedIds.sort()).toEqual(
      ["CAL-01", "EVA-01", "FR-01", "REM-01"].sort()
    )
  })

  it("treats whitespace, Markdown decoration, and punctuation-only edits as presentation", () => {
    const before = makeCriterion({ definition: "Every promise remains." })
    const after = {
      ...before,
      definition: "**Every**   promise remains!",
    }
    after.meaningHash = calculateCriterionMeaningHash(after)
    expect(after.meaningHash).toBe(before.meaningHash)
  })

  it("detects changed verified evidence content", () => {
    const runs = [
      makeRun(1),
      makeRun(2),
      makeRun(3, {
        evidence: [
          makeCitation({
            citationId: "citation-2",
            contentHash: HASH_B,
          }),
        ],
      }),
    ]
    const result = aggregateEvaluationRuns(runs)
    expect(result.status).toBe("unstable")
    expect(result.reasons.join(" ")).toContain("evidence does not converge")
  })
})
