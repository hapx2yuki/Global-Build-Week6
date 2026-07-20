import type { LucideIcon } from "lucide-react"
import {
  Anvil,
  Archive,
  BookOpenText,
  CircleCheck,
  FileSearch,
  GitCompareArrows,
  History,
  MessageSquareText,
  Scale,
  Sparkles,
} from "lucide-react"
import recordedFounderBrief from "@/fixtures/founderbrief/recorded-evaluations.json"

export type Stage = {
  id: string
  label: string
  shortLabel: string
  description: string
  icon: LucideIcon
  state: "complete" | "current" | "upcoming"
}

export const stages: Stage[] = [
  {
    id: "intent",
    label: "Bring in intent",
    shortLabel: "Intent",
    description: "Add source material and the product idea.",
    icon: Archive,
    state: "complete",
  },
  {
    id: "constitution",
    label: "Shape the constitution",
    shortLabel: "Constitution",
    description: "Resolve the decisions that define good.",
    icon: BookOpenText,
    state: "current",
  },
  {
    id: "compile",
    label: "Compile",
    shortLabel: "Compile",
    description: "Lock a version and its acceptance tests.",
    icon: Anvil,
    state: "upcoming",
  },
  {
    id: "evidence",
    label: "Inspect evidence",
    shortLabel: "Evidence",
    description: "Observe the built product and its sources.",
    icon: FileSearch,
    state: "upcoming",
  },
  {
    id: "evaluate",
    label: "Evaluate",
    shortLabel: "Evaluate",
    description: "Apply the locked constitution independently.",
    icon: Scale,
    state: "upcoming",
  },
  {
    id: "improve",
    label: "Improve with Codex",
    shortLabel: "Improve",
    description: "Approve a bounded remediation brief.",
    icon: Sparkles,
    state: "upcoming",
  },
  {
    id: "reevaluate",
    label: "Re-evaluate",
    shortLabel: "Re-evaluate",
    description: "Verify the changed product against the same version.",
    icon: GitCompareArrows,
    state: "upcoming",
  },
]

export type ProvenanceKind = "human" | "source" | "ai"

export type ConstitutionSection = {
  id: string
  number: string
  title: string
  summary: string
  detail: string
  provenance: ProvenanceKind
  provenanceLabel: string
  source: string
  date: string
  status: "approved" | "unconfirmed"
}

export const initialConstitutionSections: ConstitutionSection[] = [
  {
    id: "purpose",
    number: "01",
    title: "Why this product exists",
    summary:
      "Help non-technical product owners preserve intent while Codex turns an idea into a working product.",
    detail:
      "CriteriaForge exists because implementation speed now outpaces a team’s ability to define and preserve what ‘good’ means.",
    provenance: "human",
    provenanceLabel: "Human approved",
    source: "Owner interview · H-02",
    date: "Jul 20, 2026",
    status: "approved",
  },
  {
    id: "experience",
    number: "02",
    title: "Promised experience",
    summary:
      "A useful draft in five minutes; a simple product constitution ready to compile in about twenty.",
    detail:
      "The owner should feel that their intent has become clearer without surrendering the authority to define it.",
    provenance: "source",
    provenanceLabel: "Source extracted",
    source: "Working session · S-14",
    date: "Jul 20, 2026",
    status: "approved",
  },
  {
    id: "scope",
    number: "03",
    title: "Scope and non-goals",
    summary:
      "Evaluate products, plans, artifacts, and workflows—not people or high-stakes eligibility decisions.",
    detail:
      "CriteriaForge may organize considerations in sensitive domains, but it must not automate hiring, credit, insurance, medical, or legal outcomes.",
    provenance: "human",
    provenanceLabel: "Human approved",
    source: "Safety decision · H-18",
    date: "Jul 21, 2026",
    status: "approved",
  },
  {
    id: "gates",
    number: "04",
    title: "Must-pass conditions",
    summary:
      "Important criteria are ratified, evidence is defined, contradictions are resolved, and repeat evaluations are stable.",
    detail:
      "A failed hard gate cannot be averaged away by a strong quality score elsewhere.",
    provenance: "source",
    provenanceLabel: "Source extracted",
    source: "Compile contract · S-21",
    date: "Jul 21, 2026",
    status: "approved",
  },
  {
    id: "quality",
    number: "05",
    title: "Quality criteria",
    summary:
      "Quality is anchored to observable levels: insufficient, minimum, good, and exceptional.",
    detail:
      "A numeric score is secondary. Each level describes the behavior or outcome a reviewer must be able to observe.",
    provenance: "human",
    provenanceLabel: "Human approved",
    source: "Evaluation model · H-11",
    date: "Jul 20, 2026",
    status: "approved",
  },
  {
    id: "evidence",
    number: "06",
    title: "Required evidence",
    summary:
      "Claims must point to precise observations in documents, video, design files, spreadsheets, Git, or the live product.",
    detail:
      "A decisive finding without a reviewable citation is incomplete, even if the model’s conclusion sounds plausible.",
    provenance: "source",
    provenanceLabel: "Source extracted",
    source: "Evidence policy · S-27",
    date: "Jul 21, 2026",
    status: "approved",
  },
  {
    id: "examples",
    number: "07",
    title: "Examples and boundary cases",
    summary:
      "Real examples are authoritative; synthetic examples become tests only after the owner ratifies them.",
    detail:
      "Good, bad, and boundary examples are retained as regression tests across constitution versions.",
    provenance: "human",
    provenanceLabel: "Human approved",
    source: "Calibration decision · H-23",
    date: "Jul 21, 2026",
    status: "approved",
  },
  {
    id: "uncertainty",
    number: "08",
    title: "When judgment must stop",
    summary:
      "Material contradictions and missing evidence pause only the affected criterion and return it to the owner.",
    detail:
      "CriteriaForge never silently chooses between equally authoritative sources or fills a material gap with an assumption.",
    provenance: "ai",
    provenanceLabel: "AI proposed",
    source: "Derived from 3 decisions · AI-17",
    date: "Jul 21, 2026",
    status: "unconfirmed",
  },
]

export type ReadinessGate = {
  label: string
  detail: string
  value: number
  complete: boolean
}

export const readinessGates: ReadinessGate[] = [
  {
    label: "Intent complete",
    detail: "Audience, problem, promise, and boundaries are explicit.",
    value: 100,
    complete: true,
  },
  {
    label: "Ratified",
    detail: "All material criteria have an accountable owner.",
    value: 88,
    complete: false,
  },
  {
    label: "Evaluable",
    detail: "Every decisive claim has an evidence rule.",
    value: 100,
    complete: true,
  },
  {
    label: "Consistent",
    detail: "No unresolved material contradictions remain.",
    value: 100,
    complete: true,
  },
  {
    label: "Stable",
    detail: "Three independent runs stay inside tolerance.",
    value: 100,
    complete: true,
  },
]

export type EvaluationCriterion = {
  id: string
  title: string
  kind: "must-pass" | "quality"
  intent: string
  observed: string
  evidence: string
  source: string
  gap: string
  status: "pass" | "fail" | "insufficient"
}

const criterionTitles: Record<string, string> = {
  "FR-01": "Preserve the founder’s stated intent",
  "FR-02": "Ask before making a material assumption",
  "FR-03": "Trace output back to source",
  "UX-02": "Reach a useful first result without setup knowledge",
}

function citationLabel(citation: {
  sourceId: string
  segmentId: string
  locator: Record<string, unknown>
}): string {
  const locator = citation.locator
  if (locator.kind === "document") {
    return `${citation.sourceId}:${String(locator.startLine)}–${String(
      locator.endLine
    )}`
  }
  if (locator.kind === "git") {
    return `${String(locator.relativePath)}:${String(
      locator.startLine
    )}–${String(locator.endLine)}`
  }
  if (locator.kind === "web") {
    return `${citation.sourceId}:step-${String(locator.step)}`
  }
  return `${citation.sourceId}:${citation.segmentId}`
}

export const evaluationCriteria: EvaluationCriterion[] =
  recordedFounderBrief.aggregation.items.map((aggregated) => {
    const item = aggregated.representative
    if (!item) {
      throw new Error(
        `Recorded evaluation is missing representative item ${aggregated.criterionId}`
      )
    }
    const kind =
      aggregated.criterionId === "FR-01" ||
      aggregated.criterionId === "FR-02"
        ? ("must-pass" as const)
        : ("quality" as const)
    const status: EvaluationCriterion["status"] =
      aggregated.mustPass === "fail"
        ? "fail"
        : aggregated.qualityLevel === "insufficient"
          ? "insufficient"
          : "pass"
    return {
      id: aggregated.criterionId,
      title:
        criterionTitles[aggregated.criterionId] ?? aggregated.criterionId,
      kind,
      intent: item.intent,
      observed: item.observed,
      evidence: item.evidence
        .map(
          (citation) =>
            `${citationLabel(citation)} · ${
              citation.verified ? "hash verified" : "unverified"
            }`
        )
        .join("; "),
      source: item.evidence.map(citationLabel).join(" → "),
      gap: item.gap,
      status,
    }
  })

export const viewCommands = [
  {
    id: "constitution",
    label: "Open Product Constitution",
    shortcut: "⌘1",
    icon: BookOpenText,
  },
  {
    id: "evaluation",
    label: "Open evaluation map",
    shortcut: "⌘2",
    icon: Scale,
  },
  {
    id: "history",
    label: "Review version history",
    shortcut: "⌘H",
    icon: History,
  },
  {
    id: "questions",
    label: "Review open questions",
    shortcut: "⌘J",
    icon: MessageSquareText,
  },
  {
    id: "readiness",
    label: "Inspect compile readiness",
    shortcut: "⌘R",
    icon: CircleCheck,
  },
]
