import { execFileSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import type {
  ProductConstitution,
  RemediationBrief,
} from "@/lib/criteriaforge/contracts"
import {
  applyVerifiedRemediation,
  disposeRemediationWorktree,
  prepareRemediationWorktree,
  verifyRemediationWorktree,
} from "@/lib/criteriaforge/remediation"

const roots: string[] = []

function git(cwd: string, args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" })
}

function repository(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "criteriaforge-rem-"))
  roots.push(root)
  git(root, ["init", "-q"])
  git(root, ["config", "user.email", "test@example.invalid"])
  git(root, ["config", "user.name", "CriteriaForge Test"])
  fs.writeFileSync(path.join(root, "allowed.txt"), "before\n")
  fs.writeFileSync(path.join(root, "forbidden.txt"), "protected\n")
  git(root, ["add", "."])
  git(root, ["commit", "-qm", "baseline"])
  return root
}

function constitution(workspaceId = "workspace-1"): ProductConstitution {
  return {
    schemaVersion: "1.0.0",
    constitutionId: "constitution-1",
    workspaceId,
    version: "1.0",
    immutable: true,
    sourceLanguage: "en",
    sections: [],
    criteria: [],
    citations: [],
    contentHash: "a".repeat(64),
    createdAt: "2026-07-21T00:00:00.000Z",
    createdBy: "Owner",
  }
}

function brief(): RemediationBrief {
  return {
    remediationId: "remediation-1",
    constitutionVersionId: "constitution-1",
    targetSnapshotId: "target-1",
    criterionIds: ["FR-01"],
    gaps: [
      {
        criterionId: "FR-01",
        intent: "Preserve intent.",
        observed: "Intent missing.",
        evidence: [],
        gap: "Restore it.",
      },
    ],
    allowedFiles: ["allowed.txt"],
    forbiddenPaths: [".criteriaforge", ".env", "forbidden.txt"],
    allowedCommands: [["git", "diff", "--check"]],
    acceptanceConditions: ["The allowed file contains the repair."],
    maximumSeconds: 30,
    requiredOutputs: ["Git patch"],
  }
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

describe("bounded remediation worktree", () => {
  it("accepts an allowed change and applies it only after verification", () => {
    const root = repository()
    const prepared = prepareRemediationWorktree({
      repositoryRoot: root,
      worktreePath: path.join(root, "..", `${path.basename(root)}-worktree`),
      constitution: constitution(),
    })
    roots.push(prepared.worktreePath)
    fs.writeFileSync(path.join(prepared.worktreePath, "allowed.txt"), "after\n")
    const verification = verifyRemediationWorktree({
      prepared,
      brief: brief(),
    })
    expect(verification).toMatchObject({
      accepted: true,
      changedFiles: ["allowed.txt"],
      unauthorizedFiles: [],
      constitutionUnchanged: true,
    })
    expect(applyVerifiedRemediation({ prepared, verification })).toMatchObject({
      applied: true,
    })
    expect(fs.readFileSync(path.join(root, "allowed.txt"), "utf8")).toBe(
      "after\n"
    )
    disposeRemediationWorktree(prepared)
  })

  it("rejects a change outside the allowlist", () => {
    const root = repository()
    const prepared = prepareRemediationWorktree({
      repositoryRoot: root,
      worktreePath: path.join(root, "..", `${path.basename(root)}-worktree`),
      constitution: constitution(),
    })
    roots.push(prepared.worktreePath)
    fs.writeFileSync(
      path.join(prepared.worktreePath, "forbidden.txt"),
      "changed\n"
    )
    const verification = verifyRemediationWorktree({
      prepared,
      brief: brief(),
    })
    expect(verification.accepted).toBe(false)
    expect(verification.unauthorizedFiles).toContain("forbidden.txt")
    disposeRemediationWorktree(prepared)
  })

  it("includes an explicitly allowed new file in the verified patch", () => {
    const root = repository()
    const prepared = prepareRemediationWorktree({
      repositoryRoot: root,
      worktreePath: path.join(root, "..", `${path.basename(root)}-worktree`),
      constitution: constitution(),
    })
    roots.push(prepared.worktreePath)
    fs.writeFileSync(path.join(prepared.worktreePath, "new.txt"), "new\n")
    const withNewFile = {
      ...brief(),
      allowedFiles: ["new.txt"],
    }
    const verification = verifyRemediationWorktree({
      prepared,
      brief: withNewFile,
    })
    expect(verification.accepted).toBe(true)
    expect(verification.patch).toContain("new file mode")
    disposeRemediationWorktree(prepared)
  })

  it("refuses automatic application when the original HEAD changes", () => {
    const root = repository()
    const prepared = prepareRemediationWorktree({
      repositoryRoot: root,
      worktreePath: path.join(root, "..", `${path.basename(root)}-worktree`),
      constitution: constitution(),
    })
    roots.push(prepared.worktreePath)
    fs.writeFileSync(path.join(prepared.worktreePath, "allowed.txt"), "after\n")
    const verification = verifyRemediationWorktree({
      prepared,
      brief: brief(),
    })
    fs.writeFileSync(path.join(root, "new.txt"), "new head\n")
    git(root, ["add", "new.txt"])
    git(root, ["commit", "-qm", "head changed"])
    expect(() =>
      applyVerifiedRemediation({ prepared, verification })
    ).toThrow(/HEAD changed/i)
    disposeRemediationWorktree(prepared)
  })
})
