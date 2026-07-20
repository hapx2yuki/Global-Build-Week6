import { createHash } from "node:crypto"

import type { NextRequest } from "next/server"

import {
  ApiFailure,
  errorResponse,
  jsonResponse,
  readJsonObject,
} from "@/lib/criteriaforge/api"
import type {
  ConstitutionSection,
  Criterion,
} from "@/lib/criteriaforge/contracts"
import { assertLocalSession } from "@/lib/criteriaforge/request-security"
import {
  calculateCriterionMeaningHash,
  calculateSectionMeaningHash,
} from "@/lib/criteriaforge/semantic-change"
import { getStore } from "@/lib/criteriaforge/storage"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Context = { params: Promise<{ id: string }> }
type DraftContract = {
  sections: ConstitutionSection[]
  criteria: Criterion[]
  openQuestions: Array<Record<string, unknown>>
  contradictions: Array<Record<string, unknown>>
  [key: string]: unknown
}

function detailHash(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(value), "utf8")
    .digest("hex")
}

export async function POST(request: NextRequest, context: Context) {
  try {
    assertLocalSession(request, true)
    const { id } = await context.params
    const store = getStore()
    const draft = store.getDraftConstitution(id)
    if (!draft) {
      throw new ApiFailure(
        404,
        "draft_not_found",
        "The requested Product Constitution draft does not exist.",
        "Return to the constitution workspace."
      )
    }
    const body = await readJsonObject(request)
    const subjectType = body.subjectType
    const subjectId = body.subjectId
    const decision = body.decision
    const decidedBy = body.decidedBy
    if (
      !["section", "criterion", "question", "contradiction"].includes(
        String(subjectType)
      ) ||
      typeof subjectId !== "string" ||
      !["approve", "reject", "defer", "answer", "resolve"].includes(
        String(decision)
      ) ||
      typeof decidedBy !== "string" ||
      !decidedBy.trim()
    ) {
      throw new ApiFailure(
        400,
        "invalid_human_decision",
        "The human decision is incomplete or unsupported.",
        "Choose a subject, decision, and Constitution Owner."
      )
    }

    const contract = structuredClone(
      draft.contract
    ) as unknown as DraftContract
    let found = false
    if (subjectType === "section") {
      contract.sections = contract.sections.map((section) => {
        if (section.sectionId !== subjectId) return section
        found = true
        const next = {
          ...section,
          approvalStatus:
            decision === "approve"
              ? ("approved" as const)
              : decision === "reject"
                ? ("rejected" as const)
                : ("deferred" as const),
          lastEditedBy: decidedBy.trim(),
          lastEditedAt: new Date().toISOString(),
        }
        return {
          ...next,
          meaningHash: calculateSectionMeaningHash(next),
        }
      })
    } else if (subjectType === "criterion") {
      contract.criteria = contract.criteria.map((criterion) => {
        if (criterion.criterionId !== subjectId) return criterion
        found = true
        const next = {
          ...criterion,
          approvalStatus:
            decision === "approve"
              ? ("approved" as const)
              : decision === "reject"
                ? ("rejected" as const)
                : ("deferred" as const),
          examples: criterion.examples.map((example) => ({
            ...example,
            ratified: decision === "approve",
          })),
        }
        return {
          ...next,
          meaningHash: calculateCriterionMeaningHash(next),
        }
      })
    } else if (subjectType === "question") {
      contract.openQuestions = contract.openQuestions.map((question) => {
        if (question.questionId !== subjectId) return question
        found = true
        return {
          ...question,
          status: decision === "answer" ? "answered" : "deferred",
          humanAnswer:
            typeof body.answer === "string" ? body.answer.trim() : "",
        }
      })
    } else {
      contract.contradictions = contract.contradictions.map(
        (contradiction) => {
          if (contradiction.contradictionId !== subjectId) {
            return contradiction
          }
          found = true
          return {
            ...contradiction,
            resolvedByHuman: decision === "resolve",
            humanResolution:
              typeof body.answer === "string" ? body.answer.trim() : "",
          }
        }
      )
    }
    if (!found) {
      throw new ApiFailure(
        404,
        "decision_subject_not_found",
        "The decision subject no longer exists in this draft.",
        "Reload the draft before deciding."
      )
    }
    const hash = detailHash({
      subjectType,
      subjectId,
      decision,
      answer: body.answer,
    })
    const decisionId = store.saveHumanDecision({
      workspaceId: draft.workspaceId,
      subjectType: String(subjectType),
      subjectId,
      decision: String(decision),
      decidedBy: decidedBy.trim(),
      detailHash: hash,
    })
    const updated = store.replaceDraftConstitution(id, contract)
    return jsonResponse({ draft: updated, decisionId })
  } catch (error) {
    return errorResponse(error)
  }
}
