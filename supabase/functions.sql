-- Drop existing overloads so we can redefine the return shape safely
drop function if exists public.random_questions(int, text[], text[], boolean);
drop function if exists public.random_questions(int, text[], text[], boolean, boolean);

-- Random selection RPC with optional filters
create or replace function public.random_questions(
  n int,
  topics text[] default null,
  difficulties text[] default null,
  mcq_only boolean default false,
  include_attempted boolean default false
)
returns table (
  id uuid,
  question_text text,
  answer_text text,
  topic text,
  sub_topic text,
  difficulty public.difficulty_level,
  created_at timestamptz,
  mcq jsonb
)
language sql
stable
as $$
  select
    q.id,
    q.question_text,
    q.answer_text,
    q.topic,
    q.sub_topic,
    q.difficulty,
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
  where (topics is null or q.topic = any(topics))
    and (difficulties is null or q.difficulty::text = any(difficulties))
    and (not mcq_only or mcq.id is not null)
    and (
      include_attempted
      or not exists (
        select 1
        from public.question_attempts qa
        where qa.question_id = q.id
          and qa.user_id = auth.uid()
      )
    )
  order by random()
  limit n;
$$;

grant execute on function public.random_questions(int, text[], text[], boolean, boolean) to anon, authenticated;

-- Distinct topics
create or replace function public.list_topics()
returns setof text
language sql
stable
as $$
  select distinct q.topic from public.questions q where q.topic is not null order by 1;
$$;

grant execute on function public.list_topics() to anon, authenticated;

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
