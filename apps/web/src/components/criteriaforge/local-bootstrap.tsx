"use client"

import * as React from "react"

const CSRF_STORAGE_KEY = "criteriaforge.csrf"

export function LocalBootstrap() {
  React.useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1))
    const token = hash.get("bootstrap")
    if (!token) return

    let cancelled = false
    void fetch("/api/v1/system/bootstrap", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Local session exchange failed")
        const body = (await response.json()) as { csrfToken: string }
        if (!cancelled) {
          window.sessionStorage.setItem(CSRF_STORAGE_KEY, body.csrfToken)
          window.history.replaceState(null, "", `${location.pathname}${location.search}`)
          window.dispatchEvent(new Event("criteriaforge:local-ready"))
        }
      })
      .catch(() => {
        if (!cancelled) {
          window.dispatchEvent(new Event("criteriaforge:local-failed"))
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  return null
}

export function criteriaForgeCsrfToken(): string | null {
  if (typeof window === "undefined") return null
  return window.sessionStorage.getItem(CSRF_STORAGE_KEY)
}
