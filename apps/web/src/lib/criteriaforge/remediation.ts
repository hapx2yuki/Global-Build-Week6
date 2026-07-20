import { createHash } from "node:crypto"
import { execFileSync, spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"

import type {
  ProductConstitution,
  RemediationBrief,
} from "@/lib/criteriaforge/contracts"

const PRIVATE_DIRECTORY_MODE = 0o700
const READ_ONLY_FILE_MODE = 0o400
const MAX_COMMAND_OUTPUT = 2 * 1024 * 1024

function git(
  cwd: string,
  args: string[],
  options: { input?: string; maxBuffer?: number } = {}
): string {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    input: options.input,
    maxBuffer: options.maxBuffer ?? 20 * 1024 * 1024,
    stdio: ["pipe", "pipe", "pipe"],
  })
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex")
}

function safeRelativePath(value: string): string {
  const normalized = value.replaceAll("\\", "/")
  if (
    !normalized ||
    normalized.startsWith("/") ||
    normalized === ".." ||
    normalized.startsWith("../") ||
    normalized.includes("/../") ||
    normalized.includes("\0")
  ) {
    throw new Error(`Unsafe remediation path: ${value}`)
  }
  return normalized.replace(/^\.\//u, "")
}

function statusPaths(cwd: string): string[] {
  const output = git(cwd, [
    "status",
    "--porcelain=v1",
    "-z",
    "--untracked-files=all",
  ])
  const entries = output.split("\0").filter(Boolean)
  const paths: string[] = []
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index]
    const status = entry.slice(0, 2)
    const filePath = entry.slice(3)
    if (status.includes("R") || status.includes("C")) {
      const next = entries[index + 1]
      if (next) {
        paths.push(safeRelativePath(next))
        index += 1
      }
    } else {
      paths.push(safeRelativePath(filePath))
    }
  }
  return [...new Set(paths)].sort()
}

function remediationPatch(cwd: string): string {
  let patch = git(
    cwd,
    ["diff", "--binary", "--no-ext-diff", "HEAD"],
    { maxBuffer: 50 * 1024 * 1024 }
  )
  const untracked = git(cwd, [
    "ls-files",
    "--others",
    "--exclude-standard",
    "-z",
  ])
    .split("\0")
    .filter(Boolean)
    .map(safeRelativePath)
  for (const relativePath of untracked) {
    const result = spawnSync(
      "git",
      ["diff", "--no-index", "--binary", "--", "/dev/null", relativePath],
      {
        cwd,
        encoding: "utf8",
        shell: false,
        maxBuffer: 50 * 1024 * 1024,
      }
    )
    if (result.status !== 1 || result.error) {
      throw new Error(`Could not create a patch for ${relativePath}`)
    }
    patch += result.stdout
  }
  return patch
}

function isForbidden(
  relativePath: string,
  forbiddenPaths: readonly string[]
): boolean {
  return forbiddenPaths.some((candidate) => {
    const forbidden = safeRelativePath(candidate.replace(/\*+$/u, ""))
      .replace(/\/$/u, "")
    return (
      relativePath === forbidden ||
      relativePath.startsWith(`${forbidden}/`)
    )
  })
}

export type RepositorySnapshot = {
  root: string
  head: string
  dirty: boolean
  statusHash: string
}

export type PreparedRemediation = {
  original: RepositorySnapshot
  worktreePath: string
  governancePath: string
  governanceHash: string
}

export type RemediationVerification = {
  accepted: boolean
  changedFiles: string[]
  unauthorizedFiles: string[]
  constitutionUnchanged: boolean
  testResults: Array<{
    command: string[]
    passed: boolean
    exitCode: number | null
    output: string
  }>
  patch: string
  patchHash: string
}

export function snapshotRepository(repositoryRoot: string): RepositorySnapshot {
  const root = fs.realpathSync(repositoryRoot)
  const head = git(root, ["rev-parse", "HEAD"]).trim()
  const status = git(root, [
    "status",
    "--porcelain=v1",
    "-z",
    "--untracked-files=all",
  ])
  return {
    root,
    head,
    dirty: status.length > 0,
    statusHash: sha256(status),
  }
}

export function prepareRemediationWorktree(input: {
  repositoryRoot: string
  worktreePath: string
  constitution: ProductConstitution
}): PreparedRemediation {
  const original = snapshotRepository(input.repositoryRoot)
  const worktreePath = path.resolve(input.worktreePath)
  if (fs.existsSync(worktreePath)) {
    throw new Error("The remediation worktree path already exists")
  }
  fs.mkdirSync(path.dirname(worktreePath), {
    recursive: true,
    mode: PRIVATE_DIRECTORY_MODE,
  })
  git(original.root, [
    "worktree",
    "add",
    "--detach",
    worktreePath,
    original.head,
  ])
  fs.chmodSync(worktreePath, PRIVATE_DIRECTORY_MODE)
  const governanceRoot = path.join(
    path.dirname(worktreePath),
    `${path.basename(worktreePath)}-governance`
  )
  fs.mkdirSync(governanceRoot, {
    recursive: false,
    mode: PRIVATE_DIRECTORY_MODE,
  })
  const governancePath = path.join(governanceRoot, "constitution.json")
  const serialized = `${JSON.stringify(input.constitution, null, 2)}\n`
  fs.writeFileSync(governancePath, serialized, {
    encoding: "utf8",
    mode: READ_ONLY_FILE_MODE,
    flag: "wx",
  })
  fs.chmodSync(governancePath, READ_ONLY_FILE_MODE)
  return {
    original,
    worktreePath,
    governancePath,
    governanceHash: sha256(serialized),
  }
}

function checkGovernance(prepared: PreparedRemediation): boolean {
  if (!fs.existsSync(prepared.governancePath)) return false
  return (
    sha256(fs.readFileSync(prepared.governancePath, "utf8")) ===
    prepared.governanceHash
  )
}

function assertChangedPathInsideWorktree(
  worktreePath: string,
  relativePath: string
): void {
  const candidate = path.resolve(worktreePath, relativePath)
  if (!candidate.startsWith(`${worktreePath}${path.sep}`)) {
    throw new Error(`Changed file escaped the remediation worktree: ${relativePath}`)
  }
  if (fs.existsSync(candidate) && fs.lstatSync(candidate).isSymbolicLink()) {
    const resolved = fs.realpathSync(candidate)
    if (!resolved.startsWith(`${worktreePath}${path.sep}`)) {
      throw new Error(
        `Changed symlink points outside the remediation worktree: ${relativePath}`
      )
    }
  }
}

export function verifyRemediationWorktree(input: {
  prepared: PreparedRemediation
  brief: RemediationBrief
}): RemediationVerification {
  const allowed = new Set(
    input.brief.allowedFiles.map(safeRelativePath)
  )
  const changedFiles = statusPaths(input.prepared.worktreePath)
  changedFiles.forEach((file) =>
    assertChangedPathInsideWorktree(input.prepared.worktreePath, file)
  )
  const unauthorizedFiles = changedFiles.filter(
    (file) =>
      !allowed.has(file) ||
      isForbidden(file, input.brief.forbiddenPaths) ||
      file === ".criteriaforge" ||
      file.startsWith(".criteriaforge/")
  )
  const constitutionUnchanged = checkGovernance(input.prepared)
  const testResults = input.brief.allowedCommands.map((command) => {
    const [executable, ...args] = command
    const result = spawnSync(executable, args, {
      cwd: input.prepared.worktreePath,
      encoding: "utf8",
      shell: false,
      timeout: input.brief.maximumSeconds * 1_000,
      maxBuffer: MAX_COMMAND_OUTPUT,
      env: { ...process.env, NO_COLOR: "1" },
    })
    return {
      command,
      passed: result.status === 0 && !result.error,
      exitCode: result.status,
      output: `${result.stdout ?? ""}${result.stderr ?? ""}`.slice(
        0,
        MAX_COMMAND_OUTPUT
      ),
    }
  })
  const patch = remediationPatch(input.prepared.worktreePath)
  const accepted =
    changedFiles.length > 0 &&
    unauthorizedFiles.length === 0 &&
    constitutionUnchanged &&
    testResults.every((result) => result.passed)
  return {
    accepted,
    changedFiles,
    unauthorizedFiles,
    constitutionUnchanged,
    testResults,
    patch,
    patchHash: sha256(patch),
  }
}

export function applyVerifiedRemediation(input: {
  prepared: PreparedRemediation
  verification: RemediationVerification
}): { applied: true; head: string } {
  if (!input.verification.accepted) {
    throw new Error("An unverified remediation patch cannot be applied")
  }
  const current = snapshotRepository(input.prepared.original.root)
  if (
    input.prepared.original.dirty ||
    current.dirty ||
    current.head !== input.prepared.original.head
  ) {
    throw new Error(
      "The original repository is dirty or its HEAD changed; write the patch instead"
    )
  }
  git(current.root, ["apply", "--check", "--binary", "-"], {
    input: input.verification.patch,
  })
  git(current.root, ["apply", "--binary", "-"], {
    input: input.verification.patch,
  })
  return { applied: true, head: current.head }
}

export function disposeRemediationWorktree(
  prepared: PreparedRemediation
): void {
  try {
    git(prepared.original.root, [
      "worktree",
      "remove",
      "--force",
      prepared.worktreePath,
    ])
  } finally {
    fs.rmSync(path.dirname(prepared.governancePath), {
      recursive: true,
      force: true,
    })
  }
}
