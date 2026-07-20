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
  CodexRunner,
  CodexRunnerError,
} from "@/lib/criteriaforge/codex-runner"
import { RemediationRunOutputSchema } from "@/lib/criteriaforge/contracts"
import { remediationPrompt } from "@/lib/criteriaforge/prompts"
import {
  disposeRemediationWorktree,
  prepareRemediationWorktree,
  snapshotRepository,
  verifyRemediationWorktree,
  type PreparedRemediation,
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

function privateWrite(filePath: string, value: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o700 })
  fs.writeFileSync(filePath, value, {
    encoding: "utf8",
    mode: 0o600,
  })
  fs.chmodSync(filePath, 0o600)
}

async function runRemediationJob(input: {
  jobId: string
  remediationId: string
  model: string
  reasoningEffort: string
}) {
  const store = getStore()
  let prepared: PreparedRemediation | null = null
  try {
    const remediation = store.getRemediationBrief(input.remediationId)
    if (!remediation) throw new Error("Remediation brief not found")
    const constitution = store.getConstitutionVersion(
      remediation.contract.constitutionVersionId
    )
    const target = store.getTargetSnapshot(
      remediation.contract.targetSnapshotId
    )
    if (!constitution || !target) {
      throw new Error("The immutable constitution or target snapshot is missing")
    }
    const repositoryRoot = target.snapshot.repositoryRoot
    const expectedHead = target.snapshot.head
    const expectedStatusHash = target.snapshot.dirtyStateHash
    if (
      typeof repositoryRoot !== "string" ||
      typeof expectedHead !== "string" ||
      typeof expectedStatusHash !== "string"
    ) {
      throw new Error("The target is not a complete Git snapshot")
    }
    const current = snapshotRepository(repositoryRoot)
    if (
      current.head !== expectedHead ||
      current.statusHash !== expectedStatusHash
    ) {
      throw new Error(
        "The repository changed after the target snapshot; create a new snapshot"
      )
    }

    store.updateBackgroundJob(input.jobId, {
      status: "running",
      progress: 5,
    })
    const workspaceRoot = workspaceStorageRoot(
      remediation.workspaceId,
      store.root
    )
    const worktreePath = path.join(
      workspaceRoot,
      "worktrees",
      input.jobId
    )
    prepared = prepareRemediationWorktree({
      repositoryRoot,
      worktreePath,
      constitution: constitution.contract,
    })
    store.updateBackgroundJob(input.jobId, { progress: 20 })
    const result = await new CodexRunner().runStructured({
      purpose: "remediation",
      model: input.model,
      reasoningEffort: input.reasoningEffort,
      sandbox: "workspace-write",
      prompt: remediationPrompt({
        constitution: constitution.contract,
        brief: remediation.contract,
        governancePath: prepared.governancePath,
      }),
      outputSchema: RemediationRunOutputSchema,
      cwd: prepared.worktreePath,
      runRoot: path.join(workspaceRoot, "runs"),
      timeoutMs: remediation.contract.maximumSeconds * 1_000,
    })
    if (
      store.getBackgroundJob(input.jobId)?.status === "cancel_requested"
    ) {
      disposeRemediationWorktree(prepared)
      store.updateBackgroundJob(input.jobId, {
        status: "cancelled",
        progress: 100,
      })
      return
    }
    store.updateBackgroundJob(input.jobId, { progress: 75 })
    const verification = verifyRemediationWorktree({
      prepared,
      brief: remediation.contract,
    })
    const reportedFiles = [...result.value.changedFiles].sort()
    const actualFiles = [...verification.changedFiles].sort()
    const reportMatches =
      JSON.stringify(reportedFiles) === JSON.stringify(actualFiles)
    const accepted = verification.accepted && reportMatches
    const runDirectory = path.join(workspaceRoot, "runs", input.jobId)
    const patchPath = path.join(runDirectory, "remediation.patch")
    privateWrite(patchPath, verification.patch)
    const state = {
      prepared,
      verification: {
        ...verification,
        accepted,
        patch: undefined,
      },
      patchPath,
    }
    const stateJson = JSON.stringify(state)
    privateWrite(path.join(runDirectory, "remediation-state.json"), stateJson)
    if (!accepted) {
      disposeRemediationWorktree(prepared)
      prepared = null
    }
    store.updateRemediationStatus(
      remediation.id,
      accepted ? "awaiting_human_apply" : "rejected"
    )
    store.updateBackgroundJob(input.jobId, {
      status: "completed",
      progress: 100,
      result: {
        remediationId: remediation.id,
        accepted,
        reportMatches,
        changedFiles: verification.changedFiles,
        unauthorizedFiles: verification.unauthorizedFiles,
        constitutionUnchanged: verification.constitutionUnchanged,
        tests: verification.testResults.map((test) => ({
          command: test.command,
          passed: test.passed,
          exitCode: test.exitCode,
        })),
        patchHash: verification.patchHash,
        stateHash: sha256(stateJson),
        codexVersion: result.codexVersion,
        outputHash: result.outputHash,
        retryCount: result.retryCount,
      },
    })
  } catch (error) {
    if (prepared) disposeRemediationWorktree(prepared)
    store.updateRemediationStatus(input.remediationId, "failed")
    store.updateBackgroundJob(input.jobId, {
      status: "failed",
      progress: 100,
      error: {
        code:
          error instanceof CodexRunnerError
            ? error.code
            : "remediation_run_failed",
        message:
          error instanceof Error
            ? error.message
            : "Bounded remediation failed.",
        retryable:
          error instanceof CodexRunnerError ? error.retryable : false,
      },
    })
  }
}

export async function POST(request: NextRequest, context: Context) {
  try {
    assertLocalSession(request, true)
    const { id } = await context.params
    const store = getStore()
    const remediation = store.getRemediationBrief(id)
    if (!remediation) {
      throw new ApiFailure(
        404,
        "remediation_not_found",
        "The ratified remediation brief does not exist.",
        "Return to the formal evaluation."
      )
    }
    const body = await readJsonObject(request)
    if (body.confirmed !== true) {
      throw new ApiFailure(
        400,
        "remediation_confirmation_required",
        "Review the temporary worktree boundary before running Codex.",
        "Confirm the exact files, commands, and acceptance conditions."
      )
    }
    const model =
      body.model === "gpt-5.6-terra" || body.model === "gpt-5.6-sol"
        ? body.model
        : null
    if (!model) {
      throw new ApiFailure(
        400,
        "unsupported_model",
        "Choose gpt-5.6-terra or gpt-5.6-sol.",
        "Select an available model; CriteriaForge will not switch silently."
      )
    }
    const idempotencyKey = request.headers.get("idempotency-key")
    if (!idempotencyKey || idempotencyKey.length > 160) {
      throw new ApiFailure(
        400,
        "idempotency_key_required",
        "This operation requires an Idempotency-Key header.",
        "Retry from the remediation review."
      )
    }
    const { job, existing } = store.createBackgroundJob({
      workspaceId: remediation.workspaceId,
      type: `remediation:${id}`,
      idempotencyKey,
      inputHash: sha256(
        JSON.stringify({
          remediation: remediation.contract,
          model,
          reasoningEffort: body.reasoningEffort ?? "high",
        })
      ),
    })
    if (!existing) {
      store.updateRemediationStatus(id, "running")
      void runRemediationJob({
        jobId: job.id,
        remediationId: id,
        model,
        reasoningEffort:
          typeof body.reasoningEffort === "string"
            ? body.reasoningEffort
            : "high",
      })
    }
    return jsonResponse({ job, existing }, 202)
  } catch (error) {
    return errorResponse(error)
  }
}
