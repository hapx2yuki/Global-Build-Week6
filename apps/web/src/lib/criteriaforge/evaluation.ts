import {
  type EvaluationItem,
  type EvaluationRun,
  type QualityLevel,
} from "@/lib/criteriaforge/contracts"

const QUALITY_ORDER: Record<QualityLevel, number> = {
  insufficient: 0,
  minimum: 1,
  good: 2,
  exceptional: 3,
}

export type AggregatedEvaluationItem = {
  criterionId: string
  status: "stable" | "unstable"
  representative: EvaluationItem | null
  mustPass:
    | "pass"
    | "fail"
    | "not_applicable"
    | "undetermined"
  qualityLevel?: QualityLevel
  reasons: string[]
}

export type EvaluationAggregation = {
  status: "stable" | "unstable"
  overall: "blocked" | "not_met" | "met"
  items: AggregatedEvaluationItem[]
  reasons: string[]
}

function comparableRuns(runs: EvaluationRun[]): boolean {
  if (runs.length !== 3) return false
  const [first] = runs
  return runs.every(
    (run) =>
      run.constitutionVersionId === first.constitutionVersionId &&
      run.targetSnapshotId === first.targetSnapshotId &&
      run.modelId === first.modelId &&
      run.reasoningEffort === first.reasoningEffort &&
      run.codexVersion === first.codexVersion &&
      run.promptVersion === first.promptVersion &&
      run.schemaVersion === first.schemaVersion
  )
}

function mode<T extends string>(values: T[]): T | undefined {
  const counts = new Map<T, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  const sorted = [...counts.entries()].sort(
    ([leftValue, leftCount], [rightValue, rightCount]) =>
      rightCount - leftCount || leftValue.localeCompare(rightValue)
  )
  return sorted[0]?.[1] >= 2 ? sorted[0][0] : undefined
}

function citationContentSets(items: EvaluationItem[]): string[][] {
  return items.map((item) =>
    item.evidence
      .filter((citation) => citation.verified)
      .map((citation) => citation.contentHash)
      .sort()
  )
}

function evidenceAgrees(items: EvaluationItem[]): boolean {
  const sets = citationContentSets(items)
  if (sets.every((set) => set.length === 0)) return true
  if (sets.some((set) => set.length === 0)) return false
  return sets.every((set) =>
    set.some((hash) => sets.every((candidate) => candidate.includes(hash)))
  )
}

function aggregateCriterion(
  criterionId: string,
  items: EvaluationItem[]
): AggregatedEvaluationItem {
  const reasons: string[] = []
  if (items.length !== 3) {
    reasons.push(`${criterionId}: missing one or more independent runs`)
  }
  const applicability = items.map((item) => item.applicability)
  if (new Set(applicability).size !== 1) {
    reasons.push(`${criterionId}: applicability differs across runs`)
  }
  const mustPassValues = items.map((item) => item.mustPass)
  if (new Set(mustPassValues).size !== 1) {
    reasons.push(`${criterionId}: must-pass result differs across runs`)
  }
  const evidenceStatuses = items.map((item) => item.evidenceStatus)
  if (new Set(evidenceStatuses).size !== 1) {
    reasons.push(`${criterionId}: evidence sufficiency differs across runs`)
  }
  const uncertaintyFlags = items.map((item) =>
    item.uncertainty.trim() ? "uncertain" : "certain"
  )
  if (new Set(uncertaintyFlags).size !== 1) {
    reasons.push(`${criterionId}: uncertainty differs across runs`)
  }
  if (!evidenceAgrees(items)) {
    reasons.push(`${criterionId}: verified evidence does not converge`)
  }

  const qualityValues = items
    .map((item) => item.qualityLevel)
    .filter((level): level is QualityLevel => Boolean(level))
  let qualityLevel: QualityLevel | undefined
  if (qualityValues.length > 0) {
    qualityLevel = mode(qualityValues)
    const qualityRange =
      Math.max(...qualityValues.map((level) => QUALITY_ORDER[level])) -
      Math.min(...qualityValues.map((level) => QUALITY_ORDER[level]))
    if (!qualityLevel) {
      reasons.push(`${criterionId}: no quality level appears twice`)
    }
    if (qualityRange > 1) {
      reasons.push(`${criterionId}: quality levels differ by more than one tier`)
    }
  }

  return {
    criterionId,
    status: reasons.length === 0 ? "stable" : "unstable",
    representative: items[0] ?? null,
    mustPass: items[0]?.mustPass ?? "undetermined",
    qualityLevel,
    reasons,
  }
}

export function aggregateEvaluationRuns(
  runs: EvaluationRun[]
): EvaluationAggregation {
  if (!comparableRuns(runs)) {
    return {
      status: "unstable",
      overall: "blocked",
      items: [],
      reasons: [
        "Exactly three runs with the same constitution, target, model, Codex, prompt, and schema versions are required",
      ],
    }
  }

  const criterionIds = new Set(
    runs.flatMap((run) => run.items.map((item) => item.criterionId))
  )
  const items = [...criterionIds]
    .sort()
    .map((criterionId) =>
      aggregateCriterion(
        criterionId,
        runs.flatMap((run) =>
          run.items.filter((item) => item.criterionId === criterionId)
        )
      )
    )
  const reasons = items.flatMap((item) => item.reasons)
  if (reasons.length > 0) {
    return { status: "unstable", overall: "blocked", items, reasons }
  }

  const blocked = items.some((item) => {
    const representative = item.representative
    return (
      !representative ||
      representative.applicability === "uncertain" ||
      representative.evidenceStatus !== "sufficient" ||
      item.mustPass === "undetermined"
    )
  })
  if (blocked) {
    return {
      status: "stable",
      overall: "blocked",
      items,
      reasons: ["One or more criteria cannot be decided from valid evidence"],
    }
  }

  const hasFailure = items.some((item) => item.mustPass === "fail")
  return {
    status: "stable",
    overall: hasFailure ? "not_met" : "met",
    items,
    reasons: [],
  }
}
