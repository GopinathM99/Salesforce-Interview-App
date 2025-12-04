-- Migration script to convert topic column from text to ENUM type
-- This script will:
-- 1. Query existing unique topic values
-- 2. Create a topic_type ENUM with those values
-- 3. Convert the topic column to use the ENUM type

-- Step 1: Create topic_type enum with existing values
-- Note: You need to run this migration after verifying the values below match your database
do $$
declare
  existing_topics text[];
  topic_value text;
begin
  -- Get all distinct topics from the database
  select array_agg(distinct topic order by topic)
  into existing_topics
  from public.questions
  where topic is not null and topic != '';

  -- Create the enum type if it doesn't exist
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'topic_type' and n.nspname = 'public'
  ) then
    -- Construct the CREATE TYPE statement dynamically
    execute format(
      'create type public.topic_type as enum (%s)',
      (
        select string_agg(quote_literal(topic), ', ')
        from (
          select distinct topic
          from public.questions
          where topic is not null and topic != ''
          order by topic
        ) t
      )
    );

    raise notice 'Created topic_type enum with values: %', array_to_string(existing_topics, ', ');
  end if;
end$$;

-- Step 2: Add new enum values to existing enum if needed
-- This ensures idempotency if the enum already exists
do $$
declare
  topic_value text;
begin
  if exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'topic_type' and n.nspname = 'public'
  ) then
    -- For each distinct topic in the database
    for topic_value in
      select distinct topic
      from public.questions
      where topic is not null and topic != ''
      order by topic
    loop
      -- Check if this value exists in the enum
      if not exists (
        select 1 from pg_enum e
        join pg_type t on t.oid = e.enumtypid
        join pg_namespace n on n.oid = t.typnamespace
        where n.nspname = 'public'
          and t.typname = 'topic_type'
          and e.enumlabel = topic_value
      ) then
        -- Add the missing value
        execute format('alter type public.topic_type add value %L', topic_value);
        raise notice 'Added topic value: %', topic_value;
      end if;
    end loop;
  end if;
end$$;

-- Step 3: Migrate the topic column from text to enum
do $$
begin
  -- Check if topic column exists and is still text type
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'questions'
      and column_name = 'topic'
      and data_type = 'text'
  ) then
    raise notice 'Starting migration of topic column to enum type';

    -- First, ensure all existing values are valid
    -- Log any values that don't match the enum
    perform topic
    from public.questions
    where topic is not null
      and topic != ''
      and topic not in (
        select enumlabel
        from pg_enum e
        join pg_type t on t.oid = e.enumtypid
        join pg_namespace n on n.oid = t.typnamespace
        where n.nspname = 'public' and t.typname = 'topic_type'
      );

    if found then
      raise exception 'Found topics that are not in the enum. Please check data integrity.';
    end if;

    -- Add temporary column with enum type
    alter table public.questions
      add column if not exists topic_enum public.topic_type;

    -- Copy and convert data
    update public.questions
    set topic_enum = topic::public.topic_type
    where topic is not null and topic != '';

    -- Drop old column and index
    drop index if exists idx_questions_topic;
    alter table public.questions drop column topic;

    -- Rename new column
    alter table public.questions rename column topic_enum to topic;

    -- Set not null constraint
    alter table public.questions
      alter column topic set not null;

    -- Recreate index
    create index idx_questions_topic on public.questions (topic);

    raise notice 'Successfully migrated topic column to enum type';
  else
    raise notice 'Topic column is already using enum type or does not exist';
  end if;

  -- If column doesn't exist yet, add it with enum type
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'questions'
      and column_name = 'topic'
  ) then
    alter table public.questions
      add column topic public.topic_type not null;
    create index idx_questions_topic on public.questions (topic);
    raise notice 'Added topic column with enum type';
  end if;
end$$;

-- Step 4: Update the list_topics function to work with enum
create or replace function public.list_topics()
returns setof text
language sql
stable
as $$
  select distinct q.topic::text from public.questions q where q.topic is not null order by 1;
$$;

grant execute on function public.list_topics() to anon, authenticated;

-- Verification query
-- Run this to verify the migration worked correctly
do $$
declare
  topic_count int;
  enum_count int;
begin
  select count(distinct topic) into topic_count from public.questions;

  select count(*) into enum_count
  from pg_enum e
  join pg_type t on t.oid = e.enumtypid
  join pg_namespace n on n.oid = t.typnamespace
  where n.nspname = 'public' and t.typname = 'topic_type';

  raise notice 'Migration verification:';
  raise notice '  Distinct topics in database: %', topic_count;
  raise notice '  Topic enum values: %', enum_count;
  raise notice '  Column type: %', (
    select data_type
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'questions'
      and column_name = 'topic'
  );
end$$;
