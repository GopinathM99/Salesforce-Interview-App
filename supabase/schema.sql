-- Schema: questions + enum + helpful indexes

-- Enable needed extensions
create extension if not exists pgcrypto;
create extension if not exists citext;

-- Table of admin accounts identified by email
create table if not exists public.admin_users (
  email citext primary key,
  first_name text,
  last_name text,
  created_at timestamptz not null default now()
);

alter table public.admin_users
  add column if not exists first_name text;

alter table public.admin_users
  add column if not exists last_name text;

alter table public.admin_users
  add column if not exists is_primary boolean not null default false;

create unique index if not exists admin_users_primary_one
  on public.admin_users (is_primary)
  where is_primary;

grant select, insert, update, delete on table public.admin_users to authenticated;

drop function if exists public.is_admin() cascade;
drop function if exists public.current_user_email() cascade;

create or replace function public.current_user_email()
returns citext
language sql
stable
security definer
set search_path = public
as $$
  select nullif(auth.jwt() ->> 'email', '')::citext;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users au
    where au.email = public.current_user_email()
  );
$$;

grant execute on function public.current_user_email() to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;

drop function if exists public.execute_insert_sql(text);

create or replace function public.execute_insert_sql(sql text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  sanitized text;
begin
  sanitized := trim(sql);

  if sanitized is null or sanitized = '' then
    return;
  end if;

  sanitized := regexp_replace(sanitized, ';\s*$', '', 1, 0, 'g');

  -- Allow CTE-based statements by accepting any query that eventually runs INSERT INTO
  if sanitized !~* 'insert\s+into\s+' then
    raise exception 'Only INSERT statements are allowed.';
  end if;

  execute sanitized;
end;
$$;

revoke all on function public.execute_insert_sql(text) from public;
grant execute on function public.execute_insert_sql(text) to service_role;

alter table public.admin_users enable row level security;

drop policy if exists "Admins can manage admin users" on public.admin_users;
create policy "Admins can manage admin users"
  on public.admin_users for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

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

-- Create category enum type
do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'question_category' and n.nspname = 'public'
  ) then
    create type public.question_category as enum ('General', 'Sales Cloud', 'Service Cloud', 'Agentforce', 'CPQ', 'Litify');
  end if;
end$$;

-- Ensure all expected enum labels exist (idempotent)
do $$
begin
  if exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'question_category' and n.nspname = 'public'
  ) then
    if not exists (
      select 1 from pg_enum e
      join pg_type t on t.oid = e.enumtypid
      join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = 'public' and t.typname = 'question_category' and e.enumlabel = 'General'
    ) then
      alter type public.question_category add value 'General';
    end if;

    if not exists (
      select 1 from pg_enum e
      join pg_type t on t.oid = e.enumtypid
      join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = 'public' and t.typname = 'question_category' and e.enumlabel = 'Sales Cloud'
    ) then
      alter type public.question_category add value 'Sales Cloud';
    end if;

    if not exists (
      select 1 from pg_enum e
      join pg_type t on t.oid = e.enumtypid
      join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = 'public' and t.typname = 'question_category' and e.enumlabel = 'Service Cloud'
    ) then
      alter type public.question_category add value 'Service Cloud';
    end if;

    if not exists (
      select 1 from pg_enum e
      join pg_type t on t.oid = e.enumtypid
      join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = 'public' and t.typname = 'question_category' and e.enumlabel = 'Agentforce'
    ) then
      alter type public.question_category add value 'Agentforce';
    end if;

    if not exists (
      select 1 from pg_enum e
      join pg_type t on t.oid = e.enumtypid
      join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = 'public' and t.typname = 'question_category' and e.enumlabel = 'CPQ'
    ) then
      alter type public.question_category add value 'CPQ';
    end if;

    if not exists (
      select 1 from pg_enum e
      join pg_type t on t.oid = e.enumtypid
      join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = 'public' and t.typname = 'question_category' and e.enumlabel = 'Litify'
    ) then
      alter type public.question_category add value 'Litify';
    end if;
  end if;
end$$;

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  question_text text not null,
  answer_text text,
  topic text not null,
  category text,
  difficulty public.difficulty_level not null default 'medium',
  created_at timestamptz not null default now()
);

alter table if exists public.questions
  add column if not exists category text;

-- Migrate category column to enum type
-- This requires dropping and recreating the column due to PostgreSQL limitations
do $$
begin
  -- Check if category column exists and is still text type
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'questions'
      and column_name = 'category'
      and data_type = 'text'
  ) then
    -- First, normalize any invalid values to 'General'
    update public.questions
    set category = 'General'
    where category is not null
      and category not in ('General', 'Sales Cloud', 'Service Cloud', 'Agentforce', 'CPQ', 'Litify');

    -- Add temporary column with enum type
    alter table public.questions
      add column if not exists category_enum public.question_category default 'General';

    -- Copy and convert data
    update public.questions
    set category_enum = case
      when category = 'General' then 'General'::public.question_category
      when category = 'Sales Cloud' then 'Sales Cloud'::public.question_category
      when category = 'Service Cloud' then 'Service Cloud'::public.question_category
      when category = 'Agentforce' then 'Agentforce'::public.question_category
      when category = 'CPQ' then 'CPQ'::public.question_category
      when category = 'Litify' then 'Litify'::public.question_category
      else 'General'::public.question_category
    end;

    -- Drop old column and index
    drop index if exists idx_questions_category;
    alter table public.questions drop column if exists category;

    -- Rename new column
    alter table public.questions rename column category_enum to category;

    -- Recreate index
    create index if not exists idx_questions_category on public.questions (category);
  end if;

  -- If column doesn't exist yet, add it with enum type
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'questions'
      and column_name = 'category'
  ) then
    alter table public.questions
      add column category public.question_category default 'General';
    create index if not exists idx_questions_category on public.questions (category);
  end if;

  -- Ensure default value is set
  alter table public.questions
    alter column category set default 'General';
end$$;

-- Indexes for filtering
create index if not exists idx_questions_topic on public.questions (topic);
create index if not exists idx_questions_category on public.questions (category);
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

create table if not exists public.gemini_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  used_at timestamptz not null default now()
);

drop index if exists idx_gemini_usage_logs_user_day;
create index if not exists idx_gemini_usage_logs_user_used_at
  on public.gemini_usage_logs (user_id, used_at);

alter table public.gemini_usage_logs enable row level security;

drop policy if exists "Users can view their Gemini usage" on public.gemini_usage_logs;
create policy "Users can view their Gemini usage"
  on public.gemini_usage_logs for select
  using (auth.uid() = user_id);

drop policy if exists "Users can log their Gemini usage" on public.gemini_usage_logs;
create policy "Users can log their Gemini usage"
  on public.gemini_usage_logs for insert
  with check (auth.uid() = user_id);

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  first_name text,
  last_name text,
  email citext not null,
  first_signed_in_at timestamptz not null default now(),
  last_signed_in_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.user_profiles
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_user_profiles_last_signed_in
  on public.user_profiles (last_signed_in_at desc);

create unique index if not exists user_profiles_email_unique
  on public.user_profiles (lower(email));

alter table public.user_profiles enable row level security;

drop policy if exists "Users manage own profile" on public.user_profiles;
create policy "Users manage own profile"
  on public.user_profiles for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Admins can view profiles" on public.user_profiles;
create policy "Admins can view profiles"
  on public.user_profiles for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Admins can manage profiles" on public.user_profiles;
create policy "Admins can manage profiles"
  on public.user_profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

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
drop policy if exists "Only admins can modify questions" on public.questions;
create policy "Only admins can modify questions"
  on public.questions for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

alter table public.multiple_choice_questions enable row level security;

drop policy if exists "MCQs are readable by anyone" on public.multiple_choice_questions;
create policy "MCQs are readable by anyone"
  on public.multiple_choice_questions for select
  to anon, authenticated
  using (true);

drop policy if exists "Only authenticated can modify MCQs" on public.multiple_choice_questions;
drop policy if exists "Only admins can modify MCQs" on public.multiple_choice_questions;
create policy "Only admins can modify MCQs"
  on public.multiple_choice_questions for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Subscription preferences table
create table if not exists public.subscription_preferences (
  id uuid primary key default gen_random_uuid(),
  email citext not null,
  user_id uuid references auth.users (id) on delete cascade,
  topics text[] not null default '{}',
  difficulties text[] not null default '{}',
  question_types text[] not null default '{}',
  practice_modes text[] not null default '{}',
  question_count int not null default 3,
  delivery_frequency text not null default 'Daily',
  include_answers boolean not null default true,
  custom_message text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscription_preferences_email_check check (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  constraint subscription_preferences_delivery_frequency_check check (delivery_frequency in ('Daily', 'Weekly', 'Bi-weekly')),
  constraint subscription_preferences_question_count_check check (question_count >= 1 and question_count <= 5),
  constraint subscription_preferences_topics_not_empty check (array_length(topics, 1) > 0),
  constraint subscription_preferences_question_types_or_practice_modes_not_empty check (
    array_length(question_types, 1) > 0 or array_length(practice_modes, 1) > 0
  )
);

-- Indexes for subscription preferences
create index if not exists idx_subscription_preferences_email on public.subscription_preferences (email);
create index if not exists idx_subscription_preferences_user_id on public.subscription_preferences (user_id);
create index if not exists idx_subscription_preferences_active on public.subscription_preferences (is_active);
create unique index if not exists subscription_preferences_email_unique
  on public.subscription_preferences (email);

-- Enable RLS for subscription preferences
alter table public.subscription_preferences enable row level security;

-- Policy: Anyone can insert subscription preferences (for anonymous users)
drop policy if exists "Anyone can subscribe" on public.subscription_preferences;
create policy "Anyone can subscribe"
  on public.subscription_preferences for insert
  to anon, authenticated
  with check (true);

-- Policy: Users can update their own subscription preferences
drop policy if exists "Users can update own subscription preferences" on public.subscription_preferences;
create policy "Users can update own subscription preferences"
  on public.subscription_preferences for update
  to authenticated
  using (auth.uid() = user_id or email = public.current_user_email())
  with check (auth.uid() = user_id or email = public.current_user_email());

-- Policy: Users can delete their own subscription preferences
drop policy if exists "Users can delete own subscription preferences" on public.subscription_preferences;
create policy "Users can delete own subscription preferences"
  on public.subscription_preferences for delete
  to authenticated
  using (auth.uid() = user_id or email = public.current_user_email());

-- Policy: Users can view their own subscription preferences
drop policy if exists "Users can view own subscription preferences" on public.subscription_preferences;
create policy "Users can view own subscription preferences"
  on public.subscription_preferences for select
  to authenticated
  using (auth.uid() = user_id or email = public.current_user_email());

-- Policy: Admins can view all subscription preferences
drop policy if exists "Admins can view subscription preferences" on public.subscription_preferences;
create policy "Admins can view subscription preferences"
  on public.subscription_preferences for select
  to authenticated
  using (public.is_admin());

-- Policy: Admins can update all subscription preferences
drop policy if exists "Admins can update subscription preferences" on public.subscription_preferences;
create policy "Admins can update subscription preferences"
  on public.subscription_preferences for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Add last_sent_at column to subscription_preferences
alter table public.subscription_preferences
  add column if not exists last_sent_at timestamptz;

-- Email delivery logs table
create table if not exists public.email_delivery_logs (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscription_preferences (id) on delete cascade,
  email citext not null,
  questions_sent jsonb not null,
  sent_at timestamptz not null default now(),
  status text not null check (status in ('sent', 'failed', 'bounced')),
  error_message text,
  created_at timestamptz not null default now()
);

-- Indexes for email delivery logs
create index if not exists idx_email_delivery_logs_subscription_id on public.email_delivery_logs (subscription_id);
create index if not exists idx_email_delivery_logs_email on public.email_delivery_logs (email);
create index if not exists idx_email_delivery_logs_sent_at on public.email_delivery_logs (sent_at);
create index if not exists idx_email_delivery_logs_status on public.email_delivery_logs (status);

-- Enable RLS for email delivery logs
alter table public.email_delivery_logs enable row level security;

-- Policy: Admins can view all email delivery logs
drop policy if exists "Admins can view email delivery logs" on public.email_delivery_logs;
create policy "Admins can view email delivery logs"
  on public.email_delivery_logs for select
  to authenticated
  using (public.is_admin());

-- Policy: Service role can manage email delivery logs
drop policy if exists "Service role can manage email delivery logs" on public.email_delivery_logs;
create policy "Service role can manage email delivery logs"
  on public.email_delivery_logs for all
  to service_role
  using (true)
  with check (true);

-- Unsubscribe tokens table
create table if not exists public.unsubscribe_tokens (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscription_preferences (id) on delete cascade,
  token text not null unique,
  created_at timestamptz not null default now(),
  used_at timestamptz,
  expires_at timestamptz not null default (now() + interval '1 year')
);

-- Indexes for unsubscribe tokens
create index if not exists idx_unsubscribe_tokens_token on public.unsubscribe_tokens (token);
create index if not exists idx_unsubscribe_tokens_subscription_id on public.unsubscribe_tokens (subscription_id);
create index if not exists idx_unsubscribe_tokens_expires_at on public.unsubscribe_tokens (expires_at);

-- Enable RLS for unsubscribe tokens
alter table public.unsubscribe_tokens enable row level security;

-- Policy: Anyone can insert unsubscribe tokens (for service operations)
drop policy if exists "Anyone can insert unsubscribe tokens" on public.unsubscribe_tokens;
create policy "Anyone can insert unsubscribe tokens"
  on public.unsubscribe_tokens for insert
  to anon, authenticated, service_role
  with check (true);

-- Policy: Anyone can select unsubscribe tokens (for unsubscribe operations)
drop policy if exists "Anyone can select unsubscribe tokens" on public.unsubscribe_tokens;
create policy "Anyone can select unsubscribe tokens"
  on public.unsubscribe_tokens for select
  to anon, authenticated, service_role
  using (true);

-- Policy: Service role can update unsubscribe tokens
drop policy if exists "Service role can update unsubscribe tokens" on public.unsubscribe_tokens;
create policy "Service role can update unsubscribe tokens"
  on public.unsubscribe_tokens for update
  to service_role
  using (true)
  with check (true);

-- Coding Q&A table for programming questions
create table if not exists public.coding_questions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  problem_statement text not null,
  solution_code text not null,
  explanation text,
  difficulty public.difficulty_level not null default 'medium',
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Drop the removed columns if they exist (for existing databases)
alter table public.coding_questions drop column if exists language;
alter table public.coding_questions drop column if exists test_cases;
alter table public.coding_questions drop column if exists hints;
alter table public.coding_questions drop column if exists related_topics;

-- Indexes for coding questions
create index if not exists idx_coding_questions_difficulty on public.coding_questions (difficulty);
create index if not exists idx_coding_questions_tags on public.coding_questions using gin (tags);
create index if not exists idx_coding_questions_created_at on public.coding_questions (created_at desc);

-- Enable RLS for coding questions
alter table public.coding_questions enable row level security;

-- Policy: Anyone can read coding questions
drop policy if exists "Coding questions are readable by anyone" on public.coding_questions;
create policy "Coding questions are readable by anyone"
  on public.coding_questions for select
  to anon, authenticated
  using (true);

-- Policy: Only admins can modify coding questions
drop policy if exists "Only admins can modify coding questions" on public.coding_questions;
create policy "Only admins can modify coding questions"
  on public.coding_questions for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
