-- ============================================
-- bracket_matches テストデータ（手動確認用）
-- ============================================
-- 使用前に以下のプレースホルダを実際のIDに置換してください:
--   __EVENT_ID__  : GFイベント（match_format='double_elimination'）のID
--   __TEAM1_ID__  : seed=1 のチームID
--   __TEAM2_ID__  : seed=2 のチームID
--   __TEAM3_ID__  : seed=3 のチームID
--   __TEAM4_ID__  : seed=4 のチームID
--
-- 確認方法:
--   SELECT id, name, seed FROM tournament_teams
--   WHERE event_id = '__EVENT_ID__' ORDER BY seed;

-- 6試合の標準ブラケット構成
-- WR1-M1: Seed1 vs Seed4 → Seed1勝利（confirmed）
-- WR1-M2: Seed2 vs Seed3 → Seed2勝利（confirmed）
-- LR1:    Seed4 vs Seed3 → Seed3勝利（confirmed）
-- WF:     Seed1 vs Seed2（ready）
-- LF:     未定（pending）
-- GF:     未定（pending）

INSERT INTO bracket_matches (event_id, bracket_type, round_number, match_order, team_a_id, team_b_id, winner_team_id, status)
VALUES
  -- Winners Round 1
  ('__EVENT_ID__', 'winners', 1, 1, '__TEAM1_ID__', '__TEAM4_ID__', '__TEAM1_ID__', 'confirmed'),
  ('__EVENT_ID__', 'winners', 1, 2, '__TEAM2_ID__', '__TEAM3_ID__', '__TEAM2_ID__', 'confirmed'),
  -- Winners Final
  ('__EVENT_ID__', 'winners', 2, 1, '__TEAM1_ID__', '__TEAM2_ID__', NULL, 'ready'),
  -- Losers Round 1
  ('__EVENT_ID__', 'losers', 1, 1, '__TEAM4_ID__', '__TEAM3_ID__', '__TEAM3_ID__', 'confirmed'),
  -- Losers Final
  ('__EVENT_ID__', 'losers', 2, 1, NULL, NULL, NULL, 'pending'),
  -- Grand Final
  ('__EVENT_ID__', 'grand_final', 1, 1, NULL, NULL, NULL, 'pending');

-- Cleanup:
-- DELETE FROM bracket_matches WHERE event_id = '__EVENT_ID__';
