import { describe, expect, it } from "vitest"

import type {
  Criterion,
  EvaluationGeneration,
} from "@/lib/criteriaforge/contracts"
import { verifyEvaluationGeneration } from "@/lib/criteriaforge/verify-evaluation"

const HASH = "a".repeat(64)
const locator = {
  kind: "document" as const,
  startLine: 1,
  endLine: 1,
  textHash: HASH,
}

function criterion(): Criterion {
  return {
    criterionId: "FR-01",
    name: "Traceable intent",
    definition: "Keep intent.",
    kind: "must_pass",
    appliesWhen: "A brief exists.",
    excludedWhen: "Never.",
    observableExpectation: "The clause exists.",
    evidenceRequirement: {
      allowedKinds: ["document"],
      minimumCount: 1,
      missingEvidence: "block",
      contradictoryEvidence: "human_resolves",
    },
    minimumBoundary: "One clause.",
    qualityDefinitions: {
      insufficient: "Missing.",
      minimum: "Present.",
      good: "Linked.",
      exceptional: "Tested.",
    },
    examples: [
      {
        exampleId: "example-1",
        kind: "good",
        originalLanguage: "en",
        originalText: "Keep it.",
        expectedOutcome: "pass",
        ratified: true,
      },
    ],
    owner: "Owner",
    approvalStatus: "approved",
    provenance: "human_approved",
    dependencies: [],
    originalLanguage: "en",
    authority: { rank: 100, label: "Owner", decidedBy: "human" },
    meaningHash: HASH,
  }
}

function generated(contentHash = HASH): EvaluationGeneration {
  return {
    items: [
      {
        criterionId: "FR-01",
        intent: "Keep intent.",
        observed: "The clause exists.",
        evidence: [
          {
            citationId: "citation-1",
            sourceId: "source-1",
            segmentId: "segment-1",
            locator,
            contentHash,
            verified: false,
            shareable: false,
          },
        ],
        gap: "None.",
        applicability: "applicable",
        applicabilityReason: "A brief exists.",
        evidenceStatus: "sufficient",
        mustPass: "pass",
        qualityLevel: "good",
        uncertainty: "",
        remediationPriority: "none",
      },
    ],
  }
}

describe("local evaluation citation verification", () => {
  it("adopts only an exact source, locator, and content-hash match", () => {
    const result = verifyEvaluationGeneration({
      generated: generated(),
      approvedExcerpts: [
        {
          sourceId: "source-1",
          segmentId: "segment-1",
          originalLanguage: "en",
          authorityRank: 100,
          locator,
          contentHash: HASH,
          content: "Keep it.",
        },
      ],
      criteria: [criterion()],
    })
    expect(result.rejectedCitationIds).toEqual([])
    expect(result.items[0].evidence[0].verified).toBe(true)
    expect(result.items[0].mustPass).toBe("pass")
  })

  it("drops a fabricated citation and blocks the decision", () => {
    const result = verifyEvaluationGeneration({
      generated: generated("b".repeat(64)),
      approvedExcerpts: [
        {
          sourceId: "source-1",
          segmentId: "segment-1",
          originalLanguage: "en",
          authorityRank: 100,
          locator,
          contentHash: HASH,
          content: "Keep it.",
        },
      ],
      criteria: [criterion()],
    })
    expect(result.rejectedCitationIds).toEqual(["citation-1"])
    expect(result.items[0]).toMatchObject({
      evidence: [],
      evidenceStatus: "missing",
      mustPass: "undetermined",
    })
  })
})
