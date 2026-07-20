import { createHash } from "node:crypto"
import fs from "node:fs"
import path from "node:path"

import type { NextRequest } from "next/server"

import {
  ApiFailure,
  errorResponse,
  jsonResponse,
} from "@/lib/criteriaforge/api"
import { assertLocalSession } from "@/lib/criteriaforge/request-security"
import { workspaceStorageRoot } from "@/lib/criteriaforge/runtime"
import { getStore } from "@/lib/criteriaforge/storage"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Context = { params: Promise<{ id: string }> }

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex")
}

export async function GET(request: NextRequest, context: Context) {
  try {
    assertLocalSession(request)
    const { id } = await context.params
    const jobId = request.nextUrl.searchParams.get("jobId")
    if (!jobId) {
      throw new ApiFailure(
        400,
        "remediation_job_required",
        "Choose a bounded remediation run.",
        "Return to the remediation result and open its verified patch."
      )
    }
    const store = getStore()
    const remediation = store.getRemediationBrief(id)
    const job = store.getBackgroundJob(jobId)
    if (
      !remediation ||
      !job ||
      job.workspaceId !== remediation.workspaceId ||
      job.result?.remediationId !== remediation.id ||
      typeof job.result?.patchHash !== "string"
    ) {
      throw new ApiFailure(
        404,
        "remediation_patch_not_found",
        "No verified patch matches this remediation run.",
        "Run the ratified remediation brief again."
      )
    }
    const patchPath = path.join(
      workspaceStorageRoot(remediation.workspaceId, store.root),
      "runs",
      job.id,
      "remediation.patch"
    )
    const patch = fs.readFileSync(patchPath, "utf8")
    if (sha256(patch) !== job.result.patchHash) {
      throw new ApiFailure(
        409,
        "remediation_patch_changed",
        "The local patch changed after verification.",
        "Discard this run and create a new bounded remediation."
      )
    }
    return jsonResponse({
      remediationId: remediation.id,
      jobId: job.id,
      patchHash: job.result.patchHash,
      patch,
    })
  } catch (error) {
    return errorResponse(error)
  }
}
