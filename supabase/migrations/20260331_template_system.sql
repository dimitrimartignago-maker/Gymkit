-- supabase/migrations/20260331_template_system.sql

-- client_id diventa nullable (template = workout_plan senza cliente)
ALTER TABLE workout_plans
  ALTER COLUMN client_id DROP NOT NULL;

-- da quale template deriva questa scheda
ALTER TABLE workout_plans
  ADD COLUMN IF NOT EXISTS source_template_id UUID REFERENCES workout_plans(id);

-- obiettivi del cliente (testo libero)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS goals TEXT;

-- indice per query template del trainer
CREATE INDEX IF NOT EXISTS idx_workout_plans_templates
  ON workout_plans(trainer_id)
  WHERE client_id IS NULL;
