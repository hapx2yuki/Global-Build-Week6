import type { NextRequest } from "next/server"

import {
  ApiFailure,
  errorResponse,
  jsonResponse,
  readJsonObject,
} from "@/lib/criteriaforge/api"
import {
  compileConstitution,
  ConstitutionCompileError,
  type CompilableDraft,
} from "@/lib/criteriaforge/constitution"
import {
  EvaluationRunSchema,
  type EvaluationRun,
} from "@/lib/criteriaforge/contracts"
import { assertLocalSession } from "@/lib/criteriaforge/request-security"
import { getStore } from "@/lib/criteriaforge/storage"
import { validateSchema } from "@/lib/criteriaforge/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Context = { params: Promise<{ id: string }> }

function strings(value: unknown): string[] {
  if (value === undefined) return []
  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== "string")
  ) {
    throw new ApiFailure(
      400,
      "invalid_decision_ids",
      "Decision identifiers must be an array of strings.",
      "Reload the compile review and try again."
    )
  }
  return value
}

function calibrationRuns(value: unknown): EvaluationRun[] {
  if (!Array.isArray(value) || value.length !== 3) {
    throw new ApiFailure(
      400,
      "three_calibration_runs_required",
      "Compilation requires exactly three calibration runs.",
      "Run calibration three times with the same model and settings."
    )
  }
  return value.map((candidate, index) => {
    const result = validateSchema<EvaluationRun>(
      EvaluationRunSchema,
      candidate
    )
    if (!result.success) {
      throw new ApiFailure(
        400,
        "invalid_calibration_run",
        `Calibration run ${index + 1} does not match the evaluation contract.`,
        "Discard the invalid run and calibrate again."
      )
    }
    return result.value
  })
}

export async function POST(request: NextRequest, context: Context) {
  try {
    assertLocalSession(request, true)
    const { id } = await context.params
    const store = getStore()
    const draft = store.getDraftConstitution(id)
    if (!draft) {
      throw new ApiFailure(
        404,
        "draft_not_found",
        "The requested Product Constitution draft does not exist.",
        "Return to the constitution workspace."
      )
    }
    const workspace = store.getWorkspace(draft.workspaceId)
    if (!workspace) {
      throw new ApiFailure(
        404,
        "workspace_not_found",
        "The draft workspace no longer exists.",
        "Return to the workspace list."
      )
    }
    const idempotencyKey = request.headers.get("idempotency-key")
    if (!idempotencyKey || idempotencyKey.length > 160) {
      throw new ApiFailure(
        400,
        "idempotency_key_required",
        "Compilation requires an Idempotency-Key header.",
        "Retry from the compile review."
      )
    }
    const body = await readJsonObject(request)
    if (
      typeof body.version !== "string" ||
      !/^[0-9]+\.[0-9]+$/.test(body.version) ||
      typeof body.createdBy !== "string" ||
      !body.createdBy.trim()
    ) {
      throw new ApiFailure(
        400,
        "invalid_compile_identity",
        "A semantic version and the human Constitution Owner are required.",
        "Enter the version and owner in the compile review."
      )
    }

    const { constitution, gates } = compileConstitution({
      draft: draft.contract as unknown as CompilableDraft,
      workspaceId: workspace.id,
      sourceLanguage: workspace.sourceLanguage,
      version: body.version,
      createdBy: body.createdBy.trim(),
      calibrationRuns: calibrationRuns(body.calibrationRuns),
      scopeConflict: body.scopeConflict === true,
      answeredQuestionIds: strings(body.answeredQuestionIds),
      resolvedContradictionIds: strings(body.resolvedContradictionIds),
      parentVersionId:
        typeof body.parentVersionId === "string"
          ? body.parentVersionId
          : undefined,
    })
    const existing = store
      .listConstitutionVersions(workspace.id)
      .find(
        (candidate) =>
          candidate.version === constitution.version ||
          candidate.contentHash === constitution.contentHash
      )
    if (existing) {
      return jsonResponse({ version: existing, gates, existing: true })
    }
    const checkId = store.saveCompileCheck(id, {
      gates,
      calibrationRunIds: calibrationRuns(body.calibrationRuns).map(
        (run) => run.runId
      ),
      idempotencyKey,
    })
    const version = store.saveConstitutionVersion(constitution)
    return jsonResponse({ version, gates, checkId, existing: false }, 201)
  } catch (error) {
    if (error instanceof ConstitutionCompileError) {
      return errorResponse(
        new ApiFailure(
          409,
          "constitution_not_compilable",
          error.message,
          "Resolve every failed safeguard before creating an immutable version.",
          false,
          Object.fromEntries(
            error.gates
              .filter((gate) => !gate.passed)
              .map((gate) => [gate.key, gate.failures])
          )
        )
      )
    }
    return errorResponse(error)
  }
}
