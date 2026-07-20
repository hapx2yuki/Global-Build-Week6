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
  DraftGenerationSchema,
  type Citation,
} from "@/lib/criteriaforge/contracts"
import { finalizeGeneratedDraft } from "@/lib/criteriaforge/draft"
import {
  assertAllowedProductUse,
  constitutionDraftPrompt,
  type ApprovedEvidenceExcerpt,
} from "@/lib/criteriaforge/prompts"
import { assertLocalSession } from "@/lib/criteriaforge/request-security"
import { workspaceStorageRoot } from "@/lib/criteriaforge/runtime"
import { getStore } from "@/lib/criteriaforge/storage"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Context = { params: Promise<{ id: string }> }

type ApprovedSegmentInput = {
  sourceId: string
  segmentId: string
  contentHash: string
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex")
}

function parseApprovedSegments(value: unknown): ApprovedSegmentInput[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 500) {
    throw new ApiFailure(
      400,
      "approved_segments_required",
      "Choose between 1 and 500 evidence segments for this Codex run.",
      "Review the send confirmation and select the relevant evidence."
    )
  }
  return value.map((candidate, index) => {
    if (!candidate || typeof candidate !== "object") {
      throw new ApiFailure(
        400,
        "invalid_approved_segment",
        `Approved segment ${index + 1} is invalid.`,
        "Review the send confirmation and try again."
      )
    }
    const input = candidate as Record<string, unknown>
    if (
      typeof input.sourceId !== "string" ||
      typeof input.segmentId !== "string" ||
      typeof input.contentHash !== "string"
    ) {
      throw new ApiFailure(
        400,
        "invalid_approved_segment",
        `Approved segment ${index + 1} is missing an identifier or hash.`,
        "Review the send confirmation and try again."
      )
    }
    return {
      sourceId: input.sourceId,
      segmentId: input.segmentId,
      contentHash: input.contentHash,
    }
  })
}

function verifiedExcerpts(
  workspaceId: string,
  approved: ApprovedSegmentInput[]
): ApprovedEvidenceExcerpt[] {
  const store = getStore()
  const excerpts = approved.map((approval) => {
    const source = store.getEvidenceSource(approval.sourceId)
    if (!source || source.workspaceId !== workspaceId) {
      throw new ApiFailure(
        400,
        "unapproved_source",
        "The send confirmation contains a source outside this workspace.",
        "Reopen the send confirmation and select evidence again."
      )
    }
    const segment = store
      .listEvidenceSegments(source.id)
      .find((candidate) => candidate.id === approval.segmentId)
    if (
      !segment ||
      !segment.readable ||
      segment.contentHash !== approval.contentHash
    ) {
      throw new ApiFailure(
        409,
        "evidence_changed",
        "An approved evidence segment is missing, unreadable, or has changed.",
        "Review the source again before sending it to Codex."
      )
    }
    const content = store.readNormalizedSegment(source.id, segment.id)
    if (content === null || sha256(content) !== segment.contentHash) {
      throw new ApiFailure(
        409,
        "evidence_hash_mismatch",
        "The local normalized evidence no longer matches its verified hash.",
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
      "The approved excerpts exceed the approximately 120,000-token send limit.",
      "Choose a narrower set of pages, paragraphs, cells, or code ranges."
    )
  }
  return excerpts
}

async function runDraftJob(input: {
  jobId: string
  workspaceId: string
  sourceLanguage: string
  model: string
  reasoningEffort: string
  excerpts: ApprovedEvidenceExcerpt[]
}) {
  const store = getStore()
  try {
    const current = store.getBackgroundJob(input.jobId)
    if (!current || current.status === "cancelled") return
    store.updateBackgroundJob(input.jobId, {
      status: "running",
      progress: 10,
    })
    const workspaceRoot = workspaceStorageRoot(
      input.workspaceId,
      store.root
    )
    const isolatedCwd = path.join(workspaceRoot, "runs", input.jobId, "cwd")
    fs.mkdirSync(isolatedCwd, { recursive: true, mode: 0o700 })
    fs.chmodSync(isolatedCwd, 0o700)
    const prompt = constitutionDraftPrompt({
      sourceLanguage: input.sourceLanguage,
      excerpts: input.excerpts,
    })
    const result = await new CodexRunner().runStructured({
      purpose: "constitution",
      model: input.model,
      reasoningEffort: input.reasoningEffort,
      sandbox: "read-only",
      prompt,
      outputSchema: DraftGenerationSchema,
      cwd: isolatedCwd,
      runRoot: path.join(workspaceRoot, "runs"),
      timeoutMs: 15 * 60 * 1_000,
    })
    if (store.getBackgroundJob(input.jobId)?.status === "cancel_requested") {
      store.updateBackgroundJob(input.jobId, {
        status: "cancelled",
        progress: 100,
      })
      return
    }
    store.updateBackgroundJob(input.jobId, { progress: 75 })
    const draft = finalizeGeneratedDraft({
      generated: result.value,
      approvedSourceIds: new Set(
        input.excerpts.map((excerpt) => excerpt.sourceId)
      ),
      approvedCitationIds: new Set(
        input.excerpts.map((excerpt) => excerpt.segmentId)
      ),
      approvedCitations: input.excerpts.map(
        (excerpt): Citation => ({
          citationId: excerpt.segmentId,
          sourceId: excerpt.sourceId,
          segmentId: excerpt.segmentId,
          locator: excerpt.locator as Citation["locator"],
          contentHash: excerpt.contentHash,
          verified: true,
          shareable: false,
        })
      ),
    })
    const saved = store.saveDraftConstitution(input.workspaceId, draft)
    store.updateBackgroundJob(input.jobId, {
      status: "completed",
      progress: 100,
      result: {
        draftId: saved.id,
        revision: saved.revision,
        modelId: input.model,
        codexVersion: result.codexVersion,
        promptHash: result.promptHash,
        schemaHash: result.schemaHash,
        outputHash: result.outputHash,
        retryCount: result.retryCount,
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
            : "constitution_draft_failed",
        message:
          error instanceof Error
            ? error.message
            : "Constitution drafting failed.",
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
    const workspace = store.getWorkspace(id)
    if (!workspace) {
      throw new ApiFailure(
        404,
        "workspace_not_found",
        "The requested workspace does not exist.",
        "Return to the workspace list."
      )
    }
    const body = await readJsonObject(request)
    if (body.confirmed !== true) {
      throw new ApiFailure(
        400,
        "egress_confirmation_required",
        "Every Codex run requires a fresh send confirmation.",
        "Review the model, purpose, and exact evidence segments to send."
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
    const productPurpose =
      typeof body.productPurpose === "string" ? body.productPurpose : ""
    const explicitNonGoals =
      typeof body.explicitNonGoals === "string" ? body.explicitNonGoals : ""
    try {
      assertAllowedProductUse(productPurpose, explicitNonGoals)
    } catch (error) {
      throw new ApiFailure(
        422,
        "prohibited_high_impact_use",
        error instanceof Error ? error.message : "This use is not supported.",
        "Use CriteriaForge only to evaluate products, artifacts, or workflows."
      )
    }
    const approved = parseApprovedSegments(body.approvedSegments)
    const excerpts = verifiedExcerpts(id, approved)
    const inputHash = sha256(
      JSON.stringify({
        workspaceId: id,
        sourceLanguage: workspace.sourceLanguage,
        model,
        reasoningEffort,
        segments: approved,
      })
    )
    const idempotencyKey = request.headers.get("idempotency-key")
    if (!idempotencyKey || idempotencyKey.length > 160) {
      throw new ApiFailure(
        400,
        "idempotency_key_required",
        "This operation requires an Idempotency-Key header.",
        "Retry from the CriteriaForge screen; it will generate the key."
      )
    }
    const { job, existing } = store.createBackgroundJob({
      workspaceId: id,
      type: "constitution_draft",
      idempotencyKey,
      inputHash,
    })
    if (!existing) {
      store.saveEgressApproval({
        workspaceId: id,
        purpose: "constitution",
        modelId: model,
        segmentIds: approved.map((segment) => segment.segmentId),
        hashes: approved.map((segment) => segment.contentHash),
      })
      void runDraftJob({
        jobId: job.id,
        workspaceId: id,
        sourceLanguage: workspace.sourceLanguage,
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
