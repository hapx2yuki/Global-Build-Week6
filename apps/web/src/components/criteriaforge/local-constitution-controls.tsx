"use client"

import * as React from "react"
import {
  AlertTriangle,
  Check,
  CircleDashed,
  Scale,
  ShieldCheck,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { LocalDraft } from "@/hooks/use-local-workspace"

function pendingCounts(draft: LocalDraft) {
  return {
    sections: draft.contract.sections.filter(
      (section) => section.approvalStatus !== "approved"
    ).length,
    criteria: draft.contract.criteria.filter(
      (criterion) => criterion.approvalStatus !== "approved"
    ).length,
    questions: draft.contract.openQuestions.filter(
      (question) =>
        question.impact === "material" && question.status !== "answered"
    ).length,
    contradictions: draft.contract.contradictions.filter(
      (item) =>
        item.material === true &&
        item.equalAuthority === true &&
        item.resolvedByHuman !== true
    ).length,
  }
}

export function LocalConstitutionControls({
  draft,
  busy,
  onApproveRules,
  onAnswerQuestion,
  onResolveContradiction,
}: {
  draft: LocalDraft
  busy: boolean
  onApproveRules: () => Promise<void>
  onAnswerQuestion: (questionId: string, answer: string) => Promise<void>
  onResolveContradiction: (
    contradictionId: string,
    answer: string
  ) => Promise<void>
}) {
  const counts = pendingCounts(draft)
  const question = draft.contract.openQuestions.find(
    (item) => item.impact === "material" && item.status !== "answered"
  )
  const contradiction = draft.contract.contradictions.find(
    (item) =>
      item.material === true &&
      item.equalAuthority === true &&
      item.resolvedByHuman !== true
  )
  const [answer, setAnswer] = React.useState("")
  const pending =
    counts.sections +
    counts.criteria +
    counts.questions +
    counts.contradictions

  return (
    <section className="border-b bg-card/95 px-4 py-3 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Live local draft r{draft.revision}</Badge>
            <Badge
              variant="outline"
              className={
                pending === 0
                  ? "border-approved/25 bg-approved/8 text-approved-foreground"
                  : "border-ember/25 bg-ember/7 text-ember-foreground"
              }
            >
              {pending === 0 ? <Check /> : <CircleDashed />}
              {pending === 0
                ? "All displayed decisions ratified"
                : `${pending} decisions remain`}
            </Badge>
          </div>
          {(counts.sections > 0 || counts.criteria > 0) && (
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => void onApproveRules()}
            >
              <ShieldCheck />
              Approve all displayed rules and examples
            </Button>
          )}
        </div>

        {(question || contradiction) && (
          <Alert className="border-ember/30 bg-ember/5">
            {contradiction ? <AlertTriangle /> : <Scale />}
            <AlertTitle>
              {contradiction
                ? String(contradiction.description)
                : String(question?.question)}
            </AlertTitle>
            <AlertDescription>
              {contradiction
                ? String(contradiction.recommendedHumanQuestion)
                : String(question?.reasonHumanMustDecide)}
            </AlertDescription>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Textarea
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                placeholder="Record the Constitution Owner’s decision in the source language…"
                className="min-h-20 bg-background"
              />
              <Button
                className="sm:self-end"
                disabled={busy || !answer.trim()}
                onClick={() => {
                  const operation = contradiction
                    ? onResolveContradiction(
                        String(contradiction.contradictionId),
                        answer.trim()
                      )
                    : onAnswerQuestion(
                        String(question?.questionId),
                        answer.trim()
                      )
                  void operation.then(() => setAnswer(""))
                }}
              >
                Record human decision
              </Button>
            </div>
          </Alert>
        )}
      </div>
    </section>
  )
}
