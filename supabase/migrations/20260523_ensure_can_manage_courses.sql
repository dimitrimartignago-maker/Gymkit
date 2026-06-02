-- GymKit — Aggiunge can_manage_courses a profiles (idempotente)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS can_manage_courses BOOLEAN NOT NULL DEFAULT false;
