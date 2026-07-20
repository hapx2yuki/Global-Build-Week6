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
    const store = getStore()
    const source = store.getEvidenceSource(id)
    if (!source) {
      throw new ApiFailure(
        404,
        "source_not_found",
        "The requested evidence source does not exist.",
        "Return to the source list."
      )
    }
    const segments = store.listEvidenceSegments(id).map((segment) => ({
      id: segment.id,
      sourceId: segment.sourceId,
      ordinal: segment.ordinal,
      contentHash: segment.contentHash,
      locator: segment.locator,
      readable: segment.readable,
      failureReason: segment.failureReason,
      content: store.readNormalizedSegment(id, segment.id),
    }))
    return jsonResponse({ source, segments })
  } catch (error) {
    return errorResponse(error)
  }
}
