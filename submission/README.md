# 提出用資料

このディレクトリは Devpost に転記する情報と、動画・審査証拠を管理する。

## 最初の準備

```bash
make setup
```

`metadata.example.env` から、Git に含まれない `metadata.env` が作成される。URL、Session ID、最終音声の承認、公開確認などは `metadata.env` だけに記入する。

## 文書の役割

- `project-description.md`: Devpost の英語説明原稿
- `demo-script.md`: 3分未満の英語動画台本
- `judging-evidence.md`: 四つの審査観点と証拠の対応
- `release-checklist.md`: 提出直前の確認

## 完了確認

```bash
make submission-check
```

この検査が成功しても、最新の Devpost 画面と Official Rules を目視で再確認する。
