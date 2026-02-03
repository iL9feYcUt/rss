-- Supabase: create `push_subscriptions` table used by frontend to store push endpoints
-- Paste into Supabase SQL Editor and run.

create table if not exists public.push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  endpoint text unique,
  keys jsonb,
  subscription jsonb,
  created_at timestamptz default now()
);

create index if not exists push_subscriptions_created_idx on public.push_subscriptions(created_at desc);

-- RLS: allow anon (frontend) to upsert subscriptions. Use with caution.
alter table public.push_subscriptions enable row level security;

drop policy if exists anon_upsert on public.push_subscriptions;
create policy anon_upsert on public.push_subscriptions
  for all
  using (true)
  with check (true);

-- End
