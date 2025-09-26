-- Run this in Supabase SQL editor
-- Schema: questions + enum + helpful indexes

-- Enable needed extensions
create extension if not exists pgcrypto;

-- PostgreSQL does not support `CREATE TYPE IF NOT EXISTS`.
-- Use a DO block to create the enum only if it doesn't already exist.
do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'difficulty_level' and n.nspname = 'public'
  ) then
    create type public.difficulty_level as enum ('easy','medium','hard');
  end if;
end$$;

-- Ensure all expected enum labels exist (idempotent)
do $$
begin
  if exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'difficulty_level' and n.nspname = 'public'
  ) then
    if not exists (
      select 1 from pg_enum e
      join pg_type t on t.oid = e.enumtypid
      join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = 'public' and t.typname = 'difficulty_level' and e.enumlabel = 'easy'
    ) then
      alter type public.difficulty_level add value 'easy';
    end if;

    if not exists (
      select 1 from pg_enum e
      join pg_type t on t.oid = e.enumtypid
      join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = 'public' and t.typname = 'difficulty_level' and e.enumlabel = 'medium'
    ) then
      alter type public.difficulty_level add value 'medium';
    end if;

    if not exists (
      select 1 from pg_enum e
      join pg_type t on t.oid = e.enumtypid
      join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = 'public' and t.typname = 'difficulty_level' and e.enumlabel = 'hard'
    ) then
      alter type public.difficulty_level add value 'hard';
    end if;
  end if;
end$$;

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  question_text text not null,
  answer_text text,
  topic text not null,
  difficulty public.difficulty_level not null default 'medium',
  created_at timestamptz not null default now()
);

-- Indexes for filtering
create index if not exists idx_questions_topic on public.questions (topic);
create index if not exists idx_questions_difficulty on public.questions (difficulty);

create table if not exists public.multiple_choice_questions (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  choices jsonb not null,
  correct_choice_index int not null,
  explanation text,
  shuffle_options boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint multiple_choice_questions_unique_question unique (question_id),
  constraint multiple_choice_questions_choices_array check (jsonb_typeof(choices) = 'array'),
  constraint multiple_choice_questions_min_choices check (
    case jsonb_typeof(choices)
      when 'array' then jsonb_array_length(choices) >= 2
      else false
    end
  ),
  constraint multiple_choice_questions_correct_idx_range check (
    case jsonb_typeof(choices)
      when 'array' then correct_choice_index >= 0
        and correct_choice_index < jsonb_array_length(choices)
      else false
    end
  )
);

create index if not exists idx_multiple_choice_questions_question_id
  on public.multiple_choice_questions (question_id);

-- Track which user has attempted which question
create table if not exists public.question_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  is_correct boolean,
  attempted_at timestamptz not null default now(),
  constraint question_attempts_unique_user_question unique (user_id, question_id)
);

create index if not exists idx_question_attempts_user_question
  on public.question_attempts (user_id, question_id);
create index if not exists idx_question_attempts_question on public.question_attempts (question_id);

alter table public.question_attempts enable row level security;

drop policy if exists "Users can view own attempts" on public.question_attempts;
create policy "Users can view own attempts"
  on public.question_attempts for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can record own attempts" on public.question_attempts;
create policy "Users can record own attempts"
  on public.question_attempts for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own attempts" on public.question_attempts;
create policy "Users can update own attempts"
  on public.question_attempts for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own attempts" on public.question_attempts;
create policy "Users can delete own attempts"
  on public.question_attempts for delete
  to authenticated
  using (auth.uid() = user_id);

-- Enable Row Level Security and allow read-only public access
alter table public.questions enable row level security;

-- Policy: anyone (anon) can read questions
drop policy if exists "Questions are readable by anyone" on public.questions;
create policy "Questions are readable by anyone"
  on public.questions for select
  to anon, authenticated
  using (true);

-- Optional: restrict inserts/updates/deletes to authenticated users only (adjust as needed)
drop policy if exists "Only authenticated can modify questions" on public.questions;
create policy "Only authenticated can modify questions"
  on public.questions for all
  to authenticated
  using (true)
  with check (true);

alter table public.multiple_choice_questions enable row level security;

drop policy if exists "MCQs are readable by anyone" on public.multiple_choice_questions;
create policy "MCQs are readable by anyone"
  on public.multiple_choice_questions for select
  to anon, authenticated
  using (true);

drop policy if exists "Only authenticated can modify MCQs" on public.multiple_choice_questions;
create policy "Only authenticated can modify MCQs"
  on public.multiple_choice_questions for all
  to authenticated
  using (true)
  with check (true);
