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
import {
  CodexRunner,
  CodexRunnerError,
} from "@/lib/criteriaforge/codex-runner"
import {
  EvaluationGenerationSchema,
  type EvaluationRun,
} from "@/lib/criteriaforge/contracts"
import { aggregateEvaluationRuns } from "@/lib/criteriaforge/evaluation"
import {
  evaluationPrompt,
  type ApprovedEvidenceExcerpt,
} from "@/lib/criteriaforge/prompts"
import { assertLocalSession } from "@/lib/criteriaforge/request-security"
import { workspaceStorageRoot } from "@/lib/criteriaforge/runtime"
import { getStore } from "@/lib/criteriaforge/storage"
import { verifyEvaluationGeneration } from "@/lib/criteriaforge/verify-evaluation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type ApprovedSegment = {
  sourceId: string
  segmentId: string
  contentHash: string
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex")
}

function approvedSegments(value: unknown): ApprovedSegment[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 500) {
    throw new ApiFailure(
      400,
      "approved_segments_required",
      "Choose between 1 and 500 evidence segments for evaluation.",
      "Review the send confirmation and select the relevant evidence."
    )
  }
  return value.map((candidate) => {
    if (!candidate || typeof candidate !== "object") {
      throw new ApiFailure(
        400,
        "invalid_approved_segment",
        "An approved evidence segment is invalid.",
        "Review the send confirmation."
      )
    }
    const item = candidate as Record<string, unknown>
    if (
      typeof item.sourceId !== "string" ||
      typeof item.segmentId !== "string" ||
      typeof item.contentHash !== "string"
    ) {
      throw new ApiFailure(
        400,
        "invalid_approved_segment",
        "An approved segment is missing an identifier or hash.",
        "Review the send confirmation."
      )
    }
    return {
      sourceId: item.sourceId,
      segmentId: item.segmentId,
      contentHash: item.contentHash,
    }
  })
}

function loadApprovedExcerpts(
  workspaceId: string,
  approved: ApprovedSegment[]
): ApprovedEvidenceExcerpt[] {
  const store = getStore()
  const excerpts = approved.map((approval) => {
    const source = store.getEvidenceSource(approval.sourceId)
    const segment = store
      .listEvidenceSegments(approval.sourceId)
      .find((candidate) => candidate.id === approval.segmentId)
    if (
      !source ||
      source.workspaceId !== workspaceId ||
      !segment ||
      !segment.readable ||
      segment.contentHash !== approval.contentHash
    ) {
      throw new ApiFailure(
        409,
        "evidence_changed",
        "Approved evidence is missing, unreadable, or changed.",
        "Review and approve the evidence again."
      )
    }
    const content = store.readNormalizedSegment(source.id, segment.id)
    if (content === null || sha256(content) !== segment.contentHash) {
      throw new ApiFailure(
        409,
        "evidence_hash_mismatch",
        "Normalized evidence failed its local content-hash check.",
        "Re-import the affected source."
      )
    }
    return {
      sourceId: source.id,
      segmentId: segment.id,
      originalLanguage: source.originalLanguage ?? "und",
      authorityRank: source.authorityRank,
      locator: segment.locator,
      contentHash: segment.contentHash,
      content,
    }
  })
  const characterCount = excerpts.reduce(
    (total, excerpt) => total + excerpt.content.length,
    0
  )
  if (characterCount > 480_000) {
    throw new ApiFailure(
      413,
      "codex_text_limit",
      "The approved evaluation excerpts exceed the approximately 120,000-token send limit.",
      "Choose a narrower set of product evidence."
    )
  }
  return excerpts
}

async function runEvaluationJob(input: {
  jobId: string
  workspaceId: string
  constitutionVersionId: string
  targetSnapshotId: string
  model: string
  reasoningEffort: string
  excerpts: ApprovedEvidenceExcerpt[]
}) {
  const store = getStore()
  try {
    const constitution = store.getConstitutionVersion(
      input.constitutionVersionId
    )
    const target = store.getTargetSnapshot(input.targetSnapshotId)
    if (
      !constitution ||
      !target ||
      constitution.workspaceId !== input.workspaceId ||
      target.workspaceId !== input.workspaceId
    ) {
      throw new Error("The constitution and target snapshot do not match")
    }
    store.updateBackgroundJob(input.jobId, {
      status: "running",
      progress: 5,
    })
    const workspaceRoot = workspaceStorageRoot(input.workspaceId, store.root)
    const isolatedRoot = path.join(
      workspaceRoot,
      "runs",
      input.jobId,
      "evaluation-cwd"
    )
    fs.mkdirSync(isolatedRoot, { recursive: true, mode: 0o700 })
    const prompt = evaluationPrompt({
      constitution: constitution.contract,
      criteria: constitution.contract.criteria,
      excerpts: input.excerpts,
    })
    const runner = new CodexRunner()
    const generated = await Promise.all(
      [1, 2, 3].map(async (runIndex) => {
        const cwd = path.join(isolatedRoot, `run-${runIndex}`)
        fs.mkdirSync(cwd, { recursive: true, mode: 0o700 })
        const result = await runner.runStructured({
          purpose: "evaluation",
          model: input.model,
          reasoningEffort: input.reasoningEffort,
          sandbox: "read-only",
          prompt,
          outputSchema: EvaluationGenerationSchema,
          cwd,
          runRoot: path.join(workspaceRoot, "runs"),
          timeoutMs: 15 * 60 * 1_000,
        })
        const verified = verifyEvaluationGeneration({
          generated: result.value,
          approvedExcerpts: input.excerpts,
          criteria: constitution.contract.criteria,
        })
        const evaluation: EvaluationRun = {
          runId: result.runId,
          constitutionVersionId: constitution.id,
          targetSnapshotId: target.id,
          modelId: input.model,
          reasoningEffort: input.reasoningEffort,
          codexVersion: result.codexVersion,
          promptVersion: "evaluation-1.0.0",
          schemaVersion: "1.0.0",
          items: verified.items,
          startedAt: result.startedAt,
          completedAt: result.completedAt,
        }
        store.saveEvaluationRun({
          workspaceId: input.workspaceId,
          constitutionVersionId: constitution.id,
          targetSnapshotId: target.id,
          runIndex,
          status: "completed",
          settings: {
            modelId: input.model,
            reasoningEffort: input.reasoningEffort,
            codexVersion: result.codexVersion,
            promptVersion: evaluation.promptVersion,
            schemaVersion: evaluation.schemaVersion,
          },
          result: evaluation,
          inputHash: sha256(prompt),
          outputHash: result.outputHash,
          startedAt: result.startedAt,
          completedAt: result.completedAt,
        })
        return {
          evaluation,
          outputHash: result.outputHash,
          rejectedCitationIds: verified.rejectedCitationIds,
        }
      })
    )
    const runs = generated.map((item) => item.evaluation)
    const aggregation = aggregateEvaluationRuns(runs)
    store.updateBackgroundJob(input.jobId, {
      status: "completed",
      progress: 100,
      result: {
        evaluationRunIds: runs.map((run) => run.runId),
        aggregation,
        outputHashes: generated.map((item) => item.outputHash),
        rejectedCitationIds: generated.flatMap(
          (item) => item.rejectedCitationIds
        ),
        constitutionVersionId: constitution.id,
        targetSnapshotId: target.id,
        modelId: input.model,
        reasoningEffort: input.reasoningEffort,
        codexVersions: [...new Set(runs.map((run) => run.codexVersion))],
        promptVersion: "evaluation-1.0.0",
        schemaVersion: "1.0.0",
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
            : "evaluation_failed",
        message:
          error instanceof Error ? error.message : "Evaluation failed.",
        retryable:
          error instanceof CodexRunnerError ? error.retryable : false,
      },
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    assertLocalSession(request, true)
    const body = await readJsonObject(request)
    if (
      body.confirmed !== true ||
      typeof body.workspaceId !== "string" ||
      typeof body.constitutionVersionId !== "string" ||
      typeof body.targetSnapshotId !== "string"
    ) {
      throw new ApiFailure(
        400,
        "evaluation_confirmation_required",
        "Confirm the workspace, immutable constitution, target, and evidence.",
        "Review the send confirmation before running evaluation."
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
        "Select an available model; CriteriaForge will not switch silently."
      )
    }
    const approved = approvedSegments(body.approvedSegments)
    const excerpts = loadApprovedExcerpts(body.workspaceId, approved)
    const idempotencyKey = request.headers.get("idempotency-key")
    if (!idempotencyKey || idempotencyKey.length > 160) {
      throw new ApiFailure(
        400,
        "idempotency_key_required",
        "This operation requires an Idempotency-Key header.",
        "Retry from the evaluation review."
      )
    }
    const reasoningEffort =
      typeof body.reasoningEffort === "string"
        ? body.reasoningEffort
        : "high"
    const inputHash = sha256(
      JSON.stringify({
        constitutionVersionId: body.constitutionVersionId,
        targetSnapshotId: body.targetSnapshotId,
        model,
        reasoningEffort,
        approved,
      })
    )
    const store = getStore()
    const { job, existing } = store.createBackgroundJob({
      workspaceId: body.workspaceId,
      type: "formal_evaluation",
      idempotencyKey,
      inputHash,
    })
    if (!existing) {
      store.saveEgressApproval({
        workspaceId: body.workspaceId,
        purpose: "evaluation",
        modelId: model,
        segmentIds: approved.map((item) => item.segmentId),
        hashes: approved.map((item) => item.contentHash),
      })
      void runEvaluationJob({
        jobId: job.id,
        workspaceId: body.workspaceId,
        constitutionVersionId: body.constitutionVersionId,
        targetSnapshotId: body.targetSnapshotId,
        model,
        reasoningEffort,
        excerpts,
      })
    }
    return jsonResponse({ job, existing }, 202)
  } catch (error) {
    return errorResponse(error)
  }
}
