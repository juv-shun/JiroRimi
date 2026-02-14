-- ============================================
-- Migration: Add Rules Columns
-- Version: 20260214000002
-- Description: tournaments と qualifiers テーブルに rules カラムを追加
-- ============================================

-- 1. tournaments テーブルに rules カラムを追加
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS rules text;

COMMENT ON COLUMN public.tournaments.rules IS '大会ルール（自由記載）';

-- 2. qualifiers テーブルに rules カラムを追加
ALTER TABLE public.qualifiers ADD COLUMN IF NOT EXISTS rules text;

COMMENT ON COLUMN public.qualifiers.rules IS '予選固有ルール（NULLの場合は大会ルールを適用）';
