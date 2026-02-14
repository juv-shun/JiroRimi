-- ============================================
-- 1. テーブル名変更
-- ============================================
ALTER TABLE public.qualifiers RENAME TO events;

-- ============================================
-- 2. カラム名変更
-- ============================================
ALTER TABLE public.events RENAME COLUMN qualifier_number TO event_number;
ALTER TABLE public.entries RENAME COLUMN qualifier_id TO event_id;
ALTER TABLE public.tournaments RENAME COLUMN matches_per_qualifier TO matches_per_event;

-- ============================================
-- 3. 新カラム追加
-- ============================================
ALTER TABLE public.events ADD COLUMN event_type text NOT NULL DEFAULT 'qualifier';
ALTER TABLE public.events ADD COLUMN match_format text NOT NULL DEFAULT 'swiss';

-- ============================================
-- 4. CHECK制約追加
-- ============================================
ALTER TABLE public.events ADD CONSTRAINT events_event_type_check
  CHECK (event_type IN ('qualifier', 'main'));
ALTER TABLE public.events ADD CONSTRAINT events_match_format_check
  CHECK (match_format IN ('swiss', 'double_elimination', 'single_elimination', 'round_robin'));

-- ============================================
-- 5. 制約名リネーム
-- ============================================
ALTER TABLE public.events RENAME CONSTRAINT qualifiers_tournament_id_qualifier_number_key
  TO events_tournament_id_event_number_key;
ALTER TABLE public.events RENAME CONSTRAINT qualifiers_tournament_id_fkey
  TO events_tournament_id_fkey;
ALTER TABLE public.events RENAME CONSTRAINT qualifiers_status_check
  TO events_status_check;
ALTER TABLE public.entries RENAME CONSTRAINT entries_qualifier_id_fkey
  TO entries_event_id_fkey;
ALTER TABLE public.entries RENAME CONSTRAINT entries_profile_id_qualifier_id_key
  TO entries_profile_id_event_id_key;

-- ============================================
-- 6. インデックス名リネーム
-- ============================================
ALTER INDEX entries_qualifier_id_idx RENAME TO entries_event_id_idx;

-- ============================================
-- 7. トリガー名リネーム
-- ============================================
ALTER TRIGGER update_qualifiers_updated_at ON public.events
  RENAME TO update_events_updated_at;

-- ============================================
-- 8. RLS ポリシー名リネーム
-- ============================================
ALTER POLICY qualifiers_select_public ON public.events RENAME TO events_select_public;
ALTER POLICY qualifiers_select_admin ON public.events RENAME TO events_select_admin;
ALTER POLICY qualifiers_insert_policy ON public.events RENAME TO events_insert_policy;
ALTER POLICY qualifiers_update_policy ON public.events RENAME TO events_update_policy;
ALTER POLICY qualifiers_delete_policy ON public.events RENAME TO events_delete_policy;

-- ============================================
-- 9. コメント更新
-- ============================================
COMMENT ON TABLE public.events IS 'イベント（予選・本戦）';
COMMENT ON COLUMN public.events.event_number IS 'イベント番号（大会内での連番）';
COMMENT ON COLUMN public.events.event_type IS 'イベント種別: qualifier(予選), main(本戦)';
COMMENT ON COLUMN public.events.match_format IS '進行形式: swiss, double_elimination, single_elimination, round_robin';
COMMENT ON COLUMN public.entries.event_id IS 'FK → events.id';
COMMENT ON COLUMN public.tournaments.matches_per_event IS '1イベントあたりの試合数';
