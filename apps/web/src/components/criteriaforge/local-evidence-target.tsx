"use client"

import * as React from "react"
import {
  ArrowRight,
  FileCheck2,
  FolderGit2,
  LockKeyhole,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { LocalConstitutionState } from "@/hooks/use-local-workspace"
import type { UiLocale } from "@/lib/criteriaforge/ui-types"

export function LocalEvidenceTarget({
  locale,
  target,
  busy,
  onImport,
  onContinue,
}: {
  locale: UiLocale
  target: LocalConstitutionState["targets"][number] | null
  busy: boolean
  onImport: (repositoryPath: string) => Promise<void>
  onContinue: () => void
}) {
  const [repositoryPath, setRepositoryPath] = React.useState("")
  const title =
    locale === "ja"
      ? "評価するGit成果物の版を固定する"
      : "Freeze the Git artifact that will be evaluated"

  return (
    <div className="h-full overflow-y-auto">
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-7 sm:py-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ember-foreground">
          04 · Evidence inspection
        </p>
        <h1 className="mt-3 max-w-3xl font-editorial text-4xl tracking-[-0.035em] sm:text-5xl">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
          CriteriaForge records the current commit, branch, dirty-state hash,
          included text files, and default exclusions. It does not fetch or
          push a remote.
        </p>

        <section className="mt-8 rounded-xl border bg-card p-5">
          <Label htmlFor="repository-path">Absolute local repository path</Label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <Input
              id="repository-path"
              value={repositoryPath}
              onChange={(event) => setRepositoryPath(event.target.value)}
              placeholder="/Users/you/Projects/product"
              disabled={busy}
            />
            <Button
              disabled={busy || !repositoryPath.trim()}
              onClick={() => void onImport(repositoryPath.trim())}
            >
              <FolderGit2 />
              {busy ? "Indexing locally…" : "Freeze Git snapshot"}
            </Button>
          </div>
        </section>

        {target ? (
          <section className="mt-6 overflow-hidden rounded-xl border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
              <div>
                <h2 className="font-editorial text-2xl">Fixed target snapshot</h2>
                <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                  {target.contentHash}
                </p>
              </div>
              <Badge className="border-approved/25 bg-approved/8 text-approved-foreground">
                <FileCheck2 />
                Ready
              </Badge>
            </div>
            <dl className="grid gap-px bg-border sm:grid-cols-2">
              {[
                ["Commit", String(target.snapshot.head ?? "Unavailable")],
                ["Branch", String(target.snapshot.branch ?? "Unavailable")],
                [
                  "Dirty state",
                  target.snapshot.dirty ? "Captured with hash" : "Clean",
                ],
                [
                  "Indexed segments",
                  String(target.snapshot.indexedTextSegments ?? 0),
                ],
              ].map(([label, value]) => (
                <div key={label} className="bg-card p-4">
                  <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                    {label}
                  </dt>
                  <dd className="mt-1 break-all text-xs">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : (
          <Alert className="mt-6">
            <LockKeyhole />
            <AlertTitle>No target version has been fixed</AlertTitle>
            <AlertDescription>
              Formal evaluation cannot start until the artifact identity is
              immutable for the duration of all three runs.
            </AlertDescription>
          </Alert>
        )}

        <div className="mt-7 flex justify-end">
          <Button disabled={!target} onClick={onContinue}>
            Review evaluation send
            <ArrowRight />
          </Button>
        </div>
      </main>
    </div>
  )
}
