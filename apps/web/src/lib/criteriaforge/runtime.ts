import os from "node:os"
import path from "node:path"

export type RuntimeMode = "local" | "demo"

export function runtimeMode(): RuntimeMode {
  return process.env.CRITERIAFORGE_RUNTIME === "local" ? "local" : "demo"
}

export function isLocalRuntime(): boolean {
  return runtimeMode() === "local"
}

export function applicationSupportRoot(): string {
  if (process.env.CRITERIAFORGE_DATA_DIR) {
    return path.resolve(
      /* turbopackIgnore: true */ process.env.CRITERIAFORGE_DATA_DIR
    )
  }
  return path.join(
    os.homedir(),
    "Library",
    "Application Support",
    "CriteriaForge"
  )
}

export function workspaceStorageRoot(
  workspaceId: string,
  root = applicationSupportRoot()
): string {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,159}$/.test(workspaceId)) {
    throw new Error("Invalid workspace identifier")
  }
  return path.join(
    /* turbopackIgnore: true */ root,
    "workspaces",
    workspaceId
  )
}

export function storageLocationWarnings(root: string): string[] {
  const normalized = path
    .resolve(/* turbopackIgnore: true */ root)
    .toLocaleLowerCase()
  const warnings: string[] = []
  const cloudMarkers = [
    "mobile documents",
    "icloud",
    "dropbox",
    "onedrive",
    "google drive",
    "box",
  ]
  if (cloudMarkers.some((marker) => normalized.includes(marker))) {
    warnings.push(
      "The selected storage location appears to be cloud-synchronized."
    )
  }
  if (normalized.includes(`${path.sep}.git${path.sep}`)) {
    warnings.push("The selected storage location is inside Git metadata.")
  }
  return warnings
}
