# How to Add New Category or Topic Values

This guide explains where and how to add new Category or Topic enum values to your application.

## Quick Reference

| Step | For Category | For Topic |
|------|-------------|-----------|
| 1. Database | Run **SECTION 1** of `add_enum_values.sql` | Run **SECTION 2** of `add_enum_values.sql` |
| 2. TypeScript | ⚠️ **Required**: Update `lib/types.ts` | ✅ **Not needed** (topics load dynamically) |
| 3. Schema (optional) | Update `supabase/schema.sql` | Update `supabase/schema.sql` |

**Key Difference:**
- **Categories**: Broad product areas (Sales Cloud, CPQ, Agentforce)
- **Topics**: Specific concepts within categories (Workflows, Pricing, Configuration)

---

## Step-by-Step Instructions

### Adding a New CATEGORY

#### 1. Add to Database

1. Open `supabase/add_enum_values.sql`
2. Find **SECTION 1: Add New CATEGORY Value**
3. Replace `$New_Category` with your new category name
4. Copy **only SECTION 1** and run it in Supabase SQL Editor

**Example:**
```sql
-- Original
ALTER TYPE public.question_category ADD VALUE '$New_Category';

-- Replace with (for example, adding "Marketing Cloud"):
ALTER TYPE public.question_category ADD VALUE 'Marketing Cloud';
```

**Full SECTION 1 Example:**
```sql
-- ============================================================================
-- SECTION 1: Add New CATEGORY Value
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'question_category' AND n.nspname = 'public'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
        AND t.typname = 'question_category'
        AND e.enumlabel = 'Marketing Cloud'  -- <-- YOUR VALUE HERE
    ) THEN
      ALTER TYPE public.question_category ADD VALUE 'Marketing Cloud';  -- <-- YOUR VALUE HERE
      RAISE NOTICE 'Added "Marketing Cloud" to question_category enum';
    ELSE
      RAISE NOTICE '"Marketing Cloud" already exists in question_category enum';
    END IF;
  ELSE
    RAISE EXCEPTION 'question_category enum type does not exist. Run schema.sql first';
  END IF;
END$$;
```

#### 2. Update TypeScript Types

**File:** `lib/types.ts`

Find the `Category` type and add your new value:

```typescript
export type Category =
  | "General"
  | "Sales Cloud"
  | "Service Cloud"
  | "Agentforce"
  | "CPQ"
  | "Litify"
  | "Omnistudio"
  | "Marketing Cloud"  // <-- Add your new category here
  | "Agentforce Concepts"
  | "Agentforce and Service Cloud"
  | "Agentforce and Data Cloud"
  | "Agentforce and Sales Cloud"
  | "Prompt Engineering";
```

#### 3. Update Schema (Optional but Recommended)

**File:** `supabase/schema.sql`

Add your new category in **THREE places**:

**Place 1:** Initial enum definition (around line 161)
```sql
create type public.question_category as enum (
  'General',
  'Sales Cloud',
  'Service Cloud',
  'Agentforce',
  'CPQ',
  'Litify',
  'Omnistudio',
  'Marketing Cloud',  -- <-- Add here
  'Agentforce Concepts',
  -- ... rest of values
);
```

**Place 2:** Idempotent check section (around line 241)
```sql
if not exists (
  select 1 from pg_enum e
  join pg_type t on t.oid = e.enumtypid
  join pg_namespace n on n.oid = t.typnamespace
  where n.nspname = 'public' and t.typname = 'question_category' and e.enumlabel = 'Marketing Cloud'
) then
  alter type public.question_category add value 'Marketing Cloud';
end if;
```

**Place 3:** Data validation list (around line 376)
```sql
and category not in (
  'General',
  'Sales Cloud',
  'Service Cloud',
  'Agentforce',
  'CPQ',
  'Litify',
  'Omnistudio',
  'Marketing Cloud',  -- <-- Add here
  -- ... rest of values
)
```

**Place 4:** Data migration case statement (around line 397)
```sql
when category = 'Marketing Cloud' then 'Marketing Cloud'::public.question_category
```

---

### Adding a New TOPIC

#### 1. Add to Database

1. Open `supabase/add_enum_values.sql`
2. Find **SECTION 2: Add New TOPIC Value**
3. Replace `$New_Topic` with your new topic name
4. Copy **only SECTION 2** and run it in Supabase SQL Editor

**Example:**
```sql
-- Original
ALTER TYPE public.topic_type ADD VALUE '$New_Topic';

-- Replace with (for example, adding "Flows"):
ALTER TYPE public.topic_type ADD VALUE 'Flows';
```

**Full SECTION 2 Example:**
```sql
-- ============================================================================
-- SECTION 2: Add New TOPIC Value
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'topic_type' AND n.nspname = 'public'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
        AND t.typname = 'topic_type'
        AND e.enumlabel = 'Flows'  -- <-- YOUR VALUE HERE
    ) THEN
      ALTER TYPE public.topic_type ADD VALUE 'Flows';  -- <-- YOUR VALUE HERE
      RAISE NOTICE 'Added "Flows" to topic_type enum';
    ELSE
      RAISE NOTICE '"Flows" already exists in topic_type enum';
    END IF;
  ELSE
    RAISE WARNING 'topic_type enum does not exist yet. Run migrate_topic_to_enum.sql first';
  END IF;
END$$;
```

#### 2. TypeScript Types - No Change Needed

Topics are loaded dynamically from the database via the `list_topics()` function, so you don't need to update TypeScript types.

#### 3. Update Schema (Optional but Recommended)

If you want the topic to be included in fresh database setups, add it to `supabase/schema.sql` in the topic migration section (if you've run `migrate_topic_to_enum.sql`).

---

## Verification

After adding a new value, run **SECTION 3** to verify:

```sql
-- ============================================================================
-- SECTION 3: Verification - Show All Current Enum Values
-- ============================================================================

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
```

---

## Testing

After adding new values:

1. **Verify in Database:**
   - Run SECTION 3 verification query
   - Check that your new value appears in the output

2. **Test in UI:**
   - Navigate to `/admin/edit-questions`
   - Click "Edit" on any question
   - Your new Category/Topic should appear in the dropdown
   - Try creating a new question with the new value

3. **Test API:**
   - The `list_categories()` and `list_topics()` functions should return your new value
   - Questions filtered by the new value should work correctly

---

## Important Notes

### ⚠️ Understanding Category vs Topic

**Categories** are broad product areas (what the question is about):
- Examples: "Sales Cloud", "Service Cloud", "CPQ", "Agentforce"

**Topics** are specific concepts or features (what aspect of the category):
- Examples: "Workflows", "Triggers", "Pricing", "Product Rules", "Configuration"

**Common Mistake:**
```sql
-- ❌ WRONG - Using Category as Topic
'CPQ'::public.topic_type,        -- Error! CPQ is a category
'CPQ'::public.question_category, -- Correct

-- ✅ CORRECT - Using appropriate Topic
'Product Rules'::public.topic_type,  -- Specific CPQ concept
'CPQ'::public.question_category,     -- Broad product area
```

**Note:** Some values like "CPQ" can be BOTH a Category AND a Topic if you add it to both enums. This is useful for general questions about the product itself.

### ⚠️ Cannot Remove Enum Values

PostgreSQL does **NOT** support removing values from an ENUM type. Once added, a value is permanent. To "remove" a value:

1. Ensure no records use it
2. Create a new enum type without that value
3. Migrate all data to the new type
4. Drop the old type and rename the new one

**This is complex - avoid needing to remove values by choosing carefully!**

### ✅ Best Practices

1. **Use consistent naming:**
   - Use proper capitalization (e.g., "Service Cloud" not "service cloud")
   - Match Salesforce product names exactly

2. **Add to schema.sql:**
   - Always update `schema.sql` so fresh database setups have the value
   - This ensures consistency across environments

3. **Update TypeScript types:**
   - For Categories, always update `lib/types.ts`
   - This provides type safety in your code

4. **Test thoroughly:**
   - Test creating, editing, and filtering questions with the new value
   - Verify the value appears in all relevant dropdowns

---

## File Locations Summary

| What | File | Action |
|------|------|--------|
| Add to Database | `supabase/add_enum_values.sql` | Run SECTION 1 (Category) or SECTION 2 (Topic) |
| TypeScript Types | `lib/types.ts` | Add to `Category` type (categories only) |
| Schema Definition | `supabase/schema.sql` | Add in 4 places (optional) |
| UI Components | `components/QuestionForm.tsx` | No change needed (loads dynamically) |

---

## Quick Commands

### Add a Category:
1. Edit `add_enum_values.sql` SECTION 1, replace `$New_Category`
2. Run in Supabase SQL Editor
3. Edit `lib/types.ts`, add to `Category` type
4. (Optional) Edit `schema.sql` in 4 places

### Add a Topic:
1. Edit `add_enum_values.sql` SECTION 2, replace `$New_Topic`
2. Run in Supabase SQL Editor
3. Done! (Topics load dynamically)

### Verify:
1. Run SECTION 3 of `add_enum_values.sql`
2. Check output for your new value
3. Test in UI at `/admin/edit-questions`

---

## Examples

### Example 1: Adding "Marketing Cloud" Category

**Step 1 - Database:**
```sql
ALTER TYPE public.question_category ADD VALUE 'Marketing Cloud';
```

**Step 2 - TypeScript (`lib/types.ts`):**
```typescript
export type Category =
  | "General"
  | "Marketing Cloud"  // Added
  | "Sales Cloud"
  // ... rest
```

**Step 3 - Test:**
- Open `/admin/edit-questions`
- "Marketing Cloud" appears in Category dropdown ✅

### Example 2: Adding "Process Builder" Topic

**Step 1 - Database:**
```sql
ALTER TYPE public.topic_type ADD VALUE 'Process Builder';
```

**Step 2 - Test:**
- Open `/admin/edit-questions`
- "Process Builder" appears in Topic dropdown ✅
- No other changes needed!

### Example 3: Adding "CPQ" Topic (Using Full Script)

If you want to add 'CPQ' as a topic (note: CPQ can be both a Category AND a Topic):

**Step 1 - Database (using idempotent script):**
```sql
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'topic_type' AND n.nspname = 'public'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
        AND t.typname = 'topic_type'
        AND e.enumlabel = 'CPQ'
    ) THEN
      ALTER TYPE public.topic_type ADD VALUE 'CPQ';
      RAISE NOTICE 'Added "CPQ" to topic_type enum';
    ELSE
      RAISE NOTICE '"CPQ" already exists in topic_type enum';
    END IF;
  ELSE
    RAISE WARNING 'topic_type enum does not exist yet. Run migrate_topic_to_enum.sql first';
  END IF;
END$$;
```

**Step 2 - Verify:**
```sql
SELECT enumlabel as topic_name
FROM pg_enum e
JOIN pg_type t ON t.oid = e.enumtypid
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public' AND t.typname = 'topic_type'
ORDER BY enumlabel;
```

**Step 3 - Use in your queries:**
```sql
INSERT INTO questions (question_text, topic, category, ...)
VALUES (
  'What is CPQ?',
  'CPQ'::public.topic_type,        -- Now valid!
  'CPQ'::public.question_category, -- Also valid!
  ...
);
```

---

## Troubleshooting

### "invalid input value for enum topic_type: 'SomeValue'"
This means you're trying to use a value that doesn't exist in the `topic_type` enum yet.

**Common cause:** Using a Category value as a Topic
```sql
-- ❌ Error: "invalid input value for enum topic_type: 'CPQ'"
'CPQ'::public.topic_type,        -- CPQ might not be added as a topic yet
'CPQ'::public.question_category  -- CPQ exists as a category

-- ✅ Fix Option 1: Use an existing topic
'Product Rules'::public.topic_type,
'CPQ'::public.question_category

-- ✅ Fix Option 2: Add the value as a topic first
-- Run: ALTER TYPE public.topic_type ADD VALUE 'CPQ';
-- Then you can use:
'CPQ'::public.topic_type,
'CPQ'::public.question_category
```

### "enum type does not exist"
- **For Category:** Run `schema.sql` first to create the enum
- **For Topic:** Run `migrate_topic_to_enum.sql` first

### New value doesn't appear in UI
- Refresh the browser (hard refresh with Cmd+Shift+R / Ctrl+Shift+F5)
- Check that `list_topics()` or `list_categories()` functions cast to text
- Verify the value was added: run SECTION 3

### TypeScript type errors
- Make sure you updated `lib/types.ts` for categories
- Run `npm run build` to check for type errors

---

## Need Help?

If you encounter issues:
1. Run SECTION 3 verification to see current values
2. Check the Supabase logs for detailed error messages
3. Verify the enum was created with the correct name
4. Ensure you're using the exact same case/spelling everywhere
