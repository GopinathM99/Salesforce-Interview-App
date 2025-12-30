-- Clean up related data when an auth user is deleted

drop trigger if exists on_auth_user_deleted on auth.users;
drop function if exists public.handle_auth_user_delete();

create or replace function public.handle_auth_user_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.subscription_preferences
  where user_id = old.id
     or (old.email is not null and lower(email) = lower(old.email));

  delete from public.otp_codes
  where old.email is not null
    and lower(email) = lower(old.email);

  return old;
end;
$$;

create trigger on_auth_user_deleted
after delete on auth.users
for each row execute function public.handle_auth_user_delete();
