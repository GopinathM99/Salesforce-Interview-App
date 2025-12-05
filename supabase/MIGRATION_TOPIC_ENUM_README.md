# Topic and Category ENUM Migration

## Overview

This migration converts the `topic` and `category` columns in the `questions` table from `text` type to ENUM types for better data integrity and type safety.

> **Note:** To add new Category or Topic values after this migration, see `ADD_NEW_ENUM_VALUES.md`

## Changes Made

### 1. Database Schema Updates

#### Category (Already Completed)
- **Status**: ✅ Already migrated in `schema.sql`
- **ENUM Type**: `public.question_category`
- **Values**:
  - General
  - Sales Cloud
  - Service Cloud
  - Agentforce
  - CPQ
  - Litify
  - Agentforce Concepts
  - Agentforce and Service Cloud
  - Agentforce and Data Cloud
  - Agentforce and Sales Cloud
  - Prompt Engineering

#### Topic (New Migration)
- **Status**: ⏳ Requires migration
- **ENUM Type**: `public.topic_type`
- **Values**: Dynamically created from existing database values
- **Migration Script**: `supabase/migrate_topic_to_enum.sql`

### 2. TypeScript Type Updates

Updated `/lib/types.ts`:
- Added `Category` type with all possible category values
- Updated `Question` and `RawQuestion` interfaces to use the `Category` type
- Added comments indicating that `topic` and `category` are ENUMs in the database

### 3. UI Component Updates

Updated `/components/QuestionForm.tsx`:
- Changed **Topic** input from text input with datalist to a `<select>` dropdown
- Changed **Category** input from text input with datalist to a `<select>` dropdown
- Both dropdowns now enforce selection of valid ENUM values only

Updated `/app/admin/edit-questions/page.tsx`:
- Added `loadCategories()` function to fetch categories from database
- Pass `categories` prop to `QuestionForm` component

## How to Run the Migration

### Prerequisites

1. **Backup your database** before running any migration
2. Have access to Supabase SQL Editor or `psql` command line

### Steps

#### Option 1: Using Supabase Dashboard (Recommended)

1. Log into your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the file `supabase/migrate_topic_to_enum.sql`
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click **Run** to execute the migration
7. Check the output logs for:
   - Created enum values
   - Migration verification results
   - Any errors or warnings

#### Option 2: Using psql Command Line

```bash
# Connect to your database
psql <your-database-connection-string>

# Run the migration script
\i supabase/migrate_topic_to_enum.sql

# Check the results
SELECT enumlabel
FROM pg_enum e
JOIN pg_type t ON t.oid = e.enumtypid
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public' AND t.typname = 'topic_type'
ORDER BY enumlabel;
```

### Verification

After running the migration, verify:

1. **Check the enum was created:**
   ```sql
   SELECT enumlabel
   FROM pg_enum e
   JOIN pg_type t ON t.oid = e.enumtypid
   JOIN pg_namespace n ON n.oid = t.typnamespace
   WHERE n.nspname = 'public' AND t.typname = 'topic_type'
   ORDER BY enumlabel;
   ```

2. **Check the column type:**
   ```sql
   SELECT column_name, data_type, udt_name
   FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'questions'
     AND column_name IN ('topic', 'category');
   ```

   Expected output:
   - `topic`: USER-DEFINED, `topic_type`
   - `category`: USER-DEFINED, `question_category`

3. **Test the application:**
   - Navigate to `/admin/edit-questions`
   - Click "Edit" on any question
   - Verify that Topic and Category show as dropdowns with proper values
   - Try saving a question with updated topic/category

## What the Migration Does

1. **Queries existing topics**: Scans the `questions` table to find all unique topic values
2. **Creates ENUM type**: Creates `public.topic_type` enum with all discovered values
3. **Migrates the column**:
   - Creates temporary column with enum type
   - Copies data from old text column to new enum column
   - Drops old text column
   - Renames enum column to `topic`
   - Recreates indexes
4. **Updates functions**: Updates `list_topics()` function to cast enum to text for API compatibility
5. **Verifies migration**: Outputs verification logs with topic count and enum values

## Important Notes

### Data Integrity
- ⚠️ The migration will **fail** if any existing topic value doesn't match the enum values
- All existing topic values must be valid before migration
- The script validates data integrity before converting the column

### Idempotency
- ✅ The migration script is **idempotent** - safe to run multiple times
- If enum already exists, it will add missing values instead of failing
- If column is already enum type, it will skip the migration

### Rollback (If Needed)

If you need to rollback the migration:

```sql
-- Convert topic back to text
DO $$
BEGIN
  -- Add temporary text column
  ALTER TABLE public.questions ADD COLUMN topic_text text;

  -- Copy enum values as text
  UPDATE public.questions SET topic_text = topic::text;

  -- Drop enum column
  ALTER TABLE public.questions DROP COLUMN topic;

  -- Rename text column
  ALTER TABLE public.questions RENAME COLUMN topic_text TO topic;

  -- Add not null constraint
  ALTER TABLE public.questions ALTER COLUMN topic SET NOT NULL;

  -- Recreate index
  CREATE INDEX idx_questions_topic ON public.questions (topic);
END$$;

-- Optionally drop the enum type
DROP TYPE IF EXISTS public.topic_type;
```

## Benefits of ENUM Types

1. **Data Integrity**: Prevents invalid topic/category values from being inserted
2. **Type Safety**: TypeScript types match database constraints
3. **Better Performance**: ENUMs are stored as integers internally, saving space
4. **Clear Schema**: Enum values are self-documenting in the schema
5. **Query Optimization**: Database can optimize queries on enum columns better

## Adding New Topic/Category Values

> **For detailed instructions on adding new enum values, see [`ADD_NEW_ENUM_VALUES.md`](./ADD_NEW_ENUM_VALUES.md)** or use the template script [`add_enum_values.sql`](./add_enum_values.sql)

### Quick Reference - Adding a New Topic

```sql
-- Add a new topic value to the enum
ALTER TYPE public.topic_type ADD VALUE 'New Topic Name';

-- Verify it was added
SELECT enumlabel FROM pg_enum e
JOIN pg_type t ON t.oid = e.enumtypid
WHERE t.typname = 'topic_type'
ORDER BY enumlabel;
```

### Quick Reference - Adding a New Category

```sql
-- Add a new category value to the enum
ALTER TYPE public.question_category ADD VALUE 'New Category Name';

-- Also update TypeScript types in lib/types.ts
-- Add the new value to the Category type definition
```

### Important: Cannot Remove Enum Values

⚠️ **PostgreSQL does not support removing values from an ENUM type**. If you need to remove a value:
1. Ensure no records use that value
2. Create a new enum type without that value
3. Migrate all data to the new type
4. Drop the old type and rename the new one

## Troubleshooting

### Migration Fails with "Value not in enum"

**Problem**: Existing data contains topic values not in the enum

**Solution**:
1. Check which values are causing issues:
   ```sql
   SELECT DISTINCT topic FROM public.questions
   WHERE topic NOT IN (
     SELECT enumlabel FROM pg_enum e
     JOIN pg_type t ON t.oid = e.enumtypid
     WHERE t.typname = 'topic_type'
   );
   ```
2. Either add those values to the enum or update the data to use valid values

### UI shows empty dropdowns

**Problem**: Categories or topics not loading in the UI

**Solution**:
1. Check that `list_topics()` and `list_categories()` functions are updated
2. Verify the functions cast enum to text: `topic::text` and `category::text`
3. Check browser console for any API errors

### Cannot insert new questions

**Problem**: Getting enum value errors when creating questions

**Solution**:
1. Ensure the topic/category value exists in the enum
2. Check that the value matches exactly (case-sensitive)
3. Verify the QuestionForm is passing valid enum values

## Support

If you encounter any issues with the migration:
1. Check the Supabase logs for detailed error messages
2. Verify your database connection and permissions
3. Ensure you have the latest version of the application code
4. Review the verification queries above to diagnose the issue
