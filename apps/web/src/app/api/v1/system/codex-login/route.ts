import type { NextRequest } from "next/server"

import { errorResponse, jsonResponse } from "@/lib/criteriaforge/api"
import { CodexRunner } from "@/lib/criteriaforge/codex-runner"
import { assertLocalSession } from "@/lib/criteriaforge/request-security"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    assertLocalSession(request, true)
    const runner = new CodexRunner()
    const status = await runner.loginStatus()
    if (status.loggedIn) {
      return jsonResponse({ status, loginStarted: false })
    }
    const pid = runner.startLogin()
    return jsonResponse({ status, loginStarted: true, pid }, 202)
  } catch (error) {
    return errorResponse(error)
  }
}
