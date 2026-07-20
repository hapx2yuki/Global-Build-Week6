import { randomUUID } from "node:crypto"

import type { ApiError } from "@/lib/criteriaforge/contracts"

export class ApiFailure extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly recoveryAction: string,
    readonly retryable = false,
    readonly fieldErrors: Record<string, string[]> = {}
  ) {
    super(message)
  }
}

export function jsonResponse<T>(value: T, status = 200): Response {
  return Response.json(value, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  })
}

export function errorResponse(error: unknown): Response {
  const correlationId = randomUUID()
  const failure =
    error instanceof ApiFailure
      ? error
      : new ApiFailure(
          500,
          "internal_error",
          "CriteriaForge could not complete this operation.",
          "Retry once. If the problem continues, open System diagnostics.",
          true
        )
  const body: ApiError = {
    code: failure.code,
    message: failure.message,
    fieldErrors: failure.fieldErrors,
    retryable: failure.retryable,
    correlationId,
    recoveryAction: failure.recoveryAction,
  }
  return jsonResponse(body, failure.status)
}

export async function readJsonObject(
  request: Request
): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type") ?? ""
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw new ApiFailure(
      415,
      "unsupported_media_type",
      "This operation requires an application/json body.",
      "Send the request again with Content-Type: application/json."
    )
  }
  const value: unknown = await request.json()
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiFailure(
      400,
      "invalid_json_body",
      "The request body must be a JSON object.",
      "Correct the highlighted request fields."
    )
  }
  return value as Record<string, unknown>
}
