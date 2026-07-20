import {
  Bot,
  CircleCheck,
  FileText,
  type LucideIcon,
  UserRound,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { cn } from "@/lib/utils"
import type { ProvenanceKind } from "@/lib/criteriaforge-data"

const provenanceConfig: Record<
  ProvenanceKind,
  {
    icon: LucideIcon
    label: string
    dotClassName: string
    badgeClassName: string
  }
> = {
  human: {
    icon: UserRound,
    label: "Human approved",
    dotClassName: "bg-foreground",
    badgeClassName: "border-foreground/15 bg-foreground/5 text-foreground",
  },
  source: {
    icon: FileText,
    label: "Source extracted",
    dotClassName: "bg-evidence",
    badgeClassName:
      "border-evidence/20 bg-evidence/7 text-evidence-foreground",
  },
  ai: {
    icon: Bot,
    label: "AI proposed",
    dotClassName: "border-2 border-ember bg-transparent",
    badgeClassName:
      "border-ember/30 bg-ember/7 text-ember-foreground border-dashed",
  },
}

export function ProvenanceDot({
  kind,
  className,
}: {
  kind: ProvenanceKind
  className?: string
}) {
  const config = provenanceConfig[kind]

  return (
    <span
      aria-label={config.label}
      className={cn("inline-block size-2.5 shrink-0 rounded-full", config.dotClassName, className)}
    />
  )
}

export function ProvenanceBadge({
  kind,
  source,
  date,
  approved,
  compact = false,
}: {
  kind: ProvenanceKind
  source: string
  date: string
  approved: boolean
  compact?: boolean
}) {
  const config = provenanceConfig[kind]
  const Icon = config.icon

  return (
    <HoverCard>
      <HoverCardTrigger
        render={
          <button
            type="button"
            className="rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        }
      >
        <Badge
          variant="outline"
          className={cn(
            "gap-1 font-normal",
            config.badgeClassName,
            compact && "size-6 justify-center px-0"
          )}
        >
          <Icon className="size-3" />
          {!compact && config.label}
        </Badge>
      </HoverCardTrigger>
      <HoverCardContent side="right" align="start" className="w-72">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
              config.badgeClassName
            )}
          >
            <Icon className="size-4" />
          </span>
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium">{config.label}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {source}
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              {date}
            </p>
            <div className="flex items-center gap-1 pt-1 text-xs">
              <CircleCheck
                className={cn(
                  "size-3.5",
                  approved ? "text-approved" : "text-muted-foreground"
                )}
              />
              {approved ? "Ratified by the owner" : "Awaiting owner ratification"}
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}

export function ProvenanceLegend() {
  return (
    <div className="space-y-2.5 text-xs text-sidebar-foreground/70">
      {(Object.keys(provenanceConfig) as ProvenanceKind[]).map((kind) => (
        <div key={kind} className="flex items-center gap-2">
          <ProvenanceDot kind={kind} />
          <span>{provenanceConfig[kind].label}</span>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <span className="w-3 border-t border-dashed border-sidebar-foreground/35" />
        <span>Provenance thread</span>
      </div>
    </div>
  )
}
