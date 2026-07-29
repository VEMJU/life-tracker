-- ===========================================================================
--  PUSH SUBSCRIPTIONS
--  Run this once in Supabase → SQL Editor → New query → Run.
--
--  One row per device that has agreed to receive notifications. The endpoint
--  is a URL only our server can post to; the two keys encrypt the payload so
--  even the push service cannot read it.
-- ===========================================================================

create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  agent       text,
  created_at  timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

-- A signed-in person may manage only their own devices.
drop policy if exists "own subscriptions" on public.push_subscriptions;
create policy "own subscriptions"
  on public.push_subscriptions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- The sending job uses the SERVICE ROLE key, which bypasses RLS by design —
-- that is why the service key must never appear in any browser-side file.

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);
