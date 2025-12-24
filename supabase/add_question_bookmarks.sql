-- Add table for user bookmarks (MCQ + flashcards)
-- Safe to run multiple times (idempotent).

create table if not exists public.question_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  practice_mode text not null default 'mcq',
  created_at timestamptz not null default now(),
  constraint question_bookmarks_practice_mode_check check (practice_mode in ('mcq', 'flashcards')),
  constraint question_bookmarks_unique_user_question_mode unique (user_id, question_id, practice_mode)
);

alter table public.question_bookmarks enable row level security;

-- If the table existed from a previous migration, ensure the schema is upgraded.
alter table public.question_bookmarks
  add column if not exists practice_mode text not null default 'mcq';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'question_bookmarks_practice_mode_check'
      and conrelid = 'public.question_bookmarks'::regclass
  ) then
    alter table public.question_bookmarks
      add constraint question_bookmarks_practice_mode_check
      check (practice_mode in ('mcq', 'flashcards'));
  end if;
end$$;

update public.question_bookmarks
set practice_mode = 'mcq'
where practice_mode is null or practice_mode = '';

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'question_bookmarks_unique_user_question'
      and conrelid = 'public.question_bookmarks'::regclass
  ) then
    alter table public.question_bookmarks drop constraint question_bookmarks_unique_user_question;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'question_bookmarks_unique_user_question_mode'
      and conrelid = 'public.question_bookmarks'::regclass
  ) then
    alter table public.question_bookmarks
      add constraint question_bookmarks_unique_user_question_mode
      unique (user_id, question_id, practice_mode);
  end if;
end$$;

drop index if exists public.idx_question_bookmarks_user_question;
drop index if exists public.idx_question_bookmarks_user_created_at;
drop index if exists public.idx_question_bookmarks_user_mode_question;
drop index if exists public.idx_question_bookmarks_question;
create index if not exists idx_question_bookmarks_user_created_at
  on public.question_bookmarks (user_id, practice_mode, created_at desc);
create index if not exists idx_question_bookmarks_user_mode_question
  on public.question_bookmarks (user_id, practice_mode, question_id);
create index if not exists idx_question_bookmarks_question
  on public.question_bookmarks (question_id);

drop policy if exists "Users can view own bookmarks" on public.question_bookmarks;
create policy "Users can view own bookmarks"
  on public.question_bookmarks for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can add own bookmarks" on public.question_bookmarks;
create policy "Users can add own bookmarks"
  on public.question_bookmarks for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own bookmarks" on public.question_bookmarks;
create policy "Users can update own bookmarks"
  on public.question_bookmarks for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own bookmarks" on public.question_bookmarks;
create policy "Users can delete own bookmarks"
  on public.question_bookmarks for delete
  to authenticated
  using (auth.uid() = user_id);
