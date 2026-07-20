"use client"

import {
  ArrowRight,
  CircleAlert,
  CircleCheck,
  FileSearch,
  TriangleAlert,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { EvaluationItem } from "@/lib/criteriaforge/contracts"

export type LocalEvaluationAggregation = {
  status: "stable" | "unstable"
  overall: "blocked" | "not_met" | "met"
  reasons: string[]
  items: Array<{
    criterionId: string
    status: "stable" | "unstable"
    mustPass: "pass" | "fail" | "not_applicable" | "undetermined"
    qualityLevel?: "insufficient" | "minimum" | "good" | "exceptional"
    reasons: string[]
    representative: EvaluationItem | null
  }>
}

const overallCopy = {
  blocked: {
    label: "Blocked",
    icon: CircleAlert,
    className: "border-ember/25 bg-ember/7 text-ember-foreground",
  },
  not_met: {
    label: "Not met",
    icon: TriangleAlert,
    className: "border-destructive/25 bg-destructive/7 text-destructive",
  },
  met: {
    label: "Met",
    icon: CircleCheck,
    className: "border-approved/25 bg-approved/8 text-approved-foreground",
  },
}

export function LocalEvaluationWorkspace({
  aggregation,
  running,
  onRun,
  onRemediate,
}: {
  aggregation: LocalEvaluationAggregation | null
  running: boolean
  onRun: () => void
  onRemediate: () => void
}) {
  if (!aggregation) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="max-w-lg rounded-xl border bg-card p-6 text-center">
          <FileSearch className="mx-auto size-7 text-ember" />
          <h1 className="mt-4 font-editorial text-3xl">
            Run the immutable Constitution three times
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Review the exact artifact excerpts first. All runs use the same
            Constitution version, target snapshot, model, prompt, and schema.
          </p>
          <Button className="mt-5" disabled={running} onClick={onRun}>
            {running ? "Evaluation in progress…" : "Review evaluation send"}
          </Button>
        </div>
      </div>
    )
  }

  const copy = overallCopy[aggregation.overall]
  const OverallIcon = copy.icon
  return (
    <div className="h-full overflow-y-auto">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ember-foreground">
              05 · Formal evaluation
            </p>
            <h1 className="mt-3 font-editorial text-4xl">
              Intent–reality gap
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">
              {aggregation.status === "stable"
                ? "3 runs agree"
                : "Stability insufficient"}
            </Badge>
            <Badge variant="outline" className={copy.className}>
              <OverallIcon />
              {copy.label}
            </Badge>
          </div>
        </div>

        {aggregation.reasons.length > 0 && (
          <div className="mt-6 rounded-lg border border-ember/25 bg-ember/5 p-4 text-xs">
            {aggregation.reasons.join(" · ")}
          </div>
        )}

        <section className="mt-7 overflow-hidden rounded-xl border bg-card">
          {aggregation.items.map((item) => {
            const result = item.representative
            return (
              <article key={item.criterionId} className="border-b last:border-0">
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {item.criterionId}
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      {item.mustPass === "not_applicable"
                        ? `Quality: ${item.qualityLevel ?? "undetermined"}`
                        : `Must-pass: ${item.mustPass}`}
                    </p>
                  </div>
                  <Badge variant="outline">{item.status}</Badge>
                </div>
                {result && (
                  <div className="grid border-t lg:grid-cols-4">
                    {[
                      ["Intent", result.intent],
                      ["Observed", result.observed],
                      [
                        "Evidence",
                        result.evidence.length > 0
                          ? result.evidence
                              .map(
                                (citation) =>
                                  `${citation.sourceId} · ${JSON.stringify(
                                    citation.locator
                                  )}`
                              )
                              .join("\n")
                          : "No verified evidence adopted.",
                      ],
                      ["Gap", result.gap],
                    ].map(([label, value], index) => (
                      <div
                        key={label}
                        className={`min-w-0 p-4 ${
                          index > 0 ? "border-t lg:border-l lg:border-t-0" : ""
                        }`}
                      >
                        <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                          {label}
                        </p>
                        <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            )
          })}
        </section>

        <div className="mt-7 flex flex-wrap justify-end gap-3">
          <Button variant="outline" disabled={running} onClick={onRun}>
            Re-run with a fresh confirmation
          </Button>
          <Button
            disabled={
              aggregation.overall !== "not_met" ||
              aggregation.status !== "stable"
            }
            onClick={onRemediate}
          >
            {aggregation.status === "stable"
              ? "Create bounded remediation brief"
              : "Resolve evaluation instability first"}
            <ArrowRight />
          </Button>
        </div>
      </main>
    </div>
  )
}
