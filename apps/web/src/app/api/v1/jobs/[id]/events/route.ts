import type { NextRequest } from "next/server"

import { ApiFailure, errorResponse } from "@/lib/criteriaforge/api"
import { assertLocalSession } from "@/lib/criteriaforge/request-security"
import { getStore } from "@/lib/criteriaforge/storage"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Context = { params: Promise<{ id: string }> }
const TERMINAL = new Set(["completed", "failed", "cancelled", "interrupted"])

export async function GET(request: NextRequest, context: Context) {
  try {
    assertLocalSession(request)
    const { id } = await context.params
    if (!getStore().getBackgroundJob(id)) {
      throw new ApiFailure(
        404,
        "job_not_found",
        "The requested background job does not exist.",
        "Return to the previous CriteriaForge step."
      )
    }
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        let previous = ""
        const emit = () => {
          const job = getStore().getBackgroundJob(id)
          if (!job) {
            controller.close()
            return
          }
          const serialized = JSON.stringify(job)
          if (serialized !== previous) {
            previous = serialized
            controller.enqueue(
              encoder.encode(`event: job\ndata: ${serialized}\n\n`)
            )
          }
          if (TERMINAL.has(job.status)) {
            clearInterval(timer)
            controller.close()
          }
        }
        const timer = setInterval(emit, 500)
        request.signal.addEventListener("abort", () => {
          clearInterval(timer)
          try {
            controller.close()
          } catch {
            // The stream may already be closed after a terminal job state.
          }
        })
        emit()
      },
    })
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-store",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    return errorResponse(error)
  }
}
