"use client"

import * as React from "react"
import {
  ArrowRight,
  CircleAlert,
  CircleCheck,
  FileCode2,
  FolderGit2,
  Play,
  ShieldCheck,
  Terminal,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import type { LocalEvaluationAggregation } from "@/components/criteriaforge/local-evaluation-workspace"
import type {
  LocalConstitutionState,
  LocalJob,
} from "@/hooks/use-local-workspace"
import type { RemediationBrief } from "@/lib/criteriaforge/contracts"

function lines(value: string): string[] {
  return [...new Set(value.split(/\r?\n/u).map((item) => item.trim()).filter(Boolean))]
}

function commands(value: string): string[][] {
  return lines(value).map((line, index) => {
    let parsed: unknown
    try {
      parsed = JSON.parse(line)
    } catch {
      throw new Error(
        `Command ${index + 1} must be a JSON string array, for example ["npm","test"].`
      )
    }
    if (
      !Array.isArray(parsed) ||
      parsed.length === 0 ||
      parsed.some((item) => typeof item !== "string" || !item)
    ) {
      throw new Error(`Command ${index + 1} is not a non-empty string array.`)
    }
    return parsed as string[]
  })
}

function inferredFiles(aggregation: LocalEvaluationAggregation): string[] {
  const files = aggregation.items.flatMap(
    (item) =>
      item.representative?.evidence.flatMap((citation) => {
        const locator = citation.locator as Record<string, unknown>
        return locator.kind === "git" && typeof locator.relativePath === "string"
          ? [locator.relativePath]
          : []
      }) ?? []
  )
  return [...new Set(files)].sort()
}

export function LocalRemediationWorkspace({
  aggregation,
  constitutionVersionId,
  target,
  existing,
  run,
  busy,
  patch,
  onCreate,
  onRun,
  onLoadPatch,
  onApply,
  onContinue,
}: {
  aggregation: LocalEvaluationAggregation | null
  constitutionVersionId: string | null
  target: LocalConstitutionState["targets"][number] | null
  existing: LocalConstitutionState["remediations"][number] | null
  run: LocalJob | null
  busy: boolean
  patch: string | null
  onCreate: (brief: RemediationBrief) => Promise<void>
  onRun: (remediationId: string) => Promise<void>
  onLoadPatch: (remediationId: string, jobId: string) => Promise<void>
  onApply: (remediationId: string, jobId: string) => Promise<void>
  onContinue: () => void
}) {
  const [allowedFiles, setAllowedFiles] = React.useState(() =>
    existing
      ? existing.contract.allowedFiles.join("\n")
      : aggregation
        ? inferredFiles(aggregation).join("\n")
        : ""
  )
  const [forbiddenPaths, setForbiddenPaths] = React.useState(
    ".criteriaforge\n.env\n.git"
  )
  const [allowedCommands, setAllowedCommands] = React.useState("")
  const [acceptance, setAcceptance] = React.useState(() =>
    aggregation
      ? aggregation.items
          .filter((item) => item.mustPass === "fail")
          .flatMap((item) =>
            item.representative
              ? [`${item.criterionId}: ${item.representative.gap}`]
              : []
          )
          .join("\n")
      : ""
  )
  const [error, setError] = React.useState<string | null>(null)

  const failedItems =
    aggregation?.items.filter(
      (item) =>
        item.status === "stable" &&
        item.mustPass === "fail" &&
        item.representative
    ) ?? []
  const stableFailure =
    aggregation?.status === "stable" &&
    aggregation.overall === "not_met" &&
    failedItems.length > 0
  const targetDirty = target?.snapshot.dirty === true
  const accepted = run?.result?.accepted === true
  const applied = run?.result?.applied === true || existing?.status === "applied"

  async function createBrief() {
    setError(null)
    try {
      if (!aggregation || !constitutionVersionId || !target || !stableFailure) {
        throw new Error(
          "A stable must-pass failure on one immutable Constitution and target is required."
        )
      }
      const parsedFiles = lines(allowedFiles)
      const parsedCommands = commands(allowedCommands)
      const parsedAcceptance = lines(acceptance)
      if (parsedFiles.length === 0) {
        throw new Error("Approve at least one exact relative file path.")
      }
      if (parsedCommands.length === 0) {
        throw new Error("Approve at least one exact command array.")
      }
      if (parsedAcceptance.length === 0) {
        throw new Error("Define at least one machine-checkable acceptance condition.")
      }
      await onCreate({
        remediationId: crypto.randomUUID(),
        constitutionVersionId,
        targetSnapshotId: target.id,
        criterionIds: failedItems.map((item) => item.criterionId),
        gaps: failedItems.map((item) => ({
          criterionId: item.criterionId,
          intent: item.representative!.intent,
          observed: item.representative!.observed,
          evidence: item.representative!.evidence,
          gap: item.representative!.gap,
        })),
        allowedFiles: parsedFiles,
        forbiddenPaths: lines(forbiddenPaths),
        allowedCommands: parsedCommands,
        acceptanceConditions: parsedAcceptance,
        maximumSeconds: 900,
        requiredOutputs: [
          "A structured change report matching the actual changed files.",
          "A verified binary-safe Git patch.",
        ],
      })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Invalid remediation brief.")
    }
  }

  if (!aggregation || aggregation.overall === "met") {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Alert className="max-w-xl">
          <CircleAlert />
          <AlertTitle>No bounded remediation is available</AlertTitle>
          <AlertDescription>
            Run a formal evaluation first. A met result does not need repair.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!stableFailure) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Alert className="max-w-xl border-ember/25 bg-ember/5">
          <CircleAlert />
          <AlertTitle>Human review is required before Codex can repair</AlertTitle>
          <AlertDescription>
            The three evaluations did not agree on a stable must-pass failure.
            CriteriaForge will not turn an unstable judgment into an automated
            code change.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-7">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ember-foreground">
          06 · Bounded remediation
        </p>
        <h1 className="mt-3 max-w-4xl font-editorial text-4xl tracking-[-0.035em] sm:text-5xl">
          Ratify the gap and the exact change boundary
        </h1>

        {targetDirty && (
          <Alert className="mt-6 border-ember/25 bg-ember/5">
            <CircleAlert />
            <AlertTitle>The fixed repository contains uncommitted work</AlertTitle>
            <AlertDescription>
              It remains valid evaluation evidence, but this release will not
              create a repair from a worktree that omits that dirty state.
              Commit or stash it, then freeze and evaluate a clean target.
            </AlertDescription>
          </Alert>
        )}

        <div className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <section className="overflow-hidden rounded-xl border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
              <div>
                <h2 className="font-editorial text-2xl">Ratified repair brief</h2>
                <p className="mt-1 font-mono text-[9px] text-muted-foreground">
                  {constitutionVersionId} · {target?.contentHash}
                </p>
              </div>
              <Badge variant="outline">{failedItems.length} stable hard gap(s)</Badge>
            </div>
            <div className="divide-y">
              {failedItems.map((item) => (
                <div key={item.criterionId} className="px-5 py-4">
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {item.criterionId}
                  </p>
                  <p className="mt-1 text-sm">{item.representative?.gap}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-5 border-t p-5 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="allowed-files">
                  <FileCode2 className="size-4" />
                  Exact allowed files · one per line
                </Label>
                <Textarea
                  id="allowed-files"
                  value={
                    existing
                      ? existing.contract.allowedFiles.join("\n")
                      : allowedFiles
                  }
                  onChange={(event) => setAllowedFiles(event.target.value)}
                  disabled={Boolean(existing)}
                  className="min-h-32 font-mono text-xs"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="forbidden-paths">
                  <ShieldCheck className="size-4" />
                  Forbidden path prefixes · one per line
                </Label>
                <Textarea
                  id="forbidden-paths"
                  value={
                    existing
                      ? existing.contract.forbiddenPaths.join("\n")
                      : forbiddenPaths
                  }
                  onChange={(event) => setForbiddenPaths(event.target.value)}
                  disabled={Boolean(existing)}
                  className="min-h-32 font-mono text-xs"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="allowed-commands">
                  <Terminal className="size-4" />
                  Exact command arrays · one JSON array per line
                </Label>
                <Textarea
                  id="allowed-commands"
                  value={
                    existing
                      ? existing.contract.allowedCommands
                          .map((command) => JSON.stringify(command))
                          .join("\n")
                      : allowedCommands
                  }
                  onChange={(event) => setAllowedCommands(event.target.value)}
                  disabled={Boolean(existing)}
                  placeholder={'["npm","test"]\n["npm","run","typecheck"]'}
                  className="min-h-32 font-mono text-xs"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="acceptance">Acceptance conditions</Label>
                <Textarea
                  id="acceptance"
                  value={
                    existing
                      ? existing.contract.acceptanceConditions.join("\n")
                      : acceptance
                  }
                  onChange={(event) => setAcceptance(event.target.value)}
                  disabled={Boolean(existing)}
                  className="min-h-32 text-xs"
                />
              </div>
            </div>
          </section>

          <aside className="h-fit rounded-xl border bg-card p-5">
            <div className="flex items-center gap-2">
              <FolderGit2 className="size-4 text-ember" />
              <h2 className="text-sm font-medium">Temporary Git worktree</h2>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Codex receives the ratified brief and a read-only Constitution.
              Shell interpolation is never used.
            </p>
            {run && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-xs">
                  <span>{run.status.replaceAll("_", " ")}</span>
                  <span>{run.progress}%</span>
                </div>
                <Progress value={run.progress} />
              </div>
            )}
            {!existing ? (
              <Button
                className="mt-5 w-full"
                disabled={busy || targetDirty}
                onClick={() => void createBrief()}
              >
                <ShieldCheck />
                Ratify exact boundary
              </Button>
            ) : !run ||
              ["failed", "cancelled", "interrupted"].includes(run.status) ||
              (run.status === "completed" && run.result?.accepted !== true) ? (
              <Button
                className="mt-5 w-full"
                disabled={busy || targetDirty}
                onClick={() => void onRun(existing.id)}
              >
                <Play />
                {run ? "Retry Codex in a new worktree" : "Run Codex in worktree"}
              </Button>
            ) : (
              <Button
                className="mt-5 w-full"
                variant="outline"
                disabled={busy}
                onClick={() => void onLoadPatch(existing.id, run.id)}
              >
                <FileCode2 />
                Review full patch
              </Button>
            )}
            {accepted && !applied && existing && run && (
              <Button
                className="mt-3 w-full"
                disabled={busy}
                onClick={() => void onApply(existing.id, run.id)}
              >
                <CircleCheck />
                Apply verified patch
              </Button>
            )}
          </aside>
        </div>

        {error && (
          <Alert className="mt-6 border-destructive/25">
            <CircleAlert />
            <AlertTitle>Repair boundary is incomplete</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {run?.result && (
          <section className="mt-6 rounded-xl border bg-card p-5">
            <h2 className="font-editorial text-2xl">Local verification result</h2>
            <div className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
              <p>Accepted: {String(run.result.accepted === true)}</p>
              <p>Constitution unchanged: {String(run.result.constitutionUnchanged === true)}</p>
              <p className="break-all">Patch: {String(run.result.patchHash ?? "Unavailable")}</p>
              <p>
                Files: {Array.isArray(run.result.changedFiles) ? run.result.changedFiles.join(", ") : "None"}
              </p>
            </div>
          </section>
        )}

        {patch !== null && (
          <section className="mt-6 overflow-hidden rounded-xl border bg-card">
            <div className="border-b px-5 py-3 text-sm font-medium">
              Full verified patch · remains on this Mac
            </div>
            <pre className="max-h-96 overflow-auto whitespace-pre p-5 font-mono text-[10px] leading-5">
              {patch || "The run produced no patch."}
            </pre>
          </section>
        )}

        <div className="mt-7 flex justify-end border-t pt-6">
          <Button disabled={!applied} onClick={onContinue}>
            Freeze the repaired target and re-evaluate
            <ArrowRight />
          </Button>
        </div>
      </main>
    </div>
  )
}
