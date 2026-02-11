-- ============================================
-- Migration: Create RLS Policies
-- Version: 20260211000002
-- Description: Row Level Security ポリシーを作成
-- ============================================

-- ============================================
-- 1. RLS 有効化
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. ヘルパー関数
-- ============================================

-- is_admin(): 現在のユーザーが運営者かどうかを判定
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

-- ============================================
-- 3. profiles テーブルの RLS ポリシー
-- ============================================

-- SELECT: 全員閲覧可能
CREATE POLICY profiles_select_policy ON public.profiles
  FOR SELECT
  TO public
  USING (true);

-- INSERT: 自分のプロフィールのみ作成可能、role は必ず user
CREATE POLICY profiles_insert_policy ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid() AND role = 'user');

-- UPDATE: 自分のプロフィールのみ更新可能
CREATE POLICY profiles_update_policy ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- role 変更保護トリガー
CREATE OR REPLACE FUNCTION public.protect_role_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- role が変更されようとしている場合
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    -- 運営者のみ変更可能
    IF NOT public.is_admin() THEN
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

-- ============================================
-- 4. tournaments テーブルの RLS ポリシー
-- ============================================

-- SELECT: 公開済み大会は全員閲覧可能
CREATE POLICY tournaments_select_public ON public.tournaments
  FOR SELECT
  TO public
  USING (status != 'draft');

-- SELECT: 運営者は全大会閲覧可能
CREATE POLICY tournaments_select_admin ON public.tournaments
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- INSERT: 運営者のみ作成可能
CREATE POLICY tournaments_insert_policy ON public.tournaments
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- UPDATE: 運営者のみ更新可能
CREATE POLICY tournaments_update_policy ON public.tournaments
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- DELETE: 運営者のみ削除可能
CREATE POLICY tournaments_delete_policy ON public.tournaments
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================
-- 5. qualifiers テーブルの RLS ポリシー
-- ============================================

-- SELECT: 公開大会の予選は全員閲覧可能
CREATE POLICY qualifiers_select_public ON public.qualifiers
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = qualifiers.tournament_id
      AND t.status != 'draft'
    )
  );

-- SELECT: 運営者は全予選閲覧可能
CREATE POLICY qualifiers_select_admin ON public.qualifiers
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- INSERT: 運営者のみ作成可能
CREATE POLICY qualifiers_insert_policy ON public.qualifiers
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- UPDATE: 運営者のみ更新可能
CREATE POLICY qualifiers_update_policy ON public.qualifiers
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- DELETE: 運営者のみ削除可能
CREATE POLICY qualifiers_delete_policy ON public.qualifiers
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================
-- 6. entries テーブルの RLS ポリシー
-- ============================================

-- SELECT: 全員閲覧可能
CREATE POLICY entries_select_policy ON public.entries
  FOR SELECT
  TO public
  USING (true);

-- INSERT: 自分のエントリーのみ作成可能（エントリー期間内）
CREATE POLICY entries_insert_own ON public.entries
  FOR INSERT
  TO authenticated
  WITH CHECK (
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
  );

-- INSERT: 運営者は制限なく作成可能
CREATE POLICY entries_insert_admin ON public.entries
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- DELETE: 自分のエントリーのみ削除可能
CREATE POLICY entries_delete_own ON public.entries
  FOR DELETE
  TO authenticated
  USING (profile_id = auth.uid());

-- DELETE: 運営者は全エントリー削除可能
CREATE POLICY entries_delete_admin ON public.entries
  FOR DELETE
  TO authenticated
  USING (public.is_admin());
