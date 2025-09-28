**Salesforce Interview App**

- Next.js + Supabase app for Salesforce Developer interview prep.
- Landing page offers two modes: Flashcards and MCQs.
- Questions are randomly fetched from a Supabase Postgres database via an SQL RPC.

**Quick Start**

- Create a Supabase project and copy your Project URL and anon key.
- In the Supabase SQL editor, run files in `supabase/` in this order:
  - `schema.sql`
  - `functions.sql`
  - `seed.sql` (optional but helpful)
- Copy `.env.local.example` to `.env.local` and set:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Install and run locally:
  - `npm install`
  - `npm run dev`

Open http://localhost:3000 to use the app.

**Optional Google Sign-In**

- In Supabase → Authentication → Providers, enable Google and configure your OAuth credentials.
- Add `http://localhost:3000` (and your production URL) to the provider redirect URLs so the Supabase callback returns to the app.
- No additional environment variables are required. Once enabled, the header shows a "Sign in with Google" button while still allowing anonymous use.
- Signing in stores the Supabase session locally and lets you personalize future features without blocking existing workflows.

**Admin (Create/Edit/Delete)**

- Enable Email/Password in Supabase Authentication.
- Create an admin user in the Supabase dashboard (Authentication → Users).
- Add the admin’s login email plus their first and last name to the `public.admin_users` table. Run this once per admin in the SQL editor:
  - `insert into public.admin_users (email, first_name, last_name) values ('you@example.com', 'You', 'Example');`
- Visit `/admin` and sign in using that account.
- Use the “Admin Users” card on `/admin` to add or remove additional admins by entering their first name, last name, and login email.
- Create new questions or edit/delete existing ones. MCQs are created by checking “Is Multiple Choice”, adding choices, and setting the correct index (saved into the dedicated `multiple_choice_questions` table).
- Topic dropdowns across the app pull from the DB via the `list_topics()` RPC.

**CSV Import/Export**

- On `/admin`, use the "CSV Import/Export" panel.
- Export downloads `questions_export.csv` with columns:
  - `id` (optional on import; if present, upserts by id)
  - `question_text`, `answer_text`, `topic`, `difficulty` (easy|medium|hard)
  - `choices` (either JSON array like `["A","B"]` or pipe-separated like `A|B|C|D`; mapped to the MCQ table)
  - `correct_choice_index` (0-based index for the correct choice)
- Import will upsert in batches. Rows missing `question_text` or `topic` are ignored. Difficulty defaults to `medium` if invalid.
- See `supabase/sample.csv` for an example format.

**Database Design**

- Table `public.questions`
  - `id uuid` (PK)
  - `question_text text`
  - `answer_text text`
  - `topic text`
  - `difficulty difficulty_level` (`easy|medium|hard`)
  - `created_at timestamptz`

- Table `public.multiple_choice_questions`
  - `id uuid` (PK)
  - `question_id uuid` (FK → `questions.id`, unique)
  - `choices jsonb` (array of option strings)
  - `correct_choice_index int`
  - `explanation text`
  - `shuffle_options boolean`
  - `created_at timestamptz`
  - `updated_at timestamptz`

- RPC `public.random_questions(n, topics, difficulties, mcq_only)`
  - Returns `n` random rows, optionally filtered by topic/difficulty.
  - Includes an `mcq` JSON blob when the question has MCQ metadata.
  - When `mcq_only = true`, only returns rows with MCQ metadata.

**RLS Policies**

- RLS is enabled. The included policy allows `select` for `anon` and `authenticated` roles so the UI can read questions without login.
- Modify the write policy if you plan to build an admin UI.

**Project Structure**

- `app/` Next.js App Router pages
  - `/` landing with links to `/flashcards` and `/mcq`
  - `/flashcards` Flashcard mode with reveal + next
  - `/mcq` Multiple choice with submit + feedback
- `lib/supabaseClient.ts` Supabase client using public env vars
- `lib/types.ts` TypeScript models
- `styles/globals.css` Minimal styling
- `supabase/*.sql` Schema, RPC function, and sample seed data

**Notes**

- Do not commit real keys. Use `.env.local` locally and deploy secrets in your hosting platform.
- For more features later: bookmarking, spaced repetition, test sessions, and an admin editor.
