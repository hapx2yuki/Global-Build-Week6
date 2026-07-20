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

export const evaluationCriteria: EvaluationCriterion[] = [
  {
    id: "FR-01",
    title: "Preserve the founder’s stated intent",
    kind: "must-pass",
    intent:
      "Every material promise in the source brief remains visible in the generated Codex brief.",
    observed:
      "The generated brief keeps the target user and output format, but removes the non-goal about investor materials.",
    evidence:
      "Source sentence 14 compared with generated brief section 2. No matching clause was found.",
    source: "founder-note.txt:14 → brief-v0.1.md:18–34",
    gap:
      "One explicit non-goal was dropped, which lets Codex widen the product beyond the founder’s intent.",
    status: "fail",
  },
  {
    id: "FR-02",
    title: "Ask before making a material assumption",
    kind: "must-pass",
    intent:
      "If audience, outcome, or exclusion is unresolved, FounderBrief asks before generating the final brief.",
    observed:
      "The product inferred a team account and recurring billing without asking the founder.",
    evidence:
      "Browser trace step 6 and output sections 5–6 introduce two unsupported decisions.",
    source: "browser-trace.json:step-6 → brief-v0.1.md:62–81",
    gap:
      "The output presents two AI assumptions as founder decisions.",
    status: "fail",
  },
  {
    id: "FR-03",
    title: "Trace output back to source",
    kind: "quality",
    intent:
      "A reviewer can inspect which source statement supports each material part of the brief.",
    observed:
      "The brief links to the uploaded file, but not to the sentence or time range supporting each claim.",
    evidence:
      "All nine generated sections use the same document-level citation.",
    source: "brief-v0.1.md:1–104",
    gap:
      "Document-level links do not let the owner verify whether a claim was preserved or invented.",
    status: "insufficient",
  },
  {
    id: "UX-02",
    title: "Reach a useful first result without setup knowledge",
    kind: "quality",
    intent:
      "A first-time non-technical owner can reach a useful draft in five minutes without knowing prompt terminology.",
    observed:
      "The primary path finishes in 3m 42s and every required field has plain-language guidance.",
    evidence:
      "Clean-browser task trace; 7 of 7 required actions completed without recovery.",
    source: "usability-run-03.json · recording 00:00–03:42",
    gap: "No material gap observed.",
    status: "pass",
  },
]

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
