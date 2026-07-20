import { CircleCheck, CircleDashed, Info } from "lucide-react"

import { Progress } from "@/components/ui/progress"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { ReadinessGate } from "@/lib/criteriaforge-data"

export function CompileReadiness({
  gates,
  approved,
}: {
  gates: ReadinessGate[]
  approved: boolean
}) {
  const resolvedGates = gates.map((gate) =>
    gate.label === "Ratified" && approved
      ? { ...gate, value: 100, complete: true }
      : gate
  )
  const complete = resolvedGates.filter((gate) => gate.complete).length
  const value = Math.round(
    resolvedGates.reduce((sum, gate) => sum + gate.value, 0) /
      resolvedGates.length
  )

  return (
    <section
      aria-labelledby="compile-readiness-heading"
      className="border-t bg-background/92 px-5 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-7 sm:py-4"
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2
                id="compile-readiness-heading"
                className="text-sm font-medium"
              >
                Compile readiness
              </h2>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      aria-label="About compile readiness"
                      className="rounded-sm text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    />
                  }
                >
                  <Info className="size-3.5" />
                </TooltipTrigger>
                <TooltipContent className="max-w-64">
                  A constitution compiles only when all five safeguards are
                  satisfied.
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {complete} of {resolvedGates.length} safeguards satisfied
            </p>
          </div>
          <p className="font-mono text-xs tabular-nums text-muted-foreground">
            {value}%
          </p>
        </div>
        <Progress
          value={value}
          aria-label={`${value}% compile ready`}
          className="h-1.5"
        />
        <div className="grid grid-cols-5 gap-1 sm:gap-2">
          {resolvedGates.map((gate) => {
            const Icon = gate.complete ? CircleCheck : CircleDashed

            return (
              <Tooltip key={gate.label}>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      aria-label={`${gate.label}: ${
                        gate.complete ? "satisfied" : "not yet satisfied"
                      }`}
                      className={cn(
                        "flex min-w-0 items-center justify-center gap-2 rounded-md px-1 py-1.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:justify-start",
                        !gate.complete && "text-ember-foreground"
                      )}
                    />
                  }
                >
                  <Icon
                    className={cn(
                      "size-3.5 shrink-0",
                      gate.complete ? "text-approved" : "text-ember"
                    )}
                  />
                  <span className="hidden truncate text-[11px] font-medium sm:inline">
                    {gate.label}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-64">
                  {gate.detail}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      </div>
    </section>
  )
}
