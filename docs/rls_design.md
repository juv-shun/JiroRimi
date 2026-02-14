# Row Level Security (RLS) 設計書

## 概要

本ドキュメントは「じろりみ」のRow Level Security (RLS) ポリシーを定義する。Supabase の RLS 機能を使用し、テーブル単位でアクセス制御を実装する。

**重要**: Supabase クライアントは DB へ直接アクセスできるため、書き込み制御は必ず DB 側（RLS/トリガー）で完結させる。

## ユーザー種別と権限

| ユーザー種別 | Supabase Role | 判定条件 | 権限概要 |
|-------------|---------------|----------|----------|
| 未ログイン | `anon` | - | 閲覧のみ |
| 一般ユーザー | `authenticated` | `profiles.role = 'user'` | エントリー・自身のプロフィール編集 |
| 運営者 | `authenticated` | `profiles.role = 'admin'` | 大会作成・管理・全データ操作 |

---

## RLS 有効化

全テーブルで RLS を有効化する。

```sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;
```

---

## ヘルパー関数

RLS ポリシーで使用する共通関数を定義する。

### is_admin()

現在のユーザーが運営者かどうかを判定する。

```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$;
```

---

## テーブル別 RLS ポリシー

### profiles

| 操作 | ポリシー名 | 対象ロール | USING | WITH CHECK | 説明 |
|------|-----------|-----------|-------|------------|------|
| SELECT | `profiles_select_policy` | `public` | `true` | - | 全員閲覧可能 |
| INSERT | `profiles_insert_policy` | `authenticated` | - | `id = auth.uid() AND role = 'user'` | 自分のプロフィールのみ作成可能、role は必ず user |
| UPDATE | `profiles_update_policy` | `authenticated` | `id = auth.uid()` | `id = auth.uid()` | 自分のプロフィールのみ更新可能 |
| DELETE | - | - | - | - | 削除不可 |

**role 変更保護トリガー**（必須）:

一般ユーザーが `role` カラムを変更できないようにトリガーで保護する。

```sql
CREATE OR REPLACE FUNCTION public.protect_role_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- role が変更されようとしている場合
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    -- service_role 接続（auth.uid() が NULL）は許可、それ以外は運営者のみ変更可能
    IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
      NEW.role := OLD.role;  -- 変更を無効化
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_role_column_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_role_column();
```

---

### tournaments

| 操作 | ポリシー名 | 対象ロール | USING | WITH CHECK | 説明 |
|------|-----------|-----------|-------|------------|------|
| SELECT | `tournaments_select_public` | `public` | `status != 'draft'` | - | 公開済み大会は全員閲覧可能 |
| SELECT | `tournaments_select_admin` | `authenticated` | `is_admin()` | - | 運営者は全大会閲覧可能 |
| INSERT | `tournaments_insert_policy` | `authenticated` | - | `is_admin()` | 運営者のみ作成可能 |
| UPDATE | `tournaments_update_policy` | `authenticated` | `is_admin()` | `is_admin()` | 運営者のみ更新可能 |
| DELETE | `tournaments_delete_policy` | `authenticated` | `is_admin()` | - | 運営者のみ削除可能 |

---

### qualifiers

| 操作 | ポリシー名 | 対象ロール | USING | WITH CHECK | 説明 |
|------|-----------|-----------|-------|------------|------|
| SELECT | `qualifiers_select_public` | `public` | 親 tournament が公開済み（後述） | - | 公開済み大会の予選は全員閲覧可能 |
| SELECT | `qualifiers_select_admin` | `authenticated` | `is_admin()` | - | 運営者は全予選閲覧可能 |
| INSERT | `qualifiers_insert_policy` | `authenticated` | - | `is_admin()` | 運営者のみ作成可能 |
| UPDATE | `qualifiers_update_policy` | `authenticated` | `is_admin()` | `is_admin()` | 運営者のみ更新可能 |
| DELETE | `qualifiers_delete_policy` | `authenticated` | `is_admin()` | - | 運営者のみ削除可能 |

**親 tournament 公開判定**:

```sql
EXISTS (
  SELECT 1 FROM public.tournaments t
  WHERE t.id = qualifiers.tournament_id
  AND t.status != 'draft'
)
```

---

### entries

| 操作 | ポリシー名 | 対象ロール | USING | WITH CHECK | 説明 |
|------|-----------|-----------|-------|------------|------|
| SELECT | `entries_select_policy` | `public` | `true` | - | 全員閲覧可能 |
| INSERT | `entries_insert_own` | `authenticated` | - | 本人 AND エントリー期間内（後述） | 自分のエントリーのみ作成可能 |
| INSERT | `entries_insert_admin` | `authenticated` | - | `is_admin()` | 運営者は制限なく作成可能 |
| UPDATE | - | - | - | - | 更新不可 |
| DELETE | `entries_delete_own` | `authenticated` | `profile_id = auth.uid()` | - | 自分のエントリーのみ削除可能 |
| DELETE | `entries_delete_admin` | `authenticated` | `is_admin()` | - | 運営者は全エントリー削除可能 |

**entries_insert_own の WITH CHECK 条件**:

```sql
-- 本人であること
profile_id = auth.uid()
-- かつ、エントリー期間内であること
AND EXISTS (
  SELECT 1 FROM public.qualifiers q
  JOIN public.tournaments t ON t.id = q.tournament_id
  WHERE q.id = qualifier_id
  AND t.status != 'draft'
  AND now() >= q.entry_start
  AND now() <= q.entry_end
)
```

---

## ポリシー一覧サマリー

| テーブル | SELECT | INSERT | UPDATE | DELETE |
|---------|--------|--------|--------|--------|
| profiles | 全員 | 本人のみ（role=user固定） | 本人のみ（role変更不可） | 不可 |
| tournaments | 公開済み: 全員 / draft: 運営者 | 運営者 | 運営者 | 運営者 |
| qualifiers | 公開大会の予選: 全員 / それ以外: 運営者 | 運営者 | 運営者 | 運営者 |
| entries | 全員 | 本人（期間内）or 運営者 | 不可 | 本人 or 運営者 |

---

## 追加のビジネスロジック（アプリ側で実装）

以下のバリデーションは RLS では実装せず、アプリ側で実装する:

- プロフィールが完了しているか
- 性別が大会と一致しているか
- 参加上限に達していないか

**理由**: これらは複雑な条件であり、RLS で実装するとパフォーマンスやメンテナンス性に影響するため。

---

## Phase 2 以降の RLS 拡張予定

| テーブル | SELECT | INSERT | UPDATE | DELETE |
|---------|--------|--------|--------|--------|
| check_ins | 全員 | 本人（期間内）or 運営者 | 不可 | 運営者のみ |
| matches | 全員 | 運営者 | 運営者 | 運営者 |
| match_participants | 全員 | 運営者 | 運営者 | 運営者 |
| match_results | 全員 | 本人 or 運営者 | 本人 or 運営者 | 運営者 |

---

## 次のステップ

1. 本設計書のレビュー・承認
2. マイグレーションファイルで RLS ポリシーを実装
3. Supabase ローカル環境で動作確認
