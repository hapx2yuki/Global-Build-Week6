import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

import {
  ApiFailure,
  errorResponse,
  readJsonObject,
} from "@/lib/criteriaforge/api"
import {
  assertLocalRequest,
  bootstrapSecrets,
  consumeBootstrapToken,
} from "@/lib/criteriaforge/request-security"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    assertLocalRequest(request)
    const body = await readJsonObject(request)
    const secrets = bootstrapSecrets()
    if (
      typeof body.token !== "string" ||
      !consumeBootstrapToken(body.token) ||
      !secrets.session ||
      !secrets.csrf
    ) {
      throw new ApiFailure(
        401,
        "invalid_bootstrap_token",
        "The one-time local bootstrap token is invalid or has already been used.",
        "Close this tab and run npm run local again."
      )
    }
    const response = NextResponse.json(
      { authenticated: true, csrfToken: secrets.csrf },
      { headers: { "Cache-Control": "no-store" } }
    )
    response.cookies.set(secrets.sessionCookie, secrets.session, {
      httpOnly: true,
      sameSite: "strict",
      secure: false,
      path: "/",
      maxAge: 60 * 60 * 12,
    })
    response.cookies.set(secrets.csrfCookie, secrets.csrf, {
      httpOnly: false,
      sameSite: "strict",
      secure: false,
      path: "/",
      maxAge: 60 * 60 * 12,
    })
    return response
  } catch (error) {
    return errorResponse(error)
  }
}
