---
paths:
  - app/**/*.tsx
  - app/components/**/*.tsx
---

# UI テキストスタイルガイドライン

## 基本原則

**説明文は日本語、単語レベルは英語を使用する**

### 英語を使用するもの

- ナビゲーションラベル: Home, Tournaments, Schedule, My Page
- ボタンラベル: Sign in, Sign out, Submit, Cancel, Save, Delete
- ステータス表示: Signed in, Loading, Error, Success
- プレースホルダー（短い場合）: Enter your name
- aria-label: Close menu, Open menu

### 日本語を使用するもの

- エラーメッセージ: 「入力内容に誤りがあります」
- 説明文・ヘルプテキスト: 「プロフィールを設定してください」
- フォームラベル（説明的なもの）: 「プレイヤー名」「ロール優先順位」
- 確認ダイアログのメッセージ: 「本当に削除しますか？」
- 通知メッセージ: 「保存しました」「エントリーが完了しました」

### 例

```tsx
// Good
<button>Save</button>
<span className="text-xs">Signed in</span>
<p className="text-error">プレイヤー名は必須です</p>

// Bad
<button>保存</button>
<span className="text-xs">ログイン中</span>
<p className="text-error">Player name is required</p>
```

## アプリ名

アプリ名は **Jiro-Rimi Cup** を使用する（日本語表記「Jiro-Rimi Cup」は使用しない）。
