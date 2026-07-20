"use client"

import * as React from "react"
import {
  ArrowRight,
  Braces,
  Check,
  CircleAlert,
  FileCode2,
  FileText,
  Link2,
  LockKeyhole,
  Search,
  ShieldCheck,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { UiLocale } from "@/lib/criteriaforge/ui-types"

const evidence = [
  {
    id: "EV-014",
    criterion: "FR-01",
    title: "Explicit non-goal in founder memo",
    locator: "founder-note.txt · lines 14–16",
    kind: "document",
    state: "verified",
    content:
      "Do not turn this into investor material. The product should help me produce a build-ready product brief, not a pitch deck.",
    hash: "c884…6a21",
  },
  {
    id: "EV-027",
    criterion: "FR-02",
    title: "Unsupported billing assumption",
    locator: "brief-v0.1.md · lines 62–81",
    kind: "git",
    state: "verified",
    content:
      "Team accounts use recurring billing. Workspace owners invite collaborators after checkout.",
    hash: "5ae9…17fb",
  },
  {
    id: "EV-031",
    criterion: "FR-02",
    title: "Browser trace, generation step",
    locator: "trace 03 · step 6 · localhost",
    kind: "web",
    state: "verified",
    content:
      "The final brief was generated without a question about account type or billing.",
    hash: "21dd…83c0",
  },
  {
    id: "EV-044",
    criterion: "AUDIO-01",
    title: "Spoken explanation",
    locator: "demo.mov · 00:43–00:58",
    kind: "video",
    state: "unavailable",
    content:
      "No subtitle was provided. Visual frames exist, but audio content is intentionally not inferred.",
    hash: "unavailable",
  },
]

export function EvidenceInspector({
  locale,
  onContinue,
}: {
  locale: UiLocale
  onContinue: () => void
}) {
  const [selectedId, setSelectedId] = React.useState("EV-014")
  const [query, setQuery] = React.useState("")
  const selected =
    evidence.find((item) => item.id === selectedId) ?? evidence[0]
  const visible = evidence.filter((item) =>
    `${item.id} ${item.criterion} ${item.title} ${item.locator}`
      .toLowerCase()
      .includes(query.toLowerCase())
  )
  const title =
    locale === "ja"
      ? "結論から、原典の位置まで戻れる"
      : "Move from a finding back to the exact source"
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="border-b bg-card px-4 py-5 sm:px-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-evidence-foreground">
          04 · Evidence inspection
        </p>
        <div className="mt-2 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <h1 className="font-editorial text-3xl tracking-[-0.03em] sm:text-4xl">
              {title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              A decisive claim is adopted only after the local segment and
              content hash are verified.
            </p>
          </div>
          <Button onClick={onContinue}>
            Run formal evaluation
            <ArrowRight />
          </Button>
        </div>
      </header>
      <div className="grid min-h-0 flex-1 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-r bg-card/50">
          <div className="border-b p-3">
            <InputGroup>
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              <InputGroupInput
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Find evidence…"
                aria-label="Find evidence"
              />
            </InputGroup>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            {visible.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                className={cn(
                  "w-full border-b px-4 py-4 text-left outline-none hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50",
                  selectedId === item.id && "bg-evidence/7"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[9px] text-muted-foreground">
                    {item.id} · {item.criterion}
                  </span>
                  {item.state === "verified" ? (
                    <Check className="size-3.5 text-approved" />
                  ) : (
                    <CircleAlert className="size-3.5 text-ember" />
                  )}
                </div>
                <p className="mt-2 text-xs font-medium">{item.title}</p>
                <p className="mt-1 truncate font-mono text-[9px] text-muted-foreground">
                  {item.locator}
                </p>
              </button>
            ))}
          </ScrollArea>
        </aside>
        <ScrollArea className="min-h-0">
          <article className="mx-auto max-w-4xl px-5 py-8 sm:px-8">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-mono">
                {selected.id}
              </Badge>
              <Badge
                variant="outline"
                className={
                  selected.state === "verified"
                    ? "border-approved/25 bg-approved/8 text-approved-foreground"
                    : "border-ember/25 bg-ember/7 text-ember-foreground"
                }
              >
                {selected.state === "verified" ? (
                  <ShieldCheck />
                ) : (
                  <CircleAlert />
                )}
                {selected.state === "verified"
                  ? "Locally verified"
                  : "Unavailable"}
              </Badge>
              <Badge variant="outline">
                <LockKeyhole />
                Private source
              </Badge>
            </div>
            <h2 className="mt-5 font-editorial text-3xl">{selected.title}</h2>
            <button
              type="button"
              className="mt-3 inline-flex items-center gap-1.5 rounded-sm font-mono text-[10px] text-evidence-foreground hover:underline focus-visible:ring-3"
            >
              <Link2 className="size-3.5" />
              {selected.locator}
            </button>

            <div className="mt-7 rounded-lg border bg-card">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div className="flex items-center gap-2 text-xs font-medium">
                  {selected.kind === "git" ? (
                    <FileCode2 className="size-4" />
                  ) : (
                    <FileText className="size-4" />
                  )}
                  Authoritative excerpt
                </div>
                <span className="font-mono text-[9px] text-muted-foreground">
                  SHA-256 {selected.hash}
                </span>
              </div>
              <blockquote className="px-5 py-6 font-editorial text-xl leading-8 text-foreground/85">
                {selected.content}
              </blockquote>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border p-4">
                <p className="flex items-center gap-2 text-xs font-medium">
                  <Braces className="size-4 text-evidence" />
                  Locator contract
                </p>
                <pre className="mt-3 overflow-x-auto whitespace-pre-wrap font-mono text-[10px] leading-5 text-muted-foreground">
                  {JSON.stringify(
                    selected.kind === "git"
                      ? {
                          kind: "git",
                          commit: "d9a80f7",
                          relativePath: "brief-v0.1.md",
                          startLine: 62,
                          endLine: 81,
                        }
                      : {
                          kind: "document",
                          startLine: 14,
                          endLine: 16,
                          textHash: selected.hash,
                        },
                    null,
                    2
                  )}
                </pre>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs font-medium">Sharing boundary</p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  The citation ID and governing rule can be exported. This
                  private excerpt and its absolute local path cannot.
                </p>
              </div>
            </div>
          </article>
        </ScrollArea>
      </div>
    </div>
  )
}
