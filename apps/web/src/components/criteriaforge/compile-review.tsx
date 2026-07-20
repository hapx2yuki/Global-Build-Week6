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
  onBack,
  onCompile,
}: {
  locale: UiLocale
  approved: boolean
  onBack: () => void
  onCompile: () => void
}) {
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
                approved
                  ? "border-approved/25 bg-approved/8 text-approved-foreground"
                  : "border-destructive/25 bg-destructive/7 text-destructive"
              }
            >
              {approved ? "5 / 5 pass" : "4 / 5 pass"}
            </Badge>
          </div>
          <div className="divide-y">
            {gates.map((gate, index) => {
              const passed = approved || index !== 1
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
            <Button onClick={onCompile} disabled={!approved}>
              <Anvil />
              Compile immutable v1.0
              <ArrowRight />
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
