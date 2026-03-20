-- generate_bracket: 4チームダブルエリミネーションブラケットを生成する
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
  -- 1. イベント取得 (FOR UPDATE)
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

  -- 2. 既存 bracket_matches チェック
  SELECT count(*) INTO v_confirmed_count
    FROM bracket_matches
   WHERE event_id = p_event_id
     AND status = 'confirmed';

  IF v_confirmed_count > 0 THEN
    RAISE EXCEPTION 'ブラケットに確定済みの対戦があるため再生成できません';
  END IF;

  -- confirmed が0件なら全削除（冪等な再生成）
  DELETE FROM bracket_matches WHERE event_id = p_event_id;

  -- 3. チーム取得
  SELECT array_agg(id ORDER BY seed ASC)
    INTO v_teams
    FROM tournament_teams
   WHERE event_id = p_event_id;

  IF v_teams IS NULL OR array_length(v_teams, 1) < 4 THEN
    RAISE EXCEPTION 'チームが4チーム必要です';
  END IF;

  -- 4. 6試合を INSERT（逆順で外部キー参照を解決）
  -- Grand Final (round=1)
  INSERT INTO bracket_matches (event_id, bracket_type, round_number, match_order, status)
  VALUES (p_event_id, 'grand_final', 1, 1, 'pending')
  RETURNING id INTO v_gf;

  -- Losers Final (round=2)
  INSERT INTO bracket_matches (event_id, bracket_type, round_number, match_order, status, winner_next_id)
  VALUES (p_event_id, 'losers', 2, 1, 'pending', v_gf)
  RETURNING id INTO v_lf;

  -- Losers Round 1 (round=1)
  INSERT INTO bracket_matches (event_id, bracket_type, round_number, match_order, status, winner_next_id)
  VALUES (p_event_id, 'losers', 1, 1, 'pending', v_lf)
  RETURNING id INTO v_lr1;

  -- Winners Final (round=2)
  INSERT INTO bracket_matches (event_id, bracket_type, round_number, match_order, status, winner_next_id, loser_next_id)
  VALUES (p_event_id, 'winners', 2, 1, 'pending', v_gf, v_lf)
  RETURNING id INTO v_wf;

  -- Winners Round 1 - Match 1 (Seed1 vs Seed4, ready)
  INSERT INTO bracket_matches (event_id, bracket_type, round_number, match_order, team_a_id, team_b_id, status, winner_next_id, loser_next_id)
  VALUES (p_event_id, 'winners', 1, 1, v_teams[1], v_teams[4], 'ready', v_wf, v_lr1);

  -- Winners Round 1 - Match 2 (Seed2 vs Seed3, ready)
  INSERT INTO bracket_matches (event_id, bracket_type, round_number, match_order, team_a_id, team_b_id, status, winner_next_id, loser_next_id)
  VALUES (p_event_id, 'winners', 1, 2, v_teams[2], v_teams[3], 'ready', v_wf, v_lr1);
END;
$$;
