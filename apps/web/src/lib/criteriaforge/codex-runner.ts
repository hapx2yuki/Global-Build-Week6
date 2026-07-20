import { createHash, randomUUID } from "node:crypto"
import { spawn } from "node:child_process"
import fs from "node:fs"
import path from "node:path"

import type { Static, TSchema } from "@sinclair/typebox"

import { assertSchema } from "@/lib/criteriaforge/validation"

const PRIVATE_FILE_MODE = 0o600
const PRIVATE_DIRECTORY_MODE = 0o700
const MAX_CAPTURE_BYTES = 20 * 1024 * 1024

export type CodexSandbox = "read-only" | "workspace-write"

export type CodexRunRequest<T extends TSchema> = {
  purpose: "constitution" | "calibration" | "evaluation" | "remediation"
  model: string
  reasoningEffort: string
  sandbox: CodexSandbox
  prompt: string
  outputSchema: T
  cwd: string
  runRoot: string
  timeoutMs?: number
  retryMalformedOutput?: boolean
}

export type CodexRunResult<T extends TSchema> = {
  runId: string
  value: Static<T>
  outputHash: string
  promptHash: string
  schemaHash: string
  jsonlPath: string
  outputPath: string
  codexVersion: string
  startedAt: string
  completedAt: string
  retryCount: number
}

export type CodexLoginStatus = {
  available: boolean
  loggedIn: boolean
  detail: string
  codexVersion: string | null
}

export class CodexRunnerError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly retryable: boolean,
    readonly detail?: string
  ) {
    super(message)
  }
}

type ProcessResult = {
  code: number | null
  stdout: string
  stderr: string
}

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex")
}

function privateDirectory(directory: string): void {
  fs.mkdirSync(directory, {
    recursive: true,
    mode: PRIVATE_DIRECTORY_MODE,
  })
  fs.chmodSync(directory, PRIVATE_DIRECTORY_MODE)
}

function privateWrite(filePath: string, value: string): void {
  fs.writeFileSync(filePath, value, {
    encoding: "utf8",
    mode: PRIVATE_FILE_MODE,
  })
  fs.chmodSync(filePath, PRIVATE_FILE_MODE)
}

type JsonSchemaNode = Record<string, unknown>

function makeNullable(schema: JsonSchemaNode): JsonSchemaNode {
  if (
    schema.type === "null" ||
    (Array.isArray(schema.anyOf) &&
      schema.anyOf.some(
        (candidate) =>
          candidate &&
          typeof candidate === "object" &&
          (candidate as JsonSchemaNode).type === "null"
      ))
  ) {
    return schema
  }
  return { anyOf: [schema, { type: "null" }] }
}

export function toOpenAIStructuredOutputSchema(
  schema: TSchema
): JsonSchemaNode {
  function visit(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(visit)
    if (!value || typeof value !== "object") return value
    const node = value as JsonSchemaNode
    const result: JsonSchemaNode = {}
    for (const [key, child] of Object.entries(node)) {
      if (
        key === "properties" ||
        key === "required" ||
        key === "format" ||
        key === "uniqueItems"
      ) {
        continue
      }
      result[key] = visit(child)
    }
    if (node.properties && typeof node.properties === "object") {
      const originalRequired = new Set(
        Array.isArray(node.required)
          ? node.required.filter(
              (item): item is string => typeof item === "string"
            )
          : []
      )
      const properties: Record<string, unknown> = {}
      for (const [key, propertySchema] of Object.entries(
        node.properties as Record<string, unknown>
      )) {
        const visited = visit(propertySchema) as JsonSchemaNode
        properties[key] = originalRequired.has(key)
          ? visited
          : makeNullable(visited)
      }
      result.properties = properties
      result.required = Object.keys(properties)
      result.additionalProperties = false
    }
    return result
  }
  return visit(schema) as JsonSchemaNode
}

function removeStructuredNulls(value: unknown, schema: unknown): unknown {
  if (value === null || value === undefined) return value
  if (!schema || typeof schema !== "object") return value
  const node = schema as JsonSchemaNode
  if (Array.isArray(value)) {
    return value.map((item) => removeStructuredNulls(item, node.items))
  }
  if (typeof value !== "object") return value

  let selected = node
  if (Array.isArray(node.anyOf)) {
    const discriminator =
      "kind" in (value as Record<string, unknown>)
        ? (value as Record<string, unknown>).kind
        : undefined
    selected =
      (node.anyOf.find((candidate) => {
        if (!candidate || typeof candidate !== "object") return false
        const kindSchema = (
          (candidate as JsonSchemaNode).properties as
            | Record<string, JsonSchemaNode>
            | undefined
        )?.kind
        return discriminator !== undefined && kindSchema?.const === discriminator
      }) as JsonSchemaNode | undefined) ??
      (node.anyOf.find(
        (candidate) =>
          candidate &&
          typeof candidate === "object" &&
          (candidate as JsonSchemaNode).type !== "null"
      ) as JsonSchemaNode | undefined) ??
      node
  }

  const properties =
    selected.properties && typeof selected.properties === "object"
      ? (selected.properties as Record<string, unknown>)
      : {}
  const required = new Set(
    Array.isArray(selected.required)
      ? selected.required.filter(
          (item): item is string => typeof item === "string"
        )
      : []
  )
  const output: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(
    value as Record<string, unknown>
  )) {
    if (child === null && !required.has(key)) continue
    output[key] = removeStructuredNulls(child, properties[key])
  }
  return output
}

function boundedAppend(current: string, chunk: Buffer): string {
  if (Buffer.byteLength(current) + chunk.byteLength > MAX_CAPTURE_BYTES) {
    throw new CodexRunnerError(
      "codex_output_limit",
      "Codex produced more than the 20 MB local capture limit.",
      false
    )
  }
  return current + chunk.toString("utf8")
}

export class CodexRunner {
  constructor(
    private readonly executable = "codex",
    private readonly executablePrefix: string[] = []
  ) {}

  private execute(
    args: string[],
    options: {
      cwd: string
      stdin?: string
      timeoutMs?: number
    }
  ): Promise<ProcessResult> {
    return new Promise((resolve, reject) => {
      const child = spawn(
        this.executable,
        [...this.executablePrefix, ...args],
        {
          cwd: options.cwd,
          env: { ...process.env, NO_COLOR: "1" },
          shell: false,
          stdio: ["pipe", "pipe", "pipe"],
        }
      )
      let stdout = ""
      let stderr = ""
      let settled = false
      const timeout = setTimeout(() => {
        if (!settled) child.kill("SIGTERM")
      }, options.timeoutMs ?? 10 * 60 * 1000)

      child.stdout.on("data", (chunk: Buffer) => {
        try {
          stdout = boundedAppend(stdout, chunk)
        } catch (error) {
          child.kill("SIGTERM")
          reject(error)
        }
      })
      child.stderr.on("data", (chunk: Buffer) => {
        try {
          stderr = boundedAppend(stderr, chunk)
        } catch (error) {
          child.kill("SIGTERM")
          reject(error)
        }
      })
      child.once("error", (error) => {
        clearTimeout(timeout)
        settled = true
        reject(
          new CodexRunnerError(
            "codex_unavailable",
            "The Codex CLI could not be started.",
            false,
            error.message
          )
        )
      })
      child.once("close", (code, signal) => {
        clearTimeout(timeout)
        settled = true
        if (signal === "SIGTERM") {
          reject(
            new CodexRunnerError(
              "codex_timeout",
              "The Codex run exceeded its allowed time.",
              true
            )
          )
          return
        }
        resolve({ code, stdout, stderr })
      })
      child.stdin.end(options.stdin ?? "")
    })
  }

  async loginStatus(cwd = process.cwd()): Promise<CodexLoginStatus> {
    try {
      const [version, status] = await Promise.all([
        this.execute(["--version"], { cwd, timeoutMs: 5_000 }),
        this.execute(["login", "status"], { cwd, timeoutMs: 10_000 }),
      ])
      const detail = (status.stdout || status.stderr).trim()
      return {
        available: version.code === 0,
        loggedIn:
          status.code === 0 &&
          !/(not logged in|logged out|unauthenticated)/iu.test(detail),
        detail,
        codexVersion: version.code === 0 ? version.stdout.trim() : null,
      }
    } catch (error) {
      return {
        available: false,
        loggedIn: false,
        detail:
          error instanceof Error ? error.message : "Codex is unavailable.",
        codexVersion: null,
      }
    }
  }

  startLogin(cwd = process.cwd()): number {
    const child = spawn(
      this.executable,
      [...this.executablePrefix, "login"],
      {
        cwd,
        env: { ...process.env, NO_COLOR: "1" },
        shell: false,
        detached: true,
        stdio: "ignore",
      }
    )
    child.unref()
    if (!child.pid) {
      throw new CodexRunnerError(
        "codex_login_start_failed",
        "Codex login could not be started.",
        true
      )
    }
    return child.pid
  }

  async runStructured<T extends TSchema>(
    request: CodexRunRequest<T>
  ): Promise<CodexRunResult<T>> {
    const runId = randomUUID()
    const runDirectory = path.join(request.runRoot, runId)
    privateDirectory(runDirectory)
    const schemaPath = path.join(runDirectory, "output.schema.json")
    const promptPath = path.join(runDirectory, "approved-prompt.txt")
    const outputPath = path.join(runDirectory, "last-message.json")
    const jsonlPath = path.join(runDirectory, "events.jsonl")
    const schemaJson = JSON.stringify(
      toOpenAIStructuredOutputSchema(request.outputSchema),
      null,
      2
    )
    privateWrite(schemaPath, schemaJson)
    privateWrite(promptPath, request.prompt)

    const login = await this.loginStatus(request.cwd)
    if (!login.available) {
      throw new CodexRunnerError(
        "codex_unavailable",
        "Codex CLI is not installed or cannot be started.",
        false,
        login.detail
      )
    }
    if (!login.loggedIn) {
      throw new CodexRunnerError(
        "codex_login_required",
        "Codex is not logged in with ChatGPT OAuth.",
        false,
        login.detail
      )
    }

    const startedAt = new Date().toISOString()
    let prompt = request.prompt
    let retryCount = 0
    const maximumAttempts = request.retryMalformedOutput === false ? 1 : 2
    let lastFailure: unknown = null

    for (let attempt = 0; attempt < maximumAttempts; attempt += 1) {
      const result = await this.execute(
        [
          "exec",
          "--output-schema",
          schemaPath,
          "--output-last-message",
          outputPath,
          "--json",
          "--skip-git-repo-check",
          "--sandbox",
          request.sandbox,
          "--model",
          request.model,
          "-c",
          `model_reasoning_effort="${request.reasoningEffort}"`,
          "-",
        ],
        {
          cwd: request.cwd,
          stdin: prompt,
          timeoutMs: request.timeoutMs,
        }
      )
      privateWrite(jsonlPath, result.stdout)
      if (result.code !== 0) {
        throw new CodexRunnerError(
          "codex_exec_failed",
          "Codex did not complete the structured run.",
          true,
          `${result.stderr.slice(0, 4_000)}\n${result.stdout.slice(-4_000)}`
        )
      }
      try {
        const rawOutput = fs.readFileSync(outputPath, "utf8")
        const parsed: unknown = JSON.parse(rawOutput)
        const normalized = removeStructuredNulls(
          parsed,
          request.outputSchema
        )
        const value = assertSchema<Static<T>>(
          request.outputSchema,
          normalized
        )
        fs.chmodSync(outputPath, PRIVATE_FILE_MODE)
        return {
          runId,
          value,
          outputHash: sha256(rawOutput),
          promptHash: sha256(request.prompt),
          schemaHash: sha256(schemaJson),
          jsonlPath,
          outputPath,
          codexVersion: login.codexVersion ?? "unknown",
          startedAt,
          completedAt: new Date().toISOString(),
          retryCount,
        }
      } catch (error) {
        lastFailure = error
        if (attempt + 1 >= maximumAttempts) break
        retryCount += 1
        const malformed = fs.existsSync(outputPath)
          ? fs.readFileSync(outputPath, "utf8").slice(0, 200_000)
          : "(no last message was written)"
        prompt = [
          request.prompt,
          "",
          "The previous response did not satisfy the supplied JSON Schema.",
          "Repair only the response structure. Do not introduce new evidence,",
          "new criteria, or new factual claims.",
          "",
          "BEGIN_PREVIOUS_INVALID_OUTPUT",
          malformed,
          "END_PREVIOUS_INVALID_OUTPUT",
        ].join("\n")
      }
    }

    throw new CodexRunnerError(
      "codex_schema_validation_failed",
      "Codex returned invalid structured output twice; no result was adopted.",
      false,
      lastFailure instanceof Error ? lastFailure.message : undefined
    )
  }
}
