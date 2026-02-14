-- protect_role_column トリガー関数を修正
-- service_role キー接続時（auth.uid() = NULL）は role 変更を許可する
CREATE OR REPLACE FUNCTION public.protect_role_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- role が変更されようとしている場合
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    -- service_role 接続（auth.uid() が NULL）は許可、それ以外は運営者のみ変更可能
    IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
      NEW.role := OLD.role;  -- 変更を無効化
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
