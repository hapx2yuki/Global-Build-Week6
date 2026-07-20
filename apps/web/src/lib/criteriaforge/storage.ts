import { createHash, randomUUID } from "node:crypto"
import fs from "node:fs"
import path from "node:path"

import Database from "better-sqlite3"

import type {
  EvaluationRun,
  ProductConstitution,
  RemediationBrief,
} from "@/lib/criteriaforge/contracts"
import {
  applicationSupportRoot,
  storageLocationWarnings,
  workspaceStorageRoot,
} from "@/lib/criteriaforge/runtime"

const DIRECTORY_MODE = 0o700
const FILE_MODE = 0o600

export type WorkspaceRecord = {
  id: string
  name: string
  sourceLanguage: string
  status: "draft" | "active" | "archived"
  createdAt: string
  updatedAt: string
}

export type EvidenceSourceRecord = {
  id: string
  workspaceId: string
  kind: string
  displayName: string
  originalLanguage: string | null
  authorityRank: number
  originalHash: string
  byteSize: number
  state: string
  privateOnly: boolean
  metadata: Record<string, unknown>
  createdAt: string
}

export type EvidenceSegmentRecord = {
  id: string
  sourceId: string
  ordinal: number
  contentHash: string
  locator: Record<string, unknown>
  normalizedPath: string | null
  readable: boolean
  failureReason: string | null
}

export type BackgroundJobRecord = {
  id: string
  workspaceId: string | null
  type: string
  status:
    | "queued"
    | "running"
    | "completed"
    | "failed"
    | "cancel_requested"
    | "cancelled"
    | "interrupted"
  progress: number
  idempotencyKey: string | null
  inputHash: string | null
  result: Record<string, unknown> | null
  error: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

export type ConstitutionVersionRecord = {
  id: string
  workspaceId: string
  version: string
  contentHash: string
  contract: ProductConstitution
  createdAt: string
}

export type TargetSnapshotRecord = {
  id: string
  workspaceId: string
  sourceType: string
  contentHash: string
  snapshot: Record<string, unknown>
  createdAt: string
}

type WorkspaceRow = {
  id: string
  name: string
  source_language: string
  status: WorkspaceRecord["status"]
  created_at: string
  updated_at: string
}

function mapWorkspace(row: WorkspaceRow): WorkspaceRecord {
  return {
    id: row.id,
    name: row.name,
    sourceLanguage: row.source_language,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function ensureDirectory(directory: string): void {
  fs.mkdirSync(directory, { recursive: true, mode: DIRECTORY_MODE })
  fs.chmodSync(directory, DIRECTORY_MODE)
}

function removeDirectoryIfPresent(directory: string): void {
  if (fs.existsSync(directory)) {
    fs.rmSync(directory, { recursive: true, force: true })
  }
}

export class CriteriaForgeStore {
  readonly root: string
  readonly databasePath: string
  readonly warnings: string[]
  private readonly database: Database.Database

  constructor(root = applicationSupportRoot()) {
    this.root = path.resolve(/* turbopackIgnore: true */ root)
    this.databasePath = path.join(
      /* turbopackIgnore: true */ this.root,
      "database.sqlite"
    )
    this.warnings = storageLocationWarnings(this.root)

    ensureDirectory(this.root)
    for (const directory of ["workspaces", "logs", "backups"]) {
      ensureDirectory(
        path.join(/* turbopackIgnore: true */ this.root, directory)
      )
    }

    this.database = new Database(this.databasePath)
    fs.chmodSync(this.databasePath, FILE_MODE)
    this.database.pragma("journal_mode = WAL")
    this.database.pragma("foreign_keys = ON")
    this.database.pragma("synchronous = FULL")
    this.migrate()
    this.recoverInterruptedJobs()
    this.hardenDatabaseFiles()
  }

  close(): void {
    this.database.close()
  }

  private migrate(): void {
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        source_language TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('draft', 'active', 'archived')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS evidence_sources (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        kind TEXT NOT NULL,
        display_name TEXT NOT NULL,
        original_language TEXT,
        authority_rank INTEGER NOT NULL DEFAULT 0,
        original_hash TEXT NOT NULL,
        byte_size INTEGER NOT NULL,
        state TEXT NOT NULL,
        private_only INTEGER NOT NULL DEFAULT 1,
        metadata_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS evidence_segments (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL REFERENCES evidence_sources(id) ON DELETE CASCADE,
        ordinal INTEGER NOT NULL,
        content_hash TEXT NOT NULL,
        locator_json TEXT NOT NULL,
        normalized_path TEXT,
        readable INTEGER NOT NULL DEFAULT 1,
        failure_reason TEXT,
        UNIQUE(source_id, ordinal)
      );

      CREATE TABLE IF NOT EXISTS draft_constitutions (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        revision INTEGER NOT NULL,
        contract_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(workspace_id, revision)
      );

      CREATE TABLE IF NOT EXISTS human_decisions (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        subject_type TEXT NOT NULL,
        subject_id TEXT NOT NULL,
        decision TEXT NOT NULL,
        decided_by TEXT NOT NULL,
        decided_at TEXT NOT NULL,
        detail_hash TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS open_questions (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        material INTEGER NOT NULL,
        status TEXT NOT NULL,
        question_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS contradictions (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        material INTEGER NOT NULL,
        resolved_by_human INTEGER NOT NULL DEFAULT 0,
        contradiction_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS compile_checks (
        id TEXT PRIMARY KEY,
        draft_id TEXT NOT NULL REFERENCES draft_constitutions(id) ON DELETE CASCADE,
        results_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS constitution_versions (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        version TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        contract_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(workspace_id, version),
        UNIQUE(workspace_id, content_hash)
      );

      CREATE TRIGGER IF NOT EXISTS constitution_versions_no_update
      BEFORE UPDATE ON constitution_versions
      BEGIN
        SELECT RAISE(ABORT, 'Constitution versions are immutable');
      END;

      CREATE TABLE IF NOT EXISTS target_snapshots (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        source_type TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        snapshot_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS evaluation_runs (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        constitution_version_id TEXT NOT NULL REFERENCES constitution_versions(id),
        target_snapshot_id TEXT NOT NULL REFERENCES target_snapshots(id),
        run_index INTEGER NOT NULL,
        status TEXT NOT NULL,
        settings_json TEXT NOT NULL,
        result_json TEXT,
        input_hash TEXT NOT NULL,
        output_hash TEXT,
        started_at TEXT NOT NULL,
        completed_at TEXT
      );

      CREATE TABLE IF NOT EXISTS citations (
        id TEXT PRIMARY KEY,
        evaluation_run_id TEXT NOT NULL REFERENCES evaluation_runs(id) ON DELETE CASCADE,
        citation_json TEXT NOT NULL,
        verified INTEGER NOT NULL,
        verification_failure TEXT
      );

      CREATE TABLE IF NOT EXISTS remediation_briefs (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        contract_json TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS codex_runs (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        purpose TEXT NOT NULL,
        status TEXT NOT NULL,
        settings_json TEXT NOT NULL,
        input_hash TEXT NOT NULL,
        output_hash TEXT,
        run_path TEXT NOT NULL,
        started_at TEXT NOT NULL,
        completed_at TEXT
      );

      CREATE TABLE IF NOT EXISTS egress_approvals (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        codex_run_id TEXT REFERENCES codex_runs(id) ON DELETE SET NULL,
        purpose TEXT NOT NULL,
        model_id TEXT NOT NULL,
        approved_segment_ids_json TEXT NOT NULL,
        approved_hashes_json TEXT NOT NULL,
        approved_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS semantic_changes (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        subject_id TEXT NOT NULL,
        previous_hash TEXT NOT NULL,
        next_hash TEXT NOT NULL,
        affected_ids_json TEXT NOT NULL,
        approved_by_human INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS background_jobs (
        id TEXT PRIMARY KEY,
        workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        progress INTEGER NOT NULL DEFAULT 0,
        idempotency_key TEXT,
        input_hash TEXT,
        result_json TEXT,
        error_json TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(type, idempotency_key)
      );

      CREATE TABLE IF NOT EXISTS audit_events (
        id TEXT PRIMARY KEY,
        workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
        event_type TEXT NOT NULL,
        subject_id TEXT,
        metadata_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS evidence_sources_workspace
        ON evidence_sources(workspace_id);
      CREATE INDEX IF NOT EXISTS evidence_segments_source
        ON evidence_segments(source_id);
      CREATE INDEX IF NOT EXISTS jobs_workspace
        ON background_jobs(workspace_id, created_at);
      CREATE INDEX IF NOT EXISTS audit_workspace
        ON audit_events(workspace_id, created_at);
    `)
    this.removeLegacyEvaluationUniqueness()
  }

  private removeLegacyEvaluationUniqueness(): void {
    const migrationVersion = 1
    const applied = this.database
      .prepare(`SELECT 1 FROM schema_migrations WHERE version = ?`)
      .get(migrationVersion)
    if (applied) return

    const table = this.database
      .prepare(
        `SELECT sql FROM sqlite_master
         WHERE type = 'table' AND name = 'evaluation_runs'`
      )
      .get() as { sql: string } | undefined
    const legacyConstraint =
      table?.sql.includes(
        "UNIQUE(constitution_version_id, target_snapshot_id, run_index, input_hash)"
      ) ?? false

    if (legacyConstraint) {
      this.database.pragma("foreign_keys = OFF")
      try {
        this.database.exec(`
          BEGIN IMMEDIATE;
          CREATE TABLE evaluation_runs_next (
            id TEXT PRIMARY KEY,
            workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
            constitution_version_id TEXT NOT NULL REFERENCES constitution_versions(id),
            target_snapshot_id TEXT NOT NULL REFERENCES target_snapshots(id),
            run_index INTEGER NOT NULL,
            status TEXT NOT NULL,
            settings_json TEXT NOT NULL,
            result_json TEXT,
            input_hash TEXT NOT NULL,
            output_hash TEXT,
            started_at TEXT NOT NULL,
            completed_at TEXT
          );
          INSERT INTO evaluation_runs_next
          SELECT id, workspace_id, constitution_version_id,
                 target_snapshot_id, run_index, status, settings_json,
                 result_json, input_hash, output_hash, started_at, completed_at
          FROM evaluation_runs;
          DROP TABLE evaluation_runs;
          ALTER TABLE evaluation_runs_next RENAME TO evaluation_runs;
          COMMIT;
        `)
      } catch (error) {
        if (this.database.inTransaction) this.database.exec("ROLLBACK")
        throw error
      } finally {
        this.database.pragma("foreign_keys = ON")
      }
      const violations = this.database.pragma("foreign_key_check") as unknown[]
      if (violations.length > 0) {
        throw new Error(
          "Evaluation-run migration left invalid foreign-key references"
        )
      }
    }

    this.database
      .prepare(
        `INSERT INTO schema_migrations (version, applied_at)
         VALUES (?, ?)`
      )
      .run(migrationVersion, new Date().toISOString())
  }

  private recoverInterruptedJobs(): void {
    const now = new Date().toISOString()
    this.database
      .prepare(
        `UPDATE background_jobs
         SET status = 'interrupted', updated_at = ?
         WHERE status IN ('queued', 'running', 'cancelling')`
      )
      .run(now)
  }

  private hardenDatabaseFiles(): void {
    for (const filePath of [
      this.databasePath,
      `${this.databasePath}-wal`,
      `${this.databasePath}-shm`,
    ]) {
      if (fs.existsSync(filePath)) fs.chmodSync(filePath, FILE_MODE)
    }
  }

  createWorkspace(input: {
    name: string
    sourceLanguage: string
  }): WorkspaceRecord {
    const now = new Date().toISOString()
    const record: WorkspaceRecord = {
      id: randomUUID(),
      name: input.name.trim(),
      sourceLanguage: input.sourceLanguage.trim(),
      status: "draft",
      createdAt: now,
      updatedAt: now,
    }
    if (!record.name || record.name.length > 240) {
      throw new Error("Workspace name must contain 1–240 characters")
    }
    if (!/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(record.sourceLanguage)) {
      throw new Error("Source language must be a valid language tag")
    }

    const transaction = this.database.transaction(() => {
      this.database
        .prepare(
          `INSERT INTO workspaces
           (id, name, source_language, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(
          record.id,
          record.name,
          record.sourceLanguage,
          record.status,
          record.createdAt,
          record.updatedAt
        )
      this.audit(record.id, "workspace.created", record.id, {
        sourceLanguage: record.sourceLanguage,
      })
    })
    transaction()
    this.ensureWorkspaceDirectories(record.id)
    this.hardenDatabaseFiles()
    return record
  }

  listWorkspaces(): WorkspaceRecord[] {
    return (
      this.database
        .prepare(
          `SELECT id, name, source_language, status, created_at, updated_at
           FROM workspaces ORDER BY updated_at DESC`
        )
        .all() as WorkspaceRow[]
    ).map(mapWorkspace)
  }

  getWorkspace(id: string): WorkspaceRecord | null {
    const row = this.database
      .prepare(
        `SELECT id, name, source_language, status, created_at, updated_at
         FROM workspaces WHERE id = ?`
      )
      .get(id) as WorkspaceRow | undefined
    return row ? mapWorkspace(row) : null
  }

  updateWorkspace(
    id: string,
    update: Partial<
      Pick<WorkspaceRecord, "name" | "sourceLanguage" | "status">
    >
  ): WorkspaceRecord | null {
    const current = this.getWorkspace(id)
    if (!current) return null
    const next = {
      ...current,
      ...update,
      name: update.name?.trim() ?? current.name,
      sourceLanguage:
        update.sourceLanguage?.trim() ?? current.sourceLanguage,
      updatedAt: new Date().toISOString(),
    }
    if (!next.name || next.name.length > 240) {
      throw new Error("Workspace name must contain 1–240 characters")
    }
    this.database
      .prepare(
        `UPDATE workspaces SET name = ?, source_language = ?, status = ?,
         updated_at = ? WHERE id = ?`
      )
      .run(
        next.name,
        next.sourceLanguage,
        next.status,
        next.updatedAt,
        id
      )
    this.audit(id, "workspace.updated", id, {
      fields: Object.keys(update).sort(),
    })
    this.hardenDatabaseFiles()
    return next
  }

  deleteWorkspace(id: string): boolean {
    if (!this.getWorkspace(id)) return false
    const storageRoot = workspaceStorageRoot(id, this.root)
    const transaction = this.database.transaction(() => {
      this.audit(id, "workspace.deleting", id, {})
      this.database.prepare("DELETE FROM workspaces WHERE id = ?").run(id)
      this.database
        .prepare("DELETE FROM audit_events WHERE workspace_id = ?")
        .run(id)
    })
    transaction()
    removeDirectoryIfPresent(storageRoot)
    this.hardenDatabaseFiles()
    return true
  }

  ensureWorkspaceDirectories(id: string): string {
    const root = workspaceStorageRoot(id, this.root)
    for (const directory of [
      root,
      path.join(/* turbopackIgnore: true */ root, "blobs"),
      path.join(/* turbopackIgnore: true */ root, "normalized"),
      path.join(/* turbopackIgnore: true */ root, "frames"),
      path.join(/* turbopackIgnore: true */ root, "runs"),
      path.join(/* turbopackIgnore: true */ root, "worktrees"),
    ]) {
      ensureDirectory(directory)
    }
    return root
  }

  putBlob(workspaceId: string, bytes: Uint8Array): {
    hash: string
    path: string
    duplicate: boolean
  } {
    if (!this.getWorkspace(workspaceId)) {
      throw new Error("Workspace not found")
    }
    const hash = createHash("sha256").update(bytes).digest("hex")
    const filePath = path.join(
      /* turbopackIgnore: true */ this.ensureWorkspaceDirectories(workspaceId),
      "blobs",
      hash
    )
    const duplicate = fs.existsSync(filePath)
    if (!duplicate) {
      fs.writeFileSync(filePath, bytes, {
        mode: FILE_MODE,
        flag: "wx",
      })
    }
    fs.chmodSync(filePath, FILE_MODE)
    return { hash, path: filePath, duplicate }
  }

  saveEvidence(input: {
    workspaceId: string
    kind: string
    displayName: string
    originalLanguage?: string
    authorityRank?: number
    originalHash: string
    byteSize: number
    state: string
    metadata: Record<string, unknown>
    segments: Array<{
      ordinal: number
      content: string
      contentHash: string
      locator: Record<string, unknown>
      readable: boolean
      failureReason?: string
    }>
  }): EvidenceSourceRecord {
    if (!this.getWorkspace(input.workspaceId)) {
      throw new Error("Workspace not found")
    }
    const sourceId = randomUUID()
    const now = new Date().toISOString()
    const normalizedRoot = path.join(
      /* turbopackIgnore: true */ this.ensureWorkspaceDirectories(
        input.workspaceId
      ),
      "normalized"
    )
    const segmentRows = input.segments.map((segment) => {
      const normalizedPath = path.join(
        /* turbopackIgnore: true */ normalizedRoot,
        `${sourceId}-${segment.ordinal}-${segment.contentHash}.txt`
      )
      if (segment.content) {
        fs.writeFileSync(normalizedPath, segment.content, {
          encoding: "utf8",
          mode: FILE_MODE,
          flag: "wx",
        })
      }
      return {
        id: randomUUID(),
        sourceId,
        ordinal: segment.ordinal,
        contentHash: segment.contentHash,
        locator: segment.locator,
        normalizedPath: segment.content ? normalizedPath : null,
        readable: segment.readable,
        failureReason: segment.failureReason ?? null,
      } satisfies EvidenceSegmentRecord
    })

    const record: EvidenceSourceRecord = {
      id: sourceId,
      workspaceId: input.workspaceId,
      kind: input.kind,
      displayName: input.displayName,
      originalLanguage: input.originalLanguage ?? null,
      authorityRank: input.authorityRank ?? 0,
      originalHash: input.originalHash,
      byteSize: input.byteSize,
      state: input.state,
      privateOnly: true,
      metadata: input.metadata,
      createdAt: now,
    }
    const transaction = this.database.transaction(() => {
      this.database
        .prepare(
          `INSERT INTO evidence_sources
           (id, workspace_id, kind, display_name, original_language,
            authority_rank, original_hash, byte_size, state, private_only,
            metadata_json, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
        )
        .run(
          record.id,
          record.workspaceId,
          record.kind,
          record.displayName,
          record.originalLanguage,
          record.authorityRank,
          record.originalHash,
          record.byteSize,
          record.state,
          JSON.stringify(record.metadata),
          record.createdAt
        )
      const insertSegment = this.database.prepare(
        `INSERT INTO evidence_segments
         (id, source_id, ordinal, content_hash, locator_json, normalized_path,
          readable, failure_reason)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      for (const segment of segmentRows) {
        insertSegment.run(
          segment.id,
          segment.sourceId,
          segment.ordinal,
          segment.contentHash,
          JSON.stringify(segment.locator),
          segment.normalizedPath,
          segment.readable ? 1 : 0,
          segment.failureReason
        )
      }
      this.audit(input.workspaceId, "evidence.ingested", sourceId, {
        kind: input.kind,
        byteSize: input.byteSize,
        segmentCount: segmentRows.length,
        originalHash: input.originalHash,
      })
    })
    try {
      transaction()
    } catch (error) {
      for (const segment of segmentRows) {
        if (segment.normalizedPath) {
          fs.rmSync(segment.normalizedPath, { force: true })
        }
      }
      throw error
    }
    this.hardenDatabaseFiles()
    return record
  }

  listEvidenceSources(workspaceId: string): EvidenceSourceRecord[] {
    type Row = Omit<
      EvidenceSourceRecord,
      "workspaceId" | "originalLanguage" | "privateOnly" | "metadata" | "createdAt"
    > & {
      workspace_id: string
      original_language: string | null
      private_only: number
      metadata_json: string
      created_at: string
      display_name: string
      authority_rank: number
      original_hash: string
      byte_size: number
    }
    const rows = this.database
      .prepare(
        `SELECT id, workspace_id, kind, display_name, original_language,
         authority_rank, original_hash, byte_size, state, private_only,
         metadata_json, created_at
         FROM evidence_sources WHERE workspace_id = ? ORDER BY created_at`
      )
      .all(workspaceId) as Row[]
    return rows.map((row) => ({
      id: row.id,
      workspaceId: row.workspace_id,
      kind: row.kind,
      displayName: row.display_name,
      originalLanguage: row.original_language,
      authorityRank: row.authority_rank,
      originalHash: row.original_hash,
      byteSize: row.byte_size,
      state: row.state,
      privateOnly: row.private_only === 1,
      metadata: JSON.parse(row.metadata_json) as Record<string, unknown>,
      createdAt: row.created_at,
    }))
  }

  getEvidenceSource(id: string): EvidenceSourceRecord | null {
    type Row = {
      id: string
      workspace_id: string
      kind: string
      display_name: string
      original_language: string | null
      authority_rank: number
      original_hash: string
      byte_size: number
      state: string
      private_only: number
      metadata_json: string
      created_at: string
    }
    const row = this.database
      .prepare(
        `SELECT id, workspace_id, kind, display_name, original_language,
         authority_rank, original_hash, byte_size, state, private_only,
         metadata_json, created_at FROM evidence_sources WHERE id = ?`
      )
      .get(id) as Row | undefined
    return row
      ? {
          id: row.id,
          workspaceId: row.workspace_id,
          kind: row.kind,
          displayName: row.display_name,
          originalLanguage: row.original_language,
          authorityRank: row.authority_rank,
          originalHash: row.original_hash,
          byteSize: row.byte_size,
          state: row.state,
          privateOnly: row.private_only === 1,
          metadata: JSON.parse(row.metadata_json) as Record<string, unknown>,
          createdAt: row.created_at,
        }
      : null
  }

  listEvidenceSegments(sourceId: string): EvidenceSegmentRecord[] {
    type Row = {
      id: string
      source_id: string
      ordinal: number
      content_hash: string
      locator_json: string
      normalized_path: string | null
      readable: number
      failure_reason: string | null
    }
    return (
      this.database
        .prepare(
          `SELECT id, source_id, ordinal, content_hash, locator_json,
           normalized_path, readable, failure_reason
           FROM evidence_segments WHERE source_id = ? ORDER BY ordinal`
        )
        .all(sourceId) as Row[]
    ).map((row) => ({
      id: row.id,
      sourceId: row.source_id,
      ordinal: row.ordinal,
      contentHash: row.content_hash,
      locator: JSON.parse(row.locator_json) as Record<string, unknown>,
      normalizedPath: row.normalized_path,
      readable: row.readable === 1,
      failureReason: row.failure_reason,
    }))
  }

  readNormalizedSegment(
    sourceId: string,
    segmentId: string
  ): string | null {
    const segment = this.listEvidenceSegments(sourceId).find(
      (candidate) => candidate.id === segmentId
    )
    if (!segment?.normalizedPath) return null
    const resolved = fs.realpathSync(
      /* turbopackIgnore: true */ segment.normalizedPath
    )
    const allowed = fs.realpathSync(
      path.join(/* turbopackIgnore: true */ this.root, "workspaces")
    )
    if (!resolved.startsWith(`${allowed}${path.sep}`)) {
      throw new Error("Normalized evidence path escaped the private root")
    }
    return fs.readFileSync(/* turbopackIgnore: true */ resolved, "utf8")
  }

  createBackgroundJob(input: {
    workspaceId?: string
    type: string
    idempotencyKey?: string
    inputHash?: string
  }): { job: BackgroundJobRecord; existing: boolean } {
    if (input.idempotencyKey) {
      const existing = this.database
        .prepare(
          `SELECT id FROM background_jobs
           WHERE type = ? AND idempotency_key = ?`
        )
        .get(input.type, input.idempotencyKey) as { id: string } | undefined
      if (existing) {
        const job = this.getBackgroundJob(existing.id)
        if (job) return { job, existing: true }
      }
    }
    const now = new Date().toISOString()
    const job: BackgroundJobRecord = {
      id: randomUUID(),
      workspaceId: input.workspaceId ?? null,
      type: input.type,
      status: "queued",
      progress: 0,
      idempotencyKey: input.idempotencyKey ?? null,
      inputHash: input.inputHash ?? null,
      result: null,
      error: null,
      createdAt: now,
      updatedAt: now,
    }
    this.database
      .prepare(
        `INSERT INTO background_jobs
         (id, workspace_id, type, status, progress, idempotency_key, input_hash,
          created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        job.id,
        job.workspaceId,
        job.type,
        job.status,
        job.progress,
        job.idempotencyKey,
        job.inputHash,
        job.createdAt,
        job.updatedAt
      )
    this.hardenDatabaseFiles()
    return { job, existing: false }
  }

  getBackgroundJob(id: string): BackgroundJobRecord | null {
    type Row = {
      id: string
      workspace_id: string | null
      type: string
      status: BackgroundJobRecord["status"]
      progress: number
      idempotency_key: string | null
      input_hash: string | null
      result_json: string | null
      error_json: string | null
      created_at: string
      updated_at: string
    }
    const row = this.database
      .prepare(
        `SELECT id, workspace_id, type, status, progress, idempotency_key,
         input_hash, result_json, error_json, created_at, updated_at
         FROM background_jobs WHERE id = ?`
      )
      .get(id) as Row | undefined
    return row
      ? {
          id: row.id,
          workspaceId: row.workspace_id,
          type: row.type,
          status: row.status,
          progress: row.progress,
          idempotencyKey: row.idempotency_key,
          inputHash: row.input_hash,
          result: row.result_json
            ? (JSON.parse(row.result_json) as Record<string, unknown>)
            : null,
          error: row.error_json
            ? (JSON.parse(row.error_json) as Record<string, unknown>)
            : null,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }
      : null
  }

  listBackgroundJobs(workspaceId: string): BackgroundJobRecord[] {
    const rows = this.database
      .prepare(
        `SELECT id FROM background_jobs
         WHERE workspace_id = ?
         ORDER BY created_at DESC, rowid DESC`
      )
      .all(workspaceId) as Array<{ id: string }>
    return rows
      .map((row) => this.getBackgroundJob(row.id))
      .filter((job): job is BackgroundJobRecord => Boolean(job))
  }

  updateBackgroundJob(
    id: string,
    update: Partial<
      Pick<BackgroundJobRecord, "status" | "progress" | "result" | "error">
    >
  ): BackgroundJobRecord {
    const current = this.getBackgroundJob(id)
    if (!current) throw new Error("Background job not found")
    const next: BackgroundJobRecord = {
      ...current,
      ...update,
      progress: Math.max(
        0,
        Math.min(100, update.progress ?? current.progress)
      ),
      updatedAt: new Date().toISOString(),
    }
    this.database
      .prepare(
        `UPDATE background_jobs
         SET status = ?, progress = ?, result_json = ?, error_json = ?,
             updated_at = ?
         WHERE id = ?`
      )
      .run(
        next.status,
        next.progress,
        next.result ? JSON.stringify(next.result) : null,
        next.error ? JSON.stringify(next.error) : null,
        next.updatedAt,
        id
      )
    this.hardenDatabaseFiles()
    return next
  }

  saveEgressApproval(input: {
    workspaceId: string
    purpose: string
    modelId: string
    segmentIds: string[]
    hashes: string[]
  }): string {
    const id = randomUUID()
    this.database
      .prepare(
        `INSERT INTO egress_approvals
         (id, workspace_id, purpose, model_id, approved_segment_ids_json,
          approved_hashes_json, approved_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        input.workspaceId,
        input.purpose,
        input.modelId,
        JSON.stringify(input.segmentIds),
        JSON.stringify(input.hashes),
        new Date().toISOString()
      )
    this.audit(input.workspaceId, "egress.approved", id, {
      purpose: input.purpose,
      modelId: input.modelId,
      segmentIds: input.segmentIds,
      hashes: input.hashes,
    })
    return id
  }

  saveDraftConstitution(
    workspaceId: string,
    contract: Record<string, unknown>
  ): { id: string; revision: number } {
    const current = this.database
      .prepare(
        `SELECT COALESCE(MAX(revision), 0) AS revision
         FROM draft_constitutions WHERE workspace_id = ?`
      )
      .get(workspaceId) as { revision: number }
    const revision = current.revision + 1
    const id = randomUUID()
    const now = new Date().toISOString()
    this.database
      .prepare(
        `INSERT INTO draft_constitutions
         (id, workspace_id, revision, contract_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(id, workspaceId, revision, JSON.stringify(contract), now, now)
    this.audit(workspaceId, "constitution.draft.created", id, { revision })
    return { id, revision }
  }

  getDraftConstitution(id: string): {
    id: string
    workspaceId: string
    revision: number
    contract: Record<string, unknown>
    createdAt: string
    updatedAt: string
  } | null {
    type Row = {
      id: string
      workspace_id: string
      revision: number
      contract_json: string
      created_at: string
      updated_at: string
    }
    const row = this.database
      .prepare(
        `SELECT id, workspace_id, revision, contract_json, created_at, updated_at
         FROM draft_constitutions WHERE id = ?`
      )
      .get(id) as Row | undefined
    return row
      ? {
          id: row.id,
          workspaceId: row.workspace_id,
          revision: row.revision,
          contract: JSON.parse(row.contract_json) as Record<string, unknown>,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }
      : null
  }

  listDraftConstitutions(
    workspaceId: string
  ): Array<NonNullable<ReturnType<CriteriaForgeStore["getDraftConstitution"]>>> {
    const rows = this.database
      .prepare(
        `SELECT id FROM draft_constitutions
         WHERE workspace_id = ?
         ORDER BY revision DESC`
      )
      .all(workspaceId) as Array<{ id: string }>
    return rows
      .map((row) => this.getDraftConstitution(row.id))
      .filter(
        (
          draft
        ): draft is NonNullable<
          ReturnType<CriteriaForgeStore["getDraftConstitution"]>
        > => Boolean(draft)
      )
  }

  replaceDraftConstitution(
    id: string,
    contract: Record<string, unknown>
  ): ReturnType<CriteriaForgeStore["getDraftConstitution"]> {
    const current = this.getDraftConstitution(id)
    if (!current) return null
    const now = new Date().toISOString()
    this.database
      .prepare(
        `UPDATE draft_constitutions
         SET contract_json = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(JSON.stringify(contract), now, id)
    this.audit(current.workspaceId, "constitution.draft.updated", id, {
      revision: current.revision,
      contractHash: createHash("sha256")
        .update(JSON.stringify(contract), "utf8")
        .digest("hex"),
    })
    return this.getDraftConstitution(id)
  }

  saveCompileCheck(
    draftId: string,
    results: Record<string, unknown>
  ): string {
    const id = randomUUID()
    this.database
      .prepare(
        `INSERT INTO compile_checks (id, draft_id, results_json, created_at)
         VALUES (?, ?, ?, ?)`
      )
      .run(id, draftId, JSON.stringify(results), new Date().toISOString())
    return id
  }

  saveHumanDecision(input: {
    workspaceId: string
    subjectType: string
    subjectId: string
    decision: string
    decidedBy: string
    detailHash: string
  }): string {
    const id = randomUUID()
    this.database
      .prepare(
        `INSERT INTO human_decisions
         (id, workspace_id, subject_type, subject_id, decision, decided_by,
          decided_at, detail_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        input.workspaceId,
        input.subjectType,
        input.subjectId,
        input.decision,
        input.decidedBy,
        new Date().toISOString(),
        input.detailHash
      )
    this.audit(input.workspaceId, "human.decision.recorded", input.subjectId, {
      decisionId: id,
      subjectType: input.subjectType,
      decision: input.decision,
      decidedBy: input.decidedBy,
      detailHash: input.detailHash,
    })
    return id
  }

  saveConstitutionVersion(
    constitution: ProductConstitution
  ): ConstitutionVersionRecord {
    if (!this.getWorkspace(constitution.workspaceId)) {
      throw new Error("Workspace not found")
    }
    const record: ConstitutionVersionRecord = {
      id: constitution.constitutionId,
      workspaceId: constitution.workspaceId,
      version: constitution.version,
      contentHash: constitution.contentHash,
      contract: constitution,
      createdAt: constitution.createdAt,
    }
    const transaction = this.database.transaction(() => {
      this.database
        .prepare(
          `INSERT INTO constitution_versions
           (id, workspace_id, version, content_hash, contract_json, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(
          record.id,
          record.workspaceId,
          record.version,
          record.contentHash,
          JSON.stringify(record.contract),
          record.createdAt
        )
      this.database
        .prepare(
          `UPDATE workspaces SET status = 'active', updated_at = ? WHERE id = ?`
        )
        .run(new Date().toISOString(), record.workspaceId)
      this.audit(
        record.workspaceId,
        "constitution.version.compiled",
        record.id,
        {
          version: record.version,
          contentHash: record.contentHash,
        }
      )
    })
    transaction()
    this.hardenDatabaseFiles()
    return record
  }

  getConstitutionVersion(id: string): ConstitutionVersionRecord | null {
    type Row = {
      id: string
      workspace_id: string
      version: string
      content_hash: string
      contract_json: string
      created_at: string
    }
    const row = this.database
      .prepare(
        `SELECT id, workspace_id, version, content_hash, contract_json,
                created_at
         FROM constitution_versions WHERE id = ?`
      )
      .get(id) as Row | undefined
    return row
      ? {
          id: row.id,
          workspaceId: row.workspace_id,
          version: row.version,
          contentHash: row.content_hash,
          contract: JSON.parse(row.contract_json) as ProductConstitution,
          createdAt: row.created_at,
        }
      : null
  }

  listConstitutionVersions(
    workspaceId: string
  ): ConstitutionVersionRecord[] {
    type Row = {
      id: string
      workspace_id: string
      version: string
      content_hash: string
      contract_json: string
      created_at: string
    }
    return (
      this.database
        .prepare(
          `SELECT id, workspace_id, version, content_hash, contract_json,
                  created_at
           FROM constitution_versions
           WHERE workspace_id = ?
           ORDER BY created_at`
        )
        .all(workspaceId) as Row[]
    ).map((row) => ({
      id: row.id,
      workspaceId: row.workspace_id,
      version: row.version,
      contentHash: row.content_hash,
      contract: JSON.parse(row.contract_json) as ProductConstitution,
      createdAt: row.created_at,
    }))
  }

  createTargetSnapshot(input: {
    workspaceId: string
    sourceType: string
    contentHash: string
    snapshot: Record<string, unknown>
  }): TargetSnapshotRecord {
    if (!this.getWorkspace(input.workspaceId)) {
      throw new Error("Workspace not found")
    }
    const record: TargetSnapshotRecord = {
      id: randomUUID(),
      workspaceId: input.workspaceId,
      sourceType: input.sourceType,
      contentHash: input.contentHash,
      snapshot: input.snapshot,
      createdAt: new Date().toISOString(),
    }
    this.database
      .prepare(
        `INSERT INTO target_snapshots
         (id, workspace_id, source_type, content_hash, snapshot_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        record.id,
        record.workspaceId,
        record.sourceType,
        record.contentHash,
        JSON.stringify(record.snapshot),
        record.createdAt
      )
    this.audit(record.workspaceId, "target.snapshot.created", record.id, {
      sourceType: record.sourceType,
      contentHash: record.contentHash,
    })
    return record
  }

  getTargetSnapshot(id: string): TargetSnapshotRecord | null {
    type Row = {
      id: string
      workspace_id: string
      source_type: string
      content_hash: string
      snapshot_json: string
      created_at: string
    }
    const row = this.database
      .prepare(
        `SELECT id, workspace_id, source_type, content_hash, snapshot_json,
                created_at
         FROM target_snapshots WHERE id = ?`
      )
      .get(id) as Row | undefined
    return row
      ? {
          id: row.id,
          workspaceId: row.workspace_id,
          sourceType: row.source_type,
          contentHash: row.content_hash,
          snapshot: JSON.parse(row.snapshot_json) as Record<string, unknown>,
          createdAt: row.created_at,
        }
      : null
  }

  listTargetSnapshots(workspaceId: string): TargetSnapshotRecord[] {
    const rows = this.database
      .prepare(
        `SELECT id FROM target_snapshots
         WHERE workspace_id = ?
         ORDER BY created_at DESC, rowid DESC`
      )
      .all(workspaceId) as Array<{ id: string }>
    return rows
      .map((row) => this.getTargetSnapshot(row.id))
      .filter((target): target is TargetSnapshotRecord => Boolean(target))
  }

  saveEvaluationRun(input: {
    workspaceId: string
    constitutionVersionId: string
    targetSnapshotId: string
    runIndex: number
    status: string
    settings: Record<string, unknown>
    result: EvaluationRun | null
    inputHash: string
    outputHash?: string
    startedAt: string
    completedAt?: string
  }): string {
    const id = input.result?.runId ?? randomUUID()
    this.database
      .prepare(
        `INSERT INTO evaluation_runs
         (id, workspace_id, constitution_version_id, target_snapshot_id,
          run_index, status, settings_json, result_json, input_hash,
          output_hash, started_at, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        input.workspaceId,
        input.constitutionVersionId,
        input.targetSnapshotId,
        input.runIndex,
        input.status,
        JSON.stringify(input.settings),
        input.result ? JSON.stringify(input.result) : null,
        input.inputHash,
        input.outputHash ?? null,
        input.startedAt,
        input.completedAt ?? null
      )
    this.audit(input.workspaceId, "evaluation.run.saved", id, {
      constitutionVersionId: input.constitutionVersionId,
      targetSnapshotId: input.targetSnapshotId,
      runIndex: input.runIndex,
      status: input.status,
    })
    return id
  }

  getEvaluationRun(id: string): {
    id: string
    workspaceId: string
    constitutionVersionId: string
    targetSnapshotId: string
    runIndex: number
    status: string
    settings: Record<string, unknown>
    result: EvaluationRun | null
    inputHash: string
    outputHash: string | null
    startedAt: string
    completedAt: string | null
  } | null {
    type Row = {
      id: string
      workspace_id: string
      constitution_version_id: string
      target_snapshot_id: string
      run_index: number
      status: string
      settings_json: string
      result_json: string | null
      input_hash: string
      output_hash: string | null
      started_at: string
      completed_at: string | null
    }
    const row = this.database
      .prepare(
        `SELECT id, workspace_id, constitution_version_id,
                target_snapshot_id, run_index, status, settings_json,
                result_json, input_hash, output_hash, started_at, completed_at
         FROM evaluation_runs WHERE id = ?`
      )
      .get(id) as Row | undefined
    return row
      ? {
          id: row.id,
          workspaceId: row.workspace_id,
          constitutionVersionId: row.constitution_version_id,
          targetSnapshotId: row.target_snapshot_id,
          runIndex: row.run_index,
          status: row.status,
          settings: JSON.parse(row.settings_json) as Record<string, unknown>,
          result: row.result_json
            ? (JSON.parse(row.result_json) as EvaluationRun)
            : null,
          inputHash: row.input_hash,
          outputHash: row.output_hash,
          startedAt: row.started_at,
          completedAt: row.completed_at,
        }
      : null
  }

  saveRemediationBrief(input: {
    workspaceId: string
    brief: RemediationBrief
  }): {
    id: string
    status: string
    contract: RemediationBrief
    createdAt: string
    updatedAt: string
  } {
    if (!this.getWorkspace(input.workspaceId)) {
      throw new Error("Workspace not found")
    }
    const now = new Date().toISOString()
    this.database
      .prepare(
        `INSERT INTO remediation_briefs
         (id, workspace_id, contract_json, status, created_at, updated_at)
         VALUES (?, ?, ?, 'ratified', ?, ?)`
      )
      .run(
        input.brief.remediationId,
        input.workspaceId,
        JSON.stringify(input.brief),
        now,
        now
      )
    this.audit(
      input.workspaceId,
      "remediation.brief.ratified",
      input.brief.remediationId,
      {
        constitutionVersionId: input.brief.constitutionVersionId,
        targetSnapshotId: input.brief.targetSnapshotId,
        criterionIds: input.brief.criterionIds,
      }
    )
    return {
      id: input.brief.remediationId,
      status: "ratified",
      contract: input.brief,
      createdAt: now,
      updatedAt: now,
    }
  }

  getRemediationBrief(id: string): {
    id: string
    workspaceId: string
    status: string
    contract: RemediationBrief
    createdAt: string
    updatedAt: string
  } | null {
    type Row = {
      id: string
      workspace_id: string
      status: string
      contract_json: string
      created_at: string
      updated_at: string
    }
    const row = this.database
      .prepare(
        `SELECT id, workspace_id, status, contract_json, created_at, updated_at
         FROM remediation_briefs WHERE id = ?`
      )
      .get(id) as Row | undefined
    return row
      ? {
          id: row.id,
          workspaceId: row.workspace_id,
          status: row.status,
          contract: JSON.parse(row.contract_json) as RemediationBrief,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }
      : null
  }

  listRemediationBriefs(
    workspaceId: string
  ): Array<NonNullable<ReturnType<CriteriaForgeStore["getRemediationBrief"]>>> {
    const rows = this.database
      .prepare(
        `SELECT id FROM remediation_briefs
         WHERE workspace_id = ?
         ORDER BY created_at DESC, rowid DESC`
      )
      .all(workspaceId) as Array<{ id: string }>
    return rows
      .map((row) => this.getRemediationBrief(row.id))
      .filter(
        (
          remediation
        ): remediation is NonNullable<
          ReturnType<CriteriaForgeStore["getRemediationBrief"]>
        > => Boolean(remediation)
      )
  }

  updateRemediationStatus(id: string, status: string): void {
    const current = this.getRemediationBrief(id)
    if (!current) throw new Error("Remediation brief not found")
    this.database
      .prepare(
        `UPDATE remediation_briefs SET status = ?, updated_at = ? WHERE id = ?`
      )
      .run(status, new Date().toISOString(), id)
    this.audit(
      current.workspaceId,
      "remediation.status.changed",
      id,
      { status }
    )
  }

  audit(
    workspaceId: string | null,
    eventType: string,
    subjectId: string | null,
    metadata: Record<string, unknown>
  ): void {
    const safeMetadata = JSON.stringify(metadata)
    if (safeMetadata.length > 20_000) {
      throw new Error("Audit metadata is too large")
    }
    this.database
      .prepare(
        `INSERT INTO audit_events
         (id, workspace_id, event_type, subject_id, metadata_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        randomUUID(),
        workspaceId,
        eventType,
        subjectId,
        safeMetadata,
        new Date().toISOString()
      )
    this.hardenDatabaseFiles()
  }
}

const globalStore = globalThis as typeof globalThis & {
  __criteriaForgeStore?: CriteriaForgeStore
}

export function getStore(): CriteriaForgeStore {
  globalStore.__criteriaForgeStore ??= new CriteriaForgeStore()
  return globalStore.__criteriaForgeStore
}
