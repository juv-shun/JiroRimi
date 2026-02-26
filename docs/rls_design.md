# Row Level Security (RLS) 設計書

## 概要

本ドキュメントは「Jiro-Rimi Cup」のRow Level Security (RLS) ポリシーを定義する。Supabase の RLS 機能を使用し、テーブル単位でアクセス制御を実装する。

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
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_participants ENABLE ROW LEVEL SECURITY;
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

### events

| 操作 | ポリシー名 | 対象ロール | USING | WITH CHECK | 説明 |
|------|-----------|-----------|-------|------------|------|
| SELECT | `events_select_public` | `public` | 親 tournament が公開済み（後述） | - | 公開済み大会のイベントは全員閲覧可能 |
| SELECT | `events_select_admin` | `authenticated` | `is_admin()` | - | 運営者は全イベント閲覧可能 |
| INSERT | `events_insert_policy` | `authenticated` | - | `is_admin()` | 運営者のみ作成可能 |
| UPDATE | `events_update_policy` | `authenticated` | `is_admin()` | `is_admin()` | 運営者のみ更新可能 |
| DELETE | `events_delete_policy` | `authenticated` | `is_admin()` | - | 運営者のみ削除可能 |

**親 tournament 公開判定**:

```sql
EXISTS (
  SELECT 1 FROM public.tournaments t
  WHERE t.id = events.tournament_id
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
| UPDATE | `entries_update_checkin_own` | `authenticated` | `profile_id = auth.uid() AND checked_in_at IS NULL` | 本人 AND `checked_in_at IS NOT NULL` AND チェックイン期間内 | 参加者が自分の未チェックインエントリーにチェックインを設定（1回のみ・取り消し不可） |
| UPDATE | `entries_update_checkin_admin` | `authenticated` | `public.is_admin()` | `public.is_admin()` | 運営者は時間帯制限なしで更新可能 |
| DELETE | `entries_delete_own` | `authenticated` | `profile_id = auth.uid()` | - | 自分のエントリーのみ削除可能 |
| DELETE | `entries_delete_admin` | `authenticated` | `is_admin()` | - | 運営者は全エントリー削除可能 |

**entries_insert_own の WITH CHECK 条件**:

```sql
-- 本人であること
profile_id = auth.uid()
-- かつ、エントリー期間内であること
-- かつ、性別制限をクリアしていること
AND EXISTS (
  SELECT 1 FROM public.events e
  JOIN public.tournaments t ON t.id = e.tournament_id
  WHERE e.id = event_id
  AND t.status != 'draft'
  AND now() >= e.entry_start
  AND now() <= e.entry_end
  AND (
    e.gender IS NULL
    OR e.gender = (SELECT p.gender FROM public.profiles p WHERE p.id = auth.uid())
  )
)
```

> **Note**: `entries_insert_admin`（`is_admin()` で無条件許可）は変更不要。運営者は性別制限を自動バイパスする。

**entries_update_checkin_own の WITH CHECK 条件**:

```sql
-- 本人であること
profile_id = auth.uid()
-- かつ、チェックインを取り消せない（NULL に戻せない）
AND checked_in_at IS NOT NULL
-- かつ、チェックイン期間内であること
AND EXISTS (
  SELECT 1 FROM public.events e
  WHERE e.id = event_id
  AND now() >= e.checkin_start
  AND now() <= e.checkin_end
)
```

**カラム保護トリガー**（`protect_entry_columns`）:

非管理者が `checked_in_at` 以外のカラム（`id`, `profile_id`, `event_id`, `created_at`）を変更しようとした場合、変更を無効化するトリガー。また、非管理者の `checked_in_at` はサーバー時刻（`now()`）を強制し、改ざんを防止する。`profiles` テーブルの `protect_role_column` と同じパターン。

```sql
CREATE OR REPLACE FUNCTION public.protect_entry_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 非管理者は checked_in_at 以外の変更を無効化し、checked_in_at はサーバー時刻を強制
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    NEW.id := OLD.id;
    NEW.profile_id := OLD.profile_id;
    NEW.event_id := OLD.event_id;
    NEW.created_at := OLD.created_at;
    NEW.checked_in_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_entry_columns_trigger
  BEFORE UPDATE ON public.entries
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_entry_columns();
```

---

### matches

| 操作 | ポリシー名 | 対象ロール | USING | WITH CHECK | 説明 |
|------|-----------|-----------|-------|------------|------|
| SELECT | `matches_select_public` | `public` | `status IN ('in_progress', 'confirmed')` | - | 開始済み/確定済みマッチは全員閲覧可能（waiting は非公開） |
| SELECT | `matches_select_admin` | `authenticated` | `is_admin()` | - | 運営者は全マッチ閲覧可能（waiting 含む） |
| INSERT | `matches_insert_admin` | `authenticated` | - | `is_admin()` | 運営者のみ作成可能 |
| UPDATE | `matches_update_lobby` | `authenticated` | マッチ参加者 AND `status = 'in_progress'`（後述） | 同左 | マッチ参加者がロビー番号を更新（in_progress の場合のみ） |
| UPDATE | `matches_update_admin` | `authenticated` | `is_admin()` | `is_admin()` | 運営者は全マッチ更新可能 |
| DELETE | `matches_delete_admin` | `authenticated` | `is_admin()` | - | 運営者のみ削除可能 |

**matches_update_lobby の USING / WITH CHECK 条件**:

```sql
status = 'in_progress'
AND EXISTS (
  SELECT 1 FROM public.match_participants mp
  WHERE mp.match_id = matches.id
  AND mp.profile_id = auth.uid()
)
```

**カラム保護トリガー**（`protect_match_columns`）:

非管理者が `lobby_number` 以外のカラム（`id`, `event_id`, `round_number`, `status`, `result`, `created_at`, `updated_at`）を変更しようとした場合、変更を無効化するトリガー。`entries` テーブルの `protect_entry_columns` と同じパターン。

```sql
CREATE OR REPLACE FUNCTION public.protect_match_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    NEW.id := OLD.id;
    NEW.event_id := OLD.event_id;
    NEW.round_number := OLD.round_number;
    NEW.status := OLD.status;
    NEW.result := OLD.result;
    NEW.created_at := OLD.created_at;
    NEW.updated_at := OLD.updated_at;
    -- lobby_number のみ変更を許可
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_match_columns_trigger
  BEFORE UPDATE ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_match_columns();
```

---

### match_participants

| 操作 | ポリシー名 | 対象ロール | USING | WITH CHECK | 説明 |
|------|-----------|-----------|-------|------------|------|
| SELECT | `match_participants_select_public` | `public` | 親マッチが `in_progress` or `confirmed`（後述） | - | 開始済みマッチの参加者は全員閲覧可能 |
| SELECT | `match_participants_select_admin` | `authenticated` | `is_admin()` | - | 運営者は全参加者閲覧可能 |
| INSERT | `match_participants_insert_admin` | `authenticated` | - | `is_admin()` | 運営者のみ作成可能 |
| UPDATE | `match_participants_update_vote_own` | `authenticated` | `profile_id = auth.uid()` | 本人 AND 親マッチが `in_progress`（後述） | 本人が勝敗投票を更新（マッチ進行中のみ） |
| UPDATE | `match_participants_update_admin` | `authenticated` | `is_admin()` | `is_admin()` | 運営者は全更新可能 |
| DELETE | `match_participants_delete_admin` | `authenticated` | `is_admin()` | - | 運営者のみ削除可能 |

**match_participants_select_public の USING 条件**:

```sql
EXISTS (
  SELECT 1 FROM public.matches m
  WHERE m.id = match_participants.match_id
  AND m.status IN ('in_progress', 'confirmed')
)
```

**match_participants_update_vote_own の WITH CHECK 条件**:

```sql
profile_id = auth.uid()
AND EXISTS (
  SELECT 1 FROM public.matches m
  WHERE m.id = match_participants.match_id
  AND m.status = 'in_progress'
)
```

**カラム保護トリガー**（`protect_match_participant_columns`）:

非管理者が `vote` 以外のカラム（`id`, `match_id`, `profile_id`, `team`, `created_at`, `updated_at`）を変更しようとした場合、変更を無効化するトリガー。

```sql
CREATE OR REPLACE FUNCTION public.protect_match_participant_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    NEW.id := OLD.id;
    NEW.match_id := OLD.match_id;
    NEW.profile_id := OLD.profile_id;
    NEW.team := OLD.team;
    NEW.created_at := OLD.created_at;
    NEW.updated_at := OLD.updated_at;
    -- vote のみ変更を許可
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_match_participant_columns_trigger
  BEFORE UPDATE ON public.match_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_match_participant_columns();
```

---

## ポリシー一覧サマリー

| テーブル | SELECT | INSERT | UPDATE | DELETE |
|---------|--------|--------|--------|--------|
| profiles | 全員 | 本人のみ（role=user固定） | 本人のみ（role変更不可） | 不可 |
| tournaments | 公開済み: 全員 / draft: 運営者 | 運営者 | 運営者 | 運営者 |
| events | 公開大会のイベント: 全員 / それ以外: 運営者 | 運営者 | 運営者 | 運営者 |
| entries | 全員 | 本人（期間内）or 運営者 | 本人（期間内・取り消し不可）or 運営者 | 本人 or 運営者 |
| matches | in_progress/confirmed: 全員 / waiting: 運営者 | 運営者 | 参加者（lobby_number のみ・in_progress のみ）or 運営者 | 運営者 |
| match_participants | 親マッチが in_progress/confirmed: 全員 / waiting: 運営者 | 運営者 | 本人（vote のみ・in_progress のみ）or 運営者 | 運営者 |

---

## 追加のビジネスロジック（アプリ側で実装）

以下のバリデーションは RLS では実装せず、アプリ側で実装する:

- プロフィールが完了しているか
- 参加上限に達していないか（events.max_participants）

**理由**: これらは複雑な条件であり、RLS で実装するとパフォーマンスやメンテナンス性に影響するため。

---

## Phase 3 以降の RLS 拡張予定

Phase 3（GF関連）で追加予定のテーブルの RLS ポリシーは、Phase 3 の詳細設計時に決定する。
