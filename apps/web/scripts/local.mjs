import { randomBytes } from "node:crypto"
import { spawn } from "node:child_process"
import net from "node:net"
import process from "node:process"

function randomToken() {
  return randomBytes(32).toString("base64url")
}

function availablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.unref()
    server.once("error", reject)
    server.listen({ host: "127.0.0.1", port: 0 }, () => {
      const address = server.address()
      if (!address || typeof address === "string") {
        server.close()
        reject(new Error("Could not allocate a local port"))
        return
      }
      const port = address.port
      server.close(() => resolve(port))
    })
  })
}

const port = await availablePort()
const bootstrapToken = randomToken()
const sessionToken = randomToken()
const csrfToken = randomToken()
const url = `http://127.0.0.1:${port}/#bootstrap=${bootstrapToken}`
const command =
  process.env.CRITERIAFORGE_LOCAL_PRODUCTION === "1" ? "start" : "dev"

const child = spawn(
  process.platform === "win32" ? "npm.cmd" : "npm",
  ["run", command, "--", "--hostname", "127.0.0.1", "--port", String(port)],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      CRITERIAFORGE_RUNTIME: "local",
      NEXT_PUBLIC_CRITERIAFORGE_MODE: "local",
      CRITERIAFORGE_BOOTSTRAP_TOKEN: bootstrapToken,
      CRITERIAFORGE_SESSION_TOKEN: sessionToken,
      CRITERIAFORGE_CSRF_TOKEN: csrfToken,
    },
    shell: false,
    stdio: "inherit",
  }
)

const openTimer = setTimeout(() => {
  if (process.platform === "darwin") {
    const opener = spawn("open", [url], {
      shell: false,
      stdio: "ignore",
      detached: true,
    })
    opener.unref()
  } else {
    process.stdout.write(`Open ${url}\n`)
  }
}, 1_500)

function stop(signal) {
  clearTimeout(openTimer)
  if (!child.killed) child.kill(signal)
}

process.on("SIGINT", () => stop("SIGINT"))
process.on("SIGTERM", () => stop("SIGTERM"))
child.on("exit", (code, signal) => {
  clearTimeout(openTimer)
  if (signal) process.kill(process.pid, signal)
  process.exit(code ?? 0)
})
