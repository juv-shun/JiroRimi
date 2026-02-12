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

### Toast

画面右下に表示されるトースト通知コンポーネント。成功・エラー・警告メッセージの表示に使用する。

**ファイル:** `app/components/toast.tsx`

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| message | string | ○ | - | 表示メッセージ |
| type | "success" \| "error" \| "warning" | - | "success" | トーストの種類 |
| show | boolean | ○ | - | 表示状態 |
| isExiting | boolean | - | false | フェードアウト中かどうか |

**使用例:**
```tsx
"use client"
import { useState, useEffect } from "react"
import { Toast } from "@/app/components/toast"

function MyComponent() {
  const [showToast, setShowToast] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  // 表示制御の例
  const showSuccess = () => {
    setShowToast(true)
    setIsExiting(false)
    setTimeout(() => setIsExiting(true), 2500)
    setTimeout(() => {
      setShowToast(false)
      setIsExiting(false)
    }, 3000)
  }

  return (
    <>
      <button onClick={showSuccess}>Save</button>
      <Toast message="Saved!" show={showToast} isExiting={isExiting} />
    </>
  )
}
```

---

## ページ作成時のチェックリスト

- [ ] `PageHeader` コンポーネントを使用している
- [ ] `main` タグに `min-h-screen bg-background` を適用している
- [ ] コンテンツを `max-w-2xl mx-auto` でセンタリングしている
