import { createHash } from "node:crypto"
import fs from "node:fs"
import path from "node:path"

import type { NextRequest } from "next/server"

import {
  ApiFailure,
  errorResponse,
  jsonResponse,
  readJsonObject,
} from "@/lib/criteriaforge/api"
import {
  applyVerifiedRemediation,
  disposeRemediationWorktree,
  type PreparedRemediation,
  type RemediationVerification,
} from "@/lib/criteriaforge/remediation"
import { assertLocalSession } from "@/lib/criteriaforge/request-security"
import { workspaceStorageRoot } from "@/lib/criteriaforge/runtime"
import { getStore } from "@/lib/criteriaforge/storage"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Context = { params: Promise<{ id: string }> }

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex")
}

export async function POST(request: NextRequest, context: Context) {
  try {
    assertLocalSession(request, true)
    const { id } = await context.params
    const body = await readJsonObject(request)
    if (
      body.confirmed !== true ||
      typeof body.jobId !== "string"
    ) {
      throw new ApiFailure(
        400,
        "patch_approval_required",
        "Human approval of a verified patch is required.",
        "Review the full diff and test results, then confirm application."
      )
    }
    const store = getStore()
    const remediation = store.getRemediationBrief(id)
    const job = store.getBackgroundJob(body.jobId)
    if (
      !remediation ||
      !job ||
      job.workspaceId !== remediation.workspaceId ||
      job.result?.remediationId !== id ||
      job.result?.accepted !== true
    ) {
      throw new ApiFailure(
        409,
        "verified_patch_not_found",
        "No accepted bounded remediation patch matches this request.",
        "Run remediation again and review its verified result."
      )
    }
    const runDirectory = path.join(
      workspaceStorageRoot(remediation.workspaceId, store.root),
      "runs",
      job.id
    )
    const statePath = path.join(runDirectory, "remediation-state.json")
    const stateJson = fs.readFileSync(statePath, "utf8")
    if (
      typeof job.result.stateHash !== "string" ||
      sha256(stateJson) !== job.result.stateHash
    ) {
      throw new ApiFailure(
        409,
        "remediation_state_changed",
        "The local remediation state changed after verification.",
        "Discard this run and create a new bounded remediation."
      )
    }
    const state = JSON.parse(stateJson) as {
      prepared: PreparedRemediation
      verification: Omit<RemediationVerification, "patch">
      patchPath: string
    }
    const patch = fs.readFileSync(state.patchPath, "utf8")
    if (
      sha256(patch) !== state.verification.patchHash ||
      sha256(patch) !== job.result.patchHash
    ) {
      throw new ApiFailure(
        409,
        "remediation_patch_changed",
        "The patch no longer matches the verified hash.",
        "Discard this run and create a new bounded remediation."
      )
    }
    const verification: RemediationVerification = {
      ...state.verification,
      patch,
    }
    const applied = applyVerifiedRemediation({
      prepared: state.prepared,
      verification,
    })
    disposeRemediationWorktree(state.prepared)
    store.updateRemediationStatus(id, "applied")
    store.updateBackgroundJob(job.id, {
      result: {
        ...job.result,
        applied: true,
        appliedAt: new Date().toISOString(),
      },
    })
    return jsonResponse({
      applied,
      reEvaluationRequired: true,
      constitutionVersionId: remediation.contract.constitutionVersionId,
    })
  } catch (error) {
    return errorResponse(error)
  }
}
