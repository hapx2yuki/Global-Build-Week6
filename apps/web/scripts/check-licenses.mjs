import fs from "node:fs"
import path from "node:path"
import process from "node:process"

const root = path.resolve("node_modules")
if (!fs.existsSync(root)) {
  process.stderr.write("node_modules is missing; run npm ci first.\n")
  process.exit(1)
}

const reviewedMissingLicense = new Set(["buffers@0.1.1"])
const reviewedStrongCopyleftRuntime = [
  /^@img\/sharp-libvips-/u,
  /^@img\/sharp-wasm/u,
]
const visited = new Set()
const packages = []

function inspectPackage(directory) {
  const real = fs.realpathSync(directory)
  if (visited.has(real)) return
  visited.add(real)
  const manifestPath = path.join(real, "package.json")
  if (!fs.existsSync(manifestPath)) return
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"))
  const name = String(manifest.name ?? path.basename(real))
  const version = String(manifest.version ?? "unknown")
  const license =
    typeof manifest.license === "string"
      ? manifest.license
      : Array.isArray(manifest.licenses)
        ? manifest.licenses
            .map((item) =>
              typeof item === "string" ? item : String(item?.type ?? "")
            )
            .filter(Boolean)
            .join(" OR ")
        : "UNKNOWN"
  packages.push({ name, version, license })
  const nested = path.join(real, "node_modules")
  if (fs.existsSync(nested)) inspectNodeModules(nested)
}

function inspectNodeModules(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue
    const candidate = path.join(directory, entry.name)
    if (entry.name.startsWith("@")) {
      for (const child of fs.readdirSync(candidate, {
        withFileTypes: true,
      })) {
        if (child.isDirectory()) {
          inspectPackage(path.join(candidate, child.name))
        }
      }
    } else {
      inspectPackage(candidate)
    }
  }
}

inspectNodeModules(root)

const failures = []
for (const item of packages) {
  const identifier = `${item.name}@${item.version}`
  if (
    item.license === "UNKNOWN" &&
    !reviewedMissingLicense.has(identifier)
  ) {
    failures.push(`${identifier}: missing license metadata`)
    continue
  }
  const restricted = /\b(?:AGPL|SSPL|BUSL|GPL|LGPL)\b/iu.test(item.license)
  const hasPermissiveAlternative =
    /\b(?:MIT|Apache-2\.0|BSD-[23]-Clause|ISC)\b/iu.test(item.license) &&
    /\bOR\b/iu.test(item.license)
  const reviewedRuntime = reviewedStrongCopyleftRuntime.some((pattern) =>
    pattern.test(item.name)
  )
  if (restricted && !hasPermissiveAlternative && !reviewedRuntime) {
    failures.push(`${identifier}: ${item.license}`)
  }
  if (/\b(?:UNLICENSED|SEE LICENSE|PROPRIETARY)\b/iu.test(item.license)) {
    failures.push(`${identifier}: ${item.license}`)
  }
}

if (failures.length > 0) {
  process.stderr.write("Dependency license review failed:\n")
  for (const failure of failures) process.stderr.write(`- ${failure}\n`)
  process.exit(1)
}

process.stdout.write(
  `Dependency license check passed for ${packages.length} installed packages. ` +
    "Reviewed exceptions: buffers metadata and Sharp's dynamically linked libvips runtime.\n"
)
