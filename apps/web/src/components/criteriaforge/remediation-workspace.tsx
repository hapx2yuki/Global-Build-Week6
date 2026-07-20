"use client"

import * as React from "react"
import {
  ArrowRight,
  Check,
  CircleCheck,
  FileCode2,
  FolderGit2,
  GitBranch,
  Play,
  ShieldCheck,
  Sparkles,
  Terminal,
  TriangleAlert,
} from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import type { UiLocale } from "@/lib/criteriaforge/ui-types"

const steps = [
  "Create detached worktree",
  "Mount Constitution v1.0 read-only",
  "Run Codex inside allowed paths",
  "Verify changed files and tests",
  "Re-evaluate against the same version",
]

export function RemediationWorkspace({
  locale,
  demo,
  onContinue,
}: {
  locale: UiLocale
  demo: boolean
  onContinue: () => void
}) {
  const [running, setRunning] = React.useState(false)
  const [complete, setComplete] = React.useState(false)
  const title =
    locale === "ja"
      ? "差だけを渡し、憲法には触れさせない"
      : "Give Codex the gap—not the authority to change the constitution"

  function replay() {
    setRunning(true)
    setComplete(false)
    window.setTimeout(() => {
      setRunning(false)
      setComplete(true)
      toast.success(
        demo
          ? "Recorded bounded remediation replayed."
          : "Bounded remediation completed in the temporary worktree."
      )
    }, 900)
  }

  return (
    <div className="h-full overflow-y-auto">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-7">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ember-foreground">
          06 · Bounded remediation
        </p>
        <h1 className="mt-3 max-w-4xl font-editorial text-4xl tracking-[-0.035em] sm:text-5xl">
          {title}
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">
          The repair brief contains only failed criteria, verified evidence,
          allowed files, allowed commands, and machine-checkable acceptance
          conditions.
        </p>

        <div className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <section className="overflow-hidden rounded-xl border bg-card">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="font-editorial text-2xl">Remediation brief</h2>
                <p className="mt-1 font-mono text-[9px] text-muted-foreground">
                  Constitution v1.0 · FounderBrief build 0.1
                </p>
              </div>
              <Badge variant="outline" className="border-destructive/25 text-destructive">
                2 hard gaps
              </Badge>
            </div>
            <div className="divide-y">
              {[
                {
                  id: "FR-01",
                  gap: "Restore the explicit non-goal about investor materials.",
                },
                {
                  id: "FR-02",
                  gap: "Ask before introducing account type or recurring billing.",
                },
              ].map((item) => (
                <div key={item.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[4rem_minmax(0,1fr)]">
                  <Badge variant="outline" className="h-fit font-mono text-[9px]">
                    {item.id}
                  </Badge>
                  <div>
                    <p className="text-sm font-medium">{item.gap}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Intent, observed behavior, evidence, and gap are attached.
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid border-t md:grid-cols-2">
              <div className="p-5 md:border-r">
                <p className="flex items-center gap-2 text-xs font-medium">
                  <FileCode2 className="size-4" />
                  Allowed files
                </p>
                <div className="mt-3 space-y-2 font-mono text-[10px] text-muted-foreground">
                  <p>src/lib/generate-brief.ts</p>
                  <p>src/components/brief-review.tsx</p>
                  <p>tests/acceptance/founder-intent.spec.ts</p>
                </div>
                <p className="mt-4 flex items-center gap-2 text-xs font-medium">
                  <ShieldCheck className="size-4 text-approved" />
                  Forbidden
                </p>
                <p className="mt-2 font-mono text-[10px] text-muted-foreground">
                  .criteriaforge/** · .env* · auth files · all other paths
                </p>
              </div>
              <div className="p-5">
                <p className="flex items-center gap-2 text-xs font-medium">
                  <Terminal className="size-4" />
                  Allowed commands
                </p>
                <div className="mt-3 space-y-2 font-mono text-[10px] text-muted-foreground">
                  <p>npm test -- founder-intent</p>
                  <p>npm run typecheck</p>
                </div>
                <p className="mt-4 text-xs font-medium">Acceptance</p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  Both missing intent clauses appear; no new material assumption
                  is emitted; all protected tests pass.
                </p>
              </div>
            </div>
          </section>

          <aside className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-2">
              <FolderGit2 className="size-4 text-ember" />
              <h2 className="text-sm font-medium">Temporary worktree</h2>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Original HEAD is checked before and after. The patch is not
              applied until a human reviews it.
            </p>
            <Separator className="my-4" />
            <div className="space-y-3">
              {steps.map((step, index) => {
                const done = complete || (running && index < 2)
                return (
                  <div key={step} className="flex items-start gap-2 text-xs">
                    {done ? (
                      <CircleCheck className="mt-0.5 size-3.5 shrink-0 text-approved" />
                    ) : (
                      <span className="mt-1 size-2 shrink-0 rounded-full border" />
                    )}
                    <span className={done ? "" : "text-muted-foreground"}>
                      {step}
                    </span>
                  </div>
                )
              })}
            </div>
            {running && (
              <Progress
                value={45}
                className="mt-5 h-1.5"
                aria-label="Remediation replay progress"
              />
            )}
            <Button className="mt-5 w-full" onClick={replay} disabled={running}>
              {running ? <GitBranch className="animate-pulse" /> : <Play />}
              {demo ? "Replay recorded repair" : "Run bounded repair"}
            </Button>
          </aside>
        </div>

        {complete && (
          <Alert className="mt-6 border-approved/25 bg-approved/8">
            <Check />
            <AlertTitle>Allowed diff and tests verified</AlertTitle>
            <AlertDescription>
              Three allowed files changed, both commands passed, Constitution
              v1.0 has the same hash, and no forbidden path changed.
            </AlertDescription>
          </Alert>
        )}

        <div className="mt-7 flex flex-col justify-between gap-4 border-t pt-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {complete ? (
              <CircleCheck className="size-4 text-approved" />
            ) : (
              <TriangleAlert className="size-4 text-ember" />
            )}
            Human patch approval remains required.
          </div>
          <Button onClick={onContinue} disabled={!complete}>
            <Sparkles />
            Compare the same criteria
            <ArrowRight />
          </Button>
        </div>
      </main>
    </div>
  )
}
