-- confirm_bracket_match: ブラケットマッチの結果を確定し、次戦にチームを自動配置する
CREATE OR REPLACE FUNCTION confirm_bracket_match(p_bracket_match_id uuid, p_winner_team_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_match RECORD;
  v_loser_team_id uuid;
  v_winner_is_team_a boolean;
  v_loser_is_team_a boolean;
BEGIN
  -- 1. 対象マッチ取得 (FOR UPDATE)
  SELECT id, event_id, bracket_type, round_number, match_order,
         team_a_id, team_b_id, winner_team_id, status,
         winner_next_id, loser_next_id
    INTO v_match
    FROM bracket_matches
   WHERE id = p_bracket_match_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '対戦が見つかりません';
  END IF;

  IF v_match.status NOT IN ('ready', 'in_progress') THEN
    RAISE EXCEPTION '対戦はまだ開始できない状態か、既に確定済みです';
  END IF;

  -- 2. winner が team_a or team_b と一致確認
  IF p_winner_team_id != v_match.team_a_id AND p_winner_team_id != v_match.team_b_id THEN
    RAISE EXCEPTION '勝者は対戦チームのいずれかである必要があります';
  END IF;

  -- 3. 敗者チーム特定
  IF p_winner_team_id = v_match.team_a_id THEN
    v_loser_team_id := v_match.team_b_id;
  ELSE
    v_loser_team_id := v_match.team_a_id;
  END IF;

  -- 4. 当マッチ更新
  UPDATE bracket_matches
     SET winner_team_id = p_winner_team_id,
         status = 'confirmed'
   WHERE id = p_bracket_match_id;

  -- 5. 配置先スロット決定
  -- 勝者スロット
  v_winner_is_team_a := CASE
    WHEN v_match.bracket_type = 'winners' AND v_match.round_number = 1 AND v_match.match_order = 1 THEN true
    WHEN v_match.bracket_type = 'winners' AND v_match.round_number = 1 AND v_match.match_order = 2 THEN false
    WHEN v_match.bracket_type = 'winners' AND v_match.round_number = 2 THEN true
    WHEN v_match.bracket_type = 'losers' THEN false
    ELSE true
  END;

  -- 敗者スロット
  v_loser_is_team_a := CASE
    WHEN v_match.bracket_type = 'winners' AND v_match.round_number = 1 AND v_match.match_order = 1 THEN true
    WHEN v_match.bracket_type = 'winners' AND v_match.round_number = 1 AND v_match.match_order = 2 THEN false
    WHEN v_match.bracket_type = 'winners' AND v_match.round_number = 2 THEN true
    ELSE true
  END;

  -- 6. 勝者の次戦配置
  IF v_match.winner_next_id IS NOT NULL THEN
    PERFORM place_team_in_next(v_match.winner_next_id, p_winner_team_id, v_winner_is_team_a);
  END IF;

  -- 7. 敗者の次戦配置
  IF v_match.loser_next_id IS NOT NULL THEN
    PERFORM place_team_in_next(v_match.loser_next_id, v_loser_team_id, v_loser_is_team_a);
  END IF;

  -- 8. リセットマッチ判定
  IF v_match.bracket_type = 'grand_final' AND v_match.round_number = 1 THEN
    IF p_winner_team_id = v_match.team_b_id THEN
      -- LB側勝利 → Reset マッチ INSERT
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
    -- WB側勝利 → なにもしない
  END IF;
END;
$$;

-- place_team_in_next: 次戦にチームを配置するヘルパー関数
CREATE OR REPLACE FUNCTION place_team_in_next(p_next_match_id uuid, p_team_id uuid, p_is_team_a_slot boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next RECORD;
BEGIN
  SELECT id, team_a_id, team_b_id, status
    INTO v_next
    FROM bracket_matches
   WHERE id = p_next_match_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF p_is_team_a_slot THEN
    UPDATE bracket_matches SET team_a_id = p_team_id WHERE id = p_next_match_id;
    -- 配置後、両チーム揃ったら ready
    IF v_next.team_b_id IS NOT NULL THEN
      UPDATE bracket_matches SET status = 'ready' WHERE id = p_next_match_id;
    END IF;
  ELSE
    UPDATE bracket_matches SET team_b_id = p_team_id WHERE id = p_next_match_id;
    -- 配置後、両チーム揃ったら ready
    IF v_next.team_a_id IS NOT NULL THEN
      UPDATE bracket_matches SET status = 'ready' WHERE id = p_next_match_id;
    END IF;
  END IF;
END;
$$;
