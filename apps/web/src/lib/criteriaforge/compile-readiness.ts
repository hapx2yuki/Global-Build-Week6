import {
  CONSTITUTION_SECTION_KEYS,
  type Criterion,
  type EvaluationRun,
  type ProductConstitution,
} from "@/lib/criteriaforge/contracts"
import { aggregateEvaluationRuns } from "@/lib/criteriaforge/evaluation"

export type OpenQuestion = {
  questionId: string
  material: boolean
  status: "open" | "answered" | "deferred"
}

export type Contradiction = {
  contradictionId: string
  material: boolean
  equalAuthority: boolean
  resolvedByHuman: boolean
}

export type CompileReadinessInput = {
  constitution: Omit<ProductConstitution, "immutable" | "contentHash">
  openQuestions: OpenQuestion[]
  contradictions: Contradiction[]
  scopeConflict: boolean
  calibrationRuns: EvaluationRun[]
}

export type CompileGateKey =
  | "intent_complete"
  | "ratified"
  | "evaluable"
  | "consistent"
  | "stable"

export type CompileGateResult = {
  key: CompileGateKey
  passed: boolean
  failures: string[]
}

function isNonEmpty(value: string | undefined): boolean {
  return Boolean(value?.trim())
}

function criterionEvaluabilityFailures(criterion: Criterion): string[] {
  const failures: string[] = []
  if (!isNonEmpty(criterion.observableExpectation)) {
    failures.push(`${criterion.criterionId}: observable expectation is missing`)
  }
  if (criterion.evidenceRequirement.allowedKinds.length === 0) {
    failures.push(`${criterion.criterionId}: evidence kind is missing`)
  }
  if (criterion.evidenceRequirement.minimumCount < 1) {
    failures.push(`${criterion.criterionId}: evidence minimum is missing`)
  }
  if (!isNonEmpty(criterion.minimumBoundary)) {
    failures.push(`${criterion.criterionId}: pass or quality boundary is missing`)
  }
  if (criterion.examples.length === 0) {
    failures.push(`${criterion.criterionId}: calibration example is missing`)
  }
  return failures
}

export function evaluateCompileReadiness(
  input: CompileReadinessInput
): CompileGateResult[] {
  const { constitution } = input
  const sectionKeys = new Set(constitution.sections.map((section) => section.key))
  const intentFailures: string[] = []

  for (const requiredKey of ["purpose", "experience", "scope"] as const) {
    if (!sectionKeys.has(requiredKey)) {
      intentFailures.push(`Required section is missing: ${requiredKey}`)
    }
  }
  if (constitution.criteria.every((criterion) => criterion.kind !== "must_pass")) {
    intentFailures.push("At least one must-pass criterion is required")
  }
  if (
    input.openQuestions.some(
      (question) => question.material && question.status !== "answered"
    )
  ) {
    intentFailures.push("A material question remains unresolved")
  }
  if (
    constitution.sections.some(
      (section) =>
        section.importance === "material" &&
        section.provenance === "ai_proposed" &&
        !isNonEmpty(section.originalText)
    )
  ) {
    intentFailures.push("A material blank was filled without source intent")
  }

  const ratifiedFailures: string[] = []
  for (const criterion of constitution.criteria) {
    if (
      criterion.kind === "must_pass" &&
      criterion.approvalStatus !== "approved"
    ) {
      ratifiedFailures.push(
        `${criterion.criterionId}: must-pass criterion is not approved`
      )
    }
    if (
      criterion.provenance === "ai_proposed" &&
      criterion.approvalStatus !== "approved"
    ) {
      ratifiedFailures.push(
        `${criterion.criterionId}: material AI proposal is not ratified`
      )
    }
    if (!isNonEmpty(criterion.owner)) {
      ratifiedFailures.push(`${criterion.criterionId}: owner is missing`)
    }
  }
  if (
    constitution.sections.some(
      (section) =>
        section.importance === "material" &&
        section.approvalStatus !== "approved"
    )
  ) {
    ratifiedFailures.push("A material constitution section is not approved")
  }

  const evaluableFailures = constitution.criteria.flatMap(
    criterionEvaluabilityFailures
  )

  const consistentFailures: string[] = []
  if (
    input.contradictions.some(
      (contradiction) =>
        contradiction.material &&
        contradiction.equalAuthority &&
        !contradiction.resolvedByHuman
    )
  ) {
    consistentFailures.push(
      "Equally authoritative evidence has an unresolved material conflict"
    )
  }
  if (input.scopeConflict) {
    consistentFailures.push(
      "A must-pass requirement conflicts with an explicit non-goal"
    )
  }
  const duplicateSections = CONSTITUTION_SECTION_KEYS.filter(
    (key) =>
      constitution.sections.filter((section) => section.key === key).length !== 1
  )
  if (duplicateSections.length > 0) {
    consistentFailures.push(
      `Each constitution section must occur exactly once: ${duplicateSections.join(
        ", "
      )}`
    )
  }

  const stability = aggregateEvaluationRuns(input.calibrationRuns)
  const stableFailures =
    stability.status === "stable"
      ? []
      : stability.reasons.length > 0
        ? stability.reasons
        : ["Three comparable calibration runs are required"]

  return [
    {
      key: "intent_complete",
      passed: intentFailures.length === 0,
      failures: intentFailures,
    },
    {
      key: "ratified",
      passed: ratifiedFailures.length === 0,
      failures: ratifiedFailures,
    },
    {
      key: "evaluable",
      passed: evaluableFailures.length === 0,
      failures: evaluableFailures,
    },
    {
      key: "consistent",
      passed: consistentFailures.length === 0,
      failures: consistentFailures,
    },
    {
      key: "stable",
      passed: stableFailures.length === 0,
      failures: stableFailures,
    },
  ]
}

export function canCompile(results: CompileGateResult[]): boolean {
  return (
    results.length === 5 && results.every((result) => result.passed)
  )
}
