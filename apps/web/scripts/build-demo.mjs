import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const apiDirectory = path.join(root, "src", "app", "api")
const parkedDirectory = path.join(root, `.local-api-parked-${process.pid}`)

if (!fs.existsSync(apiDirectory)) {
  throw new Error("The local API source directory is missing")
}

fs.renameSync(apiDirectory, parkedDirectory)
try {
  const next = path.join(root, "node_modules", ".bin", "next")
  const result = spawnSync(next, ["build"], {
    cwd: root,
    env: {
      ...process.env,
      NEXT_PUBLIC_CRITERIAFORGE_MODE: "demo",
      CRITERIAFORGE_RUNTIME: "demo",
    },
    encoding: "utf8",
    stdio: "inherit",
    shell: false,
  })
  if (result.error) throw result.error
  if (result.status !== 0) process.exitCode = result.status ?? 1
} finally {
  fs.renameSync(parkedDirectory, apiDirectory)
}
