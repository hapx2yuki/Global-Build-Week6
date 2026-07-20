export type StageId =
  | "intent"
  | "constitution"
  | "compile"
  | "evidence"
  | "evaluate"
  | "improve"
  | "reevaluate"

export type UiLocale = "en" | "ja"

export const STAGE_ORDER: readonly StageId[] = [
  "intent",
  "constitution",
  "compile",
  "evidence",
  "evaluate",
  "improve",
  "reevaluate",
]

export const uiText = {
  en: {
    languageName: "日本語",
    projectNavigation: "Project navigation",
    find: "Find",
    recorded: "Replay recorded GPT-5.6 evaluation",
    recordedDetail: "Fictional data · no live model call",
    stages: {
      intent: "Bring in intent",
      constitution: "Shape the constitution",
      compile: "Compile",
      evidence: "Inspect evidence",
      evaluate: "Evaluate",
      improve: "Improve with Codex",
      reevaluate: "Re-evaluate",
    },
  },
  ja: {
    languageName: "English",
    projectNavigation: "案件ナビゲーション",
    find: "検索",
    recorded: "GPT-5.6による記録済み実測結果を再生",
    recordedDetail: "架空データ限定・ライブ実行ではありません",
    stages: {
      intent: "意図を取り込む",
      constitution: "憲法を形にする",
      compile: "版を作成する",
      evidence: "根拠を検査する",
      evaluate: "正式評価する",
      improve: "Codexで修正する",
      reevaluate: "同じ条件で再評価",
    },
  },
} as const
