import * as React from "react"
import {
  Anvil,
  ArrowRight,
  Check,
  CircleCheck,
  FileJson2,
  FileLock2,
  Fingerprint,
  ShieldCheck,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import type { UiLocale } from "@/lib/criteriaforge/ui-types"

const gates = [
  {
    name: "Intent complete",
    detail: "Audience, problem, promise, boundaries, and one hard gate exist.",
  },
  {
    name: "Ratified",
    detail: "Every material AI proposal has a human owner and decision.",
  },
  {
    name: "Evaluable",
    detail: "Observations, evidence rules, boundaries, and examples are explicit.",
  },
  {
    name: "Consistent",
    detail: "No equal-authority conflict or scope contradiction remains.",
  },
  {
    name: "Stable",
    detail: "Three independent calibration runs stay inside tolerance.",
  },
]

export function CompileReview({
  locale,
  approved,
  calibrated = true,
  compiled = false,
  onBack,
  onCompile,
  onCalibrate,
  onExport,
}: {
  locale: UiLocale
  approved: boolean
  calibrated?: boolean
  compiled?: boolean
  onBack: () => void
  onCompile: () => void
  onCalibrate?: () => void
  onExport?: (repositoryRoot: string) => Promise<void>
}) {
  const [repositoryRoot, setRepositoryRoot] = React.useState("")
  const title =
    locale === "ja"
      ? "人間が承認した意味だけを、不可逆な版にする"
      : "Freeze only the meaning a human has ratified"
  return (
    <div className="h-full overflow-y-auto">
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-7 sm:py-10">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ember-foreground">
              03 · Compile review
            </p>
            <h1 className="mt-3 max-w-3xl font-editorial text-4xl tracking-[-0.035em] sm:text-5xl">
              {title}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
              Product Constitution v1.0 cannot be edited after creation.
              Changes branch into a new draft and invalidate only dependent
              checks.
            </p>
          </div>
          <Badge
            variant="outline"
            className="w-fit border-ember/25 bg-ember/7 font-mono text-[10px] text-ember-foreground"
          >
            v1.0 candidate
          </Badge>
        </div>

        {!approved && (
          <Alert variant="destructive" className="mt-7">
            <FileLock2 />
            <AlertTitle>One material AI proposal is not ratified</AlertTitle>
            <AlertDescription>
              Return to section 08 and approve, reject, or edit the stopping
              rule. CriteriaForge will not infer consent.
            </AlertDescription>
          </Alert>
        )}
        {approved && !calibrated && (
          <Alert className="mt-7">
            <ShieldCheck />
            <AlertTitle>Three comparable calibration runs are required</AlertTitle>
            <AlertDescription>
              CriteriaForge sends the displayed criteria and ratified examples
              only after a fresh confirmation. Material disagreement blocks
              compilation.
            </AlertDescription>
          </Alert>
        )}

        <section className="mt-7 overflow-hidden rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div>
              <h2 className="font-editorial text-2xl">Five compile safeguards</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                All five must pass; no average or override is available.
              </p>
            </div>
            <Badge
              variant="outline"
              className={
                approved && calibrated
                  ? "border-approved/25 bg-approved/8 text-approved-foreground"
                  : "border-destructive/25 bg-destructive/7 text-destructive"
              }
            >
              {[true, approved, true, true, calibrated].filter(Boolean).length} / 5 pass
            </Badge>
          </div>
          <div className="divide-y">
            {gates.map((gate, index) => {
              const passed =
                index === 1 ? approved : index === 4 ? calibrated : true
              return (
                <div
                  key={gate.name}
                  className="grid gap-3 px-5 py-4 sm:grid-cols-[1.5rem_10rem_minmax(0,1fr)_auto] sm:items-center"
                >
                  {passed ? (
                    <CircleCheck className="size-4 text-approved" />
                  ) : (
                    <FileLock2 className="size-4 text-destructive" />
                  )}
                  <p className="text-sm font-medium">{gate.name}</p>
                  <p className="text-xs leading-5 text-muted-foreground">
                    {gate.detail}
                  </p>
                  <Badge variant="outline">{passed ? "Pass" : "Blocked"}</Badge>
                </div>
              )
            })}
          </div>
        </section>

        <div className="mt-7 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: FileJson2,
              title: "Executable contract",
              detail:
                "JSON Schema, stable IDs, evidence rules, and calibration cases.",
            },
            {
              icon: Fingerprint,
              title: "Immutable identity",
              detail:
                "Content and meaning hashes bind every later evaluation.",
            },
            {
              icon: ShieldCheck,
              title: "Authority boundary",
              detail:
                "Codex may apply this version, but can never silently redefine it.",
            },
          ].map((item) => {
            const Icon = item.icon
            return (
              <div key={item.title} className="rounded-lg border bg-card p-4">
                <Icon className="size-4 text-ember" />
                <h3 className="mt-3 text-sm font-medium">{item.title}</h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {item.detail}
                </p>
              </div>
            )
          })}
        </div>

        {compiled && onExport && (
          <section className="mt-7 rounded-xl border bg-card p-5">
            <h2 className="font-editorial text-2xl">
              Export the shareable Constitution package
            </h2>
            <p className="mt-2 max-w-2xl text-xs leading-5 text-muted-foreground">
              This explicit write creates only <code>.criteriaforge</code> in
              the selected repository. Originals, private excerpts, OAuth
              information, run transcripts, and absolute paths are rejected.
              Export before freezing the evaluation target; otherwise create a
              fresh target snapshot afterward.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <Label htmlFor="constitution-export-root" className="sr-only">
                Absolute repository path for Constitution export
              </Label>
              <Input
                id="constitution-export-root"
                value={repositoryRoot}
                onChange={(event) => setRepositoryRoot(event.target.value)}
                placeholder="/Users/you/Projects/product"
              />
              <Button
                variant="outline"
                disabled={!repositoryRoot.trim()}
                onClick={() => void onExport(repositoryRoot.trim())}
              >
                <FileJson2 />
                Export .criteriaforge
              </Button>
            </div>
          </section>
        )}

        <Separator className="my-7" />
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <Button variant="outline" onClick={onBack}>
            Return to constitution
          </Button>
          <div className="flex flex-col items-end gap-2">
            <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Check className="size-3 text-approved" />
              Originals remain private; only the shareable contract is exportable.
            </p>
            <Button
              onClick={calibrated ? onCompile : onCalibrate}
              disabled={!approved}
            >
              <Anvil />
              {calibrated
                ? "Compile immutable v1.0"
                : "Run three calibration checks"}
              <ArrowRight />
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
