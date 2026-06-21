-- ============================================================
-- Personal Assistant Dashboard — migration 0003
-- Household staff + a money ledger (salaries, advances, repayments).
-- Run AFTER 0001_init_schema.sql and 0002_hobbies.sql.
--
-- Design note: an employee's outstanding advance balance is NOT stored.
-- It's derived: SUM(advances) - SUM(repayments). The staff_balances view
-- at the bottom computes it so the UI never has to.
-- ============================================================

-- ------------------------------------------------------------
-- staff  (the people you employ)
--   monthly_salary = the agreed wage; actual payments live in the ledger.
--   pay_day        = day of month salary is due (1-31), for reminders.
-- ------------------------------------------------------------
create table staff (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  name           text not null,
  role           text,                     -- 'Driver', 'Cook', 'Maid', etc.
  phone          text,
  monthly_salary numeric(12, 2),           -- INR; numeric avoids float rounding
  pay_day        integer check (pay_day between 1 and 31),
  start_date     date,
  status         text not null default 'active'
                   check (status in ('active', 'inactive')),
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz
);

create trigger trg_staff_updated
  before update on staff
  for each row execute function set_updated_at();

create index idx_staff_user on staff (user_id) where deleted_at is null;

-- ------------------------------------------------------------
-- staff_transactions  (the money ledger — one row per event)
--   type:
--     salary        wage paid for a month
--     advance       money lent to them (raises what they owe)
--     repayment     paid back / deducted (lowers what they owe)
--     bonus         extra payment
--     reimbursement you paid them back for an expense
--     deduction     e.g. for absence
--     other
--   amount is always positive; the type carries the meaning.
--   for_month: first-of-month the salary applies to (nullable; salary only).
-- ------------------------------------------------------------
create table staff_transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  staff_id    uuid not null references staff (id) on delete cascade,
  date        date not null default current_date,
  type        text not null
                check (type in ('salary','advance','repayment','bonus',
                                'reimbursement','deduction','other')),
  amount      numeric(12, 2) not null check (amount >= 0),
  method      text check (method in ('cash','upi','bank','other')),
  for_month   date,
  note        text,
  created_at  timestamptz not null default now()
);

create index idx_staff_tx_staff on staff_transactions (staff_id, date desc);
create index idx_staff_tx_user  on staff_transactions (user_id, date desc);

-- ============================================================
-- Row Level Security — owner only, same pattern as the rest
-- ============================================================
alter table staff               enable row level security;
alter table staff_transactions  enable row level security;

create policy "own staff" on staff
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own staff_transactions" on staff_transactions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on public.staff              to authenticated, anon, service_role;
grant select, insert, update, delete on public.staff_transactions to authenticated, anon, service_role;

-- ------------------------------------------------------------
-- staff_balances  (derived: outstanding advance per person)
--   security_invoker = true makes the view honour the querying user's RLS,
--   so it can never leak another user's rows.
-- ------------------------------------------------------------
create view staff_balances
  with (security_invoker = true)
as
select
  s.id      as staff_id,
  s.user_id as user_id,
  coalesce(sum(t.amount) filter (where t.type = 'advance'), 0)
    - coalesce(sum(t.amount) filter (where t.type = 'repayment'), 0)
    as advance_outstanding,
  max(t.date) filter (where t.type = 'salary') as last_salary_date
from staff s
left join staff_transactions t on t.staff_id = s.id
where s.deleted_at is null
group by s.id, s.user_id;

grant select on public.staff_balances to authenticated, anon, service_role;
