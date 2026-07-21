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
| Sharp / libvips | 画像無害化・変換 | https://sharp.pixelplumbing.com/ | 0.35.3 / 1.3.2 | Apache-2.0、libvips動的実行物はLGPL-3.0-or-later | SVGを生HTMLで描画せず画像化 | `apps/web` の端末内根拠処理 | 2026-07-21 |
| npm依存物一式 | 実行・開発依存 | `apps/web/package-lock.json` | lockfileを正とする | `npm run license:check`で未知、AGPL、SSPL、BUSL、単独GPL系を停止 | 直接変更なし | `apps/web` | 2026-07-21 |
| CriteriaForge visual direction v1 | AI生成の設計参考画像 | OpenAI ImageGen | 2026-07-21 | 本プロジェクト用生成物 | 実装時に構成、色、質感を再解釈 | `docs/design/criteriaforge-visual-direction-v1.png` | 2026-07-21 |
| Remotion | 動画生成基盤 | https://www.remotion.dev/ | 4.0.495 | Remotion Free License。提出者が個人である現状の資格条件を確認済み。MITではないため版・提出主体変更時は再確認 | 実画面、字幕、音声をフレーム駆動の映像へ構成 | `video/criteriaforge` | 2026-07-21 |
| CriteriaForge実画面11枚 | 画面素材 | 本リポジトリの公開体験版・端末内自己試験 | 2026-07-21収録 | 本プロジェクトが生成した架空データの画面 | 切り抜き、拡大、注釈、動きの付与 | 端末内限定の`output/criteriaforge-demo/`から動画へ使用 | 2026-07-21 |
| macOS音声「Daniel」 | 英語合成音声 | macOS `say` | 収録端末の搭載版 | Apple公式の版別ソフトウェア利用許諾に、合成音声出力の公開利用を明示する条項は確認できていない。Build WeekはAI支援音声を許可し、制作者が残余不確実性を認識した上で最終音声として承認 | 英語台本を読み上げ | 提出動画の最終音声 | 2026-07-21 |

## 動画素材の公開可否

- 映像、字幕、台本、画面素材は本プロジェクト由来で、第三者の画像、映像、音楽、書体ファイルは追加していない。
- Remotion 4.0.495は、提出者が個人である現状ではFree Licenseの対象と確認した。これは法的助言ではなく、導入時点の条件確認記録である。
- OpenAI Build Weekの公式案内はAI支援の読み上げ音声を許可している。macOS合成音声出力に固有の公開条件はAppleの一次資料で特定できていないが、制作者本人がこの残余不確実性を認識した上で、現在の音声を提出用最終音声として承認した。これは法的な権利保証ではなく、出所と判断の記録である。
- 日本語訳は`output/criteriaforge-demo/criteriaforge-narration-ja.md`だけに保存し、Git、Devpost、README、公開動画説明へ含めない。
