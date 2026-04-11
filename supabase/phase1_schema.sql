-- Phase 1 schema draft for Revive.
-- This file is meant to be run manually in the Supabase SQL editor.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.user_telegram_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  telegram_chat_id text not null unique,
  telegram_username text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.item_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  collection_id uuid not null references public.collections(id) on delete cascade,
  remind_at timestamptz not null,
  timezone text not null default 'Asia/Shanghai',
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'cancelled', 'failed')),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.collections
  add column if not exists resolved_url text,
  add column if not exists raw_input text,
  add column if not exists notes text,
  add column if not exists status text not null default 'unread',
  add column if not exists category_id uuid,
  add column if not exists metadata_source text,
  add column if not exists metadata_confidence numeric,
  add column if not exists last_opened_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table public.collections
  drop constraint if exists collections_status_check;

alter table public.collections
  add constraint collections_status_check
  check (status in ('unread', 'viewed', 'archived'));

alter table public.collections
  drop constraint if exists collections_metadata_source_check;

alter table public.collections
  add constraint collections_metadata_source_check
  check (
    metadata_source is null
    or metadata_source in (
      'share_text',
      'og',
      'json_ld',
      'title_tag',
      'fallback',
      'manual'
    )
  );

alter table public.collections
  drop constraint if exists collections_metadata_confidence_check;

alter table public.collections
  add constraint collections_metadata_confidence_check
  check (
    metadata_confidence is null
    or (metadata_confidence >= 0 and metadata_confidence <= 1)
  );

alter table public.collections
  drop constraint if exists collections_category_id_fkey;

alter table public.collections
  add constraint collections_category_id_fkey
  foreign key (category_id)
  references public.categories(id)
  on delete set null;

create index if not exists idx_categories_user_sort
  on public.categories(user_id, sort_order, created_at desc);

create index if not exists idx_collections_user_created
  on public.collections(user_id, created_at desc);

create index if not exists idx_collections_user_status
  on public.collections(user_id, status);

create index if not exists idx_collections_user_category
  on public.collections(user_id, category_id);

create index if not exists idx_item_reminders_due
  on public.item_reminders(status, remind_at);

create index if not exists idx_item_reminders_user_collection
  on public.item_reminders(user_id, collection_id);

create unique index if not exists idx_item_reminders_one_pending_per_collection
  on public.item_reminders(collection_id)
  where status = 'pending';

drop trigger if exists set_updated_at_categories on public.categories;
create trigger set_updated_at_categories
before update on public.categories
for each row
execute function public.set_updated_at();

drop trigger if exists set_updated_at_user_telegram_connections on public.user_telegram_connections;
create trigger set_updated_at_user_telegram_connections
before update on public.user_telegram_connections
for each row
execute function public.set_updated_at();

drop trigger if exists set_updated_at_item_reminders on public.item_reminders;
create trigger set_updated_at_item_reminders
before update on public.item_reminders
for each row
execute function public.set_updated_at();

drop trigger if exists set_updated_at_collections on public.collections;
create trigger set_updated_at_collections
before update on public.collections
for each row
execute function public.set_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.collections enable row level security;
alter table public.categories enable row level security;
alter table public.item_reminders enable row level security;
alter table public.user_telegram_connections enable row level security;

-- collections: 用户只能读写自己的数据
create policy "collections: user can read own"
  on public.collections for select
  using (auth.uid() = user_id);

create policy "collections: user can insert own"
  on public.collections for insert
  with check (auth.uid() = user_id);

create policy "collections: user can update own"
  on public.collections for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "collections: user can delete own"
  on public.collections for delete
  using (auth.uid() = user_id);

-- categories: 用户只能读写自己的数据
create policy "categories: user can read own"
  on public.categories for select
  using (auth.uid() = user_id);

create policy "categories: user can insert own"
  on public.categories for insert
  with check (auth.uid() = user_id);

create policy "categories: user can update own"
  on public.categories for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "categories: user can delete own"
  on public.categories for delete
  using (auth.uid() = user_id);

-- item_reminders: 用户只能读写自己的数据
create policy "item_reminders: user can read own"
  on public.item_reminders for select
  using (auth.uid() = user_id);

create policy "item_reminders: user can insert own"
  on public.item_reminders for insert
  with check (auth.uid() = user_id);

create policy "item_reminders: user can update own"
  on public.item_reminders for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "item_reminders: user can delete own"
  on public.item_reminders for delete
  using (auth.uid() = user_id);

-- user_telegram_connections: 用户只能读写自己的数据
create policy "user_telegram_connections: user can read own"
  on public.user_telegram_connections for select
  using (auth.uid() = user_id);

create policy "user_telegram_connections: user can insert own"
  on public.user_telegram_connections for insert
  with check (auth.uid() = user_id);

create policy "user_telegram_connections: user can update own"
  on public.user_telegram_connections for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_telegram_connections: user can delete own"
  on public.user_telegram_connections for delete
  using (auth.uid() = user_id);
