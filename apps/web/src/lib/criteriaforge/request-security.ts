import { timingSafeEqual } from "node:crypto"

import type { NextRequest } from "next/server"

import { ApiFailure } from "@/lib/criteriaforge/api"
import { isLocalRuntime } from "@/lib/criteriaforge/runtime"

const SESSION_COOKIE = "criteriaforge_session"
const CSRF_COOKIE = "criteriaforge_csrf"
let bootstrapConsumed = false

function equalSecret(left: string | undefined, right: string | undefined) {
  if (!left || !right) return false
  const leftBytes = Buffer.from(left)
  const rightBytes = Buffer.from(right)
  return (
    leftBytes.length === rightBytes.length &&
    timingSafeEqual(leftBytes, rightBytes)
  )
}

export function assertLocalRequest(request: NextRequest): void {
  if (!isLocalRuntime()) {
    throw new ApiFailure(
      403,
      "local_runtime_required",
      "Real-data operations are disabled in the public recorded demo.",
      "Install the local macOS edition and start it with npm run local."
    )
  }

  const hostname = request.nextUrl.hostname.toLowerCase()
  if (hostname !== "127.0.0.1" && hostname !== "localhost") {
    throw new ApiFailure(
      403,
      "invalid_host",
      "The local edition accepts only loopback requests.",
      "Open the exact 127.0.0.1 URL printed by npm run local."
    )
  }

  const host = request.headers.get("host")
  const origin = request.headers.get("origin")
  if (origin && host && new URL(origin).host !== host) {
    throw new ApiFailure(
      403,
      "invalid_origin",
      "The request came from a different origin.",
      "Return to the CriteriaForge local browser window."
    )
  }
  const fetchSite = request.headers.get("sec-fetch-site")
  if (
    fetchSite &&
    !["same-origin", "same-site", "none"].includes(fetchSite)
  ) {
    throw new ApiFailure(
      403,
      "cross_site_request",
      "Cross-site requests are not allowed.",
      "Return to the CriteriaForge local browser window."
    )
  }
}

export function assertLocalSession(
  request: NextRequest,
  requireCsrf = false
): void {
  assertLocalRequest(request)
  if (
    !equalSecret(
      request.cookies.get(SESSION_COOKIE)?.value,
      process.env.CRITERIAFORGE_SESSION_TOKEN
    )
  ) {
    throw new ApiFailure(
      401,
      "local_session_required",
      "This browser has not completed the one-time local session exchange.",
      "Close this tab and run npm run local again."
    )
  }
  if (
    requireCsrf &&
    !equalSecret(
      request.headers.get("x-criteriaforge-csrf") ?? undefined,
      process.env.CRITERIAFORGE_CSRF_TOKEN
    )
  ) {
    throw new ApiFailure(
      403,
      "csrf_validation_failed",
      "The state-changing request did not contain the local CSRF proof.",
      "Reload the local CriteriaForge window and retry."
    )
  }
}

export function bootstrapSecrets() {
  return {
    bootstrap: process.env.CRITERIAFORGE_BOOTSTRAP_TOKEN,
    session: process.env.CRITERIAFORGE_SESSION_TOKEN,
    csrf: process.env.CRITERIAFORGE_CSRF_TOKEN,
    sessionCookie: SESSION_COOKIE,
    csrfCookie: CSRF_COOKIE,
  }
}

export function consumeBootstrapToken(candidate: string | undefined): boolean {
  if (bootstrapConsumed) return false
  if (!equalSecret(candidate, process.env.CRITERIAFORGE_BOOTSTRAP_TOKEN)) {
    return false
  }
  bootstrapConsumed = true
  return true
}

export { equalSecret }
