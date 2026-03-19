-- ============================================
-- Migration: GF関連テーブル追加・RLS設定
-- Description: ダブルエリミネーショントーナメント用の
--   tournament_teams, tournament_team_members, bracket_matches を作成
-- ============================================

-- ============================================
-- 1. tournament_teams（トーナメントチーム）
-- ============================================
CREATE TABLE public.tournament_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  seed int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT tournament_teams_seed_range CHECK (seed >= 1 AND seed <= 4),
  CONSTRAINT tournament_teams_event_seed_unique UNIQUE (event_id, seed)
);

COMMENT ON TABLE public.tournament_teams IS 'GFイベントのトーナメントチーム（4チーム）';
COMMENT ON COLUMN public.tournament_teams.event_id IS '所属イベントID';
COMMENT ON COLUMN public.tournament_teams.name IS 'チーム名';
COMMENT ON COLUMN public.tournament_teams.seed IS 'シード順（1-4）';
COMMENT ON COLUMN public.tournament_teams.created_at IS '作成日時';

-- ============================================
-- 2. tournament_team_members（チームメンバー）
-- ============================================
CREATE TABLE public.tournament_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.tournament_teams(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT tournament_team_members_unique UNIQUE (team_id, profile_id)
);

COMMENT ON TABLE public.tournament_team_members IS 'トーナメントチームの所属メンバー';
COMMENT ON COLUMN public.tournament_team_members.team_id IS '所属チームID';
COMMENT ON COLUMN public.tournament_team_members.profile_id IS 'プレイヤーID';
COMMENT ON COLUMN public.tournament_team_members.created_at IS '作成日時';

-- ============================================
-- 3. bracket_matches（ブラケット対戦）
-- ============================================
CREATE TABLE public.bracket_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  bracket_type text NOT NULL,
  round_number int NOT NULL,
  match_order int NOT NULL DEFAULT 1,
  team_a_id uuid REFERENCES public.tournament_teams(id),
  team_b_id uuid REFERENCES public.tournament_teams(id),
  winner_team_id uuid REFERENCES public.tournament_teams(id),
  winner_next_id uuid REFERENCES public.bracket_matches(id),
  loser_next_id uuid REFERENCES public.bracket_matches(id),
  match_id uuid REFERENCES public.matches(id),
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT bracket_matches_bracket_type_check CHECK (bracket_type IN ('winners', 'losers', 'grand_final')),
  CONSTRAINT bracket_matches_status_check CHECK (status IN ('pending', 'ready', 'in_progress', 'confirmed')),
  CONSTRAINT bracket_matches_round_number_check CHECK (round_number >= 1)
);

COMMENT ON TABLE public.bracket_matches IS 'ダブルエリミネーションブラケットの対戦構造';
COMMENT ON COLUMN public.bracket_matches.event_id IS '所属イベントID';
COMMENT ON COLUMN public.bracket_matches.bracket_type IS 'ブラケット種別: winners, losers, grand_final';
COMMENT ON COLUMN public.bracket_matches.round_number IS 'ブラケット内ラウンド番号';
COMMENT ON COLUMN public.bracket_matches.match_order IS '同ラウンド内の対戦順';
COMMENT ON COLUMN public.bracket_matches.team_a_id IS '対戦チームA（未定の場合NULL）';
COMMENT ON COLUMN public.bracket_matches.team_b_id IS '対戦チームB（未定の場合NULL）';
COMMENT ON COLUMN public.bracket_matches.winner_team_id IS '勝者チーム（未確定の場合NULL）';
COMMENT ON COLUMN public.bracket_matches.winner_next_id IS '勝者の次戦（ブラケット内リンク）';
COMMENT ON COLUMN public.bracket_matches.loser_next_id IS '敗者の次戦（ウィナーズのみ）';
COMMENT ON COLUMN public.bracket_matches.match_id IS '実際の5v5マッチへの参照（未開始の場合NULL）';
COMMENT ON COLUMN public.bracket_matches.status IS '対戦ステータス: pending, ready, in_progress, confirmed';
COMMENT ON COLUMN public.bracket_matches.created_at IS '作成日時';
COMMENT ON COLUMN public.bracket_matches.updated_at IS '更新日時';

-- updated_at 自動更新トリガー
CREATE TRIGGER update_bracket_matches_updated_at
  BEFORE UPDATE ON public.bracket_matches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 4. RLS設定
-- ============================================

-- tournament_teams
ALTER TABLE public.tournament_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY tournament_teams_select_all ON public.tournament_teams
  FOR SELECT
  USING (true);

CREATE POLICY tournament_teams_insert_admin ON public.tournament_teams
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY tournament_teams_update_admin ON public.tournament_teams
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY tournament_teams_delete_admin ON public.tournament_teams
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- tournament_team_members
ALTER TABLE public.tournament_team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY tournament_team_members_select_all ON public.tournament_team_members
  FOR SELECT
  USING (true);

CREATE POLICY tournament_team_members_insert_admin ON public.tournament_team_members
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY tournament_team_members_update_admin ON public.tournament_team_members
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY tournament_team_members_delete_admin ON public.tournament_team_members
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- bracket_matches
ALTER TABLE public.bracket_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY bracket_matches_select_all ON public.bracket_matches
  FOR SELECT
  USING (true);

CREATE POLICY bracket_matches_insert_admin ON public.bracket_matches
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY bracket_matches_update_admin ON public.bracket_matches
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY bracket_matches_delete_admin ON public.bracket_matches
  FOR DELETE
  TO authenticated
  USING (public.is_admin());
