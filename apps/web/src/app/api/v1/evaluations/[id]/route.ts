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
    const run = getStore().getEvaluationRun(id)
    if (!run) {
      throw new ApiFailure(
        404,
        "evaluation_run_not_found",
        "The requested evaluation run does not exist.",
        "Return to the formal evaluation history."
      )
    }
    return jsonResponse({ evaluation: run })
  } catch (error) {
    return errorResponse(error)
  }
}
