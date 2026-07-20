import { createHash } from "node:crypto"
import fs from "node:fs"
import path from "node:path"

import type { NextRequest } from "next/server"

import {
  ApiFailure,
  errorResponse,
  jsonResponse,
  readJsonObject,
} from "@/lib/criteriaforge/api"
import { buildCalibrationRun } from "@/lib/criteriaforge/calibration"
import {
  CodexRunner,
  CodexRunnerError,
} from "@/lib/criteriaforge/codex-runner"
import {
  CalibrationGenerationSchema,
  type Criterion,
  type EvaluationRun,
} from "@/lib/criteriaforge/contracts"
import { aggregateEvaluationRuns } from "@/lib/criteriaforge/evaluation"
import { calibrationPrompt } from "@/lib/criteriaforge/prompts"
import { assertLocalSession } from "@/lib/criteriaforge/request-security"
import { workspaceStorageRoot } from "@/lib/criteriaforge/runtime"
import { getStore } from "@/lib/criteriaforge/storage"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Context = { params: Promise<{ id: string }> }

type DraftContract = {
  sections: Array<{ sectionId: string; meaningHash: string }>
  criteria: Criterion[]
  [key: string]: unknown
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex")
}

async function runCalibrationJob(input: {
  jobId: string
  draftId: string
  workspaceId: string
  sourceLanguage: string
  sectionMeaningHashes: Array<{
    sectionId: string
    meaningHash: string
  }>
  criteria: Criterion[]
  model: string
  reasoningEffort: string
}) {
  const store = getStore()
  try {
    store.updateBackgroundJob(input.jobId, {
      status: "running",
      progress: 5,
    })
    const prompt = calibrationPrompt({
      sourceLanguage: input.sourceLanguage,
      criteria: input.criteria,
    })
    const workspaceRoot = workspaceStorageRoot(input.workspaceId, store.root)
    const isolatedRoot = path.join(
      workspaceRoot,
      "runs",
      input.jobId,
      "calibration-cwd"
    )
    fs.mkdirSync(isolatedRoot, { recursive: true, mode: 0o700 })
    fs.chmodSync(isolatedRoot, 0o700)

    const runner = new CodexRunner()
    const results = await Promise.all(
      [1, 2, 3].map(async (runIndex) => {
        const cwd = path.join(isolatedRoot, `run-${runIndex}`)
        fs.mkdirSync(cwd, { recursive: true, mode: 0o700 })
        const result = await runner.runStructured({
          purpose: "calibration",
          model: input.model,
          reasoningEffort: input.reasoningEffort,
          sandbox: "read-only",
          prompt,
          outputSchema: CalibrationGenerationSchema,
          cwd,
          runRoot: path.join(workspaceRoot, "runs"),
          timeoutMs: 15 * 60 * 1_000,
        })
        const run = buildCalibrationRun({
          generated: result.value,
          criteria: input.criteria,
          metadata: {
            runId: result.runId,
            constitutionVersionId: `draft:${input.draftId}`,
            targetSnapshotId: `calibration:${sha256(prompt)}`,
            modelId: input.model,
            reasoningEffort: input.reasoningEffort,
            codexVersion: result.codexVersion,
            promptVersion: "calibration-1.0.0",
            schemaVersion: "1.0.0",
            startedAt: result.startedAt,
            completedAt: result.completedAt,
          },
        })
        return { run, outputHash: result.outputHash }
      })
    )
    const runs: EvaluationRun[] = results.map((result) => result.run)
    const aggregation = aggregateEvaluationRuns(runs)
    store.updateBackgroundJob(input.jobId, {
      status: "completed",
      progress: 100,
      result: {
        calibrationRuns: runs,
        aggregation,
        outputHashes: results.map((result) => result.outputHash),
        draftId: input.draftId,
        semanticHashes: {
          sections: input.sectionMeaningHashes,
          criteria: input.criteria.map((criterion) => ({
            criterionId: criterion.criterionId,
            meaningHash: criterion.meaningHash,
          })),
        },
      },
    })
  } catch (error) {
    store.updateBackgroundJob(input.jobId, {
      status: "failed",
      progress: 100,
      error: {
        code:
          error instanceof CodexRunnerError
            ? error.code
            : "calibration_failed",
        message:
          error instanceof Error ? error.message : "Calibration failed.",
        retryable:
          error instanceof CodexRunnerError ? error.retryable : false,
      },
    })
  }
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
    const body = await readJsonObject(request)
    if (body.confirmed !== true) {
      throw new ApiFailure(
        400,
        "egress_confirmation_required",
        "Calibration requires a fresh confirmation before the draft and examples are sent to Codex.",
        "Review the model, purpose, criteria, examples, and local save location."
      )
    }
    const model =
      body.model === "gpt-5.6-terra" || body.model === "gpt-5.6-sol"
        ? body.model
        : null
    if (!model) {
      throw new ApiFailure(
        400,
        "unsupported_model",
        "Choose gpt-5.6-terra or gpt-5.6-sol.",
        "Select an available model. CriteriaForge will not switch silently."
      )
    }
    const reasoningEffort =
      typeof body.reasoningEffort === "string"
        ? body.reasoningEffort
        : "high"
    const contract = draft.contract as unknown as DraftContract
    if (
      !Array.isArray(contract.criteria) ||
      contract.criteria.length === 0 ||
      contract.criteria.some(
        (criterion) =>
          !Array.isArray(criterion.examples) ||
          criterion.examples.length === 0 ||
          criterion.examples.some((example) => !example.ratified)
      )
    ) {
      throw new ApiFailure(
        409,
        "ratified_calibration_cases_required",
        "Every criterion needs at least one human-ratified calibration example.",
        "Approve or edit the good, bad, and boundary examples before calibration."
      )
    }
    const idempotencyKey = request.headers.get("idempotency-key")
    if (!idempotencyKey || idempotencyKey.length > 160) {
      throw new ApiFailure(
        400,
        "idempotency_key_required",
        "Calibration requires an Idempotency-Key header.",
        "Retry from the compile review."
      )
    }
    const inputHash = sha256(
      JSON.stringify({
        draftId: id,
        revision: draft.revision,
        model,
        reasoningEffort,
        criteria: contract.criteria,
      })
    )
    const { job, existing } = store.createBackgroundJob({
      workspaceId: draft.workspaceId,
      type: "constitution_calibration",
      idempotencyKey,
      inputHash,
    })
    if (!existing) {
      store.saveEgressApproval({
        workspaceId: draft.workspaceId,
        purpose: "calibration",
        modelId: model,
        segmentIds: contract.criteria.flatMap((criterion) =>
          criterion.examples.map((example) => example.exampleId)
        ),
        hashes: [sha256(JSON.stringify(contract.criteria))],
      })
      void runCalibrationJob({
        jobId: job.id,
        draftId: id,
        workspaceId: draft.workspaceId,
        sourceLanguage: workspace.sourceLanguage,
        sectionMeaningHashes: contract.sections.map((section) => ({
          sectionId: section.sectionId,
          meaningHash: section.meaningHash,
        })),
        criteria: contract.criteria,
        model,
        reasoningEffort,
      })
    }
    return jsonResponse({ job, existing }, 202)
  } catch (error) {
    return errorResponse(error)
  }
}
