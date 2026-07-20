import {
  type CalibrationGeneration,
  type Criterion,
  type EvaluationItem,
  type EvaluationRun,
} from "@/lib/criteriaforge/contracts"

type CalibrationRunMetadata = Omit<EvaluationRun, "items">

function caseKey(criterionId: string, exampleId: string): string {
  return `${criterionId}\u0000${exampleId}`
}

export function buildCalibrationRun(input: {
  generated: CalibrationGeneration
  criteria: Criterion[]
  metadata: CalibrationRunMetadata
}): EvaluationRun {
  const expected = new Map(
    input.criteria.flatMap((criterion) =>
      criterion.examples.map((example) => [
        caseKey(criterion.criterionId, example.exampleId),
        { criterion, example },
      ])
    )
  )
  const returned = new Map<
    string,
    CalibrationGeneration["cases"][number]
  >()

  for (const result of input.generated.cases) {
    const key = caseKey(result.criterionId, result.exampleId)
    if (!expected.has(key)) {
      throw new Error(
        `Calibration returned an unknown case: ${result.criterionId}/${result.exampleId}`
      )
    }
    if (returned.has(key)) {
      throw new Error(
        `Calibration returned a duplicate case: ${result.criterionId}/${result.exampleId}`
      )
    }
    returned.set(key, result)
  }

  if (returned.size !== expected.size) {
    const missing = [...expected.keys()]
      .filter((key) => !returned.has(key))
      .map((key) => key.replace("\u0000", "/"))
    throw new Error(`Calibration omitted cases: ${missing.join(", ")}`)
  }

  const items: EvaluationItem[] = input.criteria.map((criterion) => {
    const cases = criterion.examples.map((example) => {
      const result = returned.get(
        caseKey(criterion.criterionId, example.exampleId)
      )
      if (!result) throw new Error("Calibration result disappeared")
      return { example, result }
    })
    const mismatches = cases.filter(
      ({ example, result }) => example.kind !== result.predictedKind
    )
    const uncertainty = cases
      .map(({ example, result }) =>
        result.uncertainty.trim()
          ? `${example.exampleId}: ${result.uncertainty.trim()}`
          : ""
      )
      .filter(Boolean)
      .join("\n")
    const observed = cases
      .map(
        ({ example, result }) =>
          `${example.exampleId}: expected ${example.kind}; predicted ${result.predictedKind}. ${result.explanation}`
      )
      .join("\n")
    const matched = mismatches.length === 0

    return {
      criterionId: criterion.criterionId,
      intent: `Classify every ratified calibration example consistently with its expected good, bad, or boundary outcome for: ${criterion.observableExpectation}`,
      observed,
      evidence: [],
      gap: matched
        ? "All calibration examples matched their ratified expected classifications."
        : `Mismatched calibration examples: ${mismatches
            .map(({ example }) => example.exampleId)
            .join(", ")}`,
      applicability: "applicable",
      applicabilityReason:
        "Ratified calibration examples are directly applicable to their owning criterion.",
      evidenceStatus: "sufficient",
      mustPass:
        criterion.kind === "must_pass"
          ? matched
            ? "pass"
            : "fail"
          : "not_applicable",
      ...(criterion.kind === "quality"
        ? { qualityLevel: matched ? ("good" as const) : ("insufficient" as const) }
        : {}),
      uncertainty,
      remediationPriority: matched ? "none" : "high",
    }
  })

  return { ...input.metadata, items }
}
