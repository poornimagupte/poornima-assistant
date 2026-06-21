create table staff_absences (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  staff_id   uuid not null references staff (id) on delete cascade,
  date       date not null,
  type       text not null default 'casual'
               check (type in ('sick', 'casual', 'holiday', 'other')),
  note       text,
  created_at timestamptz not null default now(),
  unique (staff_id, date)   -- one absence record per person per day
);

create index idx_absences_staff on staff_absences (staff_id, date desc);
create index idx_absences_user  on staff_absences (user_id, date desc);

alter table staff_absences enable row level security;
create policy "own staff_absences" on staff_absences
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on public.staff_absences to authenticated, anon, service_role;
