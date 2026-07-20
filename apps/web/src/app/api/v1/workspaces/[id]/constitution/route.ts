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
    if (!store.getWorkspace(id)) {
      throw new ApiFailure(
        404,
        "workspace_not_found",
        "The requested workspace does not exist.",
        "Return to the workspace list."
      )
    }
    const drafts = store.listDraftConstitutions(id)
    return jsonResponse({
      latestDraft: drafts[0] ?? null,
      drafts: drafts.map((draft) => ({
        id: draft.id,
        revision: draft.revision,
        createdAt: draft.createdAt,
        updatedAt: draft.updatedAt,
      })),
      versions: store.listConstitutionVersions(id),
      targets: store.listTargetSnapshots(id),
      remediations: store.listRemediationBriefs(id),
      jobs: store.listBackgroundJobs(id),
    })
  } catch (error) {
    return errorResponse(error)
  }
}
