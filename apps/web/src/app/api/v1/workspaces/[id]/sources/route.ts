import type { NextRequest } from "next/server"

import {
  ApiFailure,
  errorResponse,
  jsonResponse,
  readJsonObject,
} from "@/lib/criteriaforge/api"
import {
  EVIDENCE_LIMITS,
  EvidenceError,
  normalizeEvidenceFile,
  snapshotGitRepository,
  type NormalizedEvidence,
} from "@/lib/criteriaforge/evidence"
import { assertLocalSession } from "@/lib/criteriaforge/request-security"
import { getStore } from "@/lib/criteriaforge/storage"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Context = { params: Promise<{ id: string }> }

function evidenceFailure(error: EvidenceError): ApiFailure {
  return new ApiFailure(422, error.code, error.message, error.recovery)
}

function persistNormalized(
  workspaceId: string,
  normalized: NormalizedEvidence,
  originalLanguage?: string,
  authorityRank?: number
) {
  const store = getStore()
  const existing = store
    .listEvidenceSources(workspaceId)
    .find((source) => source.originalHash === normalized.originalHash)
  if (existing) return { source: existing, duplicate: true }

  const currentBytes = store
    .listEvidenceSources(workspaceId)
    .reduce((total, source) => total + source.byteSize, 0)
  if (currentBytes + normalized.byteSize > EVIDENCE_LIMITS.workspaceBytes) {
    throw new ApiFailure(
      413,
      "workspace_size_limit",
      "This source would exceed the 2 GB workspace limit.",
      "Remove an unused source or choose a narrower source."
    )
  }

  const source = store.saveEvidence({
    workspaceId,
    kind: normalized.kind,
    displayName: normalized.displayName,
    originalLanguage,
    authorityRank,
    originalHash: normalized.originalHash,
    byteSize: normalized.byteSize,
    state: normalized.state,
    metadata: {
      detectedMime: normalized.detectedMime,
      warnings: normalized.warnings,
      ...normalized.metadata,
    },
    segments: normalized.segments.map((segment) => ({
      ordinal: segment.ordinal,
      content: segment.content,
      contentHash: segment.contentHash,
      locator: segment.locator as unknown as Record<string, unknown>,
      readable: segment.readable,
      failureReason: segment.failureReason,
    })),
  })
  return { source, duplicate: false }
}

export async function GET(request: NextRequest, context: Context) {
  try {
    assertLocalSession(request)
    const { id } = await context.params
    const store = getStore()
    if (!store.getWorkspace(id)) {
      throw new ApiFailure(
        404,
        "workspace_not_found",
        "The requested workspace does not exist.",
        "Return to the workspace list."
      )
    }
    return jsonResponse({ sources: store.listEvidenceSources(id) })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: NextRequest, context: Context) {
  try {
    assertLocalSession(request, true)
    const { id } = await context.params
    const store = getStore()
    if (!store.getWorkspace(id)) {
      throw new ApiFailure(
        404,
        "workspace_not_found",
        "The requested workspace does not exist.",
        "Return to the workspace list."
      )
    }

    const contentType = request.headers.get("content-type") ?? ""
    if (contentType.startsWith("application/json")) {
      const body = await readJsonObject(request)
      if (body.kind !== "git" || typeof body.path !== "string") {
        throw new ApiFailure(
          400,
          "invalid_git_source",
          "A local Git source requires kind=git and an absolute path.",
          "Choose the local repository again."
        )
      }
      let normalized: NormalizedEvidence
      try {
        normalized = snapshotGitRepository({ repositoryPath: body.path })
      } catch (error) {
        if (error instanceof EvidenceError) throw evidenceFailure(error)
        throw error
      }
      const result = persistNormalized(
        id,
        normalized,
        typeof body.originalLanguage === "string"
          ? body.originalLanguage
          : undefined,
        typeof body.authorityRank === "number" ? body.authorityRank : undefined
      )
      return jsonResponse(result, result.duplicate ? 200 : 201)
    }

    if (!contentType.startsWith("multipart/form-data")) {
      throw new ApiFailure(
        415,
        "unsupported_media_type",
        "Upload a file as multipart/form-data or submit a local Git path as JSON.",
        "Choose a supported source and try again."
      )
    }
    const form = await request.formData()
    const file = form.get("file")
    if (!(file instanceof File)) {
      throw new ApiFailure(
        400,
        "evidence_file_required",
        "No evidence file was attached.",
        "Choose a supported file and try again.",
        false,
        { file: ["Required"] }
      )
    }
    const bytes = new Uint8Array(await file.arrayBuffer())
    const blob = store.putBlob(id, bytes)
    let normalized: NormalizedEvidence
    try {
      normalized = await normalizeEvidenceFile({
        filename: file.name,
        bytes,
      })
    } catch (error) {
      if (error instanceof EvidenceError) throw evidenceFailure(error)
      throw error
    }
    if (normalized.originalHash !== blob.hash) {
      throw new ApiFailure(
        500,
        "blob_hash_mismatch",
        "The stored original does not match the normalized source.",
        "Remove the source and import it again."
      )
    }
    const originalLanguage = form.get("originalLanguage")
    const authorityRank = form.get("authorityRank")
    const result = persistNormalized(
      id,
      normalized,
      typeof originalLanguage === "string" ? originalLanguage : undefined,
      typeof authorityRank === "string" && authorityRank
        ? Number(authorityRank)
        : undefined
    )
    return jsonResponse(result, result.duplicate ? 200 : 201)
  } catch (error) {
    return errorResponse(error)
  }
}
