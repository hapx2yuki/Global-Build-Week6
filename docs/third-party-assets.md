# 外部素材・依存物の台帳

コード、模型、データ、画像、音声、書体、アイコン、画面素材を追加したら記録する。利用条件が不明なものは提出物に含めない。

| 名称 | 種類 | 取得元 URL | 版 | 利用条件 | 変更内容 | 提出物での場所 | 確認日 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| shadcn/ui | UI部品のソース | https://ui.shadcn.com/ | 4.13.1 | MIT | 意味変数と製品固有の組合せを追加 | `apps/web/src/components/ui` | 2026-07-21 |
| Base UI | UI基盤 | https://base-ui.com/ | 1.6.0 | MIT | 変更なし | `apps/web` のUI基盤 | 2026-07-21 |
| Lucide | アイコン | https://lucide.dev/ | 1.25.0 | ISC | 色と大きさを画面に合わせて指定 | `apps/web` 全体 | 2026-07-21 |
| Sonner | 通知部品 | https://sonner.emilkowal.ski/ | 2.0.7 | MIT | 承認・作成完了の文言を追加 | `apps/web` の補助通知 | 2026-07-21 |
| cmdk | 指令メニュー | https://github.com/pacocoursey/cmdk | 1.1.1 | MIT | 案件内移動の項目を追加 | `apps/web/src/components/criteriaforge/command-menu.tsx` | 2026-07-21 |
| react-resizable-panels | 分割領域 | https://react-resizable-panels.vercel.app/ | 4.12.2 | MIT | 文書と質問の初期比率・制約を指定 | `apps/web/src/components/criteriaforge/workspace-shell.tsx` | 2026-07-21 |
| Next.js | Webアプリ基盤 | https://nextjs.org/ | 16.2.10 | MIT | CriteriaForgeアプリを実装 | `apps/web` | 2026-07-21 |
| React | 画面描画基盤 | https://react.dev/ | 19.2.4 | MIT | CriteriaForgeアプリを実装 | `apps/web` | 2026-07-21 |
| CriteriaForge visual direction v1 | AI生成の設計参考画像 | OpenAI ImageGen | 2026-07-21 | 本プロジェクト用生成物 | 実装時に構成、色、質感を再解釈 | `docs/design/criteriaforge-visual-direction-v1.png` | 2026-07-21 |
