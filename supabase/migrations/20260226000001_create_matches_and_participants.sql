-- ============================================
-- Migration: Create matches & match_participants Tables
-- Version: 20260226000001
-- Description: マッチ・参加者テーブルを作成し、RLS ポリシーとカラム保護トリガーを設定
-- ============================================

-- ============================================
-- 1. matches テーブル
-- ============================================

CREATE TABLE public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  round_number int NOT NULL CHECK (round_number >= 1),
  lobby_number text,
  status text NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'in_progress', 'confirmed')),
  result text CHECK (result IN ('team_a', 'team_b')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX matches_event_id_round_number_idx
  ON public.matches(event_id, round_number);

CREATE TRIGGER update_matches_updated_at
  BEFORE UPDATE ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.matches IS 'マッチ（イベント内の各5v5試合）';
COMMENT ON COLUMN public.matches.id IS 'PK';
COMMENT ON COLUMN public.matches.event_id IS 'FK → events.id';
COMMENT ON COLUMN public.matches.round_number IS 'ラウンド番号（1〜matches_per_event）';
COMMENT ON COLUMN public.matches.lobby_number IS 'ロビー番号（後勝ち方式）';
COMMENT ON COLUMN public.matches.status IS 'マッチステータス: waiting, in_progress, confirmed';
COMMENT ON COLUMN public.matches.result IS '運営者確定結果: team_a, team_b';
COMMENT ON COLUMN public.matches.created_at IS '作成日時';
COMMENT ON COLUMN public.matches.updated_at IS '更新日時';

-- ============================================
-- 2. match_participants テーブル
-- ============================================

CREATE TABLE public.match_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  team text NOT NULL CHECK (team IN ('team_a', 'team_b')),
  vote text CHECK (vote IN ('win', 'lose')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (match_id, profile_id)
);

CREATE INDEX match_participants_match_id_idx
  ON public.match_participants(match_id);
CREATE INDEX match_participants_profile_id_idx
  ON public.match_participants(profile_id);

CREATE TRIGGER update_match_participants_updated_at
  BEFORE UPDATE ON public.match_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.match_participants IS 'マッチ参加者（チーム割り当てと勝敗投票）';
COMMENT ON COLUMN public.match_participants.id IS 'PK';
COMMENT ON COLUMN public.match_participants.match_id IS 'FK → matches.id';
COMMENT ON COLUMN public.match_participants.profile_id IS 'FK → profiles.id';
COMMENT ON COLUMN public.match_participants.team IS '所属チーム: team_a, team_b';
COMMENT ON COLUMN public.match_participants.vote IS '勝敗入力: win, lose';
COMMENT ON COLUMN public.match_participants.created_at IS '作成日時';
COMMENT ON COLUMN public.match_participants.updated_at IS '更新日時';

-- ============================================
-- 3. RLS 有効化
-- ============================================

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_participants ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. matches RLS ポリシー
-- ============================================

-- SELECT: 開始済み/確定済みマッチは全員閲覧可（waiting は非公開）
CREATE POLICY matches_select_public ON public.matches
  FOR SELECT
  TO public
  USING (status IN ('in_progress', 'confirmed'));

-- SELECT: 運営者は全マッチ閲覧可（waiting 含む）
CREATE POLICY matches_select_admin ON public.matches
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- INSERT: 運営者のみ作成可
CREATE POLICY matches_insert_admin ON public.matches
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- UPDATE: マッチ参加者がロビー番号を更新（in_progress の場合のみ）
-- カラム保護トリガーにより lobby_number 以外の変更は無効化される
CREATE POLICY matches_update_lobby ON public.matches
  FOR UPDATE
  TO authenticated
  USING (
    status = 'in_progress'
    AND EXISTS (
      SELECT 1 FROM public.match_participants mp
      WHERE mp.match_id = matches.id
      AND mp.profile_id = auth.uid()
    )
  )
  WITH CHECK (
    status = 'in_progress'
    AND EXISTS (
      SELECT 1 FROM public.match_participants mp
      WHERE mp.match_id = matches.id
      AND mp.profile_id = auth.uid()
    )
  );

-- UPDATE: 運営者は全マッチ更新可
CREATE POLICY matches_update_admin ON public.matches
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- DELETE: 運営者のみ削除可
CREATE POLICY matches_delete_admin ON public.matches
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================
-- 5. match_participants RLS ポリシー
-- ============================================

-- SELECT: 親マッチが開始済み/確定済みなら全員閲覧可
CREATE POLICY match_participants_select_public ON public.match_participants
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_participants.match_id
      AND m.status IN ('in_progress', 'confirmed')
    )
  );

-- SELECT: 運営者は全参加者閲覧可
CREATE POLICY match_participants_select_admin ON public.match_participants
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- INSERT: 運営者のみ作成可
CREATE POLICY match_participants_insert_admin ON public.match_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- UPDATE: 本人が vote を更新（親マッチが in_progress の場合のみ）
-- カラム保護トリガーにより vote 以外の変更は無効化される
CREATE POLICY match_participants_update_vote_own ON public.match_participants
  FOR UPDATE
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (
    profile_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_participants.match_id
      AND m.status = 'in_progress'
    )
  );

-- UPDATE: 運営者は全更新可
CREATE POLICY match_participants_update_admin ON public.match_participants
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- DELETE: 運営者のみ削除可
CREATE POLICY match_participants_delete_admin ON public.match_participants
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================
-- 6. カラム保護トリガー
-- ============================================

-- matches: 非管理者は lobby_number のみ変更可
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

-- match_participants: 非管理者は vote のみ変更可
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
