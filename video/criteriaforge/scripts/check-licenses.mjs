import fs from "node:fs"
import path from "node:path"
import process from "node:process"

const root = path.resolve("node_modules")
if (!fs.existsSync(root)) {
  process.stderr.write("node_modules is missing; run npm ci first.\n")
  process.exit(1)
}

const remotionVersion = "4.0.495"
const reviewedRemotionPackages = new Set([
  "@remotion/bundler",
  "@remotion/canvas-capture",
  "@remotion/cli",
  "@remotion/media",
  "@remotion/media-parser",
  "@remotion/player",
  "@remotion/renderer",
  "@remotion/web-renderer",
  "remotion",
])
const visited = new Set()
const packages = []

function isReviewedRemotionPackage(item) {
  return (
    item.version === remotionVersion &&
    (reviewedRemotionPackages.has(item.name) ||
      /^@remotion\/compositor-(?:darwin|linux|win32)-/u.test(item.name))
  )
}

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
        if (child.isDirectory()) inspectPackage(path.join(candidate, child.name))
      }
    } else {
      inspectPackage(candidate)
    }
  }
}

inspectNodeModules(root)

const remotionLicensePath = path.join(root, "remotion", "LICENSE.md")
const remotionLicense = fs.existsSync(remotionLicensePath)
  ? fs.readFileSync(remotionLicensePath, "utf8")
  : ""
const licenseMatchesReviewedTerms =
  remotionLicense.includes("# Remotion License") &&
  remotionLicense.includes("## Free License") &&
  remotionLicense.includes("- an individual") &&
  remotionLicense.includes("creating videos and images")

const failures = []
if (!licenseMatchesReviewedTerms) {
  failures.push(
    `remotion@${remotionVersion}: installed LICENSE.md no longer matches the reviewed individual Free License terms`
  )
}

for (const item of packages) {
  const identifier = `${item.name}@${item.version}`
  const customOrMissing =
    item.license === "UNKNOWN" ||
    /(?:SEE LICENSE|Remotion License)/iu.test(item.license)

  if (customOrMissing && isReviewedRemotionPackage(item)) continue
  if (customOrMissing) {
    failures.push(`${identifier}: unreviewed custom or missing license (${item.license})`)
    continue
  }
  const restricted = /\b(?:AGPL|SSPL|BUSL|GPL|LGPL)\b/iu.test(item.license)
  const hasPermissiveAlternative =
    /\b(?:MIT|Apache-2\.0|BSD-[23]-Clause|ISC)\b/iu.test(item.license) &&
    /\bOR\b/iu.test(item.license)
  if (restricted && !hasPermissiveAlternative) {
    failures.push(`${identifier}: ${item.license}`)
  }
  if (/\b(?:UNLICENSED|SEE LICENSE|PROPRIETARY)\b/iu.test(item.license)) {
    failures.push(`${identifier}: ${item.license}`)
  }
}

if (failures.length > 0) {
  process.stderr.write("Video dependency license review failed:\n")
  for (const failure of failures) process.stderr.write(`- ${failure}\n`)
  process.exit(1)
}

process.stdout.write(
  `Video dependency license check passed for ${packages.length} installed packages. ` +
    `Reviewed exception: Remotion ${remotionVersion} custom Free License for an individual; reassess if submitter status or version changes.\n`
)
