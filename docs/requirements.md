# OpenAI Build Week 提出要件

最終確認日: 2026-07-20（日本時間）

この文書は Devpost のイベント情報、提出フォーム、告知、Official Rules を突き合わせた作業基準である。内容が食い違う場合は、最新の [Official Rules](https://openai-build-week.devpost.com/rules) と実際の提出フォームを優先する。

## 締切

- 提出締切: 2026-07-21 17:00 PT
- 日本時間: 2026-07-22 09:00 JST
- 締切後は提出内容を編集できない前提で進める。
- 最終送信は締切の少なくとも3時間前を内部期限とする。

## 通過に必須の条件

- OpenAI Build Week の趣旨に合う、実際に動く製品である。
- Codex と GPT-5.6 を意味のある機能または開発工程に使う。
- 次のいずれか一つを選ぶ。
  - Apps for Your Life
  - Work & Productivity
  - Developer Tools
  - Education
- 英語のプロジェクト説明を提出する。
- 音声付き、3分未満の YouTube 動画を提出する。
- 審査員が無料で確認できるコードリポジトリを提出する。
- Codex の `/feedback` で得た Session ID を提出する。
- プラグインまたは開発者向け道具の場合、導入方法、対応環境、試験方法を書く。

## リポジトリの条件

次のどちらかを満たす。

1. 公開リポジトリにし、該当するライセンスを明記する。
2. 非公開リポジトリのまま、`testing@devpost.com` と `build-week-event@openai.com` に閲覧権限を付与する。

README には、少なくとも次を含める。

- 前提条件と導入手順
- 必要な環境変数の「名前」だけ
- サンプル入力
- 実行手順
- 試験手順
- Codex が開発を速めた箇所
- GPT-5.6 を使った機能または工程
- 主要な設計判断と制約

審査終了までは、リンク、閲覧権限、無料の試験経路を維持する。

## 動画の安全側の基準

告知には限定公開でもよいという記述がある一方、Official Rules と提出案内には公開動画という記述がある。このため次を採用する。

- YouTube の公開設定は「公開」にする。
- 目標尺は2分40秒から2分50秒とし、180秒ちょうどを避ける。
- 音声を必須とし、字幕も付ける。
- 最初の15秒で、誰の何の問題をどう変えるかを示す。
- 実際の画面を中心にし、資料だけの説明にしない。
- Codex と GPT-5.6 の具体的な役割を画面または証拠とともに説明する。
- ログアウト状態、別端末、別回線で再生する。

## Devpost の必須入力

| 項目 | 必須 | 作業場所 |
| --- | --- | --- |
| Submitter Type | はい | `submission/metadata.env` |
| Country | はい | `submission/metadata.env` |
| Category | はい | `submission/metadata.env` |
| Repository URL | はい | `submission/metadata.env` |
| Live demo / test instructions | 条件付き | README と提出説明 |
| Codex Session ID | はい | `submission/metadata.env` |
| Plugin / developer-tool instructions | 該当時 | README と提出説明 |
| YouTube demo | はい | `submission/metadata.env` |

## 審査観点

一次確認では、テーマ適合、必須技術、最低限の動作可能性が確認される。二次審査は次の4項目が同じ重みで評価される。

1. Technological Implementation
2. Design
3. Potential Impact
4. Quality of Idea

同点時は、技術実装、設計、潜在的な影響、アイデアの質の順に優先される。審査員は実際に製品を動かさず、説明、画像、動画だけで判断する場合がある。このため、重要な証拠は動画と提出説明だけでも理解できる形にする。

## 提出前の再確認

- Devpost の参加者名と GitHub の共同作業者が一致している。
- 既存製品を使う場合、Build Week 中の新規部分が明確である。
- 外部素材、データ、コードの利用条件を記録している。
- 無料枠だけで審査員が主要な流れを試せる。
- 提出フォームのプレビューと実際の動画・URLを第三者が確認した。

