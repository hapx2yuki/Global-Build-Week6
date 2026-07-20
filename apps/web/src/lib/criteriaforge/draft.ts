import { randomUUID } from "node:crypto"

import {
  CONSTITUTION_SECTION_KEYS,
  type Citation,
  type DraftGeneration,
} from "@/lib/criteriaforge/contracts"
import {
  calculateCriterionMeaningHash,
  calculateSectionMeaningHash,
} from "@/lib/criteriaforge/semantic-change"

export function finalizeGeneratedDraft(input: {
  generated: DraftGeneration
  approvedSourceIds: ReadonlySet<string>
  approvedCitationIds: ReadonlySet<string>
  approvedCitations?: Citation[]
  actorLabel?: string
}): Record<string, unknown> {
  const keys = input.generated.sections.map((section) => section.key)
  for (const required of CONSTITUTION_SECTION_KEYS) {
    if (keys.filter((key) => key === required).length !== 1) {
      throw new Error(
        `Generated draft must contain section ${required} exactly once`
      )
    }
  }

  const criterionIds = new Set(
    input.generated.criteria.map((criterion) => criterion.criterionId)
  )
  for (const section of input.generated.sections) {
    for (const sourceId of section.sourceIds) {
      if (!input.approvedSourceIds.has(sourceId)) {
        throw new Error(
          `Generated section references unapproved source ${sourceId}`
        )
      }
    }
    for (const citationId of section.citationIds) {
      if (!input.approvedCitationIds.has(citationId)) {
        throw new Error(
          `Generated section references unapproved citation ${citationId}`
        )
      }
    }
    for (const criterionId of section.dependentCriterionIds) {
      if (!criterionIds.has(criterionId)) {
        throw new Error(
          `Generated section references unknown criterion ${criterionId}`
        )
      }
    }
  }
  for (const criterion of input.generated.criteria) {
    for (const dependency of criterion.dependencies) {
      if (!criterionIds.has(dependency)) {
        throw new Error(
          `Generated criterion references unknown dependency ${dependency}`
        )
      }
    }
  }
  for (const question of input.generated.openQuestions) {
    for (const citationId of question.sourceCitationIds) {
      if (!input.approvedCitationIds.has(citationId)) {
        throw new Error(
          `Generated question references unapproved citation ${citationId}`
        )
      }
    }
  }

  const editedAt = new Date().toISOString()
  const actor = input.actorLabel ?? "CriteriaForge AI proposal"
  const sections = input.generated.sections.map((generatedSection) => {
    const section = {
      ...generatedSection,
      sectionId: generatedSection.sectionId || randomUUID(),
      approvalStatus: "pending" as const,
    }
    return {
      ...section,
      meaningHash: calculateSectionMeaningHash(section),
      lastEditedBy: actor,
      lastEditedAt: editedAt,
    }
  })
  const criteria = input.generated.criteria.map((generatedCriterion) => {
    const criterion = {
      ...generatedCriterion,
      approvalStatus: "pending" as const,
      examples: generatedCriterion.examples.map((example) => ({
        ...example,
        ratified: false,
      })),
    }
    return {
      ...criterion,
      meaningHash: calculateCriterionMeaningHash(criterion),
    }
  })

  return {
    schemaVersion: "1.0.0",
    sections,
    criteria,
    citations: input.approvedCitations ?? [],
    openQuestions: input.generated.openQuestions,
    contradictions: input.generated.contradictions,
    generatedAt: editedAt,
    status: "draft",
  }
}
