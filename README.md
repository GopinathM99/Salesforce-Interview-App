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
- Install dependencies and run locally:
  - `npm install`
  - `npm run dev`
- Recommended verification commands prior to committing UI changes:
  - `npm run lint`
  - `npm run build`

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

- RPC `public.random_questions(n, topics, difficulties, mcq_only, include_attempted, flashcards_only)`
  - Returns `n` random rows, optionally filtered by topic/difficulty.
  - Includes an `mcq` JSON blob when the question has MCQ metadata.
  - When `mcq_only = true`, only returns rows with MCQ metadata.
- When `flashcards_only = true`, every question is eligible so flashcards surface questions even if MCQ metadata exists.

**RLS Policies**

- RLS is enabled. The included policy allows `select` for `anon` and `authenticated` roles so the UI can read questions without login.
- Modify the write policy if you plan to build an admin UI.

**Styling & UI Toolkit**

- Tailwind CSS v4 powers utility classes. Global tokens live in `styles/globals.css`; theme extensions (colors, radius, card shadow) are defined in `tailwind.config.js`.
- Shadcn UI scaffolds reusable primitives into `components/ui/`. Components are added on demand, e.g. `npx shadcn@latest add button`.
- `lib/utils.ts` exports the `cn` helper (clsx + tailwind-merge) used by Shadcn components.
- When migrating legacy styles, replace `.btn`, `.card`, etc. with Shadcn/Tailwind utilities incrementally and rerun `npm run lint` / `npm run build` after each page.

**Project Structure**

- `app/` Next.js App Router pages
  - `/` landing with links to `/flashcards` and `/mcq`
  - `/flashcards` Flashcard mode with reveal + next
  - `/mcq` Multiple choice with submit + feedback
  - `/admin` Admin dashboard with subroutes
- `components/` shared presentation and logic (`AuthProvider`, `AuthStatus`, etc.)
- `components/ui/` Shadcn primitives generated via CLI (e.g., `button.tsx`)
- `lib/` framework-agnostic helpers (`supabaseClient`, `types`, `utils`)
- `styles/globals.css` Global Tailwind layers + design tokens
- `supabase/*.sql` Schema, RPC function, and sample seed data

**Email Delivery System**

The application includes a comprehensive email delivery system for sending daily/weekly/bi-weekly practice questions to subscribers.

**Setup:**
1. Configure Gmail SMTP credentials in environment variables:
   - `GMAIL_USER`: Your Gmail address
   - `GMAIL_APP_PASSWORD`: 16-character app password (requires 2FA)
2. Set email service configuration:
   - `EMAIL_SERVICE_TOKEN`: Secure token for API authentication
   - `CRON_SECRET`: Secret for Vercel cron job authentication
   - `NEXT_PUBLIC_SITE_URL`: Your site URL for unsubscribe links

**Features:**
- **Subscription Management**: Users can subscribe with preferences for topics, difficulty, question types, and delivery frequency
- **Email Templates**: Responsive HTML emails with customizable content and branding
- **Scheduled Delivery**: Automated email sending via Vercel cron jobs (daily at 9 AM)
- **Admin Interface**: Manage subscriptions, send test emails, and view delivery logs at `/admin/email-management`
- **Unsubscribe System**: Token-based unsubscribe mechanism with email preference management
- **Delivery Tracking**: Comprehensive logging of email delivery status and errors

**API Endpoints:**
- `POST /api/send-emails`: Trigger email delivery (requires authentication)
- `GET /api/unsubscribe?token=`: Handle unsubscribe requests
- `POST /api/unsubscribe`: Unsubscribe by email address
- `GET /api/cron/send-emails`: Vercel cron job endpoint

**Database Tables:**
- `subscription_preferences`: User subscription settings and preferences
- `email_delivery_logs`: Track email delivery attempts and status
- `unsubscribe_tokens`: Secure tokens for unsubscribe functionality

**Notes**

- Do not commit real keys. Use `.env.local` locally and deploy secrets in your hosting platform.
- Gmail SMTP has a 500 emails/day limit for regular accounts. Consider Google Workspace for higher volume.
- The email system respects user preferences and includes unsubscribe links in all emails.
- For more features later: bookmarking, spaced repetition, test sessions, and an admin editor.
