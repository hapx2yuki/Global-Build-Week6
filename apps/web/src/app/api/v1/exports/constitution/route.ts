import type { NextRequest } from "next/server"

import {
  ApiFailure,
  errorResponse,
  jsonResponse,
  readJsonObject,
} from "@/lib/criteriaforge/api"
import { writeConstitutionPackage } from "@/lib/criteriaforge/exporter"
import { assertLocalSession } from "@/lib/criteriaforge/request-security"
import { getStore } from "@/lib/criteriaforge/storage"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    assertLocalSession(request, true)
    const body = await readJsonObject(request)
    if (
      body.confirmed !== true ||
      typeof body.constitutionVersionId !== "string" ||
      typeof body.repositoryRoot !== "string"
    ) {
      throw new ApiFailure(
        400,
        "export_confirmation_required",
        "Choose an immutable version and explicitly confirm its repository destination.",
        "Review the export contents and target repository."
      )
    }
    const version = getStore().getConstitutionVersion(
      body.constitutionVersionId
    )
    if (!version) {
      throw new ApiFailure(
        404,
        "constitution_version_not_found",
        "The immutable Product Constitution version does not exist.",
        "Return to the compile history."
      )
    }
    const result = writeConstitutionPackage({
      repositoryRoot: body.repositoryRoot,
      constitution: version.contract,
    })
    getStore().audit(
      version.workspaceId,
      "constitution.package.exported",
      version.id,
      {
        fileCount: result.files.length,
        destinationName: ".criteriaforge",
      }
    )
    return jsonResponse(result, 201)
  } catch (error) {
    return errorResponse(error)
  }
}
