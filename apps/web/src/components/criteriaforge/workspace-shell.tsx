"use client"

import * as React from "react"
import {
  Anvil,
  ArrowLeft,
  ArrowRight,
  Check,
  Command,
  FileLock2,
  Languages,
  MessageSquareText,
  Search,
  Settings2,
  ShieldCheck,
} from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { CriteriaForgeSidebar } from "@/components/criteriaforge/app-sidebar"
import { CompileReadiness } from "@/components/criteriaforge/compile-readiness"
import { CompileReview } from "@/components/criteriaforge/compile-review"
import { ConstitutionDocument } from "@/components/criteriaforge/constitution-document"
import { CriteriaForgeCommandMenu } from "@/components/criteriaforge/command-menu"
import { EvaluationWorkspace } from "@/components/criteriaforge/evaluation-workspace"
import { EvidenceInspector } from "@/components/criteriaforge/evidence-inspector"
import { IntentIntake } from "@/components/criteriaforge/intent-intake"
import { QuestionInspector } from "@/components/criteriaforge/question-inspector"
import { RecordedRunBanner } from "@/components/criteriaforge/recorded-run-banner"
import { ReevaluationWorkspace } from "@/components/criteriaforge/reevaluation-workspace"
import { RemediationWorkspace } from "@/components/criteriaforge/remediation-workspace"
import { SystemDiagnostics } from "@/components/criteriaforge/system-diagnostics"
import { useLocalWorkspace } from "@/hooks/use-local-workspace"
import {
  initialConstitutionSections,
  readinessGates,
} from "@/lib/criteriaforge-data"
import {
  STAGE_ORDER,
  type StageId,
  type UiLocale,
  uiText,
} from "@/lib/criteriaforge/ui-types"

function initialLocale(): UiLocale {
  if (typeof window === "undefined") return "en"
  const stored = window.localStorage.getItem("criteriaforge.locale")
  if (stored === "en" || stored === "ja") return stored
  return navigator.language.toLowerCase().startsWith("ja") ? "ja" : "en"
}

export function WorkspaceShell() {
  const demo = process.env.NEXT_PUBLIC_CRITERIAFORGE_MODE !== "local"
  const local = useLocalWorkspace(!demo)
  const [activeStage, setActiveStage] = React.useState<StageId>("intent")
  const [locale, setLocale] = React.useState<UiLocale>(initialLocale)
  const [commandOpen, setCommandOpen] = React.useState(false)
  const [questionOpen, setQuestionOpen] = React.useState(false)
  const [compileOpen, setCompileOpen] = React.useState(false)
  const [diagnosticsOpen, setDiagnosticsOpen] = React.useState(false)
  const [approved, setApproved] = React.useState(false)
  const [compiled, setCompiled] = React.useState(false)
  const [sections, setSections] = React.useState(initialConstitutionSections)
  const [selectedSection, setSelectedSection] = React.useState("uncertainty")

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey)) return
      if (event.key.toLowerCase() === "k") {
        event.preventDefault()
        setCommandOpen((value) => !value)
        return
      }
      const index = Number.parseInt(event.key, 10) - 1
      const stage = STAGE_ORDER[index]
      if (stage) {
        event.preventDefault()
        setActiveStage(stage)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  const stageIndex = STAGE_ORDER.indexOf(activeStage)
  const text = uiText[locale]
  const projectName = demo
    ? "FounderBrief"
    : local.workspace?.name ?? "CriteriaForge"
  const sourceCount = demo ? 3 : local.sources.length
  const codexReady =
    demo ||
    Boolean(local.doctor?.codexLogin?.toLowerCase().includes("logged in"))

  function switchLocale() {
    setLocale((current) => {
      const next = current === "en" ? "ja" : "en"
      window.localStorage.setItem("criteriaforge.locale", next)
      document.documentElement.lang = next
      return next
    })
  }

  function approveRecommendation() {
    if (approved) return
    setApproved(true)
    setSections((current) =>
      current.map((section) =>
        section.id === "uncertainty"
          ? {
              ...section,
              provenance: "human",
              provenanceLabel: "Human approved",
              source: "Owner ratification · H-32",
              date: "Jul 21, 2026",
              status: "approved",
            }
          : section
      )
    )
    toast.success("The governing rule is now owner-ratified.", {
      description:
        "Compile readiness was recalculated. All five safeguards now pass.",
    })
  }

  function finishCompile() {
    setCompileOpen(false)
    setCompiled(true)
    setActiveStage("evidence")
    toast.success("Product Constitution v1.0 compiled.", {
      description:
        "The immutable contract and Codex acceptance package are ready.",
    })
  }

  function previousStage() {
    const previous = STAGE_ORDER[Math.max(0, stageIndex - 1)]
    if (previous) setActiveStage(previous)
  }

  function nextStage() {
    const next =
      STAGE_ORDER[Math.min(STAGE_ORDER.length - 1, stageIndex + 1)]
    if (next) setActiveStage(next)
  }

  return (
    <SidebarProvider
      defaultOpen
      style={
        {
          "--sidebar-width": "17rem",
          "--sidebar-width-mobile": "19rem",
        } as React.CSSProperties
      }
    >
      <CriteriaForgeSidebar
        activeStage={activeStage}
        onStageChange={setActiveStage}
        locale={locale}
        demo={demo}
        projectName={projectName}
        sourceCount={sourceCount}
        codexReady={codexReady}
        onOpenDiagnostics={() => setDiagnosticsOpen(true)}
      />

      <SidebarInset className="h-svh min-w-0 overflow-hidden bg-background">
        <header className="z-30 flex h-14 shrink-0 items-center gap-3 border-b bg-background/88 px-3 backdrop-blur-md supports-[backdrop-filter]:bg-background/76 sm:px-4">
          <Tooltip>
            <TooltipTrigger
              render={
                <SidebarTrigger
                  aria-label={text.projectNavigation}
                  className="shrink-0"
                />
              }
            />
            <TooltipContent>
              {text.projectNavigation} <Kbd>⌘B</Kbd>
            </TooltipContent>
          </Tooltip>

          <Breadcrumb className="hidden min-w-0 md:block">
            <BreadcrumbList>
              <BreadcrumbItem>{projectName}</BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{text.stages[activeStage]}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="min-w-0 md:hidden">
            <p className="truncate text-xs font-medium">
              {text.stages[activeStage]}
            </p>
            <p className="font-mono text-[9px] text-muted-foreground">
              {String(stageIndex + 1).padStart(2, "0")} / 07
            </p>
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            {activeStage === "constitution" && (
              <Button
                variant="outline"
                size="sm"
                className="xl:hidden"
                aria-label="Open constitution question"
                onClick={() => setQuestionOpen(true)}
              >
                <MessageSquareText />
                <span className="hidden sm:inline">Open question</span>
                {!approved && (
                  <span className="size-1.5 rounded-full bg-ember" />
                )}
              </Button>
            )}

            <div className="hidden items-center sm:flex">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Previous stage"
                onClick={previousStage}
                disabled={stageIndex === 0}
              >
                <ArrowLeft />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Next stage"
                onClick={nextStage}
                disabled={stageIndex === STAGE_ORDER.length - 1}
              >
                <ArrowRight />
              </Button>
            </div>

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Change language to ${text.languageName}`}
                    onClick={switchLocale}
                  />
                }
              >
                <Languages />
              </TooltipTrigger>
              <TooltipContent>{text.languageName}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Open system diagnostics"
                    onClick={() => setDiagnosticsOpen(true)}
                  />
                }
              >
                <Settings2 />
              </TooltipTrigger>
              <TooltipContent>System diagnostics</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label="Open command menu"
                    onClick={() => setCommandOpen(true)}
                    className="hidden sm:flex"
                  />
                }
              >
                <Search />
                <span className="text-muted-foreground">{text.find}</span>
                <Kbd className="ml-2">⌘K</Kbd>
              </TooltipTrigger>
              <TooltipContent>Search and navigate</TooltipContent>
            </Tooltip>

            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Open command menu"
              onClick={() => setCommandOpen(true)}
              className="sm:hidden"
            >
              <Command />
            </Button>
          </div>
        </header>

        {demo && (
          <RecordedRunBanner
            locale={locale}
            onReplay={() => setActiveStage("intent")}
          />
        )}

        <div className="min-h-0 flex-1 overflow-hidden">
          {activeStage === "intent" && (
            <IntentIntake
              locale={locale}
              demo={demo}
              loading={local.loading}
              workspace={local.workspace}
              sources={local.sources}
              error={local.error}
              onCreateWorkspace={local.createWorkspace}
              onUploadFile={local.uploadFile}
              onContinue={() => setActiveStage("constitution")}
            />
          )}

          {activeStage === "constitution" && (
            <div className="h-full">
              <div className="hidden h-full xl:block">
                <ResizablePanelGroup orientation="horizontal">
                  <ResizablePanel defaultSize="64" minSize="56">
                    <div className="flex h-full min-h-0 flex-col">
                      <ScrollArea className="min-h-0 flex-1">
                        <ConstitutionDocument
                          sections={sections}
                          onSectionsChange={setSections}
                          selectedSection={selectedSection}
                          onSelectSection={setSelectedSection}
                          proposedApproved={approved}
                        />
                      </ScrollArea>
                      <CompileReadiness
                        gates={readinessGates}
                        approved={approved}
                      />
                    </div>
                  </ResizablePanel>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize="36" minSize="30" maxSize="44">
                    <QuestionInspector
                      approved={approved}
                      onApprove={approveRecommendation}
                      onCompile={() => setActiveStage("compile")}
                    />
                  </ResizablePanel>
                </ResizablePanelGroup>
              </div>
              <div className="flex h-full min-h-0 flex-col xl:hidden">
                <ScrollArea className="min-h-0 flex-1">
                  <ConstitutionDocument
                    sections={sections}
                    onSectionsChange={setSections}
                    selectedSection={selectedSection}
                    onSelectSection={setSelectedSection}
                    proposedApproved={approved}
                  />
                </ScrollArea>
                <CompileReadiness
                  gates={readinessGates}
                  approved={approved}
                />
              </div>
            </div>
          )}

          {activeStage === "compile" && (
            <CompileReview
              locale={locale}
              approved={approved}
              onBack={() => setActiveStage("constitution")}
              onCompile={() => setCompileOpen(true)}
            />
          )}

          {activeStage === "evidence" && (
            <EvidenceInspector
              locale={locale}
              onContinue={() => setActiveStage("evaluate")}
            />
          )}

          {activeStage === "evaluate" && (
            <EvaluationWorkspace
              onRemediate={() => setActiveStage("improve")}
            />
          )}

          {activeStage === "improve" && (
            <RemediationWorkspace
              locale={locale}
              demo={demo}
              onContinue={() => setActiveStage("reevaluate")}
            />
          )}

          {activeStage === "reevaluate" && (
            <ReevaluationWorkspace
              locale={locale}
              onBack={() => setActiveStage("improve")}
            />
          )}
        </div>
      </SidebarInset>

      <Sheet open={questionOpen} onOpenChange={setQuestionOpen}>
        <SheetContent
          side="right"
          className="w-[min(92vw,28rem)] gap-0 p-0 sm:max-w-md"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Open constitution question</SheetTitle>
            <SheetDescription>
              Review and ratify the highest-impact unresolved decision.
            </SheetDescription>
          </SheetHeader>
          <QuestionInspector
            approved={approved}
            onApprove={() => {
              approveRecommendation()
              setQuestionOpen(false)
            }}
            onCompile={() => {
              setQuestionOpen(false)
              setActiveStage("compile")
            }}
          />
        </SheetContent>
      </Sheet>

      <Sheet open={diagnosticsOpen} onOpenChange={setDiagnosticsOpen}>
        <SheetContent
          side="right"
          className="w-[min(94vw,30rem)] p-0 sm:max-w-lg"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>System diagnostics</SheetTitle>
            <SheetDescription>
              Inspect the local runtime without exposing private evidence.
            </SheetDescription>
          </SheetHeader>
          <SystemDiagnostics demo={demo} doctor={local.doctor} />
        </SheetContent>
      </Sheet>

      <AlertDialog open={compileOpen} onOpenChange={setCompileOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogMedia
              className={
                approved
                  ? "bg-ember/10 text-ember-foreground"
                  : "bg-destructive/10 text-destructive"
              }
            >
              {approved ? <Anvil /> : <FileLock2 />}
            </AlertDialogMedia>
            <AlertDialogTitle>
              {approved
                ? compiled
                  ? "Product Constitution v1.0 already exists"
                  : "Compile Product Constitution v1.0?"
                : "One material clause is not ratified"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {approved
                ? "Compilation creates an immutable version, locks the evaluation contract, and writes the Codex acceptance package."
                : "CriteriaForge will not freeze a consequential AI-proposed rule without the Constitution Owner’s explicit approval."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 rounded-lg border bg-muted/35 p-3 text-xs">
            {[
              ["Intent complete", true],
              ["Important criteria ratified", approved],
              ["Evidence rules defined", true],
              ["Contradictions resolved", true],
              ["Stability tests pass", true],
            ].map(([label, complete]) => (
              <div key={String(label)} className="flex items-center gap-2">
                {complete ? (
                  <Check className="size-3.5 text-approved" />
                ) : (
                  <ShieldCheck className="size-3.5 text-destructive" />
                )}
                <span>{label}</span>
              </div>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={approved ? finishCompile : approveRecommendation}
              className={
                approved
                  ? "bg-ember text-ember-foreground-inverse hover:bg-ember/85"
                  : undefined
              }
            >
              {approved
                ? compiled
                  ? "Continue to evidence"
                  : "Compile immutable version"
                : "Approve governing rule"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CriteriaForgeCommandMenu
        open={commandOpen}
        onOpenChange={setCommandOpen}
        onNavigate={setActiveStage}
        locale={locale}
      />
    </SidebarProvider>
  )
}
