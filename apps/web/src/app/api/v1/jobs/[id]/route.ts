import type { NextRequest } from "next/server"

import {
  ApiFailure,
  errorResponse,
  jsonResponse,
} from "@/lib/criteriaforge/api"
import { assertLocalSession } from "@/lib/criteriaforge/request-security"
import { getStore } from "@/lib/criteriaforge/storage"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Context = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: Context) {
  try {
    assertLocalSession(request)
    const { id } = await context.params
    const job = getStore().getBackgroundJob(id)
    if (!job) {
      throw new ApiFailure(
        404,
        "job_not_found",
        "The requested background job does not exist.",
        "Return to the previous CriteriaForge step."
      )
    }
    return jsonResponse({ job })
  } catch (error) {
    return errorResponse(error)
  }
}
