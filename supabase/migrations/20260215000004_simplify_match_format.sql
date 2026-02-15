-- ============================================
-- 進行形式の簡素化
-- swiss → qualifier に変更
-- single_elimination, round_robin を削除
-- matches_per_event の条件付き制約を追加
-- ============================================
--
-- ⚠️ デプロイ順序: このマイグレーションはアプリデプロイ前に適用必須
--    アプリが新しい match_format 値（qualifier）と matches_per_event=NULL を
--    使用するため、先にDBスキーマを更新する必要があります。
-- ============================================

-- 1. 既存の CHECK 制約を先に削除（データ変換前に削除が必要）
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_match_format_check;
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_matches_per_event_check;

-- 2. matches_per_event を nullable に変更
ALTER TABLE public.events ALTER COLUMN matches_per_event DROP NOT NULL;

-- 3. 既存データの変換: swiss → qualifier
UPDATE public.events SET match_format = 'qualifier' WHERE match_format = 'swiss';

-- 4. single_elimination, round_robin を qualifier に変換
UPDATE public.events SET match_format = 'qualifier'
WHERE match_format IN ('single_elimination', 'round_robin');

-- 5. double_elimination の matches_per_event を NULL に
UPDATE public.events SET matches_per_event = NULL
WHERE match_format = 'double_elimination';

-- 6. 新しい CHECK 制約を追加
-- match_format は qualifier または double_elimination のみ
ALTER TABLE public.events ADD CONSTRAINT events_match_format_check
  CHECK (match_format IN ('qualifier', 'double_elimination'));

-- match_format と matches_per_event の整合性を保証
ALTER TABLE public.events ADD CONSTRAINT events_matches_per_event_check
  CHECK (
    (match_format = 'qualifier' AND matches_per_event IS NOT NULL AND matches_per_event >= 1 AND matches_per_event <= 10)
    OR
    (match_format = 'double_elimination' AND matches_per_event IS NULL)
  );

-- 7. コメント更新
COMMENT ON COLUMN public.events.match_format IS '進行形式: qualifier(予選), double_elimination(ダブルエリミネーション)';
COMMENT ON COLUMN public.events.matches_per_event IS '試合数（予選形式の場合のみ、1-10）。ダブルエリミネーションはNULL';
