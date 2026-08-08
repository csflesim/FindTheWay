-- 課程獨立連結（2026-08-09）
-- 隱藏課程＝前台列表不顯示，但持有連結者仍可進入詳情頁報名。
-- 列表頁查詢自帶 visible = true 過濾，故放開單筆讀取不會讓隱藏課程出現在列表。

drop policy if exists "courses_public_read" on public.courses;
create policy "courses_public_read" on public.courses for select using (true);
