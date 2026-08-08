-- 券制改造：訂單歸訂單、券歸券（2026-08-09）
-- 在 Supabase SQL Editor 整段執行；可重複執行（idempotent），不影響既有資料。

-- 商品：單堂型別（堂數固定 1，作為課程直購計價商品）
alter table public.products add column if not exists is_single boolean not null default false;

-- 券：新增「待使用」狀態、課程綁定欄位、歷程
alter table public.tickets drop constraint if exists tickets_status_check;
alter table public.tickets add constraint tickets_status_check
  check (status in ('未使用','待使用','已使用','已失效'));
alter table public.tickets add column if not exists course_id uuid references public.courses(id) on delete set null;
alter table public.tickets add column if not exists session_date date;
alter table public.tickets add column if not exists history jsonb not null default '[]';
create index if not exists tickets_course_session_idx on public.tickets (course_id, session_date);

-- 訂單：單堂直購預選的上課日期 ["YYYY-MM-DD", ...]
alter table public.orders add column if not exists booking_dates jsonb;
