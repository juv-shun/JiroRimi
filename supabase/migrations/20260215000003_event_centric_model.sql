-- ============================================
-- 1. events に新カラム追加
-- ============================================
ALTER TABLE public.events ADD COLUMN name text;
ALTER TABLE public.events ADD COLUMN entry_type text NOT NULL DEFAULT 'open';
ALTER TABLE public.events ADD COLUMN matches_per_event int;
ALTER TABLE public.events ADD COLUMN max_participants int;

-- ============================================
-- 2. 既存データの移行
-- ============================================
UPDATE public.events SET
  name = 'イベント ' || event_number,
  matches_per_event = (SELECT t.matches_per_event FROM public.tournaments t WHERE t.id = events.tournament_id);

-- ============================================
-- 3. NOT NULL 制約を後付け
-- ============================================
ALTER TABLE public.events ALTER COLUMN name SET NOT NULL;
ALTER TABLE public.events ALTER COLUMN matches_per_event SET NOT NULL;
ALTER TABLE public.events ALTER COLUMN matches_per_event SET DEFAULT 5;

-- ============================================
-- 4. entry_type の CHECK 制約
-- ============================================
ALTER TABLE public.events ADD CONSTRAINT events_entry_type_check
  CHECK (entry_type IN ('open', 'invite'));

-- ============================================
-- 5. event_type を削除
-- ============================================
ALTER TABLE public.events DROP CONSTRAINT events_event_type_check;
ALTER TABLE public.events DROP COLUMN event_type;

-- ============================================
-- 6. tournaments から不要カラムを削除
-- ============================================
ALTER TABLE public.tournaments DROP CONSTRAINT tournaments_category_check;
ALTER TABLE public.tournaments DROP COLUMN is_boys;
ALTER TABLE public.tournaments DROP COLUMN is_girls;
ALTER TABLE public.tournaments DROP COLUMN matches_per_event;
ALTER TABLE public.tournaments DROP COLUMN gf_advance_count;
ALTER TABLE public.tournaments DROP COLUMN max_participants;
ALTER TABLE public.tournaments DROP COLUMN rules;

-- ============================================
-- 7. コメント更新
-- ============================================
COMMENT ON TABLE public.events IS 'イベント（大会の構成単位）';
COMMENT ON COLUMN public.events.name IS 'イベント名';
COMMENT ON COLUMN public.events.entry_type IS 'エントリー方式: open(オープン), invite(招待制)';
COMMENT ON COLUMN public.events.matches_per_event IS '試合数';
COMMENT ON COLUMN public.events.max_participants IS '参加上限人数（NULLは無制限）';
