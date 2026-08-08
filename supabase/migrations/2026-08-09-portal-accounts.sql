-- 三端帳號分割（2026-08-09）
-- 會員／教師／後台人員是獨立的表與識別碼；Email／電話／LINE ID 為聯絡資料，可跨表重複。
-- 在 Supabase SQL Editor 整段執行；可重複執行，不影響既有資料。

-- 會員與後台人員的聯絡欄位（電話＋密碼、Email＋密碼登入的查表鍵）
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists contact_email text;

-- LINE ID 改為「端內唯一」：會員端一組、後台一組（教師綁定存 teachers 表，各端可綁同一個 LINE）
alter table public.profiles drop constraint if exists profiles_line_user_id_key;
drop index if exists public.profiles_line_user_id_key;
create unique index if not exists profiles_line_member_key
  on public.profiles (line_user_id) where line_user_id is not null and role = 'member';
create unique index if not exists profiles_line_staff_key
  on public.profiles (line_user_id) where line_user_id is not null and role in ('staff', 'admin');
