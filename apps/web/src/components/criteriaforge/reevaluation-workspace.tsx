import {
  ArrowLeft,
  Check,
  CircleCheck,
  GitCompareArrows,
  Minus,
  ShieldCheck,
  TrendingUp,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { UiLocale } from "@/lib/criteriaforge/ui-types"

const comparisons = [
  {
    id: "FR-01",
    label: "Preserve explicit non-goals",
    before: "Fail",
    after: "Pass",
    change: "Improved",
  },
  {
    id: "FR-02",
    label: "Ask before material assumptions",
    before: "Fail",
    after: "Pass",
    change: "Improved",
  },
  {
    id: "FR-03",
    label: "Trace output to exact source",
    before: "Insufficient",
    after: "Good",
    change: "Improved",
  },
  {
    id: "UX-02",
    label: "First result in five minutes",
    before: "Pass",
    after: "Pass",
    change: "Unchanged",
  },
]

export function ReevaluationWorkspace({
  locale,
  onBack,
}: {
  locale: UiLocale
  onBack: () => void
}) {
  const title =
    locale === "ja"
      ? "憲法を弱めず、同じ位置で前後を比べる"
      : "Compare before and after without weakening the constitution"
  return (
    <div className="h-full overflow-y-auto">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-7">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-approved-foreground">
              07 · Re-evaluation
            </p>
            <h1 className="mt-3 max-w-4xl font-editorial text-4xl tracking-[-0.035em] sm:text-5xl">
              {title}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Constitution v1.0</Badge>
            <Badge
              variant="outline"
              className="border-approved/25 bg-approved/8 text-approved-foreground"
            >
              <ShieldCheck />
              Same contract hash
            </Badge>
          </div>
        </div>

        <Alert className="mt-7 border-approved/25 bg-approved/8">
          <CircleCheck />
          <AlertTitle>All applicable must-pass conditions now meet</AlertTitle>
          <AlertDescription>
            Three independent gpt-5.6-sol runs agree. No new side effect was
            found in dependent criteria.
          </AlertDescription>
        </Alert>

        <section className="mt-7 overflow-hidden rounded-xl border bg-card">
          <div className="grid grid-cols-[5rem_minmax(0,1fr)_6rem_6rem] gap-3 border-b bg-muted/35 px-4 py-3 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground sm:grid-cols-[5rem_minmax(0,1fr)_9rem_9rem_8rem]">
            <span>ID</span>
            <span>Criterion</span>
            <span>Before</span>
            <span>After</span>
            <span className="hidden sm:block">Change</span>
          </div>
          {comparisons.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[5rem_minmax(0,1fr)_6rem_6rem] gap-3 border-b px-4 py-4 last:border-b-0 sm:grid-cols-[5rem_minmax(0,1fr)_9rem_9rem_8rem] sm:items-center"
            >
              <span className="font-mono text-[10px] text-muted-foreground">
                {item.id}
              </span>
              <span className="text-sm font-medium">{item.label}</span>
              <Badge
                variant="outline"
                className={
                  item.before === "Pass"
                    ? "border-approved/25 text-approved-foreground"
                    : "border-destructive/25 text-destructive"
                }
              >
                {item.before}
              </Badge>
              <Badge
                variant="outline"
                className="border-approved/25 bg-approved/8 text-approved-foreground"
              >
                <Check />
                {item.after}
              </Badge>
              <span className="hidden items-center gap-1.5 text-xs sm:flex">
                {item.change === "Improved" ? (
                  <TrendingUp className="size-3.5 text-approved" />
                ) : (
                  <Minus className="size-3.5 text-muted-foreground" />
                )}
                {item.change}
              </span>
            </div>
          ))}
        </section>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border bg-card p-4">
            <p className="font-mono text-[9px] uppercase text-muted-foreground">
              Must-pass
            </p>
            <p className="mt-2 font-editorial text-3xl">4 / 4</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Stable across all three runs
            </p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="font-mono text-[9px] uppercase text-muted-foreground">
              Evidence
            </p>
            <p className="mt-2 font-editorial text-3xl">100%</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Decisive findings locally verified
            </p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="font-mono text-[9px] uppercase text-muted-foreground">
              Side effects
            </p>
            <p className="mt-2 font-editorial text-3xl">0</p>
            <p className="mt-1 text-xs text-muted-foreground">
              No dependent criterion worsened
            </p>
          </div>
        </div>

        <div className="mt-7 flex flex-col justify-between gap-4 border-t pt-6 sm:flex-row sm:items-center">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft />
            Review remediation
          </Button>
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <GitCompareArrows className="size-4 text-evidence" />
            Different constitution versions are never shown as a same-condition
            comparison.
          </p>
        </div>
      </main>
    </div>
  )
}
