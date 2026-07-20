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

export async function POST(request: NextRequest, context: Context) {
  try {
    assertLocalSession(request, true)
    const { id } = await context.params
    const store = getStore()
    const current = store.getBackgroundJob(id)
    if (!current) {
      throw new ApiFailure(
        404,
        "job_not_found",
        "The requested background job does not exist.",
        "Return to the previous CriteriaForge step."
      )
    }
    if (["completed", "failed", "cancelled", "interrupted"].includes(current.status)) {
      return jsonResponse({ job: current })
    }
    const job = store.updateBackgroundJob(id, {
      status: current.status === "queued" ? "cancelled" : "cancel_requested",
    })
    return jsonResponse({ job })
  } catch (error) {
    return errorResponse(error)
  }
}
