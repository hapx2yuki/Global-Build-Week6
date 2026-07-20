import type { NextRequest } from "next/server"

import {
  ApiFailure,
  errorResponse,
  jsonResponse,
  readJsonObject,
} from "@/lib/criteriaforge/api"
import type { ConstitutionSection } from "@/lib/criteriaforge/contracts"
import { assertLocalSession } from "@/lib/criteriaforge/request-security"
import { calculateSectionMeaningHash } from "@/lib/criteriaforge/semantic-change"
import { getStore } from "@/lib/criteriaforge/storage"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Context = {
  params: Promise<{ id: string; sectionId: string }>
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    assertLocalSession(request, true)
    const { id, sectionId } = await context.params
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
    if (
      body.originalText !== undefined &&
      (typeof body.originalText !== "string" ||
        !body.originalText.trim() ||
        body.originalText.length > 100_000)
    ) {
      throw new ApiFailure(
        400,
        "invalid_original_text",
        "Original text must contain between 1 and 100,000 characters.",
        "Correct the section text."
      )
    }
    if (
      body.referenceTranslation !== undefined &&
      typeof body.referenceTranslation !== "string"
    ) {
      throw new ApiFailure(
        400,
        "invalid_reference_translation",
        "The reference translation must be text.",
        "Correct the reference translation."
      )
    }
    const contract = structuredClone(draft.contract) as {
      sections: ConstitutionSection[]
      [key: string]: unknown
    }
    let found = false
    contract.sections = contract.sections.map((section) => {
      if (section.sectionId !== sectionId) return section
      found = true
      const originalText =
        typeof body.originalText === "string"
          ? body.originalText.trim()
          : section.originalText
      const semanticChanged = originalText !== section.originalText
      const next = {
        ...section,
        originalText,
        referenceTranslation:
          typeof body.referenceTranslation === "string"
            ? body.referenceTranslation
            : section.referenceTranslation,
        approvalStatus: semanticChanged
          ? ("pending" as const)
          : section.approvalStatus,
        provenance: semanticChanged
          ? ("human_approved" as const)
          : section.provenance,
        lastEditedBy:
          typeof body.editedBy === "string" && body.editedBy.trim()
            ? body.editedBy.trim()
            : "Constitution Owner",
        lastEditedAt: new Date().toISOString(),
      }
      return {
        ...next,
        meaningHash: calculateSectionMeaningHash(next),
      }
    })
    if (!found) {
      throw new ApiFailure(
        404,
        "section_not_found",
        "The requested section no longer exists.",
        "Reload the Product Constitution."
      )
    }
    const updated = store.replaceDraftConstitution(id, contract)
    return jsonResponse({ draft: updated })
  } catch (error) {
    return errorResponse(error)
  }
}
