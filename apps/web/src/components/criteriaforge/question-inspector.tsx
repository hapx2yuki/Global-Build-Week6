"use client"

import * as React from "react"
import {
  ArrowRight,
  Bot,
  Check,
  FileText,
  LockKeyhole,
  MessageSquareText,
  ShieldCheck,
} from "lucide-react"

import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

const answers = [
  {
    value: "private",
    label: "Keep private evidence local by default",
    description:
      "Share only the ratified constitution and approved citations with Codex.",
    recommended: true,
  },
  {
    value: "approved-excerpts",
    label: "Share every approved excerpt",
    description:
      "Portable, but more source material may enter Git history.",
    recommended: false,
  },
  {
    value: "all",
    label: "Share the full evidence store",
    description:
      "Simpler model, but it breaks the local-first privacy promise.",
    recommended: false,
  },
]

export function QuestionInspector({
  approved,
  onApprove,
  onCompile,
}: {
  approved: boolean
  onApprove: () => void
  onCompile: () => void
}) {
  const [answer, setAnswer] = React.useState("private")
  const [showNote, setShowNote] = React.useState(false)

  return (
    <aside
      aria-labelledby="open-question-heading"
      className="flex h-full min-h-0 flex-col bg-card"
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="border-b px-5 py-5">
          <div className="flex items-center justify-between gap-4">
            <Badge
              variant="outline"
              className={cn(
                "gap-1.5 font-mono text-[9px] uppercase tracking-[0.12em]",
                approved
                  ? "border-approved/25 bg-approved/8 text-approved-foreground"
                  : "border-ember/30 bg-ember/7 text-ember-foreground"
              )}
            >
              {approved ? <Check /> : <Bot />}
              {approved ? "Owner ratified" : "AI proposed · Q-17"}
            </Badge>
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
              High impact
            </span>
          </div>
          <h2
            id="open-question-heading"
            className="mt-5 font-editorial text-2xl leading-[1.15] tracking-[-0.025em] text-balance"
          >
            Should private source evidence stay local when the constitution is
            shared?
          </h2>
        </div>

        <div className="space-y-6 px-5 py-5">
          <section aria-labelledby="why-heading">
            <div className="flex items-center gap-2">
              <MessageSquareText className="size-4 text-muted-foreground" />
              <h3 id="why-heading" className="text-xs font-semibold">
                Why this matters
              </h3>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              This choice controls what can enter Git history, what Codex may
              read, and whether the local-first privacy promise is credible.
            </p>
          </section>

          <Separator />

          <Field>
            <FieldLabel>Choose the governing rule</FieldLabel>
            <FieldDescription>
              The recommendation follows your approved information policy.
            </FieldDescription>
            <RadioGroup
              value={answer}
              onValueChange={(value) => setAnswer(value as string)}
              className="mt-3"
            >
              {answers.map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    "relative flex cursor-pointer gap-3 rounded-lg border px-3.5 py-3 transition-colors hover:bg-muted/55 has-[[data-checked]]:border-foreground/25 has-[[data-checked]]:bg-muted/45",
                    option.recommended &&
                      "border-ember/25 bg-ember/[0.035]"
                  )}
                >
                  <RadioGroupItem value={option.value} className="mt-0.5" />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 text-xs font-medium">
                      {option.label}
                      {option.recommended && (
                        <Badge
                          variant="outline"
                          className="border-ember/25 bg-ember/7 font-mono text-[8px] uppercase tracking-[0.1em] text-ember-foreground"
                        >
                          Recommended
                        </Badge>
                      )}
                    </span>
                    <span className="mt-1 block text-[11px] leading-4.5 text-muted-foreground">
                      {option.description}
                    </span>
                  </span>
                </label>
              ))}
            </RadioGroup>
          </Field>

          {showNote && (
            <Field className="animate-in fade-in slide-in-from-top-1">
              <FieldLabel htmlFor="decision-note">
                Add a decision note
              </FieldLabel>
              <Textarea
                id="decision-note"
                placeholder="Explain an exception or constraint…"
                className="min-h-24"
              />
            </Field>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={onApprove}
              disabled={approved}
              className="bg-ember text-ember-foreground-inverse hover:bg-ember/85"
            >
              {approved ? <Check /> : <ShieldCheck />}
              {approved ? "Recommendation approved" : "Approve recommendation"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowNote((value) => !value)}
            >
              {showNote ? "Hide note" : "Add context"}
            </Button>
          </div>

          <Separator />

          <section aria-labelledby="sources-heading">
            <div className="flex items-center justify-between gap-4">
              <h3 id="sources-heading" className="text-xs font-semibold">
                Sources considered
              </h3>
              <Badge variant="secondary" className="font-mono text-[9px]">
                3
              </Badge>
            </div>
            <AttachmentGroup className="mt-3 flex-col overflow-visible">
              <Attachment size="sm" className="w-full">
                <AttachmentMedia>
                  <FileText />
                </AttachmentMedia>
                <AttachmentContent>
                  <AttachmentTitle>Privacy decision</AttachmentTitle>
                  <AttachmentDescription>
                    Owner statement · H-26
                  </AttachmentDescription>
                </AttachmentContent>
              </Attachment>
              <Attachment size="sm" className="w-full">
                <AttachmentMedia>
                  <LockKeyhole />
                </AttachmentMedia>
                <AttachmentContent>
                  <AttachmentTitle>Evidence policy</AttachmentTitle>
                  <AttachmentDescription>
                    Compiled source · S-27
                  </AttachmentDescription>
                </AttachmentContent>
              </Attachment>
              <Attachment size="sm" className="w-full">
                <AttachmentMedia>
                  <ShieldCheck />
                </AttachmentMedia>
                <AttachmentContent>
                  <AttachmentTitle>Git boundary</AttachmentTitle>
                  <AttachmentDescription>
                    Permission rule · S-31
                  </AttachmentDescription>
                </AttachmentContent>
              </Attachment>
            </AttachmentGroup>
          </section>
        </div>
      </div>

      <div className="border-t bg-background/92 p-4 backdrop-blur">
        <Button
          size="lg"
          className={cn(
            "h-11 w-full justify-between px-4",
            approved
              ? "bg-ember text-ember-foreground-inverse hover:bg-ember/85"
              : "bg-foreground text-background hover:bg-foreground/85"
          )}
          onClick={onCompile}
        >
          <span>{approved ? "Review and compile" : "Review compile blocker"}</span>
          <ArrowRight />
        </Button>
        <p className="mt-2 text-center font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
          {approved
            ? "All five safeguards satisfied"
            : "One material clause awaits ratification"}
        </p>
      </div>
    </aside>
  )
}
