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
    const draft = getStore().getDraftConstitution(id)
    if (!draft) {
      throw new ApiFailure(
        404,
        "draft_not_found",
        "The requested Product Constitution draft does not exist.",
        "Return to the constitution workspace."
      )
    }
    return jsonResponse({ draft })
  } catch (error) {
    return errorResponse(error)
  }
}
