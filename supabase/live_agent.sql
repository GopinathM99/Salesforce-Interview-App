-- Live Agent Prep storage tables + RLS policies

create table public.live_agent_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  interview_type text not null,
  level text,
  model text,
  status text not null default 'active',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index on public.live_agent_sessions (user_id, started_at desc);

create table public.live_agent_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.live_agent_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  source text not null default 'text' check (source in ('text', 'audio', 'transcript')),
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index on public.live_agent_messages (session_id, created_at);

create table public.live_agent_feedback (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.live_agent_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  question_text text,
  score numeric(4, 2),
  rubric jsonb not null default '{}'::jsonb,
  feedback text not null,
  created_at timestamptz not null default now()
);

create index on public.live_agent_feedback (session_id, created_at);

alter table public.live_agent_sessions enable row level security;
alter table public.live_agent_messages enable row level security;
alter table public.live_agent_feedback enable row level security;

create policy "live_agent_sessions_select_own"
  on public.live_agent_sessions for select
  using (auth.uid() = user_id);

create policy "live_agent_sessions_insert_own"
  on public.live_agent_sessions for insert
  with check (auth.uid() = user_id);

create policy "live_agent_messages_select_own"
  on public.live_agent_messages for select
  using (auth.uid() = user_id);

create policy "live_agent_messages_insert_own"
  on public.live_agent_messages for insert
  with check (auth.uid() = user_id);

create policy "live_agent_feedback_select_own"
  on public.live_agent_feedback for select
  using (auth.uid() = user_id);

create policy "live_agent_feedback_insert_own"
  on public.live_agent_feedback for insert
  with check (auth.uid() = user_id);
