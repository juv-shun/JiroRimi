-- ============================================
-- Migration: Create Profile Auto-Creation Trigger
-- Version: 20260211000003
-- Description: auth.users への新規ユーザー登録時に profiles レコードを自動作成
-- ============================================

-- 既存トリガーがあれば削除（マイグレーション再実行時の安全性確保）
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_discord_id text;
  v_discord_username text;
BEGIN
  -- auth.identities から Discord provider_id を取得（provider_id カラムを使用）
  SELECT provider_id::text
  INTO v_discord_id
  FROM auth.identities
  WHERE user_id = NEW.id
    AND provider = 'discord'
  LIMIT 1;

  -- auth.identities から取得できない場合は raw_user_meta_data からフォールバック
  IF v_discord_id IS NULL OR v_discord_id = '' THEN
    v_discord_id := NEW.raw_user_meta_data->>'provider_id';
  END IF;

  -- それでも取得できない場合は認証を失敗させる（Fail-Close）
  IF v_discord_id IS NULL OR v_discord_id = '' THEN
    RAISE EXCEPTION 'Discord provider_id not found for user %', NEW.id;
  END IF;

  -- Discord ユーザー名の取得
  v_discord_username := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'preferred_username'
  );

  -- profiles レコードの作成
  -- ON CONFLICT (id): 同一ユーザー再実行時は discord_username のみ更新（冪等性確保）
  -- discord_id 重複時は例外が発生する（データ整合性を優先）
  INSERT INTO public.profiles (id, discord_id, discord_username, x_id)
  VALUES (NEW.id, v_discord_id, v_discord_username, 'PENDING')
  ON CONFLICT (id) DO UPDATE SET
    discord_username = EXCLUDED.discord_username;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS 'auth.users への INSERT 時に profiles レコードを自動作成';

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Note: COMMENT ON TRIGGER は auth.users に対して権限がないため省略
