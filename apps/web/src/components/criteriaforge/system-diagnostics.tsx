import {
  Check,
  CircleAlert,
  Database,
  HardDrive,
  KeyRound,
  Laptop,
  LockKeyhole,
  ShieldCheck,
  Terminal,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { LocalDoctor } from "@/hooks/use-local-workspace"

export function SystemDiagnostics({
  demo,
  doctor,
}: {
  demo: boolean
  doctor: LocalDoctor | null
}) {
  const rows = demo
    ? [
        ["Runtime", "Public recorded demo", true, Laptop],
        ["Private storage", "Disabled", true, HardDrive],
        ["Codex execution", "Disabled", true, Terminal],
        ["Arbitrary upload", "Disabled", true, LockKeyhole],
      ]
    : [
        [
          "macOS 14+",
          doctor?.supportedPlatform ? "Supported" : "Check required",
          Boolean(doctor?.supportedPlatform),
          Laptop,
        ],
        [
          "Codex CLI",
          doctor?.codexVersion ?? "Not found",
          Boolean(doctor?.codexVersion),
          Terminal,
        ],
        [
          "ChatGPT OAuth",
          doctor?.codexLogin ?? "Status unavailable",
          Boolean(doctor?.codexLogin?.toLowerCase().includes("logged in")),
          KeyRound,
        ],
        [
          "SQLite",
          "WAL · foreign keys · private permissions",
          true,
          Database,
        ],
        [
          "FileVault",
          doctor?.fileVault ?? "Status unavailable",
          Boolean(doctor?.fileVault?.toLowerCase().includes("on")),
          ShieldCheck,
        ],
      ]
  return (
    <div className="space-y-5 p-5">
      <div>
        <h2 className="font-editorial text-2xl">System diagnostics</h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Diagnostic logs contain identifiers and states, never private evidence
          text or OAuth tokens.
        </p>
      </div>
      <Separator />
      <div className="space-y-1">
        {rows.map(([label, value, passed, icon]) => {
          const Icon = icon as typeof Laptop
          return (
            <div
              key={String(label)}
              className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-2 rounded-md px-2 py-3 hover:bg-muted/35"
            >
              <Icon className="size-4 text-muted-foreground" />
              <div>
                <p className="text-xs font-medium">{String(label)}</p>
                <p className="mt-0.5 break-words font-mono text-[9px] text-muted-foreground">
                  {String(value)}
                </p>
              </div>
              <Badge
                variant="outline"
                className={
                  passed
                    ? "border-approved/25 text-approved-foreground"
                    : "border-ember/25 text-ember-foreground"
                }
              >
                {passed ? <Check /> : <CircleAlert />}
                {passed ? "Ready" : "Review"}
              </Badge>
            </div>
          )
        })}
      </div>
      {!demo && doctor?.storageRoot && (
        <div className="rounded-lg border bg-muted/25 p-3">
          <p className="flex items-center gap-2 text-xs font-medium">
            <HardDrive className="size-4" />
            Private storage root
          </p>
          <p className="mt-2 break-all font-mono text-[9px] leading-5 text-muted-foreground">
            {doctor.storageRoot}
          </p>
        </div>
      )}
    </div>
  )
}
