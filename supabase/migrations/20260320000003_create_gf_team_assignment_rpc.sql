-- ============================================
-- Migration: GFチーム編成RPC関数
-- Description: tournament_teams + tournament_team_members を
--   トランザクションで作成するRPC関数
-- ============================================

CREATE OR REPLACE FUNCTION public.create_gf_teams(
  p_event_id uuid,
  p_teams jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event record;
  v_team jsonb;
  v_team_id uuid;
  v_member_id text;
  v_checkin_ids uuid[];
  v_request_ids uuid[];
  v_existing_count int;
  i int;
BEGIN
  -- イベント取得（FOR UPDATEでロック）
  SELECT id, status, match_format
    INTO v_event
    FROM public.events
   WHERE id = p_event_id
   FOR UPDATE;

  IF v_event IS NULL THEN
    RAISE EXCEPTION 'イベントが見つかりません';
  END IF;

  IF v_event.status <> 'in_progress' THEN
    RAISE EXCEPTION 'イベントが進行中ではありません';
  END IF;

  IF v_event.match_format <> 'double_elimination' THEN
    RAISE EXCEPTION 'ダブルエリミネーションイベントではありません';
  END IF;

  -- 既存チームの存在チェック（TOCTOU対策）
  SELECT count(*) INTO v_existing_count
    FROM public.tournament_teams
   WHERE event_id = p_event_id;

  IF v_existing_count > 0 THEN
    RAISE EXCEPTION 'チーム編成は既に確定済みです';
  END IF;

  -- チェックイン済みエントリーのprofile_idを取得
  SELECT array_agg(profile_id ORDER BY profile_id)
    INTO v_checkin_ids
    FROM public.entries
   WHERE event_id = p_event_id
     AND checked_in_at IS NOT NULL;

  -- リクエストの全profile_idを収集
  SELECT array_agg(DISTINCT (member::text)::uuid ORDER BY (member::text)::uuid)
    INTO v_request_ids
    FROM jsonb_array_elements(p_teams) AS team,
         jsonb_array_elements_text(team -> 'member_profile_ids') AS member;

  -- 完全一致チェック
  IF v_checkin_ids IS DISTINCT FROM v_request_ids THEN
    RAISE EXCEPTION '参加者リストがチェックイン済みエントリーと一致しません';
  END IF;

  -- チームとメンバーを作成
  FOR i IN 0..jsonb_array_length(p_teams) - 1
  LOOP
    v_team := p_teams -> i;

    INSERT INTO public.tournament_teams (event_id, name, seed)
    VALUES (p_event_id, v_team ->> 'name', (v_team ->> 'seed')::int)
    RETURNING id INTO v_team_id;

    FOR v_member_id IN SELECT jsonb_array_elements_text(v_team -> 'member_profile_ids')
    LOOP
      INSERT INTO public.tournament_team_members (team_id, profile_id)
      VALUES (v_team_id, v_member_id::uuid);
    END LOOP;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.create_gf_teams IS 'GFチーム編成を確定する（tournament_teams + tournament_team_membersをトランザクションで作成）';
