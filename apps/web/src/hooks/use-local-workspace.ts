"use client"

import * as React from "react"

import { criteriaForgeCsrfToken } from "@/components/criteriaforge/local-bootstrap"

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
  const [error, setError] = React.useState<string | null>(null)

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
        const sourceResponse = await localRequest<{
          sources: LocalEvidenceSource[]
        }>(`/api/v1/workspaces/${selected.id}/sources`)
        setSources(sourceResponse.sources)
      } else {
        setSources([])
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
  }, [enabled])

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

  return {
    ready,
    loading,
    workspace,
    sources,
    doctor,
    error,
    refresh,
    createWorkspace,
    uploadFile,
  }
}
