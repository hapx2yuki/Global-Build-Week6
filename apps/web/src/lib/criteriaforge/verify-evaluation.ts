import type {
  Criterion,
  EvaluationGeneration,
  EvaluationItem,
} from "@/lib/criteriaforge/contracts"
import type { ApprovedEvidenceExcerpt } from "@/lib/criteriaforge/prompts"

function sameLocator(
  left: Record<string, unknown>,
  right: Record<string, unknown>
): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

export function verifyEvaluationGeneration(input: {
  generated: EvaluationGeneration
  approvedExcerpts: ApprovedEvidenceExcerpt[]
  criteria: Criterion[]
}): {
  items: EvaluationItem[]
  rejectedCitationIds: string[]
} {
  const approved = new Map(
    input.approvedExcerpts.map((excerpt) => [
      `${excerpt.sourceId}\0${excerpt.segmentId}`,
      excerpt,
    ])
  )
  const criteria = new Map(
    input.criteria.map((criterion) => [criterion.criterionId, criterion])
  )
  const rejectedCitationIds: string[] = []
  const items = input.generated.items.map((item): EvaluationItem => {
    const criterion = criteria.get(item.criterionId)
    if (!criterion) {
      throw new Error(
        `Evaluation returned an unknown criterion: ${item.criterionId}`
      )
    }
    const evidence = item.evidence.flatMap((citation) => {
      const excerpt = approved.get(
        `${citation.sourceId}\0${citation.segmentId}`
      )
      const valid =
        Boolean(excerpt) &&
        excerpt?.contentHash === citation.contentHash &&
        sameLocator(excerpt.locator, citation.locator)
      if (!valid) {
        rejectedCitationIds.push(citation.citationId)
        return []
      }
      return [
        {
          ...citation,
          verified: true,
          verificationFailure: undefined,
          shareable: false,
        },
      ]
    })
    const enoughEvidence =
      evidence.length >= criterion.evidenceRequirement.minimumCount
    if (!enoughEvidence && item.applicability === "applicable") {
      return {
        ...item,
        evidence,
        evidenceStatus: "missing",
        mustPass: "undetermined",
        qualityLevel:
          criterion.kind === "quality" ? "insufficient" : undefined,
        uncertainty:
          "One or more decisive citations failed local source, locator, or content-hash verification.",
        remediationPriority: "high",
      }
    }
    return {
      ...item,
      evidence,
      mustPass:
        criterion.kind === "quality" ? "not_applicable" : item.mustPass,
    }
  })
  const returnedIds = new Set(items.map((item) => item.criterionId))
  for (const criterion of input.criteria) {
    if (!returnedIds.has(criterion.criterionId)) {
      throw new Error(
        `Evaluation omitted required criterion: ${criterion.criterionId}`
      )
    }
  }
  return { items, rejectedCitationIds }
}
