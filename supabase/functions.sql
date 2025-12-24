-- Drop all existing overloads comprehensively
do $$
declare
  r record;
begin
  for r in
    select oid::regprocedure as func
    from pg_proc
    where proname = 'random_questions'
      and pronamespace = 'public'::regnamespace
  loop
    execute 'drop function if exists ' || r.func || ' cascade';
  end loop;
end$$;

-- Random selection RPC with optional filters
-- Note: categories parameter added at the end to maintain backward compatibility
create or replace function public.random_questions(
  n int,
  topics text[] default null,
  difficulties text[] default null,
  mcq_only boolean default false,
  include_attempted boolean default false,
  flashcards_only boolean default false,
  categories text[] default null,
  question_types text[] default null
)
returns table (
  id uuid,
  question_number int,
  question_text text,
  answer_text text,
  topic text,
  category text,
  difficulty public.difficulty_level,
  question_type public.question_type,
  created_at timestamptz,
  mcq jsonb
)
language sql
stable
as $$
  select
    q.id,
    q.question_number,
    q.question_text,
    q.answer_text,
    q.topic::text as topic,
    q.category,
    q.difficulty,
    q.question_type,
    q.created_at,
    case
      when mcq.id is null then null
      else jsonb_build_object(
        'id', mcq.id,
        'question_id', mcq.question_id,
        'choices', mcq.choices,
        'correct_choice_index', mcq.correct_choice_index,
        'explanation', mcq.explanation,
        'shuffle_options', mcq.shuffle_options,
        'created_at', mcq.created_at,
        'updated_at', mcq.updated_at
      )
    end as mcq
  from public.questions q
  left join public.multiple_choice_questions mcq on mcq.question_id = q.id
  where (topics is null or q.topic::text = any(topics))
    and (difficulties is null or q.difficulty::text = any(difficulties))
    and (categories is null or q.category::text = any(categories))
    and (question_types is null or q.question_type::text = any(question_types))
    and (
      -- Show all questions if neither filter is specified
      (not mcq_only and not flashcards_only)
      -- Show only MCQs if mcq_only is true
      or (mcq_only and mcq.id is not null)
      -- Flashcards view should surface every question, even if an MCQ exists
      or flashcards_only
    )
    and (
      include_attempted
      or not exists (
        select 1
        from public.question_attempts qa
        where qa.question_id = q.id
          and qa.user_id = auth.uid()
          and (
            (mcq_only and qa.practice_mode = 'mcq')
            or (flashcards_only and qa.practice_mode = 'flashcards')
            or (not mcq_only and not flashcards_only)
          )
      )
    )
  order by random()
  limit n;
$$;

-- Grant execute permissions
grant execute on function public.random_questions(int, text[], text[], boolean, boolean, boolean, text[], text[]) to anon, authenticated;

-- Distinct topics
create or replace function public.list_topics()
returns setof text
language sql
stable
as $$
  select distinct q.topic::text from public.questions q where q.topic is not null order by 1;
$$;

grant execute on function public.list_topics() to anon, authenticated;

-- Distinct topics filtered by category
create or replace function public.list_topics_by_category(category_filter text)
returns setof text
language sql
stable
as $$
  select distinct q.topic::text
  from public.questions q
  where q.topic is not null
    and q.category is not null
    and q.category::text = category_filter
  order by 1;
$$;

grant execute on function public.list_topics_by_category(text) to anon, authenticated;

-- Distinct categories
create or replace function public.list_categories()
returns setof text
language sql
stable
as $$
  select distinct q.category::text from public.questions q where q.category is not null order by 1;
$$;

grant execute on function public.list_categories() to anon, authenticated;

-- List all difficulty levels from enum
create or replace function public.list_difficulty_levels()
returns setof text
language sql
stable
as $$
  select unnest(enum_range(null::public.difficulty_level))::text order by 1;
$$;

grant execute on function public.list_difficulty_levels() to anon, authenticated;

-- List all question types from enum
create or replace function public.list_question_types()
returns setof text
language sql
stable
as $$
  select unnest(enum_range(null::public.question_type))::text order by 1;
$$;

grant execute on function public.list_question_types() to anon, authenticated;

-- Track user sessions
drop function if exists public.log_user_sign_in(text, text, text);

create or replace function public.log_user_sign_in(
  first_name text default null,
  last_name text default null,
  email text default null
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.user_profiles (
    user_id,
    first_name,
    last_name,
    email,
    first_signed_in_at,
    last_signed_in_at,
    updated_at
  )
  values (
    auth.uid(),
    nullif(first_name, ''),
    nullif(last_name, ''),
    coalesce(nullif(email, ''), auth.jwt() ->> 'email'),
    now(),
    now(),
    now()
  )
  on conflict (user_id) do update
    set
      first_name = coalesce(excluded.first_name, public.user_profiles.first_name),
      last_name = coalesce(excluded.last_name, public.user_profiles.last_name),
      email = coalesce(excluded.email, public.user_profiles.email),
      first_signed_in_at = least(public.user_profiles.first_signed_in_at, excluded.first_signed_in_at),
      last_signed_in_at = greatest(public.user_profiles.last_signed_in_at, excluded.last_signed_in_at),
      updated_at = now();
$$;

grant execute on function public.log_user_sign_in(text, text, text) to authenticated;

-- Get daily Gemini API usage statistics for the last 30 days
create or replace function public.get_daily_gemini_usage()
returns table (
  date date,
  api_calls bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    date_trunc('day', used_at)::date as date,
    count(*) as api_calls
  from public.gemini_usage_logs
  where used_at >= current_date - interval '29 days'
  group by date_trunc('day', used_at)::date
  order by date desc;
$$;

grant execute on function public.get_daily_gemini_usage() to authenticated;

-- Get daily Gemini API usage grouped by model for the last 30 days
create or replace function public.get_daily_gemini_usage_by_model()
returns table (
  date date,
  model text,
  api_calls bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    date_trunc('day', used_at)::date as date,
    model,
    count(*) as api_calls
  from public.gemini_usage_logs
  where used_at >= current_date - interval '29 days'
  group by date_trunc('day', used_at)::date, model
  order by date desc, model;
$$;

grant execute on function public.get_daily_gemini_usage_by_model() to authenticated;

-- Get MCQ progress per category for the current user
-- Returns total MCQ count and attempted count for each category
create or replace function public.get_mcq_category_progress()
returns table (
  category text,
  total_count bigint,
  attempted_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    q.category::text as category,
    count(distinct q.id) as total_count,
    count(distinct qa.question_id) filter (where qa.user_id = auth.uid()) as attempted_count
  from public.questions q
  inner join public.multiple_choice_questions mcq on mcq.question_id = q.id
  left join public.question_attempts qa
    on qa.question_id = q.id
    and qa.user_id = auth.uid()
    and qa.practice_mode = 'mcq'
  where q.category is not null
  group by q.category
  order by q.category;
$$;

grant execute on function public.get_mcq_category_progress() to anon, authenticated;

-- Get Flashcard progress per category for the current user
-- Returns total question count and attempted count for each category (all questions, not just MCQs)
create or replace function public.get_flashcard_category_progress()
returns table (
  category text,
  total_count bigint,
  attempted_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    q.category::text as category,
    count(distinct q.id) as total_count,
    count(distinct qa.question_id) filter (where qa.user_id = auth.uid()) as attempted_count
  from public.questions q
  left join public.question_attempts qa
    on qa.question_id = q.id
    and qa.user_id = auth.uid()
    and qa.practice_mode = 'flashcards'
  where q.category is not null
  group by q.category
  order by q.category;
$$;

grant execute on function public.get_flashcard_category_progress() to anon, authenticated;

-- Get today's MCQ score for the current user
-- Returns attempted count and correct count for today
create or replace function public.get_today_mcq_score(category_filter text default null)
returns table (
  attempted_today bigint,
  correct_today bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*)::bigint as attempted_today,
    count(*) filter (where qa.is_correct = true)::bigint as correct_today
  from public.question_attempts qa
  inner join public.questions q on q.id = qa.question_id
  inner join public.multiple_choice_questions mcq on mcq.question_id = q.id
  where qa.user_id = auth.uid()
    and qa.attempted_at::date = current_date
    and qa.practice_mode = 'mcq'
    and qa.is_correct is not null
    and (category_filter is null or q.category::text = category_filter);
$$;

grant execute on function public.get_today_mcq_score(text) to anon, authenticated;

-- Get today's MCQ attempt history for the current user
-- Returns question details with attempt info, ordered by most recent first
create or replace function public.get_today_mcq_history(category_filter text default null)
returns table (
  question_id uuid,
  question_number int,
  question_text text,
  topic text,
  difficulty text,
  is_correct boolean,
  attempted_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    q.id as question_id,
    q.question_number,
    q.question_text,
    q.topic::text as topic,
    q.difficulty::text as difficulty,
    qa.is_correct,
    qa.attempted_at
  from public.question_attempts qa
  inner join public.questions q on q.id = qa.question_id
  inner join public.multiple_choice_questions mcq on mcq.question_id = q.id
  where qa.user_id = auth.uid()
    and qa.attempted_at::date = current_date
    and qa.practice_mode = 'mcq'
    and qa.is_correct is not null
    and (category_filter is null or q.category::text = category_filter)
  order by qa.attempted_at desc;
$$;

grant execute on function public.get_today_mcq_history(text) to anon, authenticated;
