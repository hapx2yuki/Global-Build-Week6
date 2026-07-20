import { createHash } from "node:crypto"

import type {
  ConstitutionSection,
  Criterion,
} from "@/lib/criteriaforge/contracts"

export type SemanticChange = {
  changed: boolean
  changedFields: string[]
  affectedIds: string[]
}

const PRESENTATION_PUNCTUATION = /[.,;:!?。，、；：！？'"“”‘’`*_#>[\](){}]/gu

function normalizeSemanticText(value: string): string {
  return value
    .normalize("NFKC")
    .replace(PRESENTATION_PUNCTUATION, " ")
    .replace(/\s+/gu, " ")
    .trim()
}

function canonicalize(value: unknown): unknown {
  if (typeof value === "string") return normalizeSemanticText(value)
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, canonicalize(nested)])
    )
  }
  return value
}

function semanticProjection(criterion: Omit<Criterion, "meaningHash">) {
  return {
    definition: criterion.definition,
    kind: criterion.kind,
    appliesWhen: criterion.appliesWhen,
    excludedWhen: criterion.excludedWhen,
    observableExpectation: criterion.observableExpectation,
    evidenceRequirement: criterion.evidenceRequirement,
    minimumBoundary: criterion.minimumBoundary,
    qualityDefinitions: criterion.qualityDefinitions,
    examples: criterion.examples.map((example) => ({
      kind: example.kind,
      originalLanguage: example.originalLanguage,
      originalText: example.originalText,
      expectedOutcome: example.expectedOutcome,
    })),
    authority: criterion.authority,
    dependencies: [...criterion.dependencies].sort(),
  }
}

export function calculateCriterionMeaningHash(
  criterion: Omit<Criterion, "meaningHash">
): string {
  const canonical = JSON.stringify(canonicalize(semanticProjection(criterion)))
  return createHash("sha256").update(canonical, "utf8").digest("hex")
}

export function calculateSectionMeaningHash(
  section: Omit<
    ConstitutionSection,
    "meaningHash" | "lastEditedBy" | "lastEditedAt"
  >
): string {
  const semantic = {
    key: section.key,
    originalLanguage: section.originalLanguage,
    originalText: section.originalText,
    authority: section.authority,
    importance: section.importance,
    dependentCriterionIds: [...section.dependentCriterionIds].sort(),
  }
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(semantic)), "utf8")
    .digest("hex")
}

export function classifyCriterionChange(
  before: Criterion,
  after: Criterion,
  dependents: ReadonlyMap<string, readonly string[]>
): SemanticChange {
  const fields = Object.keys(semanticProjection(before)) as Array<
    keyof ReturnType<typeof semanticProjection>
  >
  const changedFields = fields.filter((field) => {
    const left = JSON.stringify(
      canonicalize(semanticProjection(before)[field])
    )
    const right = JSON.stringify(
      canonicalize(semanticProjection(after)[field])
    )
    return left !== right
  })

  if (changedFields.length === 0) {
    return { changed: false, changedFields: [], affectedIds: [] }
  }

  return {
    changed: true,
    changedFields,
    affectedIds: collectDependents(after.criterionId, dependents),
  }
}

export function collectDependents(
  rootId: string,
  dependents: ReadonlyMap<string, readonly string[]>
): string[] {
  const visited = new Set<string>()
  const queue = [rootId]
  while (queue.length > 0) {
    const current = queue.shift()
    if (!current || visited.has(current)) continue
    visited.add(current)
    for (const dependent of dependents.get(current) ?? []) {
      if (!visited.has(dependent)) queue.push(dependent)
    }
  }
  return [...visited]
}
