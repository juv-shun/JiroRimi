-- 1. 新カラム追加（デフォルトfalse）
ALTER TABLE public.tournaments ADD COLUMN is_boys boolean NOT NULL DEFAULT false;
ALTER TABLE public.tournaments ADD COLUMN is_girls boolean NOT NULL DEFAULT false;

-- 2. 既存データ移行
UPDATE public.tournaments SET is_boys = true WHERE gender = 'boys';
UPDATE public.tournaments SET is_girls = true WHERE gender = 'girls';

-- 3. 旧カラム削除
ALTER TABLE public.tournaments DROP COLUMN gender;

-- 4. CHECK制約追加（少なくとも1つはtrue）
ALTER TABLE public.tournaments ADD CONSTRAINT tournaments_category_check CHECK (is_boys OR is_girls);

-- 5. コメント
COMMENT ON COLUMN public.tournaments.is_boys IS 'じろカップ（Boys）対象';
COMMENT ON COLUMN public.tournaments.is_girls IS 'りみカップ（Girls）対象';
