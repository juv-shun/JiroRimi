-- ============================================
-- Migration: Add Avatar URL to Profiles
-- Version: 20260212000001
-- Description: profiles テーブルに avatar_url カラムを追加し、トリガーを更新
-- ============================================

-- 1. avatar_url カラムを追加
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

COMMENT ON COLUMN public.profiles.avatar_url IS 'Discord アバター画像URL';

-- 2. トリガー関数を更新してアバターURLも保存
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_discord_id text;
  v_discord_username text;
  v_avatar_hash text;
  v_avatar_url text;
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

  -- Discord アバターの取得
  v_avatar_hash := NEW.raw_user_meta_data->>'avatar_url';

  -- avatar_url がフルURLでない場合（ハッシュのみの場合）はURLを構築
  IF v_avatar_hash IS NOT NULL AND v_avatar_hash != '' THEN
    -- Supabase Discord OAuth は通常フルURLを返す
    IF v_avatar_hash LIKE 'https://%' THEN
      v_avatar_url := v_avatar_hash;
    ELSE
      -- ハッシュのみの場合はCDN URLを構築
      v_avatar_url := 'https://cdn.discordapp.com/avatars/' || v_discord_id || '/' || v_avatar_hash || '.png';
    END IF;
  ELSE
    v_avatar_url := NULL;
  END IF;

  -- profiles レコードの作成
  -- ON CONFLICT (id): 同一ユーザー再実行時は discord_username, avatar_url のみ更新（冪等性確保）
  -- discord_id 重複時は例外が発生する（データ整合性を優先）
  INSERT INTO public.profiles (id, discord_id, discord_username, avatar_url, x_id)
  VALUES (NEW.id, v_discord_id, v_discord_username, v_avatar_url, 'PENDING')
  ON CONFLICT (id) DO UPDATE SET
    discord_username = EXCLUDED.discord_username,
    avatar_url = EXCLUDED.avatar_url;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS 'auth.users への INSERT 時に profiles レコードを自動作成（アバターURL含む）';
