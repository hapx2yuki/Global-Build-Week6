import { type Static, Type } from "@sinclair/typebox"

const Identifier = Type.String({
  minLength: 1,
  maxLength: 160,
  pattern: "^[A-Za-z0-9][A-Za-z0-9._:-]*$",
})

const Sha256 = Type.String({ pattern: "^[a-f0-9]{64}$" })
const IsoDateTime = Type.String({ format: "date-time" })

export const ConstitutionSectionKeySchema = Type.Union([
  Type.Literal("purpose"),
  Type.Literal("experience"),
  Type.Literal("scope"),
  Type.Literal("must_pass"),
  Type.Literal("quality"),
  Type.Literal("evidence"),
  Type.Literal("examples"),
  Type.Literal("stop_conditions"),
])
export type ConstitutionSectionKey = Static<
  typeof ConstitutionSectionKeySchema
>

export const CONSTITUTION_SECTION_KEYS: readonly ConstitutionSectionKey[] = [
  "purpose",
  "experience",
  "scope",
  "must_pass",
  "quality",
  "evidence",
  "examples",
  "stop_conditions",
]

export const ProvenanceSchema = Type.Union([
  Type.Literal("human_approved"),
  Type.Literal("source_extracted"),
  Type.Literal("ai_proposed"),
])
export type Provenance = Static<typeof ProvenanceSchema>

export const ApprovalStatusSchema = Type.Union([
  Type.Literal("approved"),
  Type.Literal("pending"),
  Type.Literal("rejected"),
  Type.Literal("deferred"),
])
export type ApprovalStatus = Static<typeof ApprovalStatusSchema>

export const ImportanceSchema = Type.Union([
  Type.Literal("material"),
  Type.Literal("important"),
  Type.Literal("supporting"),
])

export const AuthoritySchema = Type.Object(
  {
    rank: Type.Integer({ minimum: 0, maximum: 100 }),
    label: Type.String({ minLength: 1, maxLength: 160 }),
    decidedBy: Type.Union([Type.Literal("human"), Type.Literal("source")]),
  },
  { additionalProperties: false }
)

export const EvidenceLocatorSchema = Type.Union([
  Type.Object(
    {
      kind: Type.Literal("document"),
      paragraph: Type.Optional(Type.Integer({ minimum: 1 })),
      startLine: Type.Integer({ minimum: 1 }),
      endLine: Type.Integer({ minimum: 1 }),
      startCharacter: Type.Optional(Type.Integer({ minimum: 0 })),
      endCharacter: Type.Optional(Type.Integer({ minimum: 0 })),
      textHash: Sha256,
    },
    { additionalProperties: false }
  ),
  Type.Object(
    {
      kind: Type.Literal("pdf"),
      page: Type.Integer({ minimum: 1 }),
      rectangle: Type.Array(Type.Number(), {
        minItems: 4,
        maxItems: 4,
      }),
      textHash: Sha256,
    },
    { additionalProperties: false }
  ),
  Type.Object(
    {
      kind: Type.Literal("slide"),
      slide: Type.Integer({ minimum: 1 }),
      elementId: Type.String({ minLength: 1, maxLength: 240 }),
    },
    { additionalProperties: false }
  ),
  Type.Object(
    {
      kind: Type.Literal("spreadsheet"),
      sheet: Type.String({ minLength: 1, maxLength: 240 }),
      cellRange: Type.String({
        minLength: 2,
        maxLength: 240,
        pattern: "^[^!]+![A-Z]+[0-9]+(?::[A-Z]+[0-9]+)?$",
      }),
      formulaHash: Type.Optional(Sha256),
      displayValueHash: Sha256,
    },
    { additionalProperties: false }
  ),
  Type.Object(
    {
      kind: Type.Literal("image"),
      imageId: Identifier,
      rectangle: Type.Array(Type.Number(), {
        minItems: 4,
        maxItems: 4,
      }),
      ocrTextHash: Type.Optional(Sha256),
    },
    { additionalProperties: false }
  ),
  Type.Object(
    {
      kind: Type.Literal("video"),
      startSeconds: Type.Number({ minimum: 0 }),
      endSeconds: Type.Number({ minimum: 0 }),
      frameId: Identifier,
      subtitleId: Type.Optional(Identifier),
    },
    { additionalProperties: false }
  ),
  Type.Object(
    {
      kind: Type.Literal("git"),
      commit: Type.String({ minLength: 7, maxLength: 64 }),
      relativePath: Type.String({ minLength: 1, maxLength: 2048 }),
      startLine: Type.Integer({ minimum: 1 }),
      endLine: Type.Integer({ minimum: 1 }),
      textHash: Sha256,
    },
    { additionalProperties: false }
  ),
  Type.Object(
    {
      kind: Type.Literal("web"),
      observationId: Identifier,
      step: Type.Integer({ minimum: 1 }),
      url: Type.String({ format: "uri", maxLength: 4096 }),
      element: Type.String({ minLength: 1, maxLength: 2048 }),
      screenshotHash: Sha256,
    },
    { additionalProperties: false }
  ),
  Type.Object(
    {
      kind: Type.Literal("unavailable"),
      reason: Type.String({ minLength: 1, maxLength: 1000 }),
      requiredPermission: Type.Optional(
        Type.String({ minLength: 1, maxLength: 500 })
      ),
      recovery: Type.String({ minLength: 1, maxLength: 1000 }),
    },
    { additionalProperties: false }
  ),
])
export type EvidenceLocator = Static<typeof EvidenceLocatorSchema>

export const CitationSchema = Type.Object(
  {
    citationId: Identifier,
    sourceId: Identifier,
    segmentId: Identifier,
    locator: EvidenceLocatorSchema,
    contentHash: Sha256,
    verified: Type.Boolean(),
    verificationFailure: Type.Optional(
      Type.String({ minLength: 1, maxLength: 1000 })
    ),
    shareable: Type.Boolean(),
  },
  { additionalProperties: false }
)
export type Citation = Static<typeof CitationSchema>

export const BoundaryExampleSchema = Type.Object(
  {
    exampleId: Identifier,
    kind: Type.Union([
      Type.Literal("good"),
      Type.Literal("bad"),
      Type.Literal("boundary"),
    ]),
    originalLanguage: Type.String({ minLength: 2, maxLength: 35 }),
    originalText: Type.String({ minLength: 1, maxLength: 20_000 }),
    referenceTranslation: Type.Optional(
      Type.String({ minLength: 1, maxLength: 20_000 })
    ),
    expectedOutcome: Type.String({ minLength: 1, maxLength: 20_000 }),
    ratified: Type.Boolean(),
  },
  { additionalProperties: false }
)
export type BoundaryExample = Static<typeof BoundaryExampleSchema>

export const EvidenceRequirementSchema = Type.Object(
  {
    allowedKinds: Type.Array(
      Type.Union([
        Type.Literal("document"),
        Type.Literal("pdf"),
        Type.Literal("slide"),
        Type.Literal("spreadsheet"),
        Type.Literal("image"),
        Type.Literal("video"),
        Type.Literal("git"),
        Type.Literal("web"),
      ]),
      { minItems: 1, uniqueItems: true }
    ),
    minimumCount: Type.Integer({ minimum: 1, maximum: 100 }),
    missingEvidence: Type.Union([
      Type.Literal("block"),
      Type.Literal("human_review"),
      Type.Literal("not_met"),
    ]),
    contradictoryEvidence: Type.Union([
      Type.Literal("block"),
      Type.Literal("human_resolves"),
    ]),
  },
  { additionalProperties: false }
)

export const QualityDefinitionsSchema = Type.Object(
  {
    insufficient: Type.String({ minLength: 1, maxLength: 10_000 }),
    minimum: Type.String({ minLength: 1, maxLength: 10_000 }),
    good: Type.String({ minLength: 1, maxLength: 10_000 }),
    exceptional: Type.String({ minLength: 1, maxLength: 10_000 }),
  },
  { additionalProperties: false }
)

export const CriterionSchema = Type.Object(
  {
    criterionId: Identifier,
    name: Type.String({ minLength: 1, maxLength: 300 }),
    definition: Type.String({ minLength: 1, maxLength: 20_000 }),
    kind: Type.Union([Type.Literal("must_pass"), Type.Literal("quality")]),
    appliesWhen: Type.String({ minLength: 1, maxLength: 10_000 }),
    excludedWhen: Type.String({ minLength: 1, maxLength: 10_000 }),
    observableExpectation: Type.String({ minLength: 1, maxLength: 20_000 }),
    evidenceRequirement: EvidenceRequirementSchema,
    minimumBoundary: Type.String({ minLength: 1, maxLength: 10_000 }),
    qualityDefinitions: QualityDefinitionsSchema,
    examples: Type.Array(BoundaryExampleSchema, { minItems: 1 }),
    owner: Type.String({ minLength: 1, maxLength: 240 }),
    approvalStatus: ApprovalStatusSchema,
    provenance: ProvenanceSchema,
    dependencies: Type.Array(Identifier, { uniqueItems: true }),
    originalLanguage: Type.String({ minLength: 2, maxLength: 35 }),
    authority: AuthoritySchema,
    meaningHash: Sha256,
  },
  { additionalProperties: false }
)
export type Criterion = Static<typeof CriterionSchema>

export const ConstitutionSectionSchema = Type.Object(
  {
    sectionId: Identifier,
    key: ConstitutionSectionKeySchema,
    originalLanguage: Type.String({ minLength: 2, maxLength: 35 }),
    originalText: Type.String({ minLength: 1, maxLength: 100_000 }),
    referenceTranslation: Type.Optional(
      Type.String({ minLength: 1, maxLength: 100_000 })
    ),
    provenance: ProvenanceSchema,
    sourceIds: Type.Array(Identifier, { uniqueItems: true }),
    authority: AuthoritySchema,
    importance: ImportanceSchema,
    approvalStatus: ApprovalStatusSchema,
    citationIds: Type.Array(Identifier, { uniqueItems: true }),
    dependentCriterionIds: Type.Array(Identifier, { uniqueItems: true }),
    meaningHash: Sha256,
    lastEditedBy: Type.String({ minLength: 1, maxLength: 240 }),
    lastEditedAt: IsoDateTime,
  },
  { additionalProperties: false }
)
export type ConstitutionSection = Static<typeof ConstitutionSectionSchema>

export const ProductConstitutionSchema = Type.Object(
  {
    schemaVersion: Type.Literal("1.0.0"),
    constitutionId: Identifier,
    workspaceId: Identifier,
    version: Type.String({ pattern: "^[0-9]+\\.[0-9]+$" }),
    immutable: Type.Literal(true),
    sourceLanguage: Type.String({ minLength: 2, maxLength: 35 }),
    sections: Type.Array(ConstitutionSectionSchema, {
      minItems: 8,
      maxItems: 8,
    }),
    criteria: Type.Array(CriterionSchema, { minItems: 1 }),
    citations: Type.Array(CitationSchema),
    parentVersionId: Type.Optional(Identifier),
    contentHash: Sha256,
    createdAt: IsoDateTime,
    createdBy: Type.String({ minLength: 1, maxLength: 240 }),
  },
  {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://criteriaforge.dev/schemas/constitution.schema.json",
    additionalProperties: false,
  }
)
export type ProductConstitution = Static<typeof ProductConstitutionSchema>

export const OpenQuestionSchema = Type.Object(
  {
    questionId: Identifier,
    question: Type.String({ minLength: 1, maxLength: 20_000 }),
    reasonHumanMustDecide: Type.String({ minLength: 1, maxLength: 20_000 }),
    impact: ImportanceSchema,
    affectedSectionIds: Type.Array(Identifier, { minItems: 1 }),
    sourceCitationIds: Type.Array(Identifier, { uniqueItems: true }),
  },
  { additionalProperties: false }
)

export const ContradictionSchema = Type.Object(
  {
    contradictionId: Identifier,
    description: Type.String({ minLength: 1, maxLength: 20_000 }),
    material: Type.Boolean(),
    leftCitationIds: Type.Array(Identifier, { minItems: 1 }),
    rightCitationIds: Type.Array(Identifier, { minItems: 1 }),
    equalAuthority: Type.Boolean(),
    recommendedHumanQuestion: Type.String({
      minLength: 1,
      maxLength: 20_000,
    }),
  },
  { additionalProperties: false }
)

const ProposedSectionSchema = Type.Omit(ConstitutionSectionSchema, [
  "meaningHash",
  "lastEditedBy",
  "lastEditedAt",
])
const ProposedCriterionSchema = Type.Omit(CriterionSchema, ["meaningHash"])

export const DraftGenerationSchema = Type.Object(
  {
    sections: Type.Array(ProposedSectionSchema, {
      minItems: 8,
      maxItems: 8,
    }),
    criteria: Type.Array(ProposedCriterionSchema, { minItems: 1 }),
    openQuestions: Type.Array(OpenQuestionSchema),
    contradictions: Type.Array(ContradictionSchema),
  },
  {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://criteriaforge.dev/schemas/draft-generation.schema.json",
    additionalProperties: false,
  }
)
export type DraftGeneration = Static<typeof DraftGenerationSchema>

export const CalibrationCaseResultSchema = Type.Object(
  {
    criterionId: Identifier,
    exampleId: Identifier,
    predictedKind: Type.Union([
      Type.Literal("good"),
      Type.Literal("bad"),
      Type.Literal("boundary"),
    ]),
    explanation: Type.String({ minLength: 1, maxLength: 20_000 }),
    uncertainty: Type.String({ maxLength: 10_000 }),
  },
  { additionalProperties: false }
)
export type CalibrationCaseResult = Static<
  typeof CalibrationCaseResultSchema
>

export const CalibrationGenerationSchema = Type.Object(
  {
    cases: Type.Array(CalibrationCaseResultSchema, { minItems: 1 }),
  },
  {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://criteriaforge.dev/schemas/calibration-generation.schema.json",
    additionalProperties: false,
  }
)
export type CalibrationGeneration = Static<
  typeof CalibrationGenerationSchema
>

export const QualityLevelSchema = Type.Union([
  Type.Literal("insufficient"),
  Type.Literal("minimum"),
  Type.Literal("good"),
  Type.Literal("exceptional"),
])
export type QualityLevel = Static<typeof QualityLevelSchema>

export const EvaluationItemSchema = Type.Object(
  {
    criterionId: Identifier,
    intent: Type.String({ minLength: 1, maxLength: 30_000 }),
    observed: Type.String({ minLength: 1, maxLength: 30_000 }),
    evidence: Type.Array(CitationSchema),
    gap: Type.String({ minLength: 1, maxLength: 30_000 }),
    applicability: Type.Union([
      Type.Literal("applicable"),
      Type.Literal("not_applicable"),
      Type.Literal("uncertain"),
    ]),
    applicabilityReason: Type.String({ minLength: 1, maxLength: 10_000 }),
    evidenceStatus: Type.Union([
      Type.Literal("sufficient"),
      Type.Literal("missing"),
      Type.Literal("weak"),
      Type.Literal("conflicting"),
      Type.Literal("unavailable"),
    ]),
    mustPass: Type.Union([
      Type.Literal("pass"),
      Type.Literal("fail"),
      Type.Literal("not_applicable"),
      Type.Literal("undetermined"),
    ]),
    qualityLevel: Type.Optional(QualityLevelSchema),
    uncertainty: Type.String({ maxLength: 10_000 }),
    remediationPriority: Type.Union([
      Type.Literal("none"),
      Type.Literal("low"),
      Type.Literal("medium"),
      Type.Literal("high"),
      Type.Literal("critical"),
    ]),
  },
  { additionalProperties: false }
)
export type EvaluationItem = Static<typeof EvaluationItemSchema>

export const EvaluationGenerationSchema = Type.Object(
  {
    items: Type.Array(EvaluationItemSchema, { minItems: 1 }),
  },
  {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://criteriaforge.dev/schemas/evaluation-generation.schema.json",
    additionalProperties: false,
  }
)
export type EvaluationGeneration = Static<typeof EvaluationGenerationSchema>

export const EvaluationRunSchema = Type.Object(
  {
    runId: Identifier,
    constitutionVersionId: Identifier,
    targetSnapshotId: Identifier,
    modelId: Type.String({ minLength: 1, maxLength: 240 }),
    reasoningEffort: Type.String({ minLength: 1, maxLength: 100 }),
    codexVersion: Type.String({ minLength: 1, maxLength: 100 }),
    promptVersion: Type.String({ minLength: 1, maxLength: 100 }),
    schemaVersion: Type.Literal("1.0.0"),
    items: Type.Array(EvaluationItemSchema, { minItems: 1 }),
    startedAt: IsoDateTime,
    completedAt: IsoDateTime,
  },
  {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://criteriaforge.dev/schemas/evaluation.schema.json",
    additionalProperties: false,
  }
)
export type EvaluationRun = Static<typeof EvaluationRunSchema>

export const RemediationBriefSchema = Type.Object(
  {
    remediationId: Identifier,
    constitutionVersionId: Identifier,
    targetSnapshotId: Identifier,
    criterionIds: Type.Array(Identifier, { minItems: 1, uniqueItems: true }),
    gaps: Type.Array(
      Type.Object(
        {
          criterionId: Identifier,
          intent: Type.String({ minLength: 1, maxLength: 30_000 }),
          observed: Type.String({ minLength: 1, maxLength: 30_000 }),
          evidence: Type.Array(CitationSchema),
          gap: Type.String({ minLength: 1, maxLength: 30_000 }),
        },
        { additionalProperties: false }
      ),
      { minItems: 1 }
    ),
    allowedFiles: Type.Array(Type.String({ minLength: 1, maxLength: 2048 }), {
      minItems: 1,
      uniqueItems: true,
    }),
    forbiddenPaths: Type.Array(
      Type.String({ minLength: 1, maxLength: 2048 }),
      { uniqueItems: true }
    ),
    allowedCommands: Type.Array(
      Type.Array(Type.String({ minLength: 1, maxLength: 1000 }), {
        minItems: 1,
      })
    ),
    acceptanceConditions: Type.Array(
      Type.String({ minLength: 1, maxLength: 10_000 }),
      { minItems: 1 }
    ),
    maximumSeconds: Type.Integer({ minimum: 1, maximum: 7200 }),
    requiredOutputs: Type.Array(
      Type.String({ minLength: 1, maxLength: 1000 }),
      { minItems: 1 }
    ),
  },
  {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://criteriaforge.dev/schemas/remediation.schema.json",
    additionalProperties: false,
  }
)
export type RemediationBrief = Static<typeof RemediationBriefSchema>

export const RemediationRunOutputSchema = Type.Object(
  {
    summary: Type.String({ minLength: 1, maxLength: 20_000 }),
    changedFiles: Type.Array(
      Type.String({ minLength: 1, maxLength: 2048 }),
      { uniqueItems: true }
    ),
    acceptanceNotes: Type.Array(
      Type.String({ minLength: 1, maxLength: 10_000 })
    ),
    unresolvedRisks: Type.Array(
      Type.String({ minLength: 1, maxLength: 10_000 })
    ),
  },
  {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://criteriaforge.dev/schemas/remediation-run-output.schema.json",
    additionalProperties: false,
  }
)
export type RemediationRunOutput = Static<
  typeof RemediationRunOutputSchema
>

export const ApiErrorSchema = Type.Object(
  {
    code: Type.String({ minLength: 1, maxLength: 100 }),
    message: Type.String({ minLength: 1, maxLength: 2000 }),
    fieldErrors: Type.Record(Type.String(), Type.Array(Type.String())),
    retryable: Type.Boolean(),
    correlationId: Identifier,
    recoveryAction: Type.String({ minLength: 1, maxLength: 2000 }),
  },
  { additionalProperties: false }
)
export type ApiError = Static<typeof ApiErrorSchema>
