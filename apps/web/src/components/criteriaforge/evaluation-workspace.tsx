"use client"

import * as React from "react"
import {
  ArrowRight,
  Check,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  FileSearch,
  GitCompareArrows,
  Link2,
  Search,
  TriangleAlert,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"
import { evaluationCriteria } from "@/lib/criteriaforge-data"
import recordedFounderBrief from "@/fixtures/founderbrief/recorded-evaluations.json"

const statusConfig = {
  fail: {
    label: "Gate failed",
    icon: TriangleAlert,
    className: "border-destructive/25 bg-destructive/7 text-destructive",
  },
  insufficient: {
    label: "Evidence weak",
    icon: CircleAlert,
    className: "border-ember/25 bg-ember/7 text-ember-foreground",
  },
  pass: {
    label: "Meets",
    icon: CircleCheck,
    className: "border-approved/25 bg-approved/8 text-approved-foreground",
  },
}

function CriterionRow({
  criterion,
  improved,
}: {
  criterion: (typeof evaluationCriteria)[number]
  improved: boolean
}) {
  const effectiveStatus = improved ? "pass" : criterion.status
  const status = statusConfig[effectiveStatus]
  const StatusIcon = status.icon

  return (
    <Collapsible defaultOpen={criterion.id === "FR-01"}>
      <div className="border-b">
        <CollapsibleTrigger
          render={
            <button
              type="button"
              className="group flex w-full items-start gap-3 px-4 py-4 text-left outline-none transition-colors hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/40 sm:px-6"
            />
          }
        >
          <span className="mt-0.5 font-mono text-[10px] text-muted-foreground">
            {criterion.id}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">{criterion.title}</span>
            <span className="mt-1 block text-xs text-muted-foreground">
              {criterion.kind === "must-pass" ? "Must-pass condition" : "Quality criterion"}
            </span>
          </span>
          <Badge
            variant="outline"
            className={cn("gap-1.5 font-normal", status.className)}
          >
            <StatusIcon />
            {status.label}
          </Badge>
          <ChevronDown className="mt-0.5 size-4 text-muted-foreground transition-transform group-data-panel-open:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="grid border-t bg-background/55 lg:grid-cols-4">
            {[
              ["Intent", criterion.intent],
              [
                "Observed",
                improved
                  ? "The repaired build now preserves this requirement and exposes it in the final brief."
                  : criterion.observed,
              ],
              [
                "Evidence",
                improved
                  ? `${criterion.evidence} Re-run confirms the repaired behavior.`
                  : criterion.evidence,
              ],
              [
                "Gap",
                improved
                  ? "No material gap observed after the Codex repair."
                  : criterion.gap,
              ],
            ].map(([label, text], index) => (
              <div
                key={label}
                className={cn(
                  "min-w-0 border-b p-4 lg:border-b-0",
                  index > 0 && "lg:border-l",
                  label === "Gap" &&
                    effectiveStatus !== "pass" &&
                    "bg-destructive/[0.025]"
                )}
              >
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                  {label}
                </p>
                <p className="mt-2 text-xs leading-5 text-foreground/78">
                  {text}
                </p>
                {label === "Evidence" && (
                  <button
                    type="button"
                    className="mt-3 inline-flex items-center gap-1 rounded-sm font-mono text-[9px] text-evidence-foreground outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <Link2 className="size-3" />
                    {criterion.source}
                  </button>
                )}
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

export function EvaluationWorkspace({
  onRemediate,
}: {
  onRemediate?: () => void
}) {
  const [improved, setImproved] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<
    "all" | "issues" | "meets"
  >("all")
  const visibleCriteria = evaluationCriteria.filter((criterion) => {
    const matchesQuery = `${criterion.id} ${criterion.title}`
      .toLowerCase()
      .includes(query.toLowerCase())
    const effectiveStatus = improved ? "pass" : criterion.status
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "issues" && effectiveStatus !== "pass") ||
      (statusFilter === "meets" && effectiveStatus === "pass")

    return matchesQuery && matchesStatus
  })
  const passCount = improved
    ? evaluationCriteria.length
    : evaluationCriteria.filter((criterion) => criterion.status === "pass").length
  const progress = Math.round((passCount / evaluationCriteria.length) * 100)

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="border-b bg-card px-4 py-5 sm:px-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-mono text-[9px]">
                FounderBrief · build 0.{improved ? "2" : "1"}
              </Badge>
              <Badge variant="secondary" className="font-mono text-[9px]">
                Constitution v1.0
              </Badge>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <h1 className="font-editorial text-3xl tracking-[-0.025em]">
                Intent–reality gap
              </h1>
              <Badge
                variant="outline"
                className={cn(
                  "gap-1.5",
                  improved
                    ? "border-approved/25 bg-approved/8 text-approved-foreground"
                    : "border-destructive/25 bg-destructive/7 text-destructive"
                )}
              >
                {improved ? <Check /> : <TriangleAlert />}
                {improved ? "Meets" : "Needs revision"}
              </Badge>
            </div>
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">
              Every finding connects the ratified intent to an observed
              behavior and a reviewable source.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant={improved ? "outline" : "default"}
              onClick={() => setImproved((value) => !value)}
            >
              <GitCompareArrows />
              {improved ? "View original build" : "Compare repaired build"}
            </Button>
            <Button variant="outline" onClick={onRemediate}>
              Create Codex brief
              <ArrowRight />
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 border-t pt-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">
                {passCount} of {evaluationCriteria.length} criteria meet the
                constitution
              </span>
              <span className="font-mono text-muted-foreground">
                {progress}%
              </span>
            </div>
            <Progress
              value={progress}
              aria-label={`${progress}% criteria meeting the constitution`}
              className="mt-2 h-1.5"
            />
          </div>
          <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
            Formal evaluation · {recordedFounderBrief.runCount} independent runs
          </p>
        </div>
      </header>

      <Tabs defaultValue="criteria" className="min-h-0 flex-1 gap-0">
        <div className="flex flex-col justify-between gap-3 border-b bg-card px-4 py-2 sm:flex-row sm:items-center sm:px-6">
          <TabsList variant="line">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="criteria">Criteria</TabsTrigger>
            <TabsTrigger value="evidence">Evidence</TabsTrigger>
          </TabsList>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <ToggleGroup
              value={[statusFilter]}
              onValueChange={(value) => {
                if (value[0]) {
                  setStatusFilter(value[0] as typeof statusFilter)
                }
              }}
              variant="outline"
              size="sm"
              spacing={0}
              aria-label="Filter criteria by status"
            >
              <ToggleGroupItem value="all">All</ToggleGroupItem>
              <ToggleGroupItem value="issues">Issues</ToggleGroupItem>
              <ToggleGroupItem value="meets">Meets</ToggleGroupItem>
            </ToggleGroup>
            <InputGroup className="w-full sm:w-64">
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              <InputGroupInput
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Find a criterion…"
                aria-label="Find a criterion"
              />
            </InputGroup>
          </div>
        </div>

        <TabsContent value="summary" className="min-h-0 overflow-y-auto p-4 sm:p-6">
          <Alert
            className={cn(
              "max-w-3xl",
              improved
                ? "border-approved/25 bg-approved/8"
                : "border-destructive/25 bg-destructive/[0.035]"
            )}
          >
            {improved ? <CircleCheck /> : <TriangleAlert />}
            <AlertTitle>
              {improved
                ? "The repaired build now meets the locked constitution."
                : "Two must-pass conditions fail in the original build."}
            </AlertTitle>
            <AlertDescription>
              {improved
                ? "The same evaluation contract was applied without weakening any criterion."
                : "FounderBrief drops one explicit non-goal and introduces two material assumptions without asking."}
            </AlertDescription>
          </Alert>
        </TabsContent>

        <TabsContent value="criteria" className="min-h-0">
          <ScrollArea className="h-full">
            <div className="min-w-0">
              {visibleCriteria.map((criterion) => (
                <CriterionRow
                  key={criterion.id}
                  criterion={criterion}
                  improved={improved}
                />
              ))}
              {visibleCriteria.length === 0 && (
                <Empty className="min-h-64">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <FileSearch />
                    </EmptyMedia>
                    <EmptyTitle>No matching criterion</EmptyTitle>
                    <EmptyDescription>
                      Change the status filter, or try a stable ID such as
                      FR-01.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="evidence" className="min-h-0 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-4xl">
            <h2 className="font-editorial text-2xl">Reviewed evidence</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Direct observations are separated from descriptions and model
              inferences.
            </p>
            <div className="mt-5 divide-y rounded-lg border bg-card">
              {evaluationCriteria.map((criterion) => (
                <div
                  key={criterion.id}
                  className="grid gap-2 px-4 py-4 sm:grid-cols-[5rem_minmax(0,1fr)_auto]"
                >
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {criterion.id}
                  </span>
                  <span className="text-xs leading-5">{criterion.source}</span>
                  <Badge
                    variant="outline"
                    className="w-fit border-evidence/20 bg-evidence/7 text-evidence-foreground"
                  >
                    Cited
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
