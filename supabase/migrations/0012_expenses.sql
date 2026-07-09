-- ============================================================
-- Personal expenses — one row per spend, built for fast entry.
-- Analytics are derived (monthly totals, category breakdowns);
-- nothing aggregated is stored.
-- ============================================================

create table expenses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  date        date not null default current_date,
  amount      numeric(12, 2) not null check (amount > 0),
  category    text not null default 'other'
                check (category in (
                  'groceries', 'eating_out', 'transport', 'household',
                  'shopping', 'health', 'kids', 'kids_fees',
                  'entertainment', 'staff', 'subscriptions', 'other'
                )),
  method      text check (method in ('cash', 'upi', 'card', 'bank', 'other')),
  note        text,
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create index idx_expenses_user_date on expenses (user_id, date desc) where deleted_at is null;
create index idx_expenses_category  on expenses (user_id, category) where deleted_at is null;

alter table expenses enable row level security;
create policy "own expenses" on expenses
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on public.expenses to authenticated, anon, service_role;
