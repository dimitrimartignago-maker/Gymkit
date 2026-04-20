-- 1. Add recurrence_id to class_slots
alter table class_slots
  add column if not exists recurrence_id uuid null;

-- 2. Create class_slot_trainers junction table
create table if not exists class_slot_trainers (
  slot_id    uuid not null references class_slots(id) on delete cascade,
  trainer_id uuid not null references profiles(id) on delete cascade,
  primary key (slot_id, trainer_id)
);

-- 3. Enable RLS
alter table class_slot_trainers enable row level security;

-- 4. Allow service role full access (admins use service role via createAdminClient)
create policy "Service role manages slot trainers"
  on class_slot_trainers
  for all
  to service_role
  using (true)
  with check (true);
