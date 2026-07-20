"use client"

import {
  ArrowLeft,
  CircleAlert,
  CircleCheck,
  GitCompareArrows,
  LockKeyhole,
  RefreshCw,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { LocalEvaluationAggregation } from "@/components/criteriaforge/local-evaluation-workspace"
import type {
  LocalConstitutionState,
  LocalJob,
} from "@/hooks/use-local-workspace"

function resultLabel(
  item: LocalEvaluationAggregation["items"][number] | undefined
): string {
  if (!item) return "Not evaluated"
  if (item.status === "unstable") return "Blocked"
  if (item.mustPass !== "not_applicable") return item.mustPass
  return item.qualityLevel ?? "undetermined"
}

function changeLabel(before: string, after: string): string {
  if (after === "Not evaluated") return "Pending"
  if (before === after) return "Unchanged"
  if (
    (before === "fail" && after === "pass") ||
    (before === "insufficient" &&
      ["minimum", "good", "exceptional"].includes(after)) ||
    (before === "minimum" && ["good", "exceptional"].includes(after)) ||
    (before === "good" && after === "exceptional")
  ) {
    return "Improved"
  }
  return "Changed · inspect evidence"
}

export function LocalReevaluationWorkspace({
  constitutionVersion,
  constitutionHash,
  beforeTarget,
  afterTarget,
  beforeJob,
  afterJob,
  before,
  after,
  remediationApplied,
  busy,
  onFreezeTarget,
  onRun,
  onBack,
}: {
  constitutionVersion: string | null
  constitutionHash: string | null
  beforeTarget: LocalConstitutionState["targets"][number] | null
  afterTarget: LocalConstitutionState["targets"][number] | null
  beforeJob: LocalJob | null
  afterJob: LocalJob | null
  before: LocalEvaluationAggregation | null
  after: LocalEvaluationAggregation | null
  remediationApplied: boolean
  busy: boolean
  onFreezeTarget: (repositoryRoot: string) => Promise<void>
  onRun: () => void
  onBack: () => void
}) {
  const repositoryRoot =
    typeof beforeTarget?.snapshot.repositoryRoot === "string"
      ? beforeTarget.snapshot.repositoryRoot
      : null
  const sameContract =
    beforeJob?.result?.constitutionVersionId &&
    beforeJob.result.constitutionVersionId ===
      afterJob?.result?.constitutionVersionId
  const sameModel =
    beforeJob?.result?.modelId &&
    beforeJob.result.modelId === afterJob?.result?.modelId
  const sameReasoning =
    beforeJob?.result?.reasoningEffort &&
    beforeJob.result.reasoningEffort === afterJob?.result?.reasoningEffort
  const sameExecutionContract =
    beforeJob?.result?.promptVersion === afterJob?.result?.promptVersion &&
    beforeJob?.result?.schemaVersion === afterJob?.result?.schemaVersion
  const comparable =
    Boolean(sameContract) &&
    Boolean(sameModel) &&
    Boolean(sameReasoning) &&
    sameExecutionContract
  const ids = [
    ...new Set([
      ...(before?.items.map((item) => item.criterionId) ?? []),
      ...(after?.items.map((item) => item.criterionId) ?? []),
    ]),
  ]

  return (
    <div className="h-full overflow-y-auto">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-approved-foreground">
              07 · Re-evaluation
            </p>
            <h1 className="mt-3 max-w-4xl font-editorial text-4xl tracking-[-0.035em] sm:text-5xl">
              Compare the repaired artifact at the same constitutional boundary
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">
              Constitution {constitutionVersion ?? "unavailable"}
            </Badge>
            <Badge variant="outline" className="max-w-64 truncate font-mono">
              {constitutionHash ?? "No immutable hash"}
            </Badge>
          </div>
        </div>

        {!remediationApplied ? (
          <Alert className="mt-7 border-ember/25 bg-ember/5">
            <CircleAlert />
            <AlertTitle>No human-approved patch has been applied</AlertTitle>
            <AlertDescription>
              Return to remediation. Re-evaluation never substitutes an
              unverified Codex worktree for the original artifact.
            </AlertDescription>
          </Alert>
        ) : !afterTarget ? (
          <section className="mt-7 rounded-xl border bg-card p-6">
            <LockKeyhole className="size-6 text-ember" />
            <h2 className="mt-4 font-editorial text-3xl">
              Freeze the repaired repository state
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              CriteriaForge will capture a new commit and dirty-state hash. The
              original target and Constitution remain unchanged for comparison.
            </p>
            <Button
              className="mt-5"
              disabled={busy || !repositoryRoot}
              onClick={() =>
                repositoryRoot ? void onFreezeTarget(repositoryRoot) : undefined
              }
            >
              <RefreshCw />
              Freeze repaired target
            </Button>
          </section>
        ) : !after ? (
          <section className="mt-7 rounded-xl border bg-card p-6">
            <GitCompareArrows className="size-6 text-evidence" />
            <h2 className="mt-4 font-editorial text-3xl">
              Run the same evaluation settings three times
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              The Constitution is unchanged. The send review locks the original
              model and reasoning effort and asks for a fresh approval of the
              repaired artifact excerpts.
            </p>
            <Button className="mt-5" disabled={busy} onClick={onRun}>
              Review re-evaluation send
            </Button>
          </section>
        ) : (
          <>
            <Alert
              className={`mt-7 ${
                comparable
                  ? "border-approved/25 bg-approved/8"
                  : "border-destructive/25"
              }`}
            >
              {comparable ? (
                <CircleCheck />
              ) : (
                <CircleAlert />
              )}
              <AlertTitle>
                {comparable
                  ? "Comparison boundary verified"
                  : "Same-condition comparison is not allowed"}
              </AlertTitle>
              <AlertDescription>
                {comparable
                  ? `Both sides use ${String(
                      afterJob?.result?.modelId
                    )}, ${String(
                      afterJob?.result?.reasoningEffort
                    )} reasoning, and the same immutable Constitution.`
                  : "A Constitution or model setting differs. Review the two results separately."}
              </AlertDescription>
            </Alert>

            <section className="mt-7 overflow-hidden rounded-xl border bg-card">
              <div className="grid grid-cols-[minmax(0,1fr)_7rem_7rem] gap-3 border-b bg-muted/35 px-4 py-3 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground sm:grid-cols-[9rem_minmax(0,1fr)_9rem_9rem_12rem]">
                <span className="hidden sm:block">ID</span>
                <span>Criterion</span>
                <span>Before</span>
                <span>After</span>
                <span className="hidden sm:block">Change</span>
              </div>
              {ids.map((criterionId) => {
                const beforeItem = before?.items.find(
                  (item) => item.criterionId === criterionId
                )
                const afterItem = after.items.find(
                  (item) => item.criterionId === criterionId
                )
                const beforeLabel = resultLabel(beforeItem)
                const afterLabel = resultLabel(afterItem)
                return (
                  <div
                    key={criterionId}
                    className="grid grid-cols-[minmax(0,1fr)_7rem_7rem] gap-3 border-b px-4 py-4 last:border-b-0 sm:grid-cols-[9rem_minmax(0,1fr)_9rem_9rem_12rem] sm:items-center"
                  >
                    <span className="hidden font-mono text-[10px] text-muted-foreground sm:block">
                      {criterionId}
                    </span>
                    <span className="break-words text-sm font-medium">
                      {afterItem?.representative?.intent ??
                        beforeItem?.representative?.intent ??
                        criterionId}
                    </span>
                    <Badge variant="outline">{beforeLabel}</Badge>
                    <Badge variant="outline">{afterLabel}</Badge>
                    <span className="hidden text-xs sm:block">
                      {changeLabel(beforeLabel, afterLabel)}
                    </span>
                  </div>
                )
              })}
            </section>
          </>
        )}

        <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t pt-6">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft />
            Review remediation
          </Button>
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <GitCompareArrows className="size-4 text-evidence" />
            A changed Constitution or model is never labeled as a same-condition
            comparison.
          </p>
        </div>
      </main>
    </div>
  )
}
