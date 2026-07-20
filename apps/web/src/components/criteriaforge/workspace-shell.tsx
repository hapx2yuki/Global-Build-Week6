"use client"

import * as React from "react"
import {
  Anvil,
  BookOpenText,
  Check,
  Command,
  FileLock2,
  Languages,
  MessageSquareText,
  Scale,
  Search,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { CriteriaForgeSidebar } from "@/components/criteriaforge/app-sidebar"
import { CompileReadiness } from "@/components/criteriaforge/compile-readiness"
import { ConstitutionDocument } from "@/components/criteriaforge/constitution-document"
import { CriteriaForgeCommandMenu } from "@/components/criteriaforge/command-menu"
import { EvaluationWorkspace } from "@/components/criteriaforge/evaluation-workspace"
import { QuestionInspector } from "@/components/criteriaforge/question-inspector"
import {
  initialConstitutionSections,
  readinessGates,
} from "@/lib/criteriaforge-data"

type WorkspaceView = "constitution" | "evaluation"

export function WorkspaceShell() {
  const [view, setView] = React.useState<WorkspaceView>("constitution")
  const [commandOpen, setCommandOpen] = React.useState(false)
  const [questionOpen, setQuestionOpen] = React.useState(false)
  const [compileOpen, setCompileOpen] = React.useState(false)
  const [approved, setApproved] = React.useState(false)
  const [sections, setSections] = React.useState(initialConstitutionSections)
  const [selectedSection, setSelectedSection] =
    React.useState("uncertainty")

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey)) return

      if (event.key.toLowerCase() === "k") {
        event.preventDefault()
        setCommandOpen((value) => !value)
      }
      if (event.key === "1") {
        event.preventDefault()
        setView("constitution")
      }
      if (event.key === "2") {
        event.preventDefault()
        setView("evaluation")
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

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
    toast.success("Product Constitution v1.0 compiled.", {
      description:
        "The immutable contract and Codex acceptance package are ready.",
    })
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
      <CriteriaForgeSidebar />

      <Tabs
        value={view}
        onValueChange={(value) => setView(value as WorkspaceView)}
        className="min-w-0 flex-1 gap-0"
      >
        <SidebarInset className="min-w-0 bg-background">
          <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b bg-background/88 px-3 backdrop-blur-md supports-[backdrop-filter]:bg-background/76 sm:px-4">
            <Tooltip>
              <TooltipTrigger
                render={
                  <SidebarTrigger
                    aria-label="Toggle project navigation"
                    className="shrink-0"
                  />
                }
              />
              <TooltipContent>
                Project navigation <Kbd>⌘B</Kbd>
              </TooltipContent>
            </Tooltip>

            <Breadcrumb className="hidden min-w-0 md:block">
              <BreadcrumbList>
                <BreadcrumbItem>CriteriaForge</BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>
                    {view === "constitution"
                      ? "Product Constitution"
                      : "Formal evaluation"}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <TabsList
              variant="line"
              className="ml-0 shrink-0 md:ml-3"
              aria-label="Workspace views"
            >
              <TabsTrigger
                value="constitution"
                aria-label="Product Constitution"
              >
                <BookOpenText />
                <span className="hidden sm:inline">Constitution</span>
              </TabsTrigger>
              <TabsTrigger value="evaluation" aria-label="Formal evaluation">
                <Scale />
                <span className="hidden sm:inline">Evaluation</span>
              </TabsTrigger>
            </TabsList>

            <div className="ml-auto flex items-center gap-1.5">
              {view === "constitution" && (
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

              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Change language"
                    />
                  }
                >
                  <Languages />
                </TooltipTrigger>
                <TooltipContent>English / 日本語</TooltipContent>
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
                  <span className="text-muted-foreground">Find</span>
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

          <TabsContent
            value="constitution"
            className="min-h-0 flex-1 overflow-hidden"
          >
            <div className="hidden h-[calc(100svh-3.5rem)] xl:block">
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
                    onCompile={() => setCompileOpen(true)}
                  />
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>

            <div className="flex h-[calc(100svh-3.5rem)] min-h-0 flex-col xl:hidden">
              <ScrollArea className="min-h-0 flex-1">
                <ConstitutionDocument
                  sections={sections}
                  onSectionsChange={setSections}
                  selectedSection={selectedSection}
                  onSelectSection={setSelectedSection}
                  proposedApproved={approved}
                />
              </ScrollArea>
              <CompileReadiness gates={readinessGates} approved={approved} />
            </div>
          </TabsContent>

          <TabsContent
            value="evaluation"
            className="min-h-0 flex-1 overflow-hidden"
          >
            <div className="h-[calc(100svh-3.5rem)]">
              <EvaluationWorkspace />
            </div>
          </TabsContent>
        </SidebarInset>
      </Tabs>

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
            onApprove={approveRecommendation}
            onCompile={() => {
              setQuestionOpen(false)
              setCompileOpen(true)
            }}
          />
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
                ? "Compile Product Constitution v1.0?"
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
              {approved ? "Compile immutable version" : "Approve governing rule"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CriteriaForgeCommandMenu
        open={commandOpen}
        onOpenChange={setCommandOpen}
        onNavigate={setView}
      />
    </SidebarProvider>
  )
}
