import { createHash, randomUUID } from "node:crypto"
import fs from "node:fs"
import path from "node:path"

import {
  EvaluationRunSchema,
  ProductConstitutionSchema,
  RemediationBriefSchema,
  type ProductConstitution,
} from "@/lib/criteriaforge/contracts"

const DIRECTORY_MODE = 0o700
const FILE_MODE = 0o600

type ExportManifest = {
  formatVersion: "1.0.0"
  exportedAt: string
  constitutionId: string
  constitutionVersion: string
  sourceContentHash: string
  omittedPrivateCitationCount: number
  files: string[]
}

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex")
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`
}

function markdown(constitution: ProductConstitution): string {
  const sections = constitution.sections
    .map(
      (section) =>
        `## ${section.key}\n\n${section.originalText}\n\n` +
        `- Approval: ${section.approvalStatus}\n` +
        `- Authority: ${section.authority.label} (${section.authority.rank})\n` +
        `- Meaning hash: \`${section.meaningHash}\``
    )
    .join("\n\n")
  const criteria = constitution.criteria
    .map(
      (criterion) =>
        `### ${criterion.criterionId}: ${criterion.name}\n\n` +
        `${criterion.definition}\n\n` +
        `- Kind: ${criterion.kind}\n` +
        `- Observable expectation: ${criterion.observableExpectation}\n` +
        `- Minimum boundary: ${criterion.minimumBoundary}\n` +
        `- Missing evidence: ${criterion.evidenceRequirement.missingEvidence}\n` +
        `- Owner: ${criterion.owner}\n` +
        `- Meaning hash: \`${criterion.meaningHash}\``
    )
    .join("\n\n")
  return (
    `# Product Constitution v${constitution.version}\n\n` +
    `> Human intent becomes a ratified, executable Product Constitution; ` +
    `Codex may apply it, but may never silently redefine it.\n\n` +
    `Constitution ID: \`${constitution.constitutionId}\`  \n` +
    `Source content hash: \`${constitution.contentHash}\`\n\n` +
    `${sections}\n\n## Evaluation criteria\n\n${criteria}\n`
  )
}

function skillMarkdown(constitution: ProductConstitution): string {
  return `---
name: criteriaforge-${constitution.constitutionId}
description: Apply Product Constitution v${constitution.version} without redefining human intent.
---

# CriteriaForge Product Constitution

1. Read \`../constitution.json\` and validate it against the bundled schema.
2. Treat every \`must_pass\` criterion as non-compensatory.
3. For every conclusion, return Intent, Observed, Evidence, and Gap.
4. Do not invent missing evidence or treat a reference translation as authoritative.
5. Stop for human review when applicability, evidence, or three-run stability is unresolved.
6. Never edit the Product Constitution. Propose a new draft if the governing intent must change.
7. Change only files explicitly allowed by the remediation brief.

The original-language clauses are authoritative. Private source material is not part of this package.
`
}

function agentsFragment(): string {
  return `# CriteriaForge authority boundary

- The Product Constitution in \`.criteriaforge/constitution.json\` is immutable.
- Codex may apply and test it, but may not silently redefine it.
- A failed must-pass criterion cannot be offset by quality elsewhere.
- Every material conclusion requires a verifiable citation.
- Missing, conflicting, or unstable evidence must be returned to a human.
`
}

function shareableProjection(
  constitution: ProductConstitution
): ProductConstitution {
  const citations = constitution.citations.filter(
    (citation) => citation.shareable
  )
  const citationIds = new Set(
    citations.map((citation) => citation.citationId)
  )
  return {
    ...constitution,
    citations,
    sections: constitution.sections.map((section) => ({
      ...section,
      citationIds: section.citationIds.filter((id) => citationIds.has(id)),
    })),
  }
}

function calibrationCases(constitution: ProductConstitution): string {
  return constitution.criteria
    .flatMap((criterion) =>
      criterion.examples.map((example) =>
        JSON.stringify({
          caseId: example.exampleId,
          criterionId: criterion.criterionId,
          kind: example.kind,
          originalLanguage: example.originalLanguage,
          input: example.originalText,
          expectedOutcome: example.expectedOutcome,
          ratified: example.ratified,
        })
      )
    )
    .join("\n")
    .concat("\n")
}

function acceptanceCases(constitution: ProductConstitution): string {
  return constitution.criteria
    .map((criterion) =>
      JSON.stringify({
        caseId: `accept-${criterion.criterionId}`,
        criterionId: criterion.criterionId,
        kind: criterion.kind,
        observableExpectation: criterion.observableExpectation,
        minimumBoundary: criterion.minimumBoundary,
        requiredEvidenceKinds: criterion.evidenceRequirement.allowedKinds,
        minimumEvidenceCount: criterion.evidenceRequirement.minimumCount,
      })
    )
    .join("\n")
    .concat("\n")
}

function assertNoPrivateMaterial(
  files: ReadonlyMap<string, string>,
  privateMarkers: readonly string[]
): void {
  const combined = [...files.entries()]
    .map(([name, contents]) => `${name}\n${contents}`)
    .join("\n")
  const forbiddenPatterns = [
    /\/Users\/[^/\s]+/u,
    /Library\/Application Support\/CriteriaForge/u,
    /(?:access|refresh)[_-]?token/iu,
    /OPENAI_API_KEY/u,
    /sk-(?:proj-)?[A-Za-z0-9_-]{12,}/u,
  ]
  if (forbiddenPatterns.some((pattern) => pattern.test(combined))) {
    throw new Error(
      "The export contains a local path, credential marker, or private storage reference"
    )
  }
  for (const marker of privateMarkers.filter(Boolean)) {
    if (combined.includes(marker)) {
      throw new Error(
        "The export contains text marked as private and was not written"
      )
    }
  }
}

export function buildConstitutionPackage(input: {
  constitution: ProductConstitution
  exportedAt?: string
  privateMarkers?: readonly string[]
}): Map<string, string> {
  const constitution = shareableProjection(input.constitution)
  const files = new Map<string, string>()
  files.set("constitution.json", json(constitution))
  files.set("constitution.md", markdown(constitution))
  files.set(
    "schemas/constitution.schema.json",
    json(ProductConstitutionSchema)
  )
  files.set("schemas/evaluation.schema.json", json(EvaluationRunSchema))
  files.set(
    "schemas/remediation.schema.json",
    json(RemediationBriefSchema)
  )
  files.set("tests/calibration-cases.jsonl", calibrationCases(constitution))
  files.set("tests/acceptance-cases.jsonl", acceptanceCases(constitution))
  files.set("codex/SKILL.md", skillMarkdown(constitution))
  files.set("codex/AGENTS.fragment.md", agentsFragment())

  const manifest: ExportManifest = {
    formatVersion: "1.0.0",
    exportedAt: input.exportedAt ?? new Date().toISOString(),
    constitutionId: constitution.constitutionId,
    constitutionVersion: constitution.version,
    sourceContentHash: constitution.contentHash,
    omittedPrivateCitationCount:
      input.constitution.citations.length - constitution.citations.length,
    files: ["manifest.json", ...files.keys(), "checksums.sha256"].sort(),
  }
  files.set("manifest.json", json(manifest))
  const checksums = [...files.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, contents]) => `${sha256(contents)}  ${name}`)
    .join("\n")
    .concat("\n")
  files.set("checksums.sha256", checksums)
  assertNoPrivateMaterial(files, input.privateMarkers ?? [])
  return files
}

export function writeConstitutionPackage(input: {
  repositoryRoot: string
  constitution: ProductConstitution
  privateMarkers?: readonly string[]
}): { directory: string; files: string[] } {
  const root = fs.realpathSync(input.repositoryRoot)
  if (!fs.statSync(root).isDirectory()) {
    throw new Error("The selected repository root is not a directory")
  }
  if (!fs.existsSync(path.join(root, ".git"))) {
    throw new Error("The selected directory is not a local Git repository")
  }
  const destination = path.join(root, ".criteriaforge")
  if (fs.existsSync(destination)) {
    throw new Error(
      ".criteriaforge already exists; export to a clean branch or remove it explicitly"
    )
  }
  const temporary = path.join(root, `.criteriaforge.tmp-${randomUUID()}`)
  const files = buildConstitutionPackage(input)
  try {
    fs.mkdirSync(temporary, { recursive: false, mode: DIRECTORY_MODE })
    for (const [relativePath, contents] of files) {
      const output = path.join(temporary, relativePath)
      const resolvedParent = path.resolve(path.dirname(output))
      if (
        resolvedParent !== temporary &&
        !resolvedParent.startsWith(`${temporary}${path.sep}`)
      ) {
        throw new Error("An export path escaped the package directory")
      }
      fs.mkdirSync(resolvedParent, {
        recursive: true,
        mode: DIRECTORY_MODE,
      })
      fs.writeFileSync(output, contents, {
        encoding: "utf8",
        mode: FILE_MODE,
        flag: "wx",
      })
    }
    fs.renameSync(temporary, destination)
  } catch (error) {
    fs.rmSync(temporary, { recursive: true, force: true })
    throw error
  }
  return {
    directory: destination,
    files: [...files.keys()].sort(),
  }
}
