import fs from "node:fs"
import os from "node:os"
import path from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import {
  buildConstitutionPackage,
  writeConstitutionPackage,
} from "@/lib/criteriaforge/exporter"
import type { ProductConstitution } from "@/lib/criteriaforge/contracts"

const roots: string[] = []

function constitution(): ProductConstitution {
  return {
    schemaVersion: "1.0.0",
    constitutionId: "constitution-1",
    workspaceId: "workspace-1",
    version: "1.0",
    immutable: true,
    sourceLanguage: "en",
    sections: [],
    criteria: [],
    citations: [
      {
        citationId: "private-citation",
        sourceId: "source-1",
        segmentId: "segment-1",
        locator: {
          kind: "document",
          startLine: 1,
          endLine: 1,
          textHash: "a".repeat(64),
        },
        contentHash: "a".repeat(64),
        verified: true,
        shareable: false,
      },
    ],
    contentHash: "b".repeat(64),
    createdAt: "2026-07-21T00:00:00.000Z",
    createdBy: "Product owner",
  }
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

describe("shareable Product Constitution package", () => {
  it("omits private citations and includes every required file", () => {
    const files = buildConstitutionPackage({
      constitution: constitution(),
      exportedAt: "2026-07-21T00:00:00.000Z",
    })
    expect([...files.keys()].sort()).toEqual(
      expect.arrayContaining([
        "manifest.json",
        "constitution.json",
        "constitution.md",
        "schemas/constitution.schema.json",
        "schemas/evaluation.schema.json",
        "schemas/remediation.schema.json",
        "tests/calibration-cases.jsonl",
        "tests/acceptance-cases.jsonl",
        "codex/SKILL.md",
        "codex/AGENTS.fragment.md",
        "checksums.sha256",
      ])
    )
    expect(files.get("constitution.json")).not.toContain("private-citation")
    expect(files.get("manifest.json")).toContain(
      '"omittedPrivateCitationCount": 1'
    )
  })

  it("rejects a known private marker before writing", () => {
    expect(() =>
      buildConstitutionPackage({
        constitution: constitution(),
        privateMarkers: ["Product owner"],
      })
    ).toThrow(/private/i)
  })

  it("writes atomically only inside an explicit Git repository", () => {
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "criteriaforge-export-")
    )
    roots.push(root)
    fs.mkdirSync(path.join(root, ".git"))
    const result = writeConstitutionPackage({
      repositoryRoot: root,
      constitution: constitution(),
    })
    expect(result.directory).toBe(
      path.join(fs.realpathSync(root), ".criteriaforge")
    )
    expect(fs.existsSync(path.join(result.directory, "checksums.sha256"))).toBe(
      true
    )
    expect(() =>
      writeConstitutionPackage({
        repositoryRoot: root,
        constitution: constitution(),
      })
    ).toThrow(/already exists/i)
  })
})
