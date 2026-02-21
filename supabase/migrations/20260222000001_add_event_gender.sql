-- ============================================
-- Migration: イベントに性別制限カラムを追加
-- Description: events.gender で Boys/Girls 限定イベントを制御
-- ============================================

-- 1. events テーブルに gender カラム追加
ALTER TABLE public.events ADD COLUMN gender text;

ALTER TABLE public.events ADD CONSTRAINT events_gender_check
  CHECK (gender IS NULL OR gender IN ('boys', 'girls'));

COMMENT ON COLUMN public.events.gender IS '性別制限: boys(男子のみ), girls(女子のみ), NULL(制限なし)';

-- 2. entries_insert_own RLS ポリシーに性別チェックを追加（再作成）
DROP POLICY IF EXISTS entries_insert_own ON public.entries;

CREATE POLICY entries_insert_own ON public.entries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    profile_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.tournaments t ON t.id = e.tournament_id
      WHERE e.id = event_id
      AND t.status != 'draft'
      AND now() >= e.entry_start
      AND now() <= e.entry_end
      AND (
        e.gender IS NULL
        OR e.gender = (
          SELECT p.gender FROM public.profiles p WHERE p.id = auth.uid()
        )
      )
    )
  );

-- 注: entries_insert_admin (is_admin()) は変更不要 → admin は自動バイパス
