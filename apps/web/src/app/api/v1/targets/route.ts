import type { NextRequest } from "next/server"

import {
  ApiFailure,
  errorResponse,
  jsonResponse,
  readJsonObject,
} from "@/lib/criteriaforge/api"
import { snapshotGitRepository } from "@/lib/criteriaforge/evidence"
import { assertLocalSession } from "@/lib/criteriaforge/request-security"
import { getStore } from "@/lib/criteriaforge/storage"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    assertLocalSession(request, true)
    const body = await readJsonObject(request)
    if (
      typeof body.workspaceId !== "string" ||
      typeof body.repositoryPath !== "string"
    ) {
      throw new ApiFailure(
        400,
        "git_target_required",
        "Choose a workspace and local Git repository.",
        "Select the repository that contains the artifact to evaluate."
      )
    }
    const store = getStore()
    if (!store.getWorkspace(body.workspaceId)) {
      throw new ApiFailure(
        404,
        "workspace_not_found",
        "The requested workspace does not exist.",
        "Return to the workspace list."
      )
    }
    const normalized = snapshotGitRepository({
      repositoryPath: body.repositoryPath,
    })
    const snapshot = store.createTargetSnapshot({
      workspaceId: body.workspaceId,
      sourceType: "git",
      contentHash: normalized.originalHash,
      snapshot: {
        kind: normalized.kind,
        ...normalized.metadata,
      },
    })
    return jsonResponse({ target: snapshot }, 201)
  } catch (error) {
    return errorResponse(error)
  }
}
