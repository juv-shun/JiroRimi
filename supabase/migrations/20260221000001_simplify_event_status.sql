-- ============================================
-- Migration: Simplify Event Status
-- Version: 20260221000001
-- Description: イベントステータスを7つから3つに簡素化
--              時間ベースのフェーズはアプリ層で算出する設計に変更
-- ============================================

-- 旧ステータス値を新ステータスに正規化
UPDATE public.events SET status = 'scheduled'
  WHERE status IN ('entry_open', 'entry_closed', 'checkin_open', 'participants_confirmed');

-- CHECK制約を更新
ALTER TABLE public.events DROP CONSTRAINT events_status_check;
ALTER TABLE public.events ADD CONSTRAINT events_status_check
  CHECK (status IN ('scheduled', 'in_progress', 'completed'));
COMMENT ON COLUMN public.events.status IS 'ステータス: scheduled, in_progress, completed';
