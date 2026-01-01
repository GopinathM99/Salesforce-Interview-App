# Repository Guidelines

## Project Structure & Module Organization
- `app/` contains all Next.js App Router routes; key pages include `/page.tsx`, `/flashcards`, `/mcq`, and `/admin`.
- `components/` hosts reusable UI and logic modules such as `AuthProvider` and `AuthStatus`.
- `lib/` stores client helpers (e.g., `supabaseClient.ts`, shared types) that should remain framework-agnostic.
- `styles/` keeps global CSS (`globals.css`); prefer colocated module CSS only when a component’s styles become complex.
- `supabase/` ships SQL migrations, RPC definitions, and sample data; apply them via the Supabase SQL editor in the documented order.

## Build, Test, and Development Commands
- `npm install` installs dependencies; rerun after dependency updates or lockfile changes.
- `npm run dev` launches the Next.js dev server at `http://localhost:3000` with Hot Module Reloading.
- `npm run build` performs a production build and should pass before tagging releases.
- `npm run lint` runs Next.js ESLint. On first execution, follow the prompt (`Strict` preset recommended) to scaffold `.eslintrc.json`.

## Coding Style & Naming Conventions
- Use TypeScript with explicit types for exported interfaces; rely on inference for local consts.
- Favor 2-space indentation (matching existing files) and single quotes only when template literals are not required.
- Keep React components PascalCased (`AuthStatus`), hooks camelCased (`useAuth`), and utility modules lowercased (`supabaseClient`).
- Apply minimal, purposeful comments ahead of non-obvious logic; avoid restating code.

## Testing Guidelines
- There are currently no automated tests; add React Testing Library or Vitest suites alongside components under a `__tests__/` directory.
- Name test files `<Component>.test.tsx` and mirror the folder structure of the code under test.
- New features should include coverage for rendering states (loading, error, success) and Supabase RPC interactions using mocks.
- Run `npm run lint` and any added test scripts locally before submitting a pull request.

## Commit & Pull Request Guidelines
- Write imperative, 72-character subject lines (e.g., `Add optional Google auth header`), followed by a blank line and focused detail if necessary.
- Group related changes per commit; avoid bundling SQL migrations with unrelated UI tweaks.
- Pull requests should describe the problem, summarize the solution, list manual or automated checks (`npm run dev`, `npm run lint`), and attach screenshots or screen recordings for UI changes.
- Reference Supabase configuration or environment updates explicitly so reviewers can replicate the setup.

## Security & Configuration Tips
- Never commit `.env.local`; copy from `.env.local.example` and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` locally.
- Enable Google OAuth in Supabase Providers and register both local (`http://localhost:3000`) and production redirect URLs.
- Rotate keys immediately if they appear in issue threads, PR descriptions, or logs.
