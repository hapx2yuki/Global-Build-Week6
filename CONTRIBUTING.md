# 作業への参加方法

## 変更前

1. `AGENTS.md` と `docs/requirements.md` を読む。
2. 対象の利用者、解く問題、完了条件を明記する。
3. 大きな判断は `docs/decision-log.md` に先に記録する。

## 変更中

- 一つの変更で一つの確認可能な成果を作る。
- 入力、出力、失敗時の動作を再現できる試験にする。
- Codex と GPT-5.6 の寄与を `docs/build-log.md` に残す。
- 外部の素材やライブラリは `docs/third-party-assets.md` に記録する。

## 変更後

```bash
make preflight
```

README、動画台本、審査証拠表の説明が実装と食い違っていないことも確認する。

