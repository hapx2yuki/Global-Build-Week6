"use client"

import * as React from "react"

import { criteriaForgeCsrfToken } from "@/components/criteriaforge/local-bootstrap"
import type {
  ConstitutionSection,
  EvaluationRun,
  ProductConstitution,
  RemediationBrief,
} from "@/lib/criteriaforge/contracts"

export type LocalWorkspace = {
  id: string
  name: string
  sourceLanguage: string
  status: "draft" | "active" | "archived"
  createdAt: string
  updatedAt: string
}

export type LocalEvidenceSource = {
  id: string
  workspaceId: string
  kind: string
  displayName: string
  originalLanguage: string | null
  authorityRank: number
  originalHash: string
  byteSize: number
  state: string
  privateOnly: boolean
  metadata: Record<string, unknown>
  createdAt: string
}

export type LocalDoctor = {
  status: string
  supportedPlatform: boolean
  codexVersion: string | null
  codexLogin: string | null
  storageRoot: string
  storageWarnings: string[]
  fileVault: string | null
}

export type LocalEvidenceSegment = {
  id: string
  sourceId: string
  ordinal: number
  contentHash: string
  locator: Record<string, unknown>
  readable: boolean
  failureReason: string | null
  content: string | null
}

export type LocalDraft = {
  id: string
  workspaceId: string
  revision: number
  contract: {
    schemaVersion: "1.0.0"
    sections: ConstitutionSection[]
    criteria: ProductConstitution["criteria"]
    citations: ProductConstitution["citations"]
    openQuestions: Array<Record<string, unknown>>
    contradictions: Array<Record<string, unknown>>
    [key: string]: unknown
  }
  createdAt: string
  updatedAt: string
}

export type LocalJob = {
  id: string
  workspaceId: string | null
  type: string
  status:
    | "queued"
    | "running"
    | "completed"
    | "failed"
    | "cancel_requested"
    | "cancelled"
    | "interrupted"
  progress: number
  result: Record<string, unknown> | null
  error: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

export type LocalConstitutionState = {
  latestDraft: LocalDraft | null
  drafts: Array<{
    id: string
    revision: number
    createdAt: string
    updatedAt: string
  }>
  versions: Array<{
    id: string
    workspaceId: string
    version: string
    contentHash: string
    contract: ProductConstitution
    createdAt: string
  }>
  targets: Array<{
    id: string
    workspaceId: string
    sourceType: string
    contentHash: string
    snapshot: Record<string, unknown>
    createdAt: string
  }>
  remediations: Array<{
    id: string
    workspaceId: string
    status: string
    contract: RemediationBrief
    createdAt: string
    updatedAt: string
  }>
  jobs: LocalJob[]
}

async function localRequest<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const headers = new Headers(init.headers)
  const method = init.method?.toUpperCase() ?? "GET"
  if (!["GET", "HEAD"].includes(method)) {
    const csrf = criteriaForgeCsrfToken()
    if (csrf) headers.set("x-criteriaforge-csrf", csrf)
  }
  const response = await fetch(path, {
    ...init,
    headers,
    credentials: "same-origin",
    cache: "no-store",
  })
  const body = response.status === 204 ? null : await response.json()
  if (!response.ok) {
    const apiError = body as {
      message?: string
      recoveryAction?: string
    }
    throw new Error(
      [apiError.message, apiError.recoveryAction].filter(Boolean).join(" ")
    )
  }
  return body as T
}

export function useLocalWorkspace(enabled: boolean) {
  const [ready, setReady] = React.useState(false)
  const [loading, setLoading] = React.useState(enabled)
  const [workspace, setWorkspace] = React.useState<LocalWorkspace | null>(null)
  const [sources, setSources] = React.useState<LocalEvidenceSource[]>([])
  const [doctor, setDoctor] = React.useState<LocalDoctor | null>(null)
  const [constitutionState, setConstitutionState] =
    React.useState<LocalConstitutionState | null>(null)
  const [activeJob, setActiveJob] = React.useState<LocalJob | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const loadConstitutionState = React.useCallback(
    async (workspaceId: string) => {
      const state = await localRequest<LocalConstitutionState>(
        `/api/v1/workspaces/${workspaceId}/constitution`
      )
      setConstitutionState(state)
      const unfinished = state.jobs.find((job) =>
        ["queued", "running", "cancel_requested"].includes(job.status)
      )
      setActiveJob(unfinished ?? null)
      return state
    },
    []
  )

  const refresh = React.useCallback(async () => {
    if (!enabled || !criteriaForgeCsrfToken()) return
    setLoading(true)
    setError(null)
    try {
      const [workspaceResponse, doctorResponse] = await Promise.all([
        localRequest<{ workspaces: LocalWorkspace[] }>("/api/v1/workspaces"),
        localRequest<LocalDoctor>("/api/v1/system/doctor"),
      ])
      const selected = workspaceResponse.workspaces[0] ?? null
      setWorkspace(selected)
      setDoctor(doctorResponse)
      if (selected) {
        const [sourceResponse] = await Promise.all([
          localRequest<{
            sources: LocalEvidenceSource[]
          }>(`/api/v1/workspaces/${selected.id}/sources`),
          loadConstitutionState(selected.id),
        ])
        setSources(sourceResponse.sources)
      } else {
        setSources([])
        setConstitutionState(null)
        setActiveJob(null)
      }
      setReady(true)
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The local workspace could not be loaded."
      )
    } finally {
      setLoading(false)
    }
  }, [enabled, loadConstitutionState])

  React.useEffect(() => {
    if (!enabled) return
    const onReady = () => void refresh()
    const onFailed = () => {
      setLoading(false)
      setError("The one-time local browser session could not be established.")
    }
    window.addEventListener("criteriaforge:local-ready", onReady)
    window.addEventListener("criteriaforge:local-failed", onFailed)
    if (criteriaForgeCsrfToken()) {
      queueMicrotask(() => void refresh())
    }
    return () => {
      window.removeEventListener("criteriaforge:local-ready", onReady)
      window.removeEventListener("criteriaforge:local-failed", onFailed)
    }
  }, [enabled, refresh])

  const createWorkspace = React.useCallback(
    async (name: string, sourceLanguage: string) => {
      setLoading(true)
      setError(null)
      try {
        const response = await localRequest<{ workspace: LocalWorkspace }>(
          "/api/v1/workspaces",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, sourceLanguage }),
          }
        )
        setWorkspace(response.workspace)
        setSources([])
        setConstitutionState({
          latestDraft: null,
          drafts: [],
          versions: [],
          targets: [],
          remediations: [],
          jobs: [],
        })
        setReady(true)
        return response.workspace
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Creation failed.")
        throw caught
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const uploadFile = React.useCallback(
    async (file: File, originalLanguage: string) => {
      if (!workspace) throw new Error("Create a workspace first.")
      setLoading(true)
      setError(null)
      try {
        const form = new FormData()
        form.set("file", file)
        form.set("originalLanguage", originalLanguage)
        const response = await localRequest<{
          source: LocalEvidenceSource
        }>(`/api/v1/workspaces/${workspace.id}/sources`, {
          method: "POST",
          body: form,
        })
        setSources((current) => {
          const withoutDuplicate = current.filter(
            (source) => source.id !== response.source.id
          )
          return [...withoutDuplicate, response.source]
        })
        return response.source
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Import failed.")
        throw caught
      } finally {
        setLoading(false)
      }
    },
    [workspace]
  )

  const loadSegments = React.useCallback(async () => {
    const groups = await Promise.all(
      sources.map(async (source) => {
        const response = await localRequest<{
          segments: LocalEvidenceSegment[]
        }>(`/api/v1/sources/${source.id}/segments`)
        return response.segments
      })
    )
    return groups.flat()
  }, [sources])

  const watchJob = React.useCallback(
    async (jobId: string): Promise<LocalJob> =>
      new Promise((resolve, reject) => {
        const events = new EventSource(`/api/v1/jobs/${jobId}/events`)
        const finish = (job: LocalJob) => {
          events.close()
          setActiveJob(job)
          if (job.status === "completed") {
            resolve(job)
            return
          }
          const message =
            typeof job.error?.message === "string"
              ? job.error.message
              : `The ${job.type} job stopped with status ${job.status}.`
          reject(new Error(message))
        }
        events.addEventListener("job", (event) => {
          const job = JSON.parse((event as MessageEvent).data) as LocalJob
          setActiveJob(job)
          if (
            ["completed", "failed", "cancelled", "interrupted"].includes(
              job.status
            )
          ) {
            finish(job)
          }
        })
        events.onerror = () => {
          events.close()
          reject(
            new Error(
              "The progress stream ended before CriteriaForge received a terminal job state."
            )
          )
        }
      }),
    []
  )

  const startDraft = React.useCallback(
    async (input: {
      approvedSegments: Array<{
        sourceId: string
        segmentId: string
        contentHash: string
      }>
      model: "gpt-5.6-terra" | "gpt-5.6-sol"
      reasoningEffort: string
      productPurpose: string
      explicitNonGoals: string
    }) => {
      if (!workspace) throw new Error("Create a workspace first.")
      setError(null)
      const response = await localRequest<{ job: LocalJob }>(
        `/api/v1/workspaces/${workspace.id}/constitution/draft`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": crypto.randomUUID(),
          },
          body: JSON.stringify({ ...input, confirmed: true }),
        }
      )
      setActiveJob(response.job)
      const job = await watchJob(response.job.id)
      await loadConstitutionState(workspace.id)
      return job
    },
    [loadConstitutionState, watchJob, workspace]
  )

  const importGitTarget = React.useCallback(
    async (repositoryPath: string) => {
      if (!workspace) throw new Error("Create a workspace first.")
      setLoading(true)
      setError(null)
      try {
        const sourceResponse = await localRequest<{
          source: LocalEvidenceSource
        }>(`/api/v1/workspaces/${workspace.id}/sources`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "git",
            path: repositoryPath,
            originalLanguage: workspace.sourceLanguage,
            authorityRank: 50,
          }),
        })
        setSources((current) => [
          ...current.filter((source) => source.id !== sourceResponse.source.id),
          sourceResponse.source,
        ])
        const targetResponse = await localRequest<{
          target: LocalConstitutionState["targets"][number]
        }>("/api/v1/targets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspaceId: workspace.id,
            repositoryPath,
          }),
        })
        await loadConstitutionState(workspace.id)
        return {
          source: sourceResponse.source,
          target: targetResponse.target,
        }
      } finally {
        setLoading(false)
      }
    },
    [loadConstitutionState, workspace]
  )

  const updateDraftSection = React.useCallback(
    async (sectionId: string, originalText: string) => {
      const draft = constitutionState?.latestDraft
      if (!draft) throw new Error("Create a Product Constitution draft first.")
      const response = await localRequest<{ draft: LocalDraft }>(
        `/api/v1/drafts/${draft.id}/sections/${sectionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            originalText,
            editedBy: "Constitution Owner",
          }),
        }
      )
      setConstitutionState((current) =>
        current ? { ...current, latestDraft: response.draft } : current
      )
      return response.draft
    },
    [constitutionState?.latestDraft]
  )

  const decideDraftSubject = React.useCallback(
    async (input: {
      subjectType: "section" | "criterion" | "question" | "contradiction"
      subjectId: string
      decision: "approve" | "reject" | "defer" | "answer" | "resolve"
      answer?: string
    }) => {
      const draft = constitutionState?.latestDraft
      if (!draft) throw new Error("Create a Product Constitution draft first.")
      const response = await localRequest<{ draft: LocalDraft }>(
        `/api/v1/drafts/${draft.id}/decisions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...input,
            decidedBy: "Constitution Owner",
          }),
        }
      )
      setConstitutionState((current) =>
        current ? { ...current, latestDraft: response.draft } : current
      )
      return response.draft
    },
    [constitutionState?.latestDraft]
  )

  const runCalibration = React.useCallback(
    async (input: {
      model: "gpt-5.6-terra" | "gpt-5.6-sol"
      reasoningEffort: string
    }): Promise<{ job: LocalJob; runs: EvaluationRun[] }> => {
      const draft = constitutionState?.latestDraft
      if (!draft) throw new Error("Create a Product Constitution draft first.")
      const response = await localRequest<{ job: LocalJob }>(
        `/api/v1/drafts/${draft.id}/calibrate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": crypto.randomUUID(),
          },
          body: JSON.stringify({ ...input, confirmed: true }),
        }
      )
      setActiveJob(response.job)
      const job = await watchJob(response.job.id)
      await loadConstitutionState(draft.workspaceId)
      const runs = job.result?.calibrationRuns
      if (!Array.isArray(runs)) {
        throw new Error("Calibration completed without three usable runs.")
      }
      return { job, runs: runs as EvaluationRun[] }
    },
    [constitutionState?.latestDraft, loadConstitutionState, watchJob]
  )

  const compileDraft = React.useCallback(
    async (calibrationRuns: EvaluationRun[]) => {
      const draft = constitutionState?.latestDraft
      if (!draft) throw new Error("Create a Product Constitution draft first.")
      const answeredQuestionIds = draft.contract.openQuestions
        .filter((question) => question.status === "answered")
        .map((question) => String(question.questionId))
      const resolvedContradictionIds = draft.contract.contradictions
        .filter((item) => item.resolvedByHuman === true)
        .map((item) => String(item.contradictionId))
      const response = await localRequest<{
        version: LocalConstitutionState["versions"][number]
      }>(`/api/v1/drafts/${draft.id}/compile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          version: "1.0",
          createdBy: "Constitution Owner",
          calibrationRuns,
          scopeConflict: false,
          answeredQuestionIds,
          resolvedContradictionIds,
        }),
      })
      await loadConstitutionState(draft.workspaceId)
      return response.version
    },
    [constitutionState?.latestDraft, loadConstitutionState]
  )

  const runEvaluation = React.useCallback(
    async (input: {
      approvedSegments: Array<{
        sourceId: string
        segmentId: string
        contentHash: string
      }>
      model: "gpt-5.6-terra" | "gpt-5.6-sol"
      reasoningEffort: string
    }) => {
      if (!workspace) throw new Error("Create a workspace first.")
      const version = constitutionState?.versions[0]
      const target = constitutionState?.targets[0]
      if (!version || !target) {
        throw new Error(
          "Compile a Constitution and freeze a target snapshot first."
        )
      }
      const response = await localRequest<{ job: LocalJob }>(
        "/api/v1/evaluations",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": crypto.randomUUID(),
          },
          body: JSON.stringify({
            confirmed: true,
            workspaceId: workspace.id,
            constitutionVersionId: version.id,
            targetSnapshotId: target.id,
            model: input.model,
            reasoningEffort: input.reasoningEffort,
            approvedSegments: input.approvedSegments,
          }),
        }
      )
      setActiveJob(response.job)
      const job = await watchJob(response.job.id)
      await loadConstitutionState(workspace.id)
      return job
    },
    [
      constitutionState?.targets,
      constitutionState?.versions,
      loadConstitutionState,
      watchJob,
      workspace,
    ]
  )

  const createRemediationBrief = React.useCallback(
    async (input: {
      evaluationRunId: string
      brief: RemediationBrief
    }) => {
      if (!workspace) throw new Error("Create a workspace first.")
      const response = await localRequest<{
        remediation: LocalConstitutionState["remediations"][number]
      }>(`/api/v1/evaluations/${input.evaluationRunId}/remediation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: workspace.id,
          confirmed: true,
          brief: input.brief,
        }),
      })
      await loadConstitutionState(workspace.id)
      return response.remediation
    },
    [loadConstitutionState, workspace]
  )

  const runRemediation = React.useCallback(
    async (input: {
      remediationId: string
      model: "gpt-5.6-terra" | "gpt-5.6-sol"
      reasoningEffort: string
    }) => {
      if (!workspace) throw new Error("Create a workspace first.")
      const response = await localRequest<{ job: LocalJob }>(
        `/api/v1/remediations/${input.remediationId}/run`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": crypto.randomUUID(),
          },
          body: JSON.stringify({
            confirmed: true,
            model: input.model,
            reasoningEffort: input.reasoningEffort,
          }),
        }
      )
      setActiveJob(response.job)
      const job = await watchJob(response.job.id)
      await loadConstitutionState(workspace.id)
      return job
    },
    [loadConstitutionState, watchJob, workspace]
  )

  const applyRemediation = React.useCallback(
    async (input: { remediationId: string; jobId: string }) => {
      if (!workspace) throw new Error("Create a workspace first.")
      const response = await localRequest<{
        applied: {
          applied: boolean
          patchHash: string
          changedFiles: string[]
        }
        reEvaluationRequired: boolean
        constitutionVersionId: string
      }>(`/api/v1/remediations/${input.remediationId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmed: true,
          jobId: input.jobId,
        }),
      })
      await loadConstitutionState(workspace.id)
      return response
    },
    [loadConstitutionState, workspace]
  )

  const loadRemediationPatch = React.useCallback(
    async (input: { remediationId: string; jobId: string }) =>
      localRequest<{
        remediationId: string
        jobId: string
        patchHash: string
        patch: string
      }>(
        `/api/v1/remediations/${input.remediationId}/patch?jobId=${encodeURIComponent(
          input.jobId
        )}`
      ),
    []
  )

  const exportConstitution = React.useCallback(
    async (repositoryRoot: string) => {
      const version = constitutionState?.versions[0]
      if (!version) throw new Error("Compile an immutable Constitution first.")
      return localRequest<{
        directory: string
        files: string[]
      }>("/api/v1/exports/constitution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmed: true,
          constitutionVersionId: version.id,
          repositoryRoot,
        }),
      })
    },
    [constitutionState?.versions]
  )

  return {
    ready,
    loading,
    workspace,
    sources,
    doctor,
    constitutionState,
    activeJob,
    error,
    refresh,
    createWorkspace,
    uploadFile,
    loadSegments,
    startDraft,
    updateDraftSection,
    decideDraftSubject,
    runCalibration,
    compileDraft,
    importGitTarget,
    runEvaluation,
    createRemediationBrief,
    runRemediation,
    applyRemediation,
    loadRemediationPatch,
    exportConstitution,
  }
}
