# shadcn/ui 部品採用方針

最終確認日: 2026-07-21

## 参照した正

- [shadcn/ui Components](https://ui.shadcn.com/docs/components)
- [shadcn/ui Theming](https://ui.shadcn.com/docs/theming)
- [shadcn/ui Sidebar](https://ui.shadcn.com/docs/components/sidebar)
- [shadcn/ui Field](https://ui.shadcn.com/docs/components/field)
- [shadcn/ui Command](https://ui.shadcn.com/docs/components/command)
- [shadcn/ui Alert Dialog](https://ui.shadcn.com/docs/components/alert-dialog)
- [shadcn/ui Sheet](https://ui.shadcn.com/docs/components/sheet)
- [shadcn/ui Resizable](https://ui.shadcn.com/docs/components/resizable)
- [shadcn/ui Empty](https://ui.shadcn.com/docs/components/empty)
- [shadcn/ui Tooltip](https://ui.shadcn.com/docs/components/tooltip)

実装は `shadcn` 4.13.1 の `base-nova` 様式と Base UI を使う。古い Radix UI 向けの `asChild` 例を混ぜず、Base UI の `render` 構成に統一する。

## 採用原則

1. **意味のある既存部品を優先する**  
   ボタン風の `div` や独自のモーダルを作らず、操作の意味に対応する shadcn/ui 部品を使う。
2. **部品の数ではなく、利用者の仕事に合わせる**  
   公式一覧の全てを一画面へ並べない。必要な部品を一貫した役割で使うことを「網羅的な参照」とする。
3. **状態を部品の外にも残す**  
   一時通知だけで完了を伝えず、文書、進捗、履歴へ反映する。
4. **危険度と確認の強さを一致させる**  
   閲覧補助は `Popover`、補足作業は `Sheet`、不可逆操作は `Alert Dialog` と使い分ける。
5. **狭い画面は再配置する**  
   三列を縮小せず、本文を残して補助領域を画面外パネルに移す。

## 第一版で採用した部品

| 利用者の仕事 | shadcn/ui 部品 | CriteriaForge での役割 |
| --- | --- | --- |
| 作業循環を理解する | `Sidebar`、`Breadcrumb` | 7段階と現在地 |
| 文書と評価を切り替える | `Tabs` | 同一案件の二つの主要な見方 |
| 目的地をすぐ探す | `Command`、`Kbd` | `⌘K`、`⌘1`、`⌘2` |
| 長い文書を読む | `Scroll Area` | 本文と補助領域の独立スクロール |
| 文書と判断材料を同時に見る | `Resizable` | 十分な幅でのみ比率を変更 |
| 出所と状態を判別する | `Badge`、`Tooltip`、`Hover Card` | 人間承認、原文抽出、AI 提案 |
| 高影響の質問に答える | `Field`、`Radio Group`、`Textarea` | 説明、選択肢、例外理由 |
| 根拠源を把握する | `Attachment`、`Item` | 文書、方針、Git 境界 |
| 作成可能性を理解する | `Progress`、`Tooltip` | 5条件の合否と理由 |
| 不可逆版を作る | `Alert Dialog` | 対象、結果、未達条件の確認 |
| 狭い画面で補足作業をする | `Sheet` | 質問と側面ナビゲーション |
| 評価項目を詳しく見る | `Collapsible` | 要約を保ったまま詳細を展開 |
| 完了を補助的に知らせる | `Sonner` | 承認、作成完了 |
| 追加操作をまとめる | `Dropdown Menu` | 編集、リンク、履歴 |
| 絞り込みと検索 | `Toggle Group`、`Input Group` | 評価状態と評価項目検索 |

## 公式部品一覧への対応

公式の部品を、第一版での判断によって四区分に整理する。

| 区分 | 部品 | 判断 |
| --- | --- | --- |
| 入力・選択 | `Button`、`Button Group`、`Checkbox`、`Field`、`Input`、`Input Group`、`Label`、`Radio Group`、`Select`、`Switch`、`Textarea`、`Toggle`、`Toggle Group` | 採用。質問、権限、絞り込み、直接編集で使う |
| 高度な入力 | `Autocomplete`、`Calendar`、`Combobox`、`Date Picker`、`Input OTP`、`Native Select`、`Slider` | 用途が発生するまで保留。第一版の中核経路には不要 |
| 移動・構造 | `Breadcrumb`、`Command`、`Menubar`、`Navigation Menu`、`Pagination`、`Sidebar`、`Tabs` | `Breadcrumb`、`Command`、`Sidebar`、`Tabs` を採用。ページ数より作業段階が中心のため `Pagination` は使わない |
| 開閉・重ね表示 | `Accordion`、`Alert Dialog`、`Collapsible`、`Context Menu`、`Dialog`、`Drawer`、`Dropdown Menu`、`Hover Card`、`Popover`、`Sheet`、`Tooltip` | 採用。ただし右クリック前提の `Context Menu` は中核操作にしない。スマートフォンは `Sheet`、不可逆操作は `Alert Dialog` |
| 状態・通知 | `Alert`、`Empty`、`Progress`、`Skeleton`、`Sonner`、`Spinner` | 採用。待機、空、部分失敗、完了を区別する。旧来の `Toast` は使わず `Sonner` に統一 |
| 情報表示 | `Aspect Ratio`、`Avatar`、`Badge`、`Card`、`Carousel`、`Chart`、`Item`、`Kbd`、`Table`、`Typography` | `Avatar`、`Badge`、`Item`、`Kbd`、`Table`、文字組みを採用。連続手順には不向きな `Carousel` は使わない。数値関係が必要になるまで `Chart` は保留 |
| 配置・区切り | `Resizable`、`Scroll Area`、`Separator` | 採用。`Resizable` はデスクトップだけで使う |
| AI向け表示 | `Attachment`、`Message`、`Prompt Input`、`Code Block` など | `Attachment` を採用。会話を主役にしないため `Message` と `Prompt Input` は補助画面に限定。Codex の変更や試験結果には `Code Block` を使う |
| 複合例 | `Data Table`、`Data Picker` 相当の公式構成例 | 根拠一覧と評価履歴で設計採用。第一版では軽量な一覧を優先 |

この区分は「未採用部品を独自実装する」という意味ではない。必要になった時点で、公式の構成例と読み上げ動作を再確認して導入する。

## アフォーダンスの規則

### ボタン

- 主操作は一領域につき一つ。
- 「Approve recommendation」のように、動詞と対象を同時に書く。
- アイコンだけのボタンには `aria-label` と `Tooltip` を付ける。
- 橙は人間の承認、作成、変更開始に限定する。通常の移動には使わない。
- 無効状態だけで理由を隠さず、近くに未達条件を書く。

### 選択

- 二から四個の排他的な重要判断は `Radio Group` で全選択肢を見せる。
- 候補が多いときだけ `Select` または `Combobox`。
- 推奨案は自動確定せず、推奨理由と不利益を併記する。
- 選択肢全体を押せるようにし、標的を小さな丸だけに限定しない。

### 重ね表示

- `Tooltip`: 名前や短い補足。重要情報の唯一の置き場にはしない。
- `Hover Card`: 出所の要約。クリックできない端末でも同じ情報へ到達可能にする。
- `Popover`: 現在の作業を保ったまま行う軽い設定。
- `Sheet`: 現在の本文を背景に残す補足作業。
- `Dialog`: 独立した短い作業。
- `Alert Dialog`: 不可逆、破壊的、権限変更を伴う操作。

### 待機と失敗

- 0.3秒未満の処理には待機表示を増やさない。
- 構造が分かっている読み込みは `Skeleton`、処理段階があるものは `Progress`、短い不定待機は `Spinner`。
- 一件の読取失敗で全案件を空にしない。失敗した対象に `Alert` と再試行を置く。
- 再試行後も、入力、選択、承認済み判断を保持する。

## 意味に基づく色と変数

`globals.css` では、具体色ではなく次の意味変数を使う。

| 変数 | 意味 | 使用箇所 |
| --- | --- | --- |
| `background` / `foreground` | 紙面と墨 | 全体 |
| `ember` | 人間の承認、作成、重要な変更 | 主操作、未承認の印 |
| `evidence` | 原文や観測への参照 | 根拠の印、リンク |
| `approved` | 人間が確認済み | 承認状態、合格 |
| `destructive` | 削除、重大な失敗 | 破壊操作と失敗だけ |
| `ring` | キーボードの現在位置 | 全ての操作部品 |

色だけで意味を伝えず、文言、アイコン、形を併用する。

## 実装上の規則

- `components/ui` は shadcn/ui が生成した部品として保ち、製品固有の組合せは `components/criteriaforge` に置く。
- `Sidebar` は `collapsible="offcanvas"`、本文の `SidebarInset` は `min-w-0` を付ける。
- `TooltipProvider` はアプリの根に一度だけ置く。
- Base UI のトリガー委譲は `render={<Element />}` を使う。
- `CommandDialog` 内では `Command` を明示して、入力と一覧が同じ文脈を共有する。
- `react-resizable-panels` 4系では数値が画素として解釈されるため、比率は文字列で指定する。
- 画面幅により隠れる文字を読み上げ名に使わず、`aria-label` を別途持たせる。

## 検証基準

- 1440×900と390×844で主要経路を実ブラウザ確認する。
- 意図しない横方向のスクロールがない。
- `⌘K`、`⌘1`、`⌘2`、`⌘B` と `Escape` が期待通り動く。
- モーダルや側面パネル内へフォーカスが移り、閉じた後は起点へ戻る。
- ブラウザのコンソールにエラーと警告がない。
- 型検査、静的検査、本番ビルドが成功する。
- 読み上げ木で、タブ、アイコンボタン、進捗、評価状態に意味のある名前がある。

