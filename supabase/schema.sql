-- ============================================================================
-- Find the Way 忙碌不迷路藝術工作坊 — 正式版 schema（v2 全面重建）
--
-- 使用方式：Supabase Dashboard → SQL Editor → New query → 貼上全部執行。
-- ⚠️ 此腳本會【清空所有資料】後重建（設定、課程、訂單全部歸零），
--    只在初始化或刻意重置時使用；日常欄位調整請用單獨的 ALTER 語句。
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 0. 清除舊結構
-- ────────────────────────────────────────────────────────────────────────────
drop table if exists public.message_logs        cascade;
drop table if exists public.workflows           cascade;
drop table if exists public.message_templates   cascade;
drop table if exists public.online_sections     cascade;
drop table if exists public.online_courses      cascade;
drop table if exists public.banners             cascade;
drop table if exists public.tickets             cascade;
drop table if exists public.orders              cascade;
drop table if exists public.products            cascade;
drop table if exists public.teacher_availability cascade;
drop table if exists public.enrollments         cascade;
drop table if exists public.course_sessions     cascade;
drop table if exists public.course_teachers     cascade;
drop table if exists public.courses             cascade;
drop table if exists public.classrooms          cascade;
drop table if exists public.units               cascade;
drop table if exists public.teachers            cascade;
drop table if exists public.students            cascade;
drop table if exists public.settings            cascade;
drop table if exists public.profiles            cascade;
-- 舊版遺留
drop table if exists public.contact_submissions cascade;
drop table if exists public.artworks            cascade;
drop sequence if exists public.order_no_seq;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. profiles — 所有登入者（會員 / 教師 / 後台人員），1:1 對應 auth.users
-- ────────────────────────────────────────────────────────────────────────────
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  name         text not null default '',
  phone        text,
  avatar_url   text,
  role         text not null default 'member'
               check (role in ('member', 'teacher', 'staff', 'admin')),
  line_user_id text,             -- LINE 綁定（端內唯一：見下方 partial unique indexes）
  phone        text,             -- 聯絡電話（電話＋密碼登入查表鍵）
  contact_email text,            -- 聯絡 Email（後台人員 Email 登入查表鍵）
  created_at   timestamptz not null default now()
);

-- 註冊（含 LINE 登入建立的帳號）時自動建立 profile
-- LINE ID 端內唯一（會員一組、後台一組；教師綁定存 teachers 表）
create unique index if not exists profiles_line_member_key
  on public.profiles (line_user_id) where line_user_id is not null and role = 'member';
create unique index if not exists profiles_line_staff_key
  on public.profiles (line_user_id) where line_user_id is not null and role in ('staff', 'admin');

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, avatar_url, line_user_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name',
             new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'picture_url', ''),
    nullif(new.raw_user_meta_data->>'line_user_id', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS 輔助：目前登入者是否為後台人員
create or replace function public.is_staff()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('staff', 'admin')
  );
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. units / classrooms（先建，students 會引用 units） — 單位、教室
-- ────────────────────────────────────────────────────────────────────────────
create table public.units (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  type       text,                              -- 學校 / 社區機構 / 企業…
  contact    text,
  phone      text,
  address    text,
  status     text not null default '合作中' check (status in ('合作中', '已結束')),
  sub_units  jsonb not null default '[]',       -- [{ "name": "...", "location": "..." }]
  notes      text,
  created_at timestamptz not null default now()
);

create table public.classrooms (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  capacity   int not null default 8,
  equipment  jsonb not null default '[]',       -- ["畫架", "投影機", ...]
  status     text not null default '使用中' check (status in ('使用中', '維修中', '停用')),
  notes      text,
  created_at timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────────────────────
-- 3. students — 學員（會員本人與家屬），含審核流程
-- ────────────────────────────────────────────────────────────────────────────
create table public.students (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid references public.profiles(id) on delete cascade,  -- 外部學員可無帳號
  name        text not null,
  age         int,
  relation    text not null default '本人'
              check (relation in ('本人', '子女', '配偶', '其他')),
  status      text not null default '待審核'
              check (status in ('待審核', '已核准', '已拒絕')),
  types       text[] not null default '{內部}',   -- 內部 / 外部（可複選）
  category    text,                               -- 外部：校外合作、試課…
  unit_id     uuid references public.units(id) on delete set null,
  class_group text,
  note        text,
  created_at  timestamptz not null default now()
);
create index students_owner_idx on public.students(owner_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 4. teachers — 教師（可綁定登入帳號，也可先建檔未綁定）
-- ────────────────────────────────────────────────────────────────────────────
create table public.teachers (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid unique references public.profiles(id) on delete set null,
  name         text not null,
  specialty    text,
  email        text,
  phone        text,
  bio          text,
  photo_url    text,
  line_user_id text,
  status       text not null default '在職'
               check (status in ('在職', '休假中', '離職')),
  created_at   timestamptz not null default now()
);

-- 教師請假 / 不可排課時段
create table public.teacher_availability (
  id         uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  date       date not null,
  start_time time not null,
  end_time   time not null,
  reason     text
);
create index availability_teacher_idx on public.teacher_availability(teacher_id, date);

-- ────────────────────────────────────────────────────────────────────────────
-- 5. courses / course_teachers / course_attendance — 課程、授課教師、出席
--    課程採扁平模型：班表為文字（"每週六 10:00–12:00" 或 "2026/06/10 14:00–15:30"）
--    出席紀錄一課一日一筆，名單存 jsonb（對齊點名 UI）
-- ────────────────────────────────────────────────────────────────────────────
create table public.courses (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  category     text,                               -- 前台分類篩選（素描/水彩/油畫/兒童美術/親子）
  age          text,                               -- 適合年齡（"8歲以上"…）
  types        text[] not null default '{內部}',   -- 內部 / 外部（可複選）
  schedule     text not null default '待排課',
  status       text not null default '草稿' check (status in ('草稿', '開課中', '已結束')),
  visible      boolean not null default true,      -- 前台是否顯示
  classroom_id uuid references public.classrooms(id) on delete set null,
  capacity     int not null default 8,
  enrolled     int not null default 0,
  ticket_types text[] not null default '{}',       -- 可使用的課堂券別
  unit_id      uuid references public.units(id) on delete set null,  -- 外部合作單位
  sub_unit     text,
  location     text,
  price        int not null default 0,             -- 單堂直購價
  description  text,
  highlights   text[] not null default '{}',
  notes        text,
  cover_url    text,                               -- 方圖 800x800
  banner_url   text,                               -- 橫圖 1200x400
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);

create table public.course_teachers (
  course_id  uuid not null references public.courses(id) on delete cascade,
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  primary key (course_id, teacher_id)
);

create table public.course_attendance (
  id         uuid primary key default gen_random_uuid(),
  course_id  uuid not null references public.courses(id) on delete cascade,
  date       text not null,                        -- "YYYY/MM/DD"
  records    jsonb not null default '[]',          -- [{ name, studentId?, status: 出席|請假|缺席|延期 }]
  created_at timestamptz not null default now()
);
create index attendance_course_idx on public.course_attendance(course_id, date desc);

-- ────────────────────────────────────────────────────────────────────────────
-- 6. products / orders / tickets — 商品（課堂券組合）、訂單、課堂券
-- ────────────────────────────────────────────────────────────────────────────
create table public.products (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  sessions        int not null,                 -- 堂數
  is_single       boolean not null default false, -- 單堂型別（堂數固定 1，可作課程直購載體）
  price           int not null,
  validity_months int not null default 12,
  cancel_hours    int not null default 24,      -- 課前取消時限
  transferable    boolean not null default false,
  active          boolean not null default true,
  sort_order      int not null default 0,
  notes           text,
  created_at      timestamptz not null default now()
);

create sequence public.order_no_seq start 1;

create table public.orders (
  id          uuid primary key default gen_random_uuid(),
  order_no    text not null unique
              default 'ORD-' || lpad(nextval('public.order_no_seq')::text, 4, '0'),
  member_id   uuid not null references public.profiles(id) on delete restrict,
  student_id  uuid references public.students(id) on delete set null,
  product_id  uuid references public.products(id) on delete set null,  -- 券包訂單
  course_id   uuid references public.courses(id)  on delete set null,  -- 單堂直購
  item_name   text not null,                    -- 下單當下品項名稱快照
  qty         int not null default 1,
  amount      int not null,
  status      text not null default '待確認'
              check (status in ('待確認', '已付款', '已取消', '已退款', '已售後')),
  pay_method  text,
  notes       text,
  booking_dates jsonb, -- 單堂直購預選的上課日期 ["YYYY-MM-DD", ...]，確認付款後發券並綁定
  after_sales jsonb,   -- { refundAmount, reclaimedTicketNos: [], reason, processedAt }
  created_at  timestamptz not null default now(),
  paid_at     timestamptz
);
create index orders_member_idx on public.orders(member_id, created_at desc);

create table public.tickets (
  id             uuid primary key default gen_random_uuid(),
  ticket_no      text not null unique,          -- "TK-0041-01"
  order_id       uuid not null references public.orders(id) on delete cascade,
  student_id     uuid references public.students(id) on delete set null,  -- 目前持有人
  status         text not null default '未使用'
                 check (status in ('未使用', '待使用', '已使用', '已失效')),
  expires_at     date,
  used_at        timestamptz,
  transferred_to uuid references public.students(id) on delete set null,
  course_id      uuid references public.courses(id) on delete set null,  -- 待使用時綁定的課程
  session_date   date,                                                   -- 待使用時綁定的上課日期
  history        jsonb not null default '[]',                            -- 歷程事件 [{at,event,...}]
  created_at     timestamptz not null default now()
);
create index if not exists tickets_course_session_idx on public.tickets (course_id, session_date);
create index tickets_order_idx   on public.tickets(order_id);
create index tickets_student_idx on public.tickets(student_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 7. banners / online_courses — 展示與線上課程
-- ────────────────────────────────────────────────────────────────────────────
create table public.banners (
  id         uuid primary key default gen_random_uuid(),
  image_url  text not null,
  title      text,
  link_url   text,
  sort_order int not null default 0,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.online_courses (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  subtitle        text,
  description     text,
  type            text not null default '免費課程' check (type in ('免費課程', '系列課')),
  price           int not null default 0,
  rating          numeric(2,1) not null default 5.0,
  cover_url       text,
  recommended_ids uuid[] not null default '{}',
  categories      text[] not null default '{}',   -- 前台分類篩選
  published       boolean not null default false,
  publish_date    date,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now()
);

create table public.online_sections (
  id           uuid primary key default gen_random_uuid(),
  course_id    uuid not null references public.online_courses(id) on delete cascade,
  title        text not null,
  video_url    text not null,
  label        text,
  free_preview boolean not null default false,
  sort_order   int not null default 0
);
create index online_sections_course_idx on public.online_sections(course_id, sort_order);

-- ────────────────────────────────────────────────────────────────────────────
-- 8. 訊息通知 — 範本、工作流、寄送紀錄
-- ────────────────────────────────────────────────────────────────────────────
create table public.message_templates (
  id            text primary key,               -- "tpl_enroll" ...
  name          text not null,
  email_on      boolean not null default false,
  line_on       boolean not null default false,
  email_subject text,
  email_html    text,
  line_text     text,
  email         jsonb,   -- 訊息管理設計器：{ subject, mode, blocks, html }
  line          jsonb    -- 訊息管理設計器：LineFlex 結構（可轉 Flex Message）
);

create table public.workflows (
  id          text primary key,                 -- 前端產生（"wf_..."）
  name        text not null,
  description text,
  enabled     boolean not null default false,
  variant     text not null default 'general',  -- general / social
  nodes       jsonb not null default '[]',
  edges       jsonb not null default '[]',
  created_at  timestamptz not null default now()
);

create table public.message_logs (
  id         uuid primary key default gen_random_uuid(),
  channel    text not null check (channel in ('line', 'email')),
  recipient  text not null,
  subject    text,
  body       text,
  status     text not null default 'sent' check (status in ('sent', 'failed')),
  error      text,
  created_at timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────────────────────
-- 9. settings — 系統參數（取代 localStorage 的 ftw.params.v1 與 data/*.json）
--    敏感欄位（channelSecret / accessToken / smtp pass）由應用層以
--    AES-256-GCM 加密後存入（格式 "enc:v1:..."，金鑰在 SETTINGS_ENCRYPTION_KEY
--    環境變數，見 src/lib/secret-crypto.ts）——DB 內不落明文。
-- ────────────────────────────────────────────────────────────────────────────
create table public.settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────────────────────
-- 10. Row Level Security
-- ────────────────────────────────────────────────────────────────────────────
alter table public.profiles             enable row level security;
alter table public.students             enable row level security;
alter table public.teachers             enable row level security;
alter table public.teacher_availability enable row level security;
alter table public.units                enable row level security;
alter table public.classrooms           enable row level security;
alter table public.courses              enable row level security;
alter table public.course_teachers      enable row level security;
alter table public.course_attendance    enable row level security;
alter table public.products             enable row level security;
alter table public.orders               enable row level security;
alter table public.tickets              enable row level security;
alter table public.banners              enable row level security;
alter table public.online_courses       enable row level security;
alter table public.online_sections      enable row level security;
alter table public.message_templates    enable row level security;
alter table public.workflows            enable row level security;
alter table public.message_logs         enable row level security;
alter table public.settings             enable row level security;

-- profiles：本人可讀寫自己，後台人員全權
create policy "profiles_self_select" on public.profiles for select using (auth.uid() = id or public.is_staff());
create policy "profiles_self_update" on public.profiles for update using (auth.uid() = id or public.is_staff());
create policy "profiles_staff_all"   on public.profiles for all    using (public.is_staff());

-- students：擁有者可讀可新增（審核由後台），後台全權
create policy "students_owner_select" on public.students for select using (owner_id = auth.uid() or public.is_staff());
create policy "students_owner_insert" on public.students for insert with check (owner_id = auth.uid() and status = '待審核');
create policy "students_staff_all"    on public.students for all    using (public.is_staff());

-- 公開目錄：任何人（含未登入）可讀，後台全權
create policy "teachers_public_read"  on public.teachers        for select using (status = '在職' or public.is_staff());
create policy "teachers_staff_all"    on public.teachers        for all    using (public.is_staff());
-- 隱藏課程＝不上列表但連結可達（列表查詢自帶 visible 過濾）
create policy "courses_public_read"   on public.courses         for select using (true);
create policy "courses_staff_all"     on public.courses         for all    using (public.is_staff());
create policy "ct_public_read"        on public.course_teachers for select using (true);
create policy "ct_staff_all"          on public.course_teachers for all    using (public.is_staff());
create policy "products_public_read"  on public.products        for select using (active = true or public.is_staff());
create policy "products_staff_all"    on public.products        for all    using (public.is_staff());
create policy "banners_public_read"   on public.banners         for select using (active = true or public.is_staff());
create policy "banners_staff_all"     on public.banners         for all    using (public.is_staff());
create policy "oc_public_read"        on public.online_courses  for select using (published = true or public.is_staff());
create policy "oc_staff_all"          on public.online_courses  for all    using (public.is_staff());
create policy "os_public_read"        on public.online_sections for select using (true);
create policy "os_staff_all"          on public.online_sections for all    using (public.is_staff());
create policy "units_read"            on public.units           for select using (true);
create policy "units_staff_all"       on public.units           for all    using (public.is_staff());
create policy "classrooms_read"       on public.classrooms      for select using (true);
create policy "classrooms_staff_all"  on public.classrooms      for all    using (public.is_staff());

-- course_attendance：後台與教師（點名）可讀寫
create policy "attendance_staff_all" on public.course_attendance for all
  using (
    public.is_staff()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'teacher')
  );

-- teacher_availability：教師管理自己的，後台全權，公開可讀（排課用）
create policy "availability_read"      on public.teacher_availability for select using (true);
create policy "availability_teacher"   on public.teacher_availability for all
  using (
    public.is_staff()
    or exists (select 1 from public.teachers t where t.id = teacher_id and t.profile_id = auth.uid())
  );

-- orders：會員讀自己的、可下「待確認」單、可取消自己的待確認單；後台全權
create policy "orders_member_select" on public.orders for select using (member_id = auth.uid() or public.is_staff());
create policy "orders_member_insert" on public.orders for insert with check (member_id = auth.uid() and status = '待確認');
create policy "orders_member_cancel" on public.orders for update
  using (member_id = auth.uid() and status = '待確認')
  with check (member_id = auth.uid() and status in ('待確認', '已取消'));
create policy "orders_staff_all"     on public.orders for all using (public.is_staff());

-- tickets：會員讀自己訂單／自己學員的券；轉移等變更走後台或 Server API
create policy "tickets_member_select" on public.tickets for select
  using (
    exists (select 1 from public.orders o where o.id = order_id and o.member_id = auth.uid())
    or exists (select 1 from public.students s where s.id = student_id and s.owner_id = auth.uid())
    or public.is_staff()
  );
create policy "tickets_staff_all" on public.tickets for all using (public.is_staff());

-- 訊息／參數：僅後台（settings 含金鑰，前台一律經 Server API 讀取）
create policy "templates_staff_all" on public.message_templates for all using (public.is_staff());
create policy "workflows_staff_all" on public.workflows         for all using (public.is_staff());
create policy "logs_staff_all"      on public.message_logs      for all using (public.is_staff());
create policy "settings_staff_all"  on public.settings          for all using (public.is_staff());

-- ────────────────────────────────────────────────────────────────────────────
-- 11. Storage — 圖片 bucket（課程圖、教師頭貼、Banner）
-- ────────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do nothing;

drop policy if exists "images_public_read"  on storage.objects;
drop policy if exists "images_staff_write"  on storage.objects;
drop policy if exists "artworks_storage_public_read" on storage.objects;
drop policy if exists "artworks_storage_admin_write" on storage.objects;

create policy "images_public_read" on storage.objects for select
  using (bucket_id = 'images');
create policy "images_staff_write" on storage.objects for insert
  with check (bucket_id = 'images' and public.is_staff());

-- ────────────────────────────────────────────────────────────────────────────
-- 12. Seed — 正式環境初始資料（僅系統必要值，不含測試資料）
-- ────────────────────────────────────────────────────────────────────────────
insert into public.products (name, sessions, price, validity_months, sort_order) values
  ('單堂試課券', 1,  1200,  3,  1),
  ('5堂精選包',  5,  5500,  6,  2),
  ('10堂體驗包', 10, 9800,  12, 3),
  ('20堂年繳包', 20, 18000, 12, 4);

insert into public.settings (key, value) values
  ('pay_methods', '["銀行轉帳", "現金"]'),
  ('features',    '{"onlineCourse": true}'),
  ('line_login',  '{"channelId": "", "channelSecret": "", "liffId": ""}'),
  ('line_msg',    '{"channelId": "", "channelSecret": "", "accessToken": ""}'),
  ('smtp',        '{"host": "", "port": "587", "user": "", "pass": "", "from": ""}');

insert into public.message_templates (id, name, email_on, line_on) values
  ('tpl_enroll',   '報名成功通知',     true,  true),
  ('tpl_reminder', '課前 24 小時提醒', false, true),
  ('tpl_ticket',   '課堂券即將到期',   true,  true),
  ('tpl_order',    '訂單付款確認',     true,  true);

-- ────────────────────────────────────────────────────────────────────────────
-- 13. 回填 — 重跑本腳本後，為既有 auth 使用者重建 profile 並還原管理員角色
-- ────────────────────────────────────────────────────────────────────────────
insert into public.profiles (id, name, avatar_url, line_user_id)
select
  id,
  coalesce(raw_user_meta_data->>'display_name', raw_user_meta_data->>'full_name', ''),
  nullif(raw_user_meta_data->>'picture_url', ''),
  nullif(raw_user_meta_data->>'line_user_id', '')
from auth.users
on conflict (id) do nothing;

update public.profiles p
set role = 'admin', name = case when p.name = '' then '管理員' else p.name end
from auth.users u
where u.id = p.id and u.email = 'admin@findtheway.com';
