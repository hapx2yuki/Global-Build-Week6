import fs from "node:fs"
import os from "node:os"
import path from "node:path"

import Database from "better-sqlite3"
import { afterEach, describe, expect, it } from "vitest"

import type { ProductConstitution } from "@/lib/criteriaforge/contracts"
import {
  applicationSupportRoot,
  storageLocationWarnings,
} from "@/lib/criteriaforge/runtime"
import { CriteriaForgeStore } from "@/lib/criteriaforge/storage"

const roots: string[] = []

function tempRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "criteriaforge-test-"))
  roots.push(root)
  return root
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

describe("local storage", () => {
  it("uses the macOS Application Support location by default", () => {
    const previous = process.env.CRITERIAFORGE_DATA_DIR
    delete process.env.CRITERIAFORGE_DATA_DIR
    expect(applicationSupportRoot()).toContain(
      path.join("Library", "Application Support", "CriteriaForge")
    )
    if (previous) process.env.CRITERIAFORGE_DATA_DIR = previous
  })

  it("creates private storage and restores workspaces after restart", () => {
    const root = tempRoot()
    const first = new CriteriaForgeStore(root)
    const created = first.createWorkspace({
      name: "FounderBrief",
      sourceLanguage: "en",
    })
    first.close()

    const second = new CriteriaForgeStore(root)
    expect(second.getWorkspace(created.id)).toMatchObject({
      id: created.id,
      name: "FounderBrief",
      sourceLanguage: "en",
    })
    expect(fs.statSync(root).mode & 0o777).toBe(0o700)
    expect(fs.statSync(second.databasePath).mode & 0o777).toBe(0o600)
    second.close()
  })

  it("deduplicates original bytes by SHA-256 and keeps them private", () => {
    const root = tempRoot()
    const store = new CriteriaForgeStore(root)
    const workspace = store.createWorkspace({
      name: "Evidence case",
      sourceLanguage: "ja",
    })
    const first = store.putBlob(
      workspace.id,
      new TextEncoder().encode("authoritative source")
    )
    const second = store.putBlob(
      workspace.id,
      new TextEncoder().encode("authoritative source")
    )
    expect(first.hash).toBe(second.hash)
    expect(first.duplicate).toBe(false)
    expect(second.duplicate).toBe(true)
    expect(fs.statSync(first.path).mode & 0o777).toBe(0o600)
    store.close()
  })

  it("deletes database rows and every workspace artifact together", () => {
    const root = tempRoot()
    const store = new CriteriaForgeStore(root)
    const workspace = store.createWorkspace({
      name: "Disposable case",
      sourceLanguage: "en",
    })
    const blob = store.putBlob(workspace.id, new Uint8Array([1, 2, 3]))
    expect(fs.existsSync(blob.path)).toBe(true)
    expect(store.deleteWorkspace(workspace.id)).toBe(true)
    expect(store.getWorkspace(workspace.id)).toBeNull()
    expect(fs.existsSync(path.dirname(path.dirname(blob.path)))).toBe(false)
    store.close()
  })

  it("marks unfinished jobs interrupted after restart", () => {
    const root = tempRoot()
    const store = new CriteriaForgeStore(root)
    store.close()
    const databasePath = path.join(root, "database.sqlite")
    const database = new Database(databasePath)
    const now = new Date().toISOString()
    database
      .prepare(
        `INSERT INTO background_jobs
         (id, type, status, progress, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run("job-1", "ingest", "running", 42, now, now)
    database.close()

    const reopened = new CriteriaForgeStore(root)
    reopened.close()
    const verification = new Database(databasePath, { readonly: true })
    const row = verification
      .prepare("SELECT status, progress FROM background_jobs WHERE id = ?")
      .get("job-1") as { status: string; progress: number }
    verification.close()
    expect(row).toEqual({ status: "interrupted", progress: 42 })
  })

  it("warns when private evidence is placed in a cloud-sync folder", () => {
    expect(storageLocationWarnings("/Users/test/Library/Mobile Documents/x"))
      .toContain(
        "The selected storage location appears to be cloud-synchronized."
      )
  })

  it("enforces immutable constitution rows at the database boundary", () => {
    const root = tempRoot()
    const store = new CriteriaForgeStore(root)
    const workspace = store.createWorkspace({
      name: "Immutable case",
      sourceLanguage: "en",
    })
    const now = new Date().toISOString()
    store.saveConstitutionVersion({
      schemaVersion: "1.0.0",
      constitutionId: "constitution-1",
      workspaceId: workspace.id,
      version: "1.0",
      immutable: true,
      sourceLanguage: "en",
      sections: [],
      criteria: [],
      citations: [],
      contentHash: "a".repeat(64),
      createdAt: now,
      createdBy: "Product owner",
    } as unknown as ProductConstitution)
    store.close()

    const database = new Database(path.join(root, "database.sqlite"))
    expect(() =>
      database
        .prepare(
          "UPDATE constitution_versions SET version = '2.0' WHERE id = ?"
        )
        .run("constitution-1")
    ).toThrow(/immutable/i)
    database.close()
  })
})
