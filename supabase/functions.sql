-- Drop legacy version without include_attempted param to prevent overload ambiguity
drop function if exists public.random_questions(int, text[], text[], boolean);

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
