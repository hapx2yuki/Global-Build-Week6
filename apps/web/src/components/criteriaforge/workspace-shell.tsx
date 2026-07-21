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
import { Checkbox } from "@/components/ui/checkbox"
import { Kbd } from "@/components/ui/kbd"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
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
import { Textarea } from "@/components/ui/textarea"
import { CriteriaForgeSidebar } from "@/components/criteriaforge/app-sidebar"
import { CompileReadiness } from "@/components/criteriaforge/compile-readiness"
import { CompileReview } from "@/components/criteriaforge/compile-review"
import { ConstitutionDocument } from "@/components/criteriaforge/constitution-document"
import { CriteriaForgeCommandMenu } from "@/components/criteriaforge/command-menu"
import { EvaluationWorkspace } from "@/components/criteriaforge/evaluation-workspace"
import { EvidenceInspector } from "@/components/criteriaforge/evidence-inspector"
import { IntentIntake } from "@/components/criteriaforge/intent-intake"
import { LocalConstitutionControls } from "@/components/criteriaforge/local-constitution-controls"
import { LocalEvidenceTarget } from "@/components/criteriaforge/local-evidence-target"
import {
  type LocalEvaluationAggregation,
  LocalEvaluationWorkspace,
} from "@/components/criteriaforge/local-evaluation-workspace"
import { LocalReevaluationWorkspace } from "@/components/criteriaforge/local-reevaluation-workspace"
import { LocalRemediationWorkspace } from "@/components/criteriaforge/local-remediation-workspace"
import { QuestionInspector } from "@/components/criteriaforge/question-inspector"
import { RecordedRunBanner } from "@/components/criteriaforge/recorded-run-banner"
import { ReevaluationWorkspace } from "@/components/criteriaforge/reevaluation-workspace"
import { RemediationWorkspace } from "@/components/criteriaforge/remediation-workspace"
import { SystemDiagnostics } from "@/components/criteriaforge/system-diagnostics"
import {
  type LocalDraft,
  type LocalEvidenceSegment,
  type LocalJob,
  useLocalWorkspace,
} from "@/hooks/use-local-workspace"
import type {
  EvaluationRun,
  RemediationBrief,
} from "@/lib/criteriaforge/contracts"
import {
  type ConstitutionSection as UiConstitutionSection,
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
  return "en"
}

const sectionTitles: Record<string, string> = {
  purpose: "Why this product exists",
  experience: "Promised experience",
  scope: "Scope and non-goals",
  must_pass: "Must-pass conditions",
  quality: "Quality criteria",
  evidence: "Required evidence",
  examples: "Good, bad, and boundary examples",
  stop_conditions: "When judgment must stop",
}

function draftSections(draft: LocalDraft): UiConstitutionSection[] {
  return draft.contract.sections.map((section, index) => ({
    id: section.sectionId,
    number: String(index + 1).padStart(2, "0"),
    title: sectionTitles[section.key] ?? section.key,
    summary: section.originalText,
    detail:
      section.referenceTranslation ??
      `Authoritative ${section.originalLanguage} source text`,
    provenance:
      section.provenance === "human_approved"
        ? "human"
        : section.provenance === "source_extracted"
          ? "source"
          : "ai",
    provenanceLabel: section.provenance.replaceAll("_", " "),
    source:
      section.sourceIds.length > 0
        ? section.sourceIds.join(", ")
        : "AI proposal · awaiting human decision",
    date: new Date(section.lastEditedAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    status:
      section.approvalStatus === "approved" ? "approved" : "unconfirmed",
  }))
}

function draftRatified(draft: LocalDraft | null): boolean {
  if (!draft) return false
  const sectionsReady = draft.contract.sections.every(
    (section) =>
      section.importance !== "material" ||
      section.approvalStatus === "approved"
  )
  const criteriaReady = draft.contract.criteria.every(
    (criterion) =>
      criterion.approvalStatus === "approved" &&
      criterion.examples.every((example) => example.ratified)
  )
  const questionsReady = draft.contract.openQuestions.every(
    (question) =>
      question.impact !== "material" || question.status === "answered"
  )
  const contradictionsReady = draft.contract.contradictions.every(
    (item) =>
      item.material !== true ||
      item.equalAuthority !== true ||
      item.resolvedByHuman === true
  )
  return (
    sectionsReady && criteriaReady && questionsReady && contradictionsReady
  )
}

function restoredCalibrationRuns(
  draft: LocalDraft | null,
  jobs: LocalJob[]
): EvaluationRun[] {
  const expectedHashes = draft
    ? {
        sections: draft.contract.sections.map((section) => ({
          sectionId: section.sectionId,
          meaningHash: section.meaningHash,
        })),
        criteria: draft.contract.criteria.map((criterion) => ({
          criterionId: criterion.criterionId,
          meaningHash: criterion.meaningHash,
        })),
      }
    : null
  const job = jobs.find(
    (candidate) =>
      draft &&
      candidate.type === "constitution_calibration" &&
      candidate.status === "completed" &&
      candidate.result?.draftId === draft.id &&
      JSON.stringify(candidate.result?.semanticHashes) ===
        JSON.stringify(expectedHashes) &&
      candidate.result?.aggregation &&
      (candidate.result.aggregation as { status?: string }).status === "stable"
  )
  return Array.isArray(job?.result?.calibrationRuns)
    ? (job.result.calibrationRuns as EvaluationRun[])
    : []
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
  const [draftReviewOpen, setDraftReviewOpen] = React.useState(false)
  const [evaluationReviewOpen, setEvaluationReviewOpen] = React.useState(false)
  const [evaluationReturnStage, setEvaluationReturnStage] =
    React.useState<StageId>("evaluate")
  const [calibrationOpen, setCalibrationOpen] = React.useState(false)
  const [reviewLoading, setReviewLoading] = React.useState(false)
  const [draftSegmentsForReview, setDraftSegmentsForReview] = React.useState<
    LocalEvidenceSegment[]
  >([])
  const [selectedSegmentIds, setSelectedSegmentIds] = React.useState<string[]>(
    []
  )
  const [evaluationSegments, setEvaluationSegments] = React.useState<
    LocalEvidenceSegment[]
  >([])
  const [selectedEvaluationSegmentIds, setSelectedEvaluationSegmentIds] =
    React.useState<string[]>([])
  const [model, setModel] = React.useState<
    "gpt-5.6-terra" | "gpt-5.6-sol"
  >("gpt-5.6-terra")
  const [productPurpose, setProductPurpose] = React.useState(
    "Compile a testable Product Constitution for a product or work artifact."
  )
  const [explicitNonGoals, setExplicitNonGoals] = React.useState(
    "Do not evaluate people or automate hiring, credit, insurance, medical, legal, or education eligibility decisions."
  )
  const [calibrationRuns, setCalibrationRuns] = React.useState<
    EvaluationRun[]
  >([])
  const [remediationPatch, setRemediationPatch] = React.useState<string | null>(
    null
  )

  const liveDraft = local.constitutionState?.latestDraft ?? null
  const persistedCalibrationRuns = restoredCalibrationRuns(
    liveDraft,
    local.constitutionState?.jobs ?? []
  )
  const effectiveCalibrationRuns =
    calibrationRuns.length === 3
      ? calibrationRuns
      : persistedCalibrationRuns
  const displayedSections =
    demo || !liveDraft ? sections : draftSections(liveDraft)
  const effectiveSelectedSection = displayedSections.some(
    (section) => section.id === selectedSection
  )
    ? selectedSection
    : (displayedSections[0]?.id ?? selectedSection)
  const effectiveApproved = demo ? approved : draftRatified(liveDraft)
  const calibrated = demo || effectiveCalibrationRuns.length === 3
  const effectiveCompiled =
    demo ? compiled : (local.constitutionState?.versions.length ?? 0) > 0
  const liveVersion = local.constitutionState?.versions[0] ?? null
  const liveTarget = local.constitutionState?.targets[0] ?? null
  const formalEvaluationJobs =
    local.constitutionState?.jobs.filter(
      (job) =>
        job.type === "formal_evaluation" &&
        job.status === "completed" &&
        job.result?.constitutionVersionId === liveVersion?.id
    ) ?? []
  const liveEvaluationJob =
    formalEvaluationJobs.find(
      (job) => job.result?.targetSnapshotId === liveTarget?.id
    ) ?? null
  const liveAggregation =
    (liveEvaluationJob?.result?.aggregation as
      | LocalEvaluationAggregation
      | undefined) ?? null
  const liveRemediation = local.constitutionState?.remediations[0] ?? null
  const liveRemediationJob =
    local.constitutionState?.jobs.find(
      (job) =>
        liveRemediation &&
        job.type === `remediation:${liveRemediation.id}`
    ) ?? null
  const remediationBeforeTarget =
    local.constitutionState?.targets.find(
      (target) => target.id === liveRemediation?.contract.targetSnapshotId
    ) ?? null
  const remediationAfterTarget =
    liveRemediation?.status === "applied"
      ? (local.constitutionState?.targets.find(
          (target) =>
            target.id !== remediationBeforeTarget?.id &&
            new Date(target.createdAt).getTime() >
              new Date(liveRemediation.updatedAt).getTime()
        ) ?? null)
      : null
  const remediationBeforeJob =
    formalEvaluationJobs.find(
      (job) => job.result?.targetSnapshotId === remediationBeforeTarget?.id
    ) ?? null
  const remediationAfterJob =
    formalEvaluationJobs.find(
      (job) => job.result?.targetSnapshotId === remediationAfterTarget?.id
    ) ?? null
  const remediationBeforeAggregation =
    (remediationBeforeJob?.result?.aggregation as
      | LocalEvaluationAggregation
      | undefined) ?? null
  const remediationAfterAggregation =
    (remediationAfterJob?.result?.aggregation as
      | LocalEvaluationAggregation
      | undefined) ?? null
  const previousEvaluationModel = remediationBeforeJob?.result?.modelId
  const evaluationDialogModel =
    evaluationReturnStage === "reevaluate" &&
    (previousEvaluationModel === "gpt-5.6-terra" ||
      previousEvaluationModel === "gpt-5.6-sol")
      ? previousEvaluationModel
      : model
  const localReadinessGates = readinessGates.map((gate) =>
    gate.label === "Stable"
      ? { ...gate, complete: calibrated, value: calibrated ? 100 : 0 }
      : gate
  )

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

  async function openDraftReview() {
    if (demo) {
      setActiveStage("constitution")
      return
    }
    if (liveDraft) {
      setActiveStage("constitution")
      return
    }
    if (!local.workspace || local.sources.length === 0) {
      toast.error("Add at least one readable evidence source first.")
      return
    }
    setReviewLoading(true)
    try {
      const segments = (await local.loadSegments()).filter(
        (segment) => segment.readable && segment.content
      )
      if (segments.length === 0) {
        throw new Error("No readable evidence segments are available.")
      }
      setDraftSegmentsForReview(segments)
      setSelectedSegmentIds(segments.map((segment) => segment.id))
      setDraftReviewOpen(true)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Evidence segments could not be prepared."
      )
    } finally {
      setReviewLoading(false)
    }
  }

  async function startLiveDraft() {
    const selected = new Set(selectedSegmentIds)
    const approvedSegments = draftSegmentsForReview
      .filter((segment) => selected.has(segment.id))
      .map((segment) => ({
        sourceId: segment.sourceId,
        segmentId: segment.id,
        contentHash: segment.contentHash,
      }))
    if (approvedSegments.length === 0) {
      toast.error("Select at least one evidence segment.")
      return
    }
    setReviewLoading(true)
    try {
      await local.startDraft({
        approvedSegments,
        model,
        reasoningEffort: "high",
        productPurpose,
        explicitNonGoals,
      })
      setCalibrationRuns([])
      setDraftReviewOpen(false)
      setActiveStage("constitution")
      toast.success("A live Product Constitution draft is ready.", {
        description:
          "Review every source-derived and AI-proposed rule before ratifying it.",
      })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Draft generation failed."
      )
    } finally {
      setReviewLoading(false)
    }
  }

  async function approveAllLiveRules() {
    if (!liveDraft) return
    setReviewLoading(true)
    try {
      for (const section of liveDraft.contract.sections) {
        if (section.approvalStatus !== "approved") {
          await local.decideDraftSubject({
            subjectType: "section",
            subjectId: section.sectionId,
            decision: "approve",
          })
        }
      }
      for (const criterion of liveDraft.contract.criteria) {
        if (
          criterion.approvalStatus !== "approved" ||
          criterion.examples.some((example) => !example.ratified)
        ) {
          await local.decideDraftSubject({
            subjectType: "criterion",
            subjectId: criterion.criterionId,
            decision: "approve",
          })
        }
      }
      toast.success("Every displayed rule and calibration example was ratified.")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Ratification failed."
      )
    } finally {
      setReviewLoading(false)
    }
  }

  async function answerLiveQuestion(questionId: string, answer: string) {
    await local.decideDraftSubject({
      subjectType: "question",
      subjectId: questionId,
      decision: "answer",
      answer,
    })
    toast.success("The human answer was recorded.")
  }

  async function resolveLiveContradiction(
    contradictionId: string,
    answer: string
  ) {
    await local.decideDraftSubject({
      subjectType: "contradiction",
      subjectId: contradictionId,
      decision: "resolve",
      answer,
    })
    toast.success("The authority conflict was resolved by a human decision.")
  }

  async function runLiveCalibration() {
    setReviewLoading(true)
    try {
      const result = await local.runCalibration({
        model,
        reasoningEffort: "high",
      })
      setCalibrationRuns(result.runs)
      setCalibrationOpen(false)
      toast.success("Three calibration runs completed.", {
        description:
          "The Stable safeguard passed without hiding disagreement by majority vote.",
      })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Calibration failed."
      )
    } finally {
      setReviewLoading(false)
    }
  }

  async function finishCompile() {
    setReviewLoading(true)
    try {
      if (!demo && !effectiveCompiled) {
        await local.compileDraft(effectiveCalibrationRuns)
      }
      setCompileOpen(false)
      setCompiled(true)
      setActiveStage("evidence")
      toast.success("Product Constitution v1.0 compiled.", {
        description:
          "The immutable contract and Codex acceptance package are ready.",
      })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Compilation failed."
      )
    } finally {
      setReviewLoading(false)
    }
  }

  async function exportLiveConstitution(repositoryRoot: string) {
    setReviewLoading(true)
    try {
      const result = await local.exportConstitution(repositoryRoot)
      toast.success("The shareable .criteriaforge package was exported.", {
        description: `${result.files.length} files · private evidence remained local.`,
      })
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The Constitution package could not be exported."
      )
    } finally {
      setReviewLoading(false)
    }
  }

  async function importLiveGitTarget(repositoryPath: string) {
    setReviewLoading(true)
    try {
      await local.importGitTarget(repositoryPath)
      toast.success("The Git artifact and its evidence segments were fixed.", {
        description:
          "No remote fetch or push occurred; sensitive defaults and generated files were excluded.",
      })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Git indexing failed."
      )
    } finally {
      setReviewLoading(false)
    }
  }

  async function openEvaluationReview(
    returnStage: "evaluate" | "reevaluate" = "evaluate"
  ) {
    if (demo) {
      setActiveStage(returnStage)
      return
    }
    setReviewLoading(true)
    try {
      const segments = (await local.loadSegments()).filter(
        (segment) => segment.readable && segment.content
      )
      const candidates: LocalEvidenceSegment[] = []
      const selected: string[] = []
      let characters = 0
      for (const segment of segments) {
        if (candidates.length >= 500) break
        candidates.push(segment)
        const nextCharacters = characters + (segment.content?.length ?? 0)
        if (nextCharacters <= 480_000) {
          selected.push(segment.id)
          characters = nextCharacters
        }
      }
      if (selected.length === 0) {
        throw new Error("No readable artifact evidence is available.")
      }
      setEvaluationSegments(candidates)
      setSelectedEvaluationSegmentIds(selected)
      setEvaluationReturnStage(returnStage)
      setEvaluationReviewOpen(true)
      setActiveStage(returnStage)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Evaluation evidence could not be prepared."
      )
    } finally {
      setReviewLoading(false)
    }
  }

  async function startLiveEvaluation() {
    const selected = new Set(selectedEvaluationSegmentIds)
    const approvedSegments = evaluationSegments
      .filter((segment) => selected.has(segment.id))
      .map((segment) => ({
        sourceId: segment.sourceId,
        segmentId: segment.id,
        contentHash: segment.contentHash,
      }))
    setReviewLoading(true)
    try {
      const previousModel = remediationBeforeJob?.result?.modelId
      const evaluationModel =
        evaluationReturnStage === "reevaluate" &&
        (previousModel === "gpt-5.6-terra" ||
          previousModel === "gpt-5.6-sol")
          ? previousModel
          : model
      await local.runEvaluation({
        approvedSegments,
        model: evaluationModel,
        reasoningEffort: "high",
      })
      setEvaluationReviewOpen(false)
      toast.success("Three formal evaluation runs completed.", {
        description:
          "Every adopted citation passed the local source, locator, and SHA-256 checks.",
      })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Formal evaluation failed."
      )
    } finally {
      setReviewLoading(false)
    }
  }

  async function createLiveRemediation(brief: RemediationBrief) {
    const evaluationRunIds = liveEvaluationJob?.result?.evaluationRunIds
    if (!Array.isArray(evaluationRunIds) || !evaluationRunIds[0]) {
      toast.error("No verified evaluation run is available for this brief.")
      return
    }
    setReviewLoading(true)
    try {
      await local.createRemediationBrief({
        evaluationRunId: String(evaluationRunIds[0]),
        brief,
      })
      toast.success("The exact remediation boundary was human-ratified.")
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The remediation brief could not be saved."
      )
      throw error
    } finally {
      setReviewLoading(false)
    }
  }

  async function runLiveRemediation(remediationId: string) {
    setReviewLoading(true)
    setRemediationPatch(null)
    try {
      const job = await local.runRemediation({
        remediationId,
        model,
        reasoningEffort: "high",
      })
      if (job.result?.accepted !== true) {
        toast.error(
          "Codex finished, but the local boundary verification rejected the result."
        )
        return
      }
      toast.success("The worktree diff, Constitution hash, and tests passed.")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Bounded remediation failed."
      )
    } finally {
      setReviewLoading(false)
    }
  }

  async function loadLiveRemediationPatch(
    remediationId: string,
    jobId: string
  ) {
    setReviewLoading(true)
    try {
      const result = await local.loadRemediationPatch({
        remediationId,
        jobId,
      })
      setRemediationPatch(result.patch)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "The patch could not be read."
      )
    } finally {
      setReviewLoading(false)
    }
  }

  async function applyLiveRemediation(
    remediationId: string,
    jobId: string
  ) {
    setReviewLoading(true)
    try {
      await local.applyRemediation({ remediationId, jobId })
      toast.success("The verified patch was applied after human approval.", {
        description:
          "A new target snapshot and three-run evaluation are now required.",
      })
      setActiveStage("reevaluate")
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The verified patch was not applied."
      )
    } finally {
      setReviewLoading(false)
    }
  }

  async function freezeRepairedTarget(repositoryRoot: string) {
    setReviewLoading(true)
    try {
      await local.importGitTarget(repositoryRoot)
      toast.success("The repaired artifact was frozen as a new target.", {
        description:
          "The original target and immutable Constitution remain available for comparison.",
      })
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The repaired target could not be frozen."
      )
    } finally {
      setReviewLoading(false)
    }
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
            {demo && activeStage === "constitution" && (
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
              onContinue={() => void openDraftReview()}
            />
          )}

          {activeStage === "constitution" && (
            <div className="h-full min-h-0">
              {demo ? (
                <>
              <div className="hidden h-full xl:block">
                <ResizablePanelGroup orientation="horizontal">
                  <ResizablePanel defaultSize="64" minSize="56">
                    <div className="flex h-full min-h-0 flex-col">
                      <ScrollArea className="min-h-0 flex-1">
                        <ConstitutionDocument
                          sections={displayedSections}
                          onSectionsChange={setSections}
                          selectedSection={effectiveSelectedSection}
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
                    sections={displayedSections}
                    onSectionsChange={setSections}
                    selectedSection={effectiveSelectedSection}
                    onSelectSection={setSelectedSection}
                    proposedApproved={approved}
                  />
                </ScrollArea>
                <CompileReadiness
                  gates={readinessGates}
                  approved={approved}
                />
              </div>
                </>
              ) : liveDraft ? (
                <div className="flex h-full min-h-0 flex-col">
                  <LocalConstitutionControls
                    draft={liveDraft}
                    busy={reviewLoading}
                    onApproveRules={approveAllLiveRules}
                    onAnswerQuestion={answerLiveQuestion}
                    onResolveContradiction={resolveLiveContradiction}
                  />
                  <ScrollArea className="min-h-0 flex-1">
                    <ConstitutionDocument
                      sections={displayedSections}
                      onSectionsChange={() => undefined}
                      selectedSection={effectiveSelectedSection}
                      onSelectSection={setSelectedSection}
                      proposedApproved={effectiveApproved}
                      onSaveSection={async (sectionId, originalText) => {
                        await local.updateDraftSection(sectionId, originalText)
                        toast.success(
                          "The original-language clause was saved and marked for ratification."
                        )
                      }}
                    />
                  </ScrollArea>
                  <CompileReadiness
                    gates={localReadinessGates}
                    approved={effectiveApproved}
                  />
                </div>
              ) : (
                <div className="flex h-full items-center justify-center p-6">
                  <div className="max-w-lg rounded-xl border bg-card p-6 text-center">
                    <FileLock2 className="mx-auto size-6 text-ember" />
                    <h1 className="mt-4 font-editorial text-3xl">
                      Create the live Constitution draft first
                    </h1>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      CriteriaForge will show the exact evidence segments,
                      model, purpose, sandbox, and local save location before
                      anything leaves this Mac.
                    </p>
                    <Button
                      className="mt-5"
                      disabled={reviewLoading}
                      onClick={() => void openDraftReview()}
                    >
                      Review Codex send
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeStage === "compile" && (
            <CompileReview
              locale={locale}
              approved={effectiveApproved}
              calibrated={calibrated}
              compiled={!demo && effectiveCompiled}
              onBack={() => setActiveStage("constitution")}
              onCompile={() => setCompileOpen(true)}
              onCalibrate={() => setCalibrationOpen(true)}
              onExport={demo ? undefined : exportLiveConstitution}
            />
          )}

          {activeStage === "evidence" && (
            demo ? (
              <EvidenceInspector
                locale={locale}
                onContinue={() => setActiveStage("evaluate")}
              />
            ) : (
              <LocalEvidenceTarget
                locale={locale}
                target={liveTarget}
                busy={reviewLoading}
                onImport={importLiveGitTarget}
                onContinue={() => void openEvaluationReview()}
              />
            )
          )}

          {activeStage === "evaluate" && (
            demo ? (
              <EvaluationWorkspace
                onRemediate={() => setActiveStage("improve")}
              />
            ) : (
              <LocalEvaluationWorkspace
                aggregation={liveAggregation}
                running={
                  reviewLoading ||
                  local.activeJob?.type === "formal_evaluation" &&
                    ["queued", "running"].includes(local.activeJob.status)
                }
                onRun={() => void openEvaluationReview()}
                onRemediate={() => setActiveStage("improve")}
              />
            )
          )}

          {activeStage === "improve" && (
            demo ? (
              <RemediationWorkspace
                locale={locale}
                demo
                onContinue={() => setActiveStage("reevaluate")}
              />
            ) : (
              <LocalRemediationWorkspace
                aggregation={liveAggregation}
                constitutionVersionId={
                  local.constitutionState?.versions[0]?.id ?? null
                }
                target={liveTarget}
                existing={liveRemediation}
                run={liveRemediationJob}
                busy={reviewLoading}
                patch={remediationPatch}
                onCreate={createLiveRemediation}
                onRun={runLiveRemediation}
                onLoadPatch={loadLiveRemediationPatch}
                onApply={applyLiveRemediation}
                onContinue={() => setActiveStage("reevaluate")}
              />
            )
          )}

          {activeStage === "reevaluate" && (
            demo ? (
              <ReevaluationWorkspace
                locale={locale}
                onBack={() => setActiveStage("improve")}
              />
            ) : (
              <LocalReevaluationWorkspace
                constitutionVersion={liveVersion?.version ?? null}
                constitutionHash={liveVersion?.contentHash ?? null}
                beforeTarget={remediationBeforeTarget}
                afterTarget={remediationAfterTarget}
                beforeJob={remediationBeforeJob}
                afterJob={remediationAfterJob}
                before={remediationBeforeAggregation}
                after={remediationAfterAggregation}
                remediationApplied={liveRemediation?.status === "applied"}
                busy={reviewLoading}
                onFreezeTarget={freezeRepairedTarget}
                onRun={() => void openEvaluationReview("reevaluate")}
                onBack={() => setActiveStage("improve")}
              />
            )
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

      <AlertDialog
        open={draftReviewOpen}
        onOpenChange={(open) => {
          if (!reviewLoading) setDraftReviewOpen(open)
        }}
      >
        <AlertDialogContent className="max-h-[90svh] overflow-hidden sm:max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-ember/10 text-ember-foreground">
              <ShieldCheck />
            </AlertDialogMedia>
            <AlertDialogTitle>
              Review exactly what leaves this Mac
            </AlertDialogTitle>
            <AlertDialogDescription>
              Destination: OpenAI Codex. Purpose: propose a Product
              Constitution. Only checked normalized segments are sent;
              originals stay local. Codex receives read-only sandbox access,
              and the result is saved under macOS Application Support.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="grid min-h-0 gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Label className="grid gap-1.5 text-xs">
                Model
                <select
                  value={model}
                  onChange={(event) =>
                    setModel(
                      event.target.value as
                        | "gpt-5.6-terra"
                        | "gpt-5.6-sol"
                    )
                  }
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                  disabled={reviewLoading}
                >
                  <option value="gpt-5.6-terra">
                    gpt-5.6-terra · default
                  </option>
                  <option value="gpt-5.6-sol">
                    gpt-5.6-sol · highest precision
                  </option>
                </select>
              </Label>
              <div className="rounded-md border bg-muted/35 p-3 text-xs">
                <p className="font-medium">
                  {selectedSegmentIds.length} segments ·{" "}
                  {draftSegmentsForReview
                    .filter((segment) =>
                      selectedSegmentIds.includes(segment.id)
                    )
                    .reduce(
                      (total, segment) =>
                        total + (segment.content?.length ?? 0),
                      0
                    )
                    .toLocaleString()}{" "}
                  characters
                </p>
                <p className="mt-1 text-muted-foreground">
                  Fresh approval applies to this run only.
                </p>
              </div>
            </div>

            <Label className="grid gap-1.5 text-xs">
              Product purpose
              <Textarea
                value={productPurpose}
                onChange={(event) => setProductPurpose(event.target.value)}
                disabled={reviewLoading}
                className="min-h-16"
              />
            </Label>
            <Label className="grid gap-1.5 text-xs">
              Explicit non-goals
              <Textarea
                value={explicitNonGoals}
                onChange={(event) => setExplicitNonGoals(event.target.value)}
                disabled={reviewLoading}
                className="min-h-16"
              />
            </Label>

            <div className="min-h-0 overflow-hidden rounded-md border">
              <div className="border-b bg-muted/35 px-3 py-2 text-xs font-medium">
                Approved normalized evidence
              </div>
              <ScrollArea className="h-48">
                <div className="divide-y">
                  {draftSegmentsForReview.map((segment) => {
                    const source = local.sources.find(
                      (candidate) => candidate.id === segment.sourceId
                    )
                    const checked = selectedSegmentIds.includes(segment.id)
                    return (
                      <label
                        key={segment.id}
                        className="flex cursor-pointer gap-3 px-3 py-2.5 text-xs"
                      >
                        <Checkbox
                          checked={checked}
                          disabled={reviewLoading}
                          onCheckedChange={(next) =>
                            setSelectedSegmentIds((current) =>
                              next
                                ? [...new Set([...current, segment.id])]
                                : current.filter((id) => id !== segment.id)
                            )
                          }
                        />
                        <span className="min-w-0">
                          <span className="block truncate font-medium">
                            {source?.displayName ?? segment.sourceId} · segment{" "}
                            {segment.ordinal + 1}
                          </span>
                          <span className="mt-0.5 block break-all font-mono text-[9px] text-muted-foreground">
                            {JSON.stringify(segment.locator)}
                          </span>
                        </span>
                      </label>
                    )
                  })}
                </div>
              </ScrollArea>
            </div>

            {reviewLoading && local.activeJob && (
              <div className="space-y-2 rounded-md border p-3">
                <div className="flex justify-between text-xs">
                  <span>{local.activeJob.type.replaceAll("_", " ")}</span>
                  <span>{local.activeJob.progress}%</span>
                </div>
                <Progress value={local.activeJob.progress} />
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={reviewLoading}>
              Keep everything local
            </AlertDialogCancel>
            <Button
              disabled={
                reviewLoading ||
                selectedSegmentIds.length === 0 ||
                !productPurpose.trim() ||
                !explicitNonGoals.trim()
              }
              onClick={() => void startLiveDraft()}
            >
              {reviewLoading ? "Codex is working…" : "Approve this send"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={calibrationOpen}
        onOpenChange={(open) => {
          if (!reviewLoading) setCalibrationOpen(open)
        }}
      >
        <AlertDialogContent className="sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-ember/10 text-ember-foreground">
              <ShieldCheck />
            </AlertDialogMedia>
            <AlertDialogTitle>
              Approve three independent calibration runs
            </AlertDialogTitle>
            <AlertDialogDescription>
              Destination: OpenAI Codex. CriteriaForge sends the current draft
              criteria and{" "}
              {liveDraft?.contract.criteria.reduce(
                (total, criterion) => total + criterion.examples.length,
                0
              ) ?? 0}{" "}
              human-ratified examples to {model}. Original files and unrelated
              evidence are not sent. All three runs use the same model,
              reasoning effort, prompt, and schema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {reviewLoading && local.activeJob && (
            <div className="space-y-2 rounded-md border p-3">
              <div className="flex justify-between text-xs">
                <span>Independent calibration</span>
                <span>{local.activeJob.progress}%</span>
              </div>
              <Progress value={local.activeJob.progress} />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reviewLoading}>
              Cancel
            </AlertDialogCancel>
            <Button
              disabled={reviewLoading || !effectiveApproved}
              onClick={() => void runLiveCalibration()}
            >
              {reviewLoading ? "Running three checks…" : "Approve calibration"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={evaluationReviewOpen}
        onOpenChange={(open) => {
          if (!reviewLoading) setEvaluationReviewOpen(open)
        }}
      >
        <AlertDialogContent className="max-h-[90svh] overflow-hidden sm:max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-ember/10 text-ember-foreground">
              <ShieldCheck />
            </AlertDialogMedia>
            <AlertDialogTitle>
              Review the evidence for three formal runs
            </AlertDialogTitle>
            <AlertDialogDescription>
              Destination: OpenAI Codex. Purpose: apply immutable Constitution
              v1.0 to the{" "}
              {evaluationReturnStage === "reevaluate"
                ? "newly fixed repaired Git target with the original model settings"
                : "fixed Git target"}
              . Only checked normalized excerpts are sent. The repository,
              excluded files, credentials, and unselected originals remain
              local. Codex has read-only access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid min-h-0 gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Label className="grid gap-1.5 text-xs">
                Model
                <select
                  value={evaluationDialogModel}
                  onChange={(event) =>
                    setModel(
                      event.target.value as
                        | "gpt-5.6-terra"
                        | "gpt-5.6-sol"
                    )
                  }
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                  disabled={
                    reviewLoading || evaluationReturnStage === "reevaluate"
                  }
                >
                  <option value="gpt-5.6-terra">gpt-5.6-terra · default</option>
                  <option value="gpt-5.6-sol">
                    gpt-5.6-sol · highest precision
                  </option>
                </select>
              </Label>
              <div className="rounded-md border bg-muted/35 p-3 text-xs">
                <p className="font-medium">
                  {selectedEvaluationSegmentIds.length} excerpts ·{" "}
                  {evaluationSegments
                    .filter((segment) =>
                      selectedEvaluationSegmentIds.includes(segment.id)
                    )
                    .reduce(
                      (total, segment) =>
                        total + (segment.content?.length ?? 0),
                      0
                    )
                    .toLocaleString()}{" "}
                  characters
                </p>
                <p className="mt-1 text-muted-foreground">
                  One approval covers the same input for these three
                  independent runs only.
                </p>
              </div>
            </div>
            <div className="min-h-0 overflow-hidden rounded-md border">
              <div className="border-b bg-muted/35 px-3 py-2 text-xs font-medium">
                Approved artifact and governing excerpts
              </div>
              <ScrollArea className="h-64">
                <div className="divide-y">
                  {evaluationSegments.map((segment) => {
                    const source = local.sources.find(
                      (candidate) => candidate.id === segment.sourceId
                    )
                    const checked =
                      selectedEvaluationSegmentIds.includes(segment.id)
                    return (
                      <label
                        key={segment.id}
                        className="flex cursor-pointer gap-3 px-3 py-2.5 text-xs"
                      >
                        <Checkbox
                          checked={checked}
                          disabled={reviewLoading}
                          onCheckedChange={(next) =>
                            setSelectedEvaluationSegmentIds((current) =>
                              next
                                ? [...new Set([...current, segment.id])]
                                : current.filter((id) => id !== segment.id)
                            )
                          }
                        />
                        <span className="min-w-0">
                          <span className="block truncate font-medium">
                            {source?.displayName ?? segment.sourceId}
                          </span>
                          <span className="mt-0.5 block break-all font-mono text-[9px] text-muted-foreground">
                            {JSON.stringify(segment.locator)}
                          </span>
                        </span>
                      </label>
                    )
                  })}
                </div>
              </ScrollArea>
            </div>
            {reviewLoading && local.activeJob && (
              <div className="space-y-2 rounded-md border p-3">
                <div className="flex justify-between text-xs">
                  <span>Formal evaluation · three independent runs</span>
                  <span>{local.activeJob.progress}%</span>
                </div>
                <Progress value={local.activeJob.progress} />
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reviewLoading}>
              Cancel
            </AlertDialogCancel>
            <Button
              disabled={
                reviewLoading || selectedEvaluationSegmentIds.length === 0
              }
              onClick={() => void startLiveEvaluation()}
            >
              {reviewLoading ? "Running three evaluations…" : "Approve this send"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={compileOpen} onOpenChange={setCompileOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogMedia
              className={
                effectiveApproved
                  ? "bg-ember/10 text-ember-foreground"
                  : "bg-destructive/10 text-destructive"
              }
            >
              {effectiveApproved ? <Anvil /> : <FileLock2 />}
            </AlertDialogMedia>
            <AlertDialogTitle>
              {effectiveApproved
                ? effectiveCompiled
                  ? "Product Constitution v1.0 already exists"
                  : "Compile Product Constitution v1.0?"
                : "One material clause is not ratified"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {effectiveApproved
                ? "Compilation creates an immutable version, locks the evaluation contract, and writes the Codex acceptance package."
                : "CriteriaForge will not freeze a consequential AI-proposed rule without the Constitution Owner’s explicit approval."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 rounded-lg border bg-muted/35 p-3 text-xs">
            {[
              ["Intent complete", true],
              ["Important criteria ratified", effectiveApproved],
              ["Evidence rules defined", true],
              ["Contradictions resolved", true],
              ["Stability tests pass", calibrated],
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
              disabled={reviewLoading}
              onClick={
                effectiveApproved
                  ? () => void finishCompile()
                  : approveRecommendation
              }
              className={
                effectiveApproved
                  ? "bg-ember text-ember-foreground-inverse hover:bg-ember/85"
                  : undefined
              }
            >
              {effectiveApproved
                ? effectiveCompiled
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
