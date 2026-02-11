-- ============================================
-- Migration: Create Phase 1 Tables
-- Version: 20260211000001
-- Description: profiles, tournaments, qualifiers, entries テーブルを作成
-- ============================================

-- ============================================
-- 1. profiles テーブル
-- ============================================

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  discord_id text NOT NULL UNIQUE,
  discord_username text,
  player_name text,
  x_id text,
  gender text CHECK (gender IN ('boys', 'girls')),
  first_role text CHECK (first_role IN ('top_carry', 'bot_carry', 'mid', 'tank', 'support')),
  second_role text CHECK (second_role IN ('top_carry', 'bot_carry', 'mid', 'tank', 'support')),
  third_role text CHECK (third_role IN ('top_carry', 'bot_carry', 'mid', 'tank', 'support')),
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS 'ユーザープロフィール（auth.users と 1:1）';
COMMENT ON COLUMN public.profiles.id IS 'PK, auth.users.id への FK';
COMMENT ON COLUMN public.profiles.discord_id IS 'Discord ユーザーID（認証から自動取得）';
COMMENT ON COLUMN public.profiles.discord_username IS 'Discord ユーザー名（表示用）';
COMMENT ON COLUMN public.profiles.player_name IS 'ゲーム内プレイヤー名';
COMMENT ON COLUMN public.profiles.x_id IS 'X (Twitter) ID';
COMMENT ON COLUMN public.profiles.gender IS '性別: boys(ボーイズ), girls(ガールズ)';
COMMENT ON COLUMN public.profiles.first_role IS '第1希望ロール';
COMMENT ON COLUMN public.profiles.second_role IS '第2希望ロール';
COMMENT ON COLUMN public.profiles.third_role IS '第3希望ロール';
COMMENT ON COLUMN public.profiles.role IS 'ユーザー権限: user(一般), admin(運営者)';

-- ============================================
-- 2. tournaments テーブル
-- ============================================

CREATE TABLE public.tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  gender text NOT NULL CHECK (gender IN ('boys', 'girls')),
  matches_per_qualifier int NOT NULL DEFAULT 5,
  gf_advance_count int NOT NULL DEFAULT 20,
  max_participants int,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'in_progress', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.tournaments IS '大会';
COMMENT ON COLUMN public.tournaments.name IS '大会名';
COMMENT ON COLUMN public.tournaments.gender IS '性別区分: boys(じろカップ), girls(りみカップ)';
COMMENT ON COLUMN public.tournaments.matches_per_qualifier IS '1予選あたりの試合数';
COMMENT ON COLUMN public.tournaments.gf_advance_count IS 'GF進出人数';
COMMENT ON COLUMN public.tournaments.max_participants IS '参加上限人数（NULL=無制限）';
COMMENT ON COLUMN public.tournaments.status IS 'ステータス: draft, open, in_progress, completed';

-- ============================================
-- 3. qualifiers テーブル
-- ============================================

CREATE TABLE public.qualifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  qualifier_number int NOT NULL,
  scheduled_date date NOT NULL,
  entry_start timestamptz NOT NULL,
  entry_end timestamptz NOT NULL,
  checkin_start timestamptz NOT NULL,
  checkin_end timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'entry_open', 'entry_closed', 'checkin_open', 'participants_confirmed', 'in_progress', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, qualifier_number)
);

COMMENT ON TABLE public.qualifiers IS '予選';
COMMENT ON COLUMN public.qualifiers.tournament_id IS 'FK → tournaments.id';
COMMENT ON COLUMN public.qualifiers.qualifier_number IS '予選回数（1, 2, 3...）';
COMMENT ON COLUMN public.qualifiers.scheduled_date IS '開催日';
COMMENT ON COLUMN public.qualifiers.entry_start IS 'エントリー開始日時';
COMMENT ON COLUMN public.qualifiers.entry_end IS 'エントリー締切日時';
COMMENT ON COLUMN public.qualifiers.checkin_start IS 'チェックイン開始時刻';
COMMENT ON COLUMN public.qualifiers.checkin_end IS 'チェックイン締切時刻';
COMMENT ON COLUMN public.qualifiers.status IS 'ステータス: scheduled, entry_open, entry_closed, checkin_open, participants_confirmed, in_progress, completed';

-- ============================================
-- 4. entries テーブル
-- ============================================

CREATE TABLE public.entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  qualifier_id uuid NOT NULL REFERENCES public.qualifiers(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, qualifier_id)
);

CREATE INDEX entries_qualifier_id_idx ON public.entries(qualifier_id);

COMMENT ON TABLE public.entries IS 'エントリー';
COMMENT ON COLUMN public.entries.profile_id IS 'FK → profiles.id';
COMMENT ON COLUMN public.entries.qualifier_id IS 'FK → qualifiers.id';
COMMENT ON COLUMN public.entries.created_at IS 'エントリー日時';

-- ============================================
-- 5. updated_at 自動更新トリガー
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tournaments_updated_at
  BEFORE UPDATE ON public.tournaments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_qualifiers_updated_at
  BEFORE UPDATE ON public.qualifiers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
