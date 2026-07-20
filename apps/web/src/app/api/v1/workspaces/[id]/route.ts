import type { NextRequest } from "next/server"

import {
  ApiFailure,
  errorResponse,
  jsonResponse,
  readJsonObject,
} from "@/lib/criteriaforge/api"
import { assertLocalSession } from "@/lib/criteriaforge/request-security"
import {
  getStore,
  type WorkspaceRecord,
} from "@/lib/criteriaforge/storage"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Context = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: Context) {
  try {
    assertLocalSession(request)
    const { id } = await context.params
    const workspace = getStore().getWorkspace(id)
    if (!workspace) {
      throw new ApiFailure(
        404,
        "workspace_not_found",
        "The requested workspace does not exist.",
        "Return to the workspace list."
      )
    }
    return jsonResponse({ workspace })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    assertLocalSession(request, true)
    const { id } = await context.params
    const body = await readJsonObject(request)
    const update: Partial<
      Pick<WorkspaceRecord, "name" | "sourceLanguage" | "status">
    > = {}
    if (body.name !== undefined) {
      if (typeof body.name !== "string") {
        throw new ApiFailure(
          400,
          "invalid_workspace_name",
          "Workspace name must be text.",
          "Correct the workspace name.",
          false,
          { name: ["Must be text"] }
        )
      }
      update.name = body.name
    }
    if (body.sourceLanguage !== undefined) {
      if (typeof body.sourceLanguage !== "string") {
        throw new ApiFailure(
          400,
          "invalid_source_language",
          "Source language must be a language tag.",
          "Correct the source language.",
          false,
          { sourceLanguage: ["Must be text"] }
        )
      }
      update.sourceLanguage = body.sourceLanguage
    }
    if (body.status !== undefined) {
      if (!["draft", "active", "archived"].includes(String(body.status))) {
        throw new ApiFailure(
          400,
          "invalid_workspace_status",
          "Workspace status is invalid.",
          "Choose draft, active, or archived.",
          false,
          { status: ["Invalid value"] }
        )
      }
      update.status = body.status as WorkspaceRecord["status"]
    }
    const workspace = getStore().updateWorkspace(id, update)
    if (!workspace) {
      throw new ApiFailure(
        404,
        "workspace_not_found",
        "The requested workspace does not exist.",
        "Return to the workspace list."
      )
    }
    return jsonResponse({ workspace })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    assertLocalSession(request, true)
    const { id } = await context.params
    if (!getStore().deleteWorkspace(id)) {
      throw new ApiFailure(
        404,
        "workspace_not_found",
        "The requested workspace does not exist.",
        "Return to the workspace list."
      )
    }
    return new Response(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    })
  } catch (error) {
    return errorResponse(error)
  }
}
