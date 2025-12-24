-- Add practice_mode to question_attempts so MCQ and Flashcards progress are separate.
-- Safe to run multiple times (idempotent).

alter table public.question_attempts
  add column if not exists practice_mode text not null default 'mcq';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'question_attempts_practice_mode_check'
      and conrelid = 'public.question_attempts'::regclass
  ) then
    alter table public.question_attempts
      add constraint question_attempts_practice_mode_check
      check (practice_mode in ('mcq', 'flashcards'));
  end if;
end$$;

-- Backfill based on legacy meaning:
-- - flashcards attempts were written with is_correct = null
-- - MCQ attempts have is_correct set to true/false
update public.question_attempts
set practice_mode = 'flashcards'
where practice_mode = 'mcq'
  and is_correct is null;

-- Replace old unique constraint (user_id, question_id) with (user_id, question_id, practice_mode)
do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'question_attempts_unique_user_question'
      and conrelid = 'public.question_attempts'::regclass
  ) then
    alter table public.question_attempts drop constraint question_attempts_unique_user_question;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'question_attempts_unique_user_question_mode'
      and conrelid = 'public.question_attempts'::regclass
  ) then
    alter table public.question_attempts
      add constraint question_attempts_unique_user_question_mode
      unique (user_id, question_id, practice_mode);
  end if;
end$$;

drop index if exists public.idx_question_attempts_user_question;
create index if not exists idx_question_attempts_user_mode_question
  on public.question_attempts (user_id, practice_mode, question_id);

