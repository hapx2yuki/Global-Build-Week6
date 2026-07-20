"use client"

import * as React from "react"
import {
  ChevronDown,
  FlaskConical,
  RotateCcw,
  ShieldCheck,
} from "lucide-react"

import recorded from "@/fixtures/founderbrief/recorded-evaluations.json"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { UiLocale } from "@/lib/criteriaforge/ui-types"
import { uiText } from "@/lib/criteriaforge/ui-types"

const REPLAY_EVENT = "criteriaforge:replay-count"
const DAILY_LIMIT = 10

function replayKey(): string {
  const date = new Date()
  const localDate = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-")
  return `criteriaforge.replays.${localDate}`
}

function replaySnapshot(): number {
  if (typeof window === "undefined") return 0
  return Number.parseInt(window.localStorage.getItem(replayKey()) ?? "0", 10)
}

function subscribeReplay(callback: () => void) {
  window.addEventListener(REPLAY_EVENT, callback)
  window.addEventListener("storage", callback)
  return () => {
    window.removeEventListener(REPLAY_EVENT, callback)
    window.removeEventListener("storage", callback)
  }
}

export function RecordedRunBanner({
  locale,
  onReplay,
}: {
  locale: UiLocale
  onReplay: () => void
}) {
  const text = uiText[locale]
  const replayCount = React.useSyncExternalStore(
    subscribeReplay,
    replaySnapshot,
    () => 0
  )
  const limitReached = replayCount >= DAILY_LIMIT

  function replay() {
    if (limitReached) return
    window.localStorage.setItem(replayKey(), String(replayCount + 1))
    window.dispatchEvent(new Event(REPLAY_EVENT))
    onReplay()
  }

  return (
    <div className="border-b border-evidence/20 bg-evidence/7 px-3 py-2 text-xs sm:px-4">
      <div className="flex min-h-6 flex-wrap items-center gap-x-3 gap-y-1">
        <div className="flex min-w-0 items-center gap-2 font-medium text-evidence-foreground">
          <FlaskConical className="size-3.5 shrink-0" />
          <span>{text.recorded}</span>
        </div>
        <span className="text-muted-foreground">{text.recordedDetail}</span>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-[9px]">
            {recorded.modelId} · {recorded.runCount} runs
          </Badge>
          <span className="hidden items-center gap-1 text-[10px] text-approved-foreground sm:flex">
            <ShieldCheck className="size-3" />
            stable · citations verified
          </span>
          <Button
            variant="ghost"
            size="xs"
            onClick={replay}
            disabled={limitReached}
            aria-label={
              limitReached
                ? "Daily replay limit reached"
                : "Replay FounderBrief from the beginning"
            }
          >
            <RotateCcw />
            {replayCount}/{DAILY_LIMIT}
          </Button>
        </div>
      </div>
      <details className="group mt-1 text-[10px] text-muted-foreground">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-sm font-mono outline-none focus-visible:ring-3">
          Reproducibility record
          <ChevronDown className="size-3 transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-2 grid gap-x-6 gap-y-1 border-t border-evidence/15 pt-2 font-mono sm:grid-cols-2 xl:grid-cols-4">
          <span>Codex: {recorded.codexVersion}</span>
          <span>Recorded: {recorded.recordedAt}</span>
          <span>Constitution: v{recorded.constitutionVersion}</span>
          <span>Target: {recorded.targetVersion}</span>
          <span>Input: {recorded.runMetadata[0].inputHash.slice(0, 12)}…</span>
          <span>
            Outputs:{" "}
            {recorded.runMetadata
              .map((run) => run.outputHash.slice(0, 6))
              .join(" · ")}
          </span>
          <span>Commit: {recorded.sourceGitCommit.slice(0, 12)}</span>
          <span>
            Result: {recorded.aggregation.status}/
            {recorded.aggregation.overall}
          </span>
        </div>
      </details>
    </div>
  )
}
