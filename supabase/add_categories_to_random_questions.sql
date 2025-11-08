-- Migration: Add categories parameter to random_questions function
-- Run this script in your Supabase SQL editor

-- Step 1: Drop all existing overloads of random_questions
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

-- Step 2: Recreate the function with categories parameter
create or replace function public.random_questions(
  n int,
  topics text[] default null,
  difficulties text[] default null,
  mcq_only boolean default false,
  include_attempted boolean default false,
  flashcards_only boolean default false,
  categories text[] default null
)
returns table (
  id uuid,
  question_text text,
  answer_text text,
  topic text,
  category text,
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
    q.category,
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
    and (categories is null or q.category::text = any(categories))
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
      )
    )
  order by random()
  limit n;
$$;

-- Step 3: Grant execute permissions
grant execute on function public.random_questions(int, text[], text[], boolean, boolean, boolean, text[]) to anon, authenticated;

-- Step 4: Create list_categories function to retrieve all distinct categories
create or replace function public.list_categories()
returns setof text
language sql
stable
as $$
  select distinct q.category::text from public.questions q where q.category is not null order by 1;
$$;

grant execute on function public.list_categories() to anon, authenticated;

-- Step 5: Verify the function was created
do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on p.pronamespace = n.oid
    where n.nspname = 'public'
      and p.proname = 'random_questions'
      and pg_get_function_arguments(p.oid) like '%categories%'
  ) then
    raise notice 'Success: random_questions function created with categories parameter';
  else
    raise warning 'Warning: Function may not have been created correctly';
  end if;
end$$;

