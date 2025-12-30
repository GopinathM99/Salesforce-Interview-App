-- Periodic cleanup for orphaned rows (safety net)

create or replace function public.cleanup_orphaned_records()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if to_regclass('public.live_agent_messages') is not null then
    execute 'delete from public.live_agent_messages lam
      where not exists (select 1 from auth.users u where u.id = lam.user_id)';
  end if;

  if to_regclass('public.live_agent_feedback') is not null then
    execute 'delete from public.live_agent_feedback laf
      where not exists (select 1 from auth.users u where u.id = laf.user_id)';
  end if;

  if to_regclass('public.live_agent_sessions') is not null then
    execute 'delete from public.live_agent_sessions las
      where not exists (select 1 from auth.users u where u.id = las.user_id)';
  end if;

  delete from public.question_attempts qa
  where not exists (select 1 from auth.users u where u.id = qa.user_id);

  delete from public.question_bookmarks qb
  where not exists (select 1 from auth.users u where u.id = qb.user_id);

  delete from public.gemini_usage_logs gul
  where not exists (select 1 from auth.users u where u.id = gul.user_id);

  delete from public.user_profiles up
  where not exists (select 1 from auth.users u where u.id = up.user_id);

  delete from public.subscription_preferences sp
  where sp.user_id is not null
    and not exists (select 1 from auth.users u where u.id = sp.user_id);
end;
$$;

-- Schedule cleanup daily at 03:00 UTC if pg_cron is available
create extension if not exists pg_cron;

do $$
begin
  if not exists (
    select 1 from cron.job where jobname = 'cleanup-orphans'
  ) then
    perform cron.schedule(
      'cleanup-orphans',
      '0 3 * * *',
      'select public.cleanup_orphaned_records();'
    );
  end if;
end$$;
