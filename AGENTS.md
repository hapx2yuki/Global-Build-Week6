# 作業規約

このリポジトリは OpenAI Build Week の応募物と、その提出証拠を一体で管理する。

## 必ず守ること

- 製品実装は Codex と GPT-5.6 を意味のある形で使う。
- 誇張、未検証の数値、存在しない機能を README や動画台本に書かない。
- 重要な作業ごとに `docs/build-log.md` を更新し、Codex、GPT-5.6、人間の寄与を区別する。
- 重要な設計判断は `docs/decision-log.md` に残す。
- API キー、認証情報、個人情報、非公開の評価データをコミットしない。
- `.env` と `submission/metadata.env` はローカルだけで管理する。
- 審査員向けの README、提出説明、動画台本は英語で書く。
- 内部の運用文書は、特別な理由がない限り日本語で書く。
- 変更前とコミット前に `make preflight` を実行する。
- 提出直前に `make submission-check` を成功させる。

## 標準の進め方

1. `docs/requirements.md` と `submission/release-checklist.md` を読む。
2. `docs/decision-log.md` に企画と技術選定を記録する。
3. 小さな変更単位で実装し、再現可能な試験を追加する。
4. 定量結果と失敗例を `docs/evaluation-plan.md` に記録する。
5. README の導入・実行・試験手順を実機で再確認する。
6. `submission/judging-evidence.md` に審査員が見る場所を明記する。
7. 3分未満の動画を第三者の端末で再生確認する。

## 完了の定義

コードだけでは完了としない。動作確認、README、試験証拠、動画、Codex Session ID、リポジトリ閲覧権限、Devpost の全必須項目が揃って初めて提出可能とする。

