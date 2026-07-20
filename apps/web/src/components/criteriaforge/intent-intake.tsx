"use client"

import * as React from "react"
import {
  ArrowRight,
  FileArchive,
  FileCheck2,
  FileCode2,
  FileText,
  FolderGit2,
  LockKeyhole,
  Plus,
  ShieldAlert,
  Upload,
} from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Spinner } from "@/components/ui/spinner"
import type {
  LocalEvidenceSource,
  LocalWorkspace,
} from "@/hooks/use-local-workspace"
import type { UiLocale } from "@/lib/criteriaforge/ui-types"

const demoSources = [
  {
    id: "founder-note",
    name: "founder-note.txt",
    kind: "Founder memo",
    detail: "24 lines · English original",
    icon: FileText,
    state: "Ready",
  },
  {
    id: "working-session",
    name: "working-session.md",
    kind: "Conversation record",
    detail: "8 ratified decisions · English original",
    icon: FileCheck2,
    state: "Ready",
  },
  {
    id: "founderbrief-git",
    name: "FounderBrief repository",
    kind: "Local Git snapshot",
    detail: "commit d9a80f7 + dirty-state hash",
    icon: FolderGit2,
    state: "Ready",
  },
]

function SourceRow({
  name,
  kind,
  detail,
  state,
  icon: Icon,
}: {
  name: string
  kind: string
  detail: string
  state: string
  icon: typeof FileText
}) {
  return (
    <div className="grid gap-3 border-b px-4 py-4 last:border-b-0 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] sm:items-center">
      <span className="flex size-9 items-center justify-center rounded-md border bg-background text-muted-foreground">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {kind} · {detail}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className="border-approved/25 bg-approved/8 text-approved-foreground"
        >
          <FileCheck2 />
          {state}
        </Badge>
        <Badge variant="outline" className="text-muted-foreground">
          <LockKeyhole />
          Private
        </Badge>
      </div>
    </div>
  )
}

export function IntentIntake({
  locale,
  demo,
  loading,
  workspace,
  sources,
  error,
  onCreateWorkspace,
  onUploadFile,
  onContinue,
}: {
  locale: UiLocale
  demo: boolean
  loading: boolean
  workspace: LocalWorkspace | null
  sources: LocalEvidenceSource[]
  error: string | null
  onCreateWorkspace: (name: string, language: string) => Promise<unknown>
  onUploadFile: (file: File, language: string) => Promise<unknown>
  onContinue: () => void
}) {
  const [name, setName] = React.useState("My Product Constitution")
  const [language, setLanguage] = React.useState("ja")
  const fileRef = React.useRef<HTMLInputElement>(null)
  const copy =
    locale === "ja"
      ? {
          eyebrow: "01 · 意図の取り込み",
          title: "判断の原典を、端末内へ集める",
          body: "人間の意図とAIの仮定を分けるため、原文・出所・権威順位を保ったまま正規化します。",
          create: "案件を作成",
          upload: "根拠源を追加",
          continue: "憲法案を確認",
        }
      : {
          eyebrow: "01 · Bring in intent",
          title: "Gather the sources that govern the product",
          body: "CriteriaForge preserves original language, provenance, and authority so human intent never becomes indistinguishable from an AI assumption.",
          create: "Create workspace",
          upload: "Add evidence source",
          continue: "Review constitution draft",
        }
  const rows = demo
    ? demoSources
    : sources.map((source) => ({
        id: source.id,
        name: source.displayName,
        kind: source.kind.toUpperCase(),
        detail: `${Math.max(1, Math.round(source.byteSize / 1024))} KB · ${
          source.originalLanguage ?? "language unconfirmed"
        }`,
        icon:
          source.kind === "git"
            ? FolderGit2
            : source.kind === "text" || source.kind === "markdown"
              ? FileText
              : source.kind === "image"
                ? FileArchive
                : FileCode2,
        state:
          source.state === "ready"
            ? "Ready"
            : source.state === "partial"
              ? "Partial"
              : "Processing",
      }))

  async function create() {
    try {
      await onCreateWorkspace(name, language)
      toast.success("Private local workspace created.")
    } catch {
      // The inline error is more actionable than a duplicate toast.
    }
  }

  async function chooseFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      await onUploadFile(file, workspace?.sourceLanguage ?? language)
      toast.success(`${file.name} was normalized locally.`)
    } catch {
      // The inline error is more actionable than a duplicate toast.
    } finally {
      event.target.value = ""
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-7 sm:py-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <section>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ember-foreground">
              {copy.eyebrow}
            </p>
            <h1 className="mt-3 max-w-3xl font-editorial text-4xl leading-[1.02] tracking-[-0.035em] sm:text-5xl">
              {copy.title}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
              {copy.body}
            </p>
          </section>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-xs font-medium">
              <LockKeyhole className="size-4 text-approved" />
              Private evidence boundary
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Originals and extracted text remain on this Mac. Each Codex call
              requires a new, segment-level send confirmation.
            </p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mt-6">
            <ShieldAlert />
            <AlertTitle>Local operation stopped</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!demo && !workspace && (
          <section className="mt-8 rounded-xl border bg-card p-5">
            <h2 className="font-editorial text-2xl">Create a private case</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem_auto] sm:items-end">
              <div className="space-y-2">
                <Label htmlFor="workspace-name">Case name</Label>
                <Input
                  id="workspace-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="source-language">Original language</Label>
                <Input
                  id="source-language"
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                />
              </div>
              <Button onClick={create} disabled={loading || !name.trim()}>
                {loading ? <Spinner /> : <Plus />}
                {copy.create}
              </Button>
            </div>
          </section>
        )}

        <section className="mt-8 overflow-hidden rounded-xl border bg-card">
          <div className="flex flex-col justify-between gap-3 border-b px-4 py-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-editorial text-2xl">Source register</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {rows.length} source{rows.length === 1 ? "" : "s"} · originals
                remain private
              </p>
            </div>
            <div>
              <input
                ref={fileRef}
                type="file"
                className="sr-only"
                onChange={chooseFile}
                accept=".pdf,.docx,.pptx,.txt,.md,.markdown,.csv,.xlsx,.png,.jpg,.jpeg,.webp,.svg,.mp4,.mov,.webm"
              />
              <Button
                variant="outline"
                onClick={() =>
                  demo
                    ? toast.info(
                        "The public demo is fictional and read-only. Use the local edition for private files."
                      )
                    : fileRef.current?.click()
                }
                disabled={!demo && (!workspace || loading)}
              >
                {loading ? <Spinner /> : <Upload />}
                {copy.upload}
              </Button>
            </div>
          </div>
          {rows.length > 0 ? (
            rows.map((source) => (
              <SourceRow
                key={source.id}
                name={source.name}
                kind={source.kind}
                detail={source.detail}
                state={source.state}
                icon={source.icon}
              />
            ))
          ) : (
            <div className="flex min-h-48 flex-col items-center justify-center px-6 text-center">
              <FileArchive className="size-8 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">No evidence sources yet</p>
              <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
                Add one authoritative source to begin. A failed file does not
                invalidate sources that were already imported.
              </p>
            </div>
          )}
        </section>

        <div className="mt-6 flex flex-col justify-between gap-4 rounded-lg border bg-background/70 p-4 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">First useful draft readiness</span>
              <span className="font-mono text-muted-foreground">
                {rows.length > 0 ? "100%" : "0%"}
              </span>
            </div>
            <Progress
              className="mt-2 h-1.5"
              value={rows.length > 0 ? 100 : 0}
              aria-label="First useful draft readiness"
            />
          </div>
          <Button onClick={onContinue} disabled={rows.length === 0}>
            {copy.continue}
            <ArrowRight />
          </Button>
        </div>
      </main>
    </div>
  )
}
