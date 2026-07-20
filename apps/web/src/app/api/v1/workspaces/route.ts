import type { NextRequest } from "next/server"

import {
  ApiFailure,
  errorResponse,
  jsonResponse,
  readJsonObject,
} from "@/lib/criteriaforge/api"
import { assertLocalSession } from "@/lib/criteriaforge/request-security"
import { getStore } from "@/lib/criteriaforge/storage"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    assertLocalSession(request)
    return jsonResponse({ workspaces: getStore().listWorkspaces() })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    assertLocalSession(request, true)
    const body = await readJsonObject(request)
    if (typeof body.name !== "string") {
      throw new ApiFailure(
        400,
        "workspace_name_required",
        "A workspace name is required.",
        "Enter a name for this CriteriaForge case.",
        false,
        { name: ["Required"] }
      )
    }
    if (typeof body.sourceLanguage !== "string") {
      throw new ApiFailure(
        400,
        "source_language_required",
        "The authoritative source language is required.",
        "Choose the language used by the original source.",
        false,
        { sourceLanguage: ["Required"] }
      )
    }
    const workspace = getStore().createWorkspace({
      name: body.name,
      sourceLanguage: body.sourceLanguage,
    })
    return jsonResponse({ workspace }, 201)
  } catch (error) {
    return errorResponse(error)
  }
}
