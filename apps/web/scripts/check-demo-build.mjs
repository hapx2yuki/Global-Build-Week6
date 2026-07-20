import fs from "node:fs"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const output = path.join(root, ".next")
if (!fs.existsSync(output)) {
  throw new Error("Run npm run build:demo before checking the demo build")
}

const forbiddenServerRoutes = path.join(output, "server", "app", "api")
if (fs.existsSync(forbiddenServerRoutes)) {
  throw new Error("The public demo build contains local API route bundles")
}

const staticRoot = path.join(output, "static")
const forbidden = [
  "better-sqlite3",
  "node:child_process",
  "codex exec",
  "CRITERIAFORGE_SESSION_TOKEN",
  "CRITERIAFORGE_CSRF_TOKEN",
]
const files = []
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const resolved = path.join(directory, entry.name)
    if (entry.isDirectory()) walk(resolved)
    else files.push(resolved)
  }
}
walk(staticRoot)
const clientText = files
  .filter((file) => /\.(?:js|json|html|txt)$/u.test(file))
  .map((file) => fs.readFileSync(file, "utf8"))
  .join("\n")
for (const marker of forbidden) {
  if (clientText.includes(marker)) {
    throw new Error(`The public browser bundle contains ${marker}`)
  }
}
process.stdout.write(
  "Public demo build contains no local API routes or forbidden local-runtime markers.\n"
)
