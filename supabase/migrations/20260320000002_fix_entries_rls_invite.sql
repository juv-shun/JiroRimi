-- ============================================
-- Migration: entries_insert_own に entry_type='open' 条件追加
-- Description: 招待制イベントへの一般ユーザー自己エントリーをDBレベルで防止
-- ============================================

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
      AND e.entry_type = 'open'
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
