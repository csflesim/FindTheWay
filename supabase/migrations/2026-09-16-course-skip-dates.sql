-- 課程停課日期（2026-09-16）
-- 固定週期課程可在後台把特定日期設為停課；展開場次（報名、名冊、課表）時自動排除。
-- 在 Supabase SQL Editor 整段執行；可重複執行，不影響既有資料。

alter table public.courses add column if not exists skip_dates jsonb not null default '[]';
