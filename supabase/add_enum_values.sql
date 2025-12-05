-- ============================================================================
-- Generic Script to Add New Category or Topic ENUM Values
-- ============================================================================
--
-- INSTRUCTIONS:
-- 1. Replace $New_Category with your new category value (e.g., 'Marketing Cloud')
-- 2. Replace $New_Topic with your new topic value (e.g., 'Flows')
-- 3. Run only the section you need (Category OR Topic)
-- 4. After running, also update lib/types.ts to add the value to the TypeScript Category type
--
-- IMPORTANT NOTES:
-- - Category enum (question_category) already exists in your database
-- - Topic enum (topic_type) requires migrate_topic_to_enum.sql to be run first
-- - These scripts are idempotent (safe to run multiple times)
-- - Enum values are case-sensitive and cannot be removed once added
-- ============================================================================


-- ============================================================================
-- SECTION 1: Add New CATEGORY Value
-- ============================================================================
-- Run this section to add a new Category value
-- Replace '$New_Category' with your actual category name (keep the quotes!)

DO $$
BEGIN
  -- Check if the category enum exists
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'question_category' AND n.nspname = 'public'
  ) THEN
    -- Check if the new category already exists in the enum
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
        AND t.typname = 'question_category'
        AND e.enumlabel = '$New_Category'
    ) THEN
      -- Add the new category to the enum
      ALTER TYPE public.question_category ADD VALUE '$New_Category';
      RAISE NOTICE 'Added "$New_Category" to question_category enum';
    ELSE
      RAISE NOTICE '"$New_Category" already exists in question_category enum';
    END IF;
  ELSE
    RAISE EXCEPTION 'question_category enum type does not exist. Run schema.sql first';
  END IF;
END$$;

-- After adding a category, also update:
-- 1. lib/types.ts - Add to the Category type definition
-- 2. supabase/schema.sql - Add to the initial enum definition and validation lists


-- ============================================================================
-- SECTION 2: Add New TOPIC Value
-- ============================================================================
-- Run this section to add a new Topic value
-- Replace '$New_Topic' with your actual topic name (keep the quotes!)

DO $$
BEGIN
  -- Check if the topic enum exists
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'topic_type' AND n.nspname = 'public'
  ) THEN
    -- Check if the new topic already exists in the enum
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
        AND t.typname = 'topic_type'
        AND e.enumlabel = '$New_Topic'
    ) THEN
      -- Add the new topic to the enum
      ALTER TYPE public.topic_type ADD VALUE '$New_Topic';
      RAISE NOTICE 'Added "$New_Topic" to topic_type enum';
    ELSE
      RAISE NOTICE '"$New_Topic" already exists in topic_type enum';
    END IF;
  ELSE
    RAISE WARNING 'topic_type enum does not exist yet. Run migrate_topic_to_enum.sql first';
  END IF;
END$$;


-- ============================================================================
-- SECTION 3: Verification - Show All Current Enum Values
-- ============================================================================
-- Run this section to see all current category and topic values

DO $$
DECLARE
  category_values text;
  topic_values text;
  category_count int;
  topic_count int;
BEGIN
  -- Get all category enum values
  SELECT
    string_agg(enumlabel, ', ' ORDER BY enumlabel),
    count(*)
  INTO category_values, category_count
  FROM pg_enum e
  JOIN pg_type t ON t.oid = e.enumtypid
  JOIN pg_namespace n ON n.oid = t.typnamespace
  WHERE n.nspname = 'public' AND t.typname = 'question_category';

  -- Get all topic enum values
  SELECT
    string_agg(enumlabel, ', ' ORDER BY enumlabel),
    count(*)
  INTO topic_values, topic_count
  FROM pg_enum e
  JOIN pg_type t ON t.oid = e.enumtypid
  JOIN pg_namespace n ON n.oid = t.typnamespace
  WHERE n.nspname = 'public' AND t.typname = 'topic_type';

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Current ENUM Values:';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Categories (% total): %', category_count, category_values;
  RAISE NOTICE '----------------------------------------';
  RAISE NOTICE 'Topics (% total): %', COALESCE(topic_count::text, '0'), COALESCE(topic_values, 'topic_type enum not found');
  RAISE NOTICE '========================================';
END$$;
