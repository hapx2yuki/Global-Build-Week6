import { execFileSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"

import type { NextRequest } from "next/server"

import { errorResponse, jsonResponse } from "@/lib/criteriaforge/api"
import { assertLocalSession } from "@/lib/criteriaforge/request-security"
import { applicationSupportRoot } from "@/lib/criteriaforge/runtime"
import { getStore } from "@/lib/criteriaforge/storage"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function commandVersion(command: string, args: string[]): string | null {
  try {
    return execFileSync(command, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 5_000,
      maxBuffer: 100_000,
    }).trim()
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    assertLocalSession(request)
    const store = getStore()
    return jsonResponse({
      status: "ok",
      runtime: "local",
      platform: os.platform(),
      platformRelease: os.release(),
      supportedPlatform:
        os.platform() === "darwin" &&
        Number.parseInt(os.release().split(".")[0] ?? "0", 10) >= 23,
      nodeVersion: process.version,
      codexVersion: commandVersion("codex", ["--version"]),
      codexLogin: commandVersion("codex", ["login", "status"]),
      storageRoot: applicationSupportRoot(),
      storageAccessible: fs.existsSync(store.root),
      storageWarnings: store.warnings,
      databaseJournalMode: "WAL",
      fileVault: commandVersion("fdesetup", ["status"]),
    })
  } catch (error) {
    return errorResponse(error)
  }
}
