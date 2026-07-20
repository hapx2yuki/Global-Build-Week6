"use client"

import * as React from "react"
import {
  Check,
  Copy,
  MoreHorizontal,
  PencilLine,
  RotateCcw,
  Save,
  X,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { ConstitutionSection } from "@/lib/criteriaforge-data"
import {
  ProvenanceBadge,
  ProvenanceDot,
} from "@/components/criteriaforge/provenance"

export function ConstitutionDocument({
  sections,
  onSectionsChange,
  selectedSection,
  onSelectSection,
  proposedApproved,
  onSaveSection,
}: {
  sections: ConstitutionSection[]
  onSectionsChange: (sections: ConstitutionSection[]) => void
  selectedSection: string
  onSelectSection: (id: string) => void
  proposedApproved: boolean
  onSaveSection?: (sectionId: string, originalText: string) => Promise<void>
}) {
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [draft, setDraft] = React.useState("")
  const [saving, setSaving] = React.useState(false)

  function startEditing(section: ConstitutionSection) {
    setEditingId(section.id)
    setDraft(section.summary)
  }

  async function saveEditing(sectionId: string) {
    const originalText = draft.trim()
    if (!originalText) return
    setSaving(true)
    try {
      await onSaveSection?.(sectionId, originalText)
      onSectionsChange(
        sections.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                summary: originalText,
                provenance: "human",
                provenanceLabel: "Human edited",
                source: "Direct owner edit · H-31",
                date: "Jul 21, 2026",
                status: "approved",
              }
            : section
        )
      )
      setEditingId(null)
    } finally {
      setSaving(false)
    }
  }

  return (
    <article
      aria-labelledby="constitution-title"
      className="constitution-paper min-h-full px-5 py-8 sm:px-9 sm:py-10 lg:px-12"
    >
      <header className="mx-auto max-w-4xl border-b border-foreground/16 pb-8">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Product Constitution
            </p>
            <h1
              id="constitution-title"
              className="mt-3 max-w-2xl font-editorial text-4xl leading-[0.95] tracking-[-0.035em] text-balance sm:text-5xl"
            >
              CriteriaForge
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
              Turn human intent into an executable product constitution—then
              verify that what Codex built is what you actually meant.
            </p>
          </div>
          <div className="flex shrink-0 items-start gap-2 sm:flex-col sm:items-end">
            <Badge
              variant="outline"
              className="border-foreground/15 bg-background/65 font-mono text-[10px]"
            >
              v0.3 · draft
            </Badge>
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
              Updated Jul 21, 2026
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl">
        {sections.map((section) => {
          const isSelected = selectedSection === section.id
          const isEditing = editingId === section.id
          const isApproved =
            section.status === "approved" ||
            (section.id === "uncertainty" && proposedApproved)

          return (
            <section
              id={`section-${section.id}`}
              key={section.id}
              aria-labelledby={`heading-${section.id}`}
              className={cn(
                "group/section relative grid scroll-mt-20 grid-cols-[2rem_minmax(0,1fr)] gap-x-3 border-b border-foreground/12 py-6 transition-colors sm:grid-cols-[3.5rem_minmax(0,1fr)_11rem] sm:gap-x-5",
                isSelected && "bg-foreground/[0.025]",
                !isApproved &&
                  "ai-proposal -mx-3 rounded-lg border border-dashed border-ember/35 px-3"
              )}
              onClick={() => onSelectSection(section.id)}
            >
              <div className="pt-0.5 font-editorial text-lg tabular-nums text-muted-foreground/60">
                {section.number}
              </div>
              <div className="min-w-0">
                <div className="flex items-start gap-3">
                  <ProvenanceDot kind={isApproved ? section.provenance : "ai"} className="mt-1.5" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h2
                        id={`heading-${section.id}`}
                        className={cn(
                          "font-editorial text-xl leading-tight tracking-[-0.02em]",
                          !isApproved && "text-ember-foreground"
                        )}
                      >
                        {section.title}
                      </h2>
                      <DropdownMenu>
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <DropdownMenuTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label={`Actions for ${section.title}`}
                                    className="opacity-0 transition-opacity group-hover/section:opacity-100 group-focus-within/section:opacity-100"
                                  />
                                }
                              />
                            }
                          >
                            <MoreHorizontal />
                          </TooltipTrigger>
                          <TooltipContent>Section actions</TooltipContent>
                        </Tooltip>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => startEditing(section)}
                          >
                            <PencilLine />
                            Edit directly
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Copy />
                            Copy section link
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <RotateCcw />
                            Review history
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {isEditing ? (
                      <div
                        className="mt-3 space-y-2"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Textarea
                          value={draft}
                          onChange={(event) => setDraft(event.target.value)}
                          aria-label={`Edit ${section.title}`}
                          className="min-h-28 bg-background/80 leading-6"
                          autoFocus
                        />
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            disabled={saving}
                            onClick={() => void saveEditing(section.id)}
                          >
                            <Save />
                            Save meaning
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingId(null)}
                          >
                            <X />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="mt-2 max-w-2xl text-[13px] leading-6 text-foreground/78">
                          {section.summary}
                        </p>
                        {isSelected && (
                          <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                            <p className="mt-3 border-l border-foreground/15 pl-4 text-xs leading-5 text-muted-foreground">
                              {section.detail}
                            </p>
                            <Button
                              variant="ghost"
                              size="xs"
                              className="mt-3"
                              onClick={(event) => {
                                event.stopPropagation()
                                startEditing(section)
                              }}
                            >
                              <PencilLine />
                              Edit directly
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="col-start-2 mt-4 min-w-0 sm:col-start-3 sm:row-start-1 sm:mt-0">
                <div className="provenance-thread flex items-center gap-2 sm:justify-end">
                  <ProvenanceBadge
                    kind={isApproved ? section.provenance : "ai"}
                    source={section.source}
                    date={section.date}
                    approved={isApproved}
                    compact
                  />
                  <div className="min-w-0 text-left sm:text-right">
                    <p className="truncate font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground">
                      {section.source}
                    </p>
                    <p className="mt-0.5 font-mono text-[9px] text-muted-foreground/70">
                      {section.date}
                    </p>
                  </div>
                  {isApproved && (
                    <Check className="size-3.5 shrink-0 text-approved" />
                  )}
                </div>
              </div>
            </section>
          )
        })}
      </div>
    </article>
  )
}
