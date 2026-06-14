-- Phase 2 schema for Revive: 待办 (todos) module.
-- This file is meant to be run manually in the Supabase SQL editor.
-- Run AFTER phase1_schema.sql (relies on categories table and set_updated_at function).

-- ============================================================
-- 1. todos table
-- ============================================================

create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  priority text not null default 'medium'
    check (priority in ('high', 'medium', 'low')),
  sort_order integer not null default 0,
  status text not null default 'todo'
    check (status in ('todo', 'in_progress', 'done', 'snoozed')),
  category_id uuid references public.categories(id) on delete set null,
  remind_at timestamptz,
  reminder_type text
    check (reminder_type is null or reminder_type in ('once', 'daily_20')),
  reminder_status text
    check (reminder_status is null or reminder_status in ('pending', 'sent', 'cancelled', 'failed')),
  reminder_timezone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 已建表的库补加时区列（幂等，可重复执行）
alter table public.todos
  add column if not exists reminder_timezone text;

alter table public.todos
  drop constraint if exists todos_category_id_fkey;

alter table public.todos
  add constraint todos_category_id_fkey
  foreign key (category_id)
  references public.categories(id)
  on delete set null;

-- ============================================================
-- 2. categories: add scope column
-- ============================================================

alter table public.categories
  add column if not exists scope text not null default 'all';

alter table public.categories
  drop constraint if exists categories_scope_check;

alter table public.categories
  add constraint categories_scope_check
  check (scope in ('all', 'bookmarks', 'todos'));

-- ============================================================
-- 3. Indexes
-- ============================================================

create index if not exists idx_todos_user_status_sort
  on public.todos(user_id, status, sort_order);

create index if not exists idx_todos_user_category
  on public.todos(user_id, category_id);

-- Partial index for the dispatch engine: only pending reminders that are due.
create index if not exists idx_todos_due_reminders
  on public.todos(user_id, remind_at)
  where reminder_status = 'pending';

-- ============================================================
-- 4. Triggers
-- ============================================================

drop trigger if exists set_updated_at_todos on public.todos;
create trigger set_updated_at_todos
before update on public.todos
for each row
execute function public.set_updated_at();

-- ============================================================
-- 5. Row Level Security
-- ============================================================

alter table public.todos enable row level security;

-- todos: 用户只能读写自己的数据（与 collections 一致的模式）
drop policy if exists "todos: user can read own" on public.todos;
create policy "todos: user can read own"
  on public.todos for select
  using (auth.uid() = user_id);

drop policy if exists "todos: user can insert own" on public.todos;
create policy "todos: user can insert own"
  on public.todos for insert
  with check (auth.uid() = user_id);

drop policy if exists "todos: user can update own" on public.todos;
create policy "todos: user can update own"
  on public.todos for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "todos: user can delete own" on public.todos;
create policy "todos: user can delete own"
  on public.todos for delete
  using (auth.uid() = user_id);
