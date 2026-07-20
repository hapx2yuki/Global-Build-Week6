import type { NextRequest } from "next/server"

import {
  ApiFailure,
  errorResponse,
  jsonResponse,
  readJsonObject,
} from "@/lib/criteriaforge/api"
import {
  RemediationBriefSchema,
  type RemediationBrief,
} from "@/lib/criteriaforge/contracts"
import { assertLocalSession } from "@/lib/criteriaforge/request-security"
import { getStore } from "@/lib/criteriaforge/storage"
import { validateSchema } from "@/lib/criteriaforge/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Context = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: Context) {
  try {
    assertLocalSession(request, true)
    const { id: evaluationId } = await context.params
    const body = await readJsonObject(request)
    if (
      typeof body.workspaceId !== "string" ||
      body.confirmed !== true
    ) {
      throw new ApiFailure(
        400,
        "remediation_ratification_required",
        "A workspace and explicit human confirmation are required.",
        "Review allowed files, forbidden paths, commands, and acceptance conditions."
      )
    }
    const validation = validateSchema<RemediationBrief>(
      RemediationBriefSchema,
      body.brief
    )
    if (!validation.success) {
      throw new ApiFailure(
        400,
        "invalid_remediation_brief",
        "The remediation brief does not match the ratified contract.",
        "Correct the highlighted remediation fields."
      )
    }
    const store = getStore()
    const workspace = store.getWorkspace(body.workspaceId)
    const constitution = store.getConstitutionVersion(
      validation.value.constitutionVersionId
    )
    const target = store.getTargetSnapshot(
      validation.value.targetSnapshotId
    )
    if (
      !workspace ||
      constitution?.workspaceId !== workspace.id ||
      target?.workspaceId !== workspace.id
    ) {
      throw new ApiFailure(
        409,
        "remediation_scope_mismatch",
        "The workspace, constitution, and target snapshot do not belong together.",
        "Recreate the remediation brief from the formal evaluation."
      )
    }
    const saved = store.saveRemediationBrief({
      workspaceId: workspace.id,
      brief: validation.value,
    })
    store.audit(workspace.id, "evaluation.remediation.created", saved.id, {
      evaluationId,
    })
    return jsonResponse({ remediation: saved }, 201)
  } catch (error) {
    return errorResponse(error)
  }
}
