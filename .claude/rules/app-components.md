---
paths:
  - app/**/*.tsx
---

# app ディレクトリ編集時のコンポーネント使用ガイドライン

## 再利用可能なコンポーネント

### PageHeader

ページタイトル表示用のコンポーネント。新しいページを作成する際は必ずこのコンポーネントを使用すること。

**ファイル:** `app/components/page-header.tsx`

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| title | string | ○ | - | ページタイトル |
| subtitle | string | - | undefined | サブタイトル |
| showIcons | boolean | - | true | 星アイコンの表示 |

**使用例:**
```tsx
import { PageHeader } from "@/app/components/page-header"

export default function SomePage() {
  return (
    <main className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <PageHeader
          title="Page Title"
          subtitle="Optional subtitle text"
        />
        {/* ページコンテンツ */}
      </div>
    </main>
  )
}
```

## ページ作成時のチェックリスト

- [ ] `PageHeader` コンポーネントを使用している
- [ ] `main` タグに `min-h-screen bg-background` を適用している
- [ ] コンテンツを `max-w-2xl mx-auto` でセンタリングしている
