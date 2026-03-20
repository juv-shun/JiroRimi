-- Fix 1: generate_bracket - チーム数を厳密に4チーム固定にする
-- Fix 2: confirm_bracket_match - p_event_idを追加し、所属チェック＋イベント状態検証を行う

-- generate_bracket: チーム数チェックを != 4 に修正
CREATE OR REPLACE FUNCTION generate_bracket(p_event_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event RECORD;
  v_teams uuid[];
  v_confirmed_count int;
  v_gf uuid;
  v_lf uuid;
  v_lr1 uuid;
  v_wf uuid;
BEGIN
  SELECT id, status, match_format
    INTO v_event
    FROM events
   WHERE id = p_event_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'イベントが見つかりません';
  END IF;

  IF v_event.status != 'in_progress' THEN
    RAISE EXCEPTION 'イベントが進行中ではありません';
  END IF;

  IF v_event.match_format != 'double_elimination' THEN
    RAISE EXCEPTION 'ダブルエリミネーションイベントではありません';
  END IF;

  SELECT count(*) INTO v_confirmed_count
    FROM bracket_matches
   WHERE event_id = p_event_id
     AND status = 'confirmed';

  IF v_confirmed_count > 0 THEN
    RAISE EXCEPTION 'ブラケットに確定済みの対戦があるため再生成できません';
  END IF;

  DELETE FROM bracket_matches WHERE event_id = p_event_id;

  SELECT array_agg(id ORDER BY seed ASC)
    INTO v_teams
    FROM tournament_teams
   WHERE event_id = p_event_id;

  IF v_teams IS NULL OR array_length(v_teams, 1) != 4 THEN
    RAISE EXCEPTION 'チームが4チーム必要です';
  END IF;

  INSERT INTO bracket_matches (event_id, bracket_type, round_number, match_order, status)
  VALUES (p_event_id, 'grand_final', 1, 1, 'pending')
  RETURNING id INTO v_gf;

  INSERT INTO bracket_matches (event_id, bracket_type, round_number, match_order, status, winner_next_id)
  VALUES (p_event_id, 'losers', 2, 1, 'pending', v_gf)
  RETURNING id INTO v_lf;

  INSERT INTO bracket_matches (event_id, bracket_type, round_number, match_order, status, winner_next_id)
  VALUES (p_event_id, 'losers', 1, 1, 'pending', v_lf)
  RETURNING id INTO v_lr1;

  INSERT INTO bracket_matches (event_id, bracket_type, round_number, match_order, status, winner_next_id, loser_next_id)
  VALUES (p_event_id, 'winners', 2, 1, 'pending', v_gf, v_lf)
  RETURNING id INTO v_wf;

  INSERT INTO bracket_matches (event_id, bracket_type, round_number, match_order, team_a_id, team_b_id, status, winner_next_id, loser_next_id)
  VALUES (p_event_id, 'winners', 1, 1, v_teams[1], v_teams[4], 'ready', v_wf, v_lr1);

  INSERT INTO bracket_matches (event_id, bracket_type, round_number, match_order, team_a_id, team_b_id, status, winner_next_id, loser_next_id)
  VALUES (p_event_id, 'winners', 1, 2, v_teams[2], v_teams[3], 'ready', v_wf, v_lr1);
END;
$$;

-- confirm_bracket_match: p_event_id を追加し、所属チェック＋イベント状態検証を行う
CREATE OR REPLACE FUNCTION confirm_bracket_match(p_event_id uuid, p_bracket_match_id uuid, p_winner_team_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event RECORD;
  v_match RECORD;
  v_loser_team_id uuid;
  v_winner_is_team_a boolean;
  v_loser_is_team_a boolean;
BEGIN
  -- イベント状態検証
  SELECT id, status, match_format
    INTO v_event
    FROM events
   WHERE id = p_event_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'イベントが見つかりません';
  END IF;

  IF v_event.status != 'in_progress' THEN
    RAISE EXCEPTION 'イベントが進行中ではありません';
  END IF;

  IF v_event.match_format != 'double_elimination' THEN
    RAISE EXCEPTION 'ダブルエリミネーションイベントではありません';
  END IF;

  -- 対象マッチ取得（イベント所属チェック込み）
  SELECT id, event_id, bracket_type, round_number, match_order,
         team_a_id, team_b_id, winner_team_id, status,
         winner_next_id, loser_next_id
    INTO v_match
    FROM bracket_matches
   WHERE id = p_bracket_match_id
     AND event_id = p_event_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '対戦が見つかりません';
  END IF;

  IF v_match.status NOT IN ('ready', 'in_progress') THEN
    RAISE EXCEPTION '対戦はまだ開始できない状態か、既に確定済みです';
  END IF;

  IF p_winner_team_id != v_match.team_a_id AND p_winner_team_id != v_match.team_b_id THEN
    RAISE EXCEPTION '勝者は対戦チームのいずれかである必要があります';
  END IF;

  IF p_winner_team_id = v_match.team_a_id THEN
    v_loser_team_id := v_match.team_b_id;
  ELSE
    v_loser_team_id := v_match.team_a_id;
  END IF;

  UPDATE bracket_matches
     SET winner_team_id = p_winner_team_id,
         status = 'confirmed'
   WHERE id = p_bracket_match_id;

  v_winner_is_team_a := CASE
    WHEN v_match.bracket_type = 'winners' AND v_match.round_number = 1 AND v_match.match_order = 1 THEN true
    WHEN v_match.bracket_type = 'winners' AND v_match.round_number = 1 AND v_match.match_order = 2 THEN false
    WHEN v_match.bracket_type = 'winners' AND v_match.round_number = 2 THEN true
    WHEN v_match.bracket_type = 'losers' THEN false
    ELSE true
  END;

  v_loser_is_team_a := CASE
    WHEN v_match.bracket_type = 'winners' AND v_match.round_number = 1 AND v_match.match_order = 1 THEN true
    WHEN v_match.bracket_type = 'winners' AND v_match.round_number = 1 AND v_match.match_order = 2 THEN false
    WHEN v_match.bracket_type = 'winners' AND v_match.round_number = 2 THEN true
    ELSE true
  END;

  IF v_match.winner_next_id IS NOT NULL THEN
    PERFORM place_team_in_next(v_match.winner_next_id, p_winner_team_id, v_winner_is_team_a);
  END IF;

  IF v_match.loser_next_id IS NOT NULL THEN
    PERFORM place_team_in_next(v_match.loser_next_id, v_loser_team_id, v_loser_is_team_a);
  END IF;

  IF v_match.bracket_type = 'grand_final' AND v_match.round_number = 1 THEN
    IF p_winner_team_id = v_match.team_b_id THEN
      INSERT INTO bracket_matches (
        event_id, bracket_type, round_number, match_order,
        team_a_id, team_b_id, status,
        winner_next_id, loser_next_id
      ) VALUES (
        v_match.event_id, 'grand_final', 2, 1,
        v_match.team_a_id, v_match.team_b_id, 'ready',
        NULL, NULL
      );
    END IF;
  END IF;
END;
$$;
