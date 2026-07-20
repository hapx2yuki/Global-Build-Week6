import { createHash, randomUUID } from "node:crypto"

import {
  ProductConstitutionSchema,
  type Citation,
  type ConstitutionSection,
  type Criterion,
  type EvaluationRun,
  type ProductConstitution,
} from "@/lib/criteriaforge/contracts"
import {
  canCompile,
  evaluateCompileReadiness,
  type CompileGateResult,
} from "@/lib/criteriaforge/compile-readiness"
import { assertSchema } from "@/lib/criteriaforge/validation"

export type CompilableDraft = {
  schemaVersion: "1.0.0"
  sections: ConstitutionSection[]
  criteria: Criterion[]
  citations: Citation[]
  openQuestions: Array<{
    questionId: string
    material?: boolean
    impact?: "material" | "important" | "supporting"
    status?: "open" | "answered" | "deferred"
  }>
  contradictions: Array<{
    contradictionId: string
    material: boolean
    equalAuthority: boolean
    resolvedByHuman?: boolean
  }>
}

export class ConstitutionCompileError extends Error {
  constructor(readonly gates: CompileGateResult[]) {
    super(
      `Product Constitution cannot be compiled: ${gates
        .filter((gate) => !gate.passed)
        .map((gate) => `${gate.key}: ${gate.failures.join(", ")}`)
        .join("; ")}`
    )
  }
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, nested]) => nested !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, canonicalize(nested)])
    )
  }
  return value
}

export function sha256Canonical(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(value)), "utf8")
    .digest("hex")
}

export function compileConstitution(input: {
  draft: CompilableDraft
  workspaceId: string
  sourceLanguage: string
  version: string
  createdBy: string
  calibrationRuns: EvaluationRun[]
  scopeConflict: boolean
  answeredQuestionIds?: readonly string[]
  resolvedContradictionIds?: readonly string[]
  constitutionId?: string
  parentVersionId?: string
  createdAt?: string
}): {
  constitution: ProductConstitution
  gates: CompileGateResult[]
} {
  const answered = new Set(input.answeredQuestionIds ?? [])
  const resolved = new Set(input.resolvedContradictionIds ?? [])
  const createdAt = input.createdAt ?? new Date().toISOString()
  const base = {
    schemaVersion: "1.0.0" as const,
    constitutionId: input.constitutionId ?? randomUUID(),
    workspaceId: input.workspaceId,
    version: input.version,
    sourceLanguage: input.sourceLanguage,
    sections: input.draft.sections,
    criteria: input.draft.criteria,
    citations: input.draft.citations,
    ...(input.parentVersionId
      ? { parentVersionId: input.parentVersionId }
      : {}),
    createdAt,
    createdBy: input.createdBy,
  }
  const gates = evaluateCompileReadiness({
    constitution: base,
    openQuestions: input.draft.openQuestions.map((question) => ({
      questionId: question.questionId,
      material:
        question.material === true || question.impact === "material",
      status:
        question.status === "answered" || answered.has(question.questionId)
          ? "answered"
          : question.status ?? "open",
    })),
    contradictions: input.draft.contradictions.map((contradiction) => ({
      contradictionId: contradiction.contradictionId,
      material: contradiction.material,
      equalAuthority: contradiction.equalAuthority,
      resolvedByHuman:
        contradiction.resolvedByHuman === true ||
        resolved.has(contradiction.contradictionId),
    })),
    scopeConflict: input.scopeConflict,
    calibrationRuns: input.calibrationRuns,
  })
  if (!canCompile(gates)) throw new ConstitutionCompileError(gates)

  const withoutHash = {
    ...base,
    immutable: true as const,
  }
  const constitution = assertSchema<ProductConstitution>(
    ProductConstitutionSchema,
    {
      ...withoutHash,
      contentHash: sha256Canonical(withoutHash),
    }
  )
  return { constitution, gates }
}
