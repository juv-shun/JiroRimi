-- entries テーブルにチェックイン機能を追加

-- 1. カラム追加
ALTER TABLE public.entries ADD COLUMN checked_in_at timestamptz;
COMMENT ON COLUMN public.entries.checked_in_at IS 'チェックイン日時（NULL=未チェックイン）';

-- 2. カラム保護トリガー
-- 非管理者ユーザーが checked_in_at 以外のカラムを変更しようとした場合、変更を無効化する
CREATE OR REPLACE FUNCTION public.protect_entry_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 非管理者は checked_in_at 以外の変更を無効化し、checked_in_at はサーバー時刻を強制
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    NEW.id := OLD.id;
    NEW.profile_id := OLD.profile_id;
    NEW.event_id := OLD.event_id;
    NEW.created_at := OLD.created_at;
    NEW.checked_in_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_entry_columns_trigger
  BEFORE UPDATE ON public.entries
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_entry_columns();

-- 3. RLS UPDATE ポリシー

-- 参加者用: 自分のエントリーに対し、チェックイン期間内かつ checked_in_at を非NULL値に設定する場合のみ許可（取り消し不可）
CREATE POLICY entries_update_checkin_own ON public.entries
  FOR UPDATE
  TO authenticated
  USING (profile_id = auth.uid() AND checked_in_at IS NULL)
  WITH CHECK (
    profile_id = auth.uid()
    AND checked_in_at IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id
      AND now() >= e.checkin_start
      AND now() <= e.checkin_end
    )
  );

-- 管理者用: 全エントリーを時間帯制限なしで更新可能（チェックイン追加・取り消し両方）
CREATE POLICY entries_update_checkin_admin ON public.entries
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
