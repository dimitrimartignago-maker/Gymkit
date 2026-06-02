-- =============================================================
-- GymKit — Schema completo
-- Eseguire nel SQL Editor di Supabase (Project → SQL Editor)
-- =============================================================

-- =============================================================
-- 1. CORE — Identità e Ruoli
-- =============================================================

CREATE TABLE gym (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                      TEXT NOT NULL,
  slug                      TEXT UNIQUE NOT NULL,
  logo_url                  TEXT,
  primary_color             TEXT DEFAULT '#000000',
  secondary_color           TEXT DEFAULT '#FFFFFF',
  timezone                  TEXT DEFAULT 'Europe/Rome',
  booking_cancellation_hours INT DEFAULT 2,
  created_at                TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  gym_id       UUID NOT NULL REFERENCES gym(id),
  first_name   TEXT NOT NULL,
  last_name    TEXT NOT NULL,
  email        TEXT NOT NULL,
  phone        TEXT,
  avatar_url   TEXT,
  role         TEXT NOT NULL CHECK (role IN ('admin', 'trainer', 'client')),
  invited_by          UUID REFERENCES profiles(id),
  is_active           BOOLEAN DEFAULT true,
  can_manage_courses  BOOLEAN DEFAULT false,
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE custom_roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id      UUID NOT NULL REFERENCES gym(id),
  name        TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE trainer_clients (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id  UUID NOT NULL REFERENCES profiles(id),
  client_id   UUID NOT NULL REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  is_active   BOOLEAN DEFAULT true,
  UNIQUE(trainer_id, client_id)
);

CREATE TABLE invitations (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id               UUID NOT NULL REFERENCES gym(id),
  invited_by           UUID NOT NULL REFERENCES profiles(id),
  token                TEXT UNIQUE NOT NULL,
  role                 TEXT NOT NULL DEFAULT 'client',
  pre_assigned_trainer UUID REFERENCES profiles(id),
  email                TEXT,
  used_at              TIMESTAMPTZ,
  expires_at           TIMESTAMPTZ NOT NULL,
  created_at           TIMESTAMPTZ DEFAULT now()
);

-- =============================================================
-- 2. MODULO — Schede Allenamento
-- =============================================================

CREATE TABLE exercises (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id            UUID NOT NULL REFERENCES gym(id),
  name              TEXT NOT NULL,
  muscle_group      TEXT NOT NULL,
  -- petto, dorso, gambe, quadricipiti, femorali, glutei,
  -- spalle, bicipiti, tricipiti, avambracci, core, cardio, full_body
  equipment         TEXT,
  -- bilanciere, manubri, cavi, macchina, corpo_libero, kettlebell,
  -- elastici, trx, sbarra, panca, nessuno
  description       TEXT,
  media_url         TEXT,
  thumbnail_url     TEXT,
  parent_exercise_id UUID REFERENCES exercises(id),
  cloned_from       UUID REFERENCES exercises(id),
  created_by        UUID REFERENCES profiles(id),
  is_default        BOOLEAN DEFAULT false,
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE workout_plans (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id              UUID NOT NULL REFERENCES gym(id),
  client_id           UUID NOT NULL REFERENCES profiles(id),
  trainer_id          UUID NOT NULL REFERENCES profiles(id),
  name                TEXT NOT NULL,
  description         TEXT,
  version             INT NOT NULL DEFAULT 1,
  status              TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('draft', 'active', 'archived')),
  starts_at           DATE,
  expires_at          DATE,
  previous_version_id UUID REFERENCES workout_plans(id),
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE plan_days (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id    UUID NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  day_order  INT NOT NULL,
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE plan_exercises (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_day_id       UUID NOT NULL REFERENCES plan_days(id) ON DELETE CASCADE,
  exercise_id       UUID NOT NULL REFERENCES exercises(id),
  exercise_order    INT NOT NULL,
  sets              INT NOT NULL,
  reps              TEXT NOT NULL,
  rest_seconds      INT,
  load_prescription TEXT,
  notes             TEXT,
  superset_group    TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE workout_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id      UUID NOT NULL REFERENCES profiles(id),
  plan_id        UUID NOT NULL REFERENCES workout_plans(id),
  plan_day_id    UUID NOT NULL REFERENCES plan_days(id),
  started_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at   TIMESTAMPTZ,
  overall_notes  TEXT,
  overall_rating INT CHECK (overall_rating BETWEEN 1 AND 5),
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE workout_log_sets (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_log_id   UUID NOT NULL REFERENCES workout_logs(id) ON DELETE CASCADE,
  plan_exercise_id UUID NOT NULL REFERENCES plan_exercises(id),
  set_number       INT NOT NULL,
  reps_done        INT,
  load_used        DECIMAL,
  load_unit        TEXT DEFAULT 'kg',
  rpe              INT CHECK (rpe BETWEEN 1 AND 10),
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- =============================================================
-- 3. MODULO — Booking Corsi
-- =============================================================

CREATE TABLE courses (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id                   UUID NOT NULL REFERENCES gym(id),
  name                     TEXT NOT NULL,
  description              TEXT,
  color                    TEXT,
  max_capacity             INT NOT NULL,
  default_duration_minutes INT NOT NULL DEFAULT 60,
  trainer_id               UUID REFERENCES profiles(id),
  is_active                BOOLEAN DEFAULT true,
  created_at               TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE class_slots (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id             UUID NOT NULL REFERENCES courses(id),
  trainer_id            UUID REFERENCES profiles(id),
  starts_at             TIMESTAMPTZ NOT NULL,
  ends_at               TIMESTAMPTZ NOT NULL,
  max_capacity_override INT,
  is_cancelled          BOOLEAN DEFAULT false,
  cancellation_reason   TEXT,
  created_at            TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE bookings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_slot_id    UUID NOT NULL REFERENCES class_slots(id),
  client_id        UUID NOT NULL REFERENCES profiles(id),
  status           TEXT NOT NULL DEFAULT 'confirmed'
                     CHECK (status IN ('confirmed', 'waitlist', 'cancelled', 'no_show')),
  waitlist_position INT,
  booked_at        TIMESTAMPTZ DEFAULT now(),
  cancelled_at     TIMESTAMPTZ,
  UNIQUE(class_slot_id, client_id)
);

CREATE TABLE course_schedules (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id    UUID NOT NULL REFERENCES courses(id),
  day_of_week  INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  trainer_id   UUID REFERENCES profiles(id),
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- =============================================================
-- 4. INDICI CRITICI
-- =============================================================

CREATE INDEX idx_profiles_gym_role       ON profiles(gym_id, role);
CREATE INDEX idx_trainer_clients_trainer ON trainer_clients(trainer_id) WHERE is_active;
CREATE INDEX idx_trainer_clients_client  ON trainer_clients(client_id) WHERE is_active;
CREATE INDEX idx_exercises_gym           ON exercises(gym_id) WHERE is_active;
CREATE INDEX idx_exercises_muscle        ON exercises(gym_id, muscle_group);
CREATE INDEX idx_workout_plans_client    ON workout_plans(client_id, status);
CREATE INDEX idx_workout_plans_trainer   ON workout_plans(trainer_id);
CREATE INDEX idx_workout_logs_client     ON workout_logs(client_id);
CREATE INDEX idx_workout_logs_plan_day   ON workout_logs(plan_day_id);
CREATE INDEX idx_class_slots_date        ON class_slots(starts_at) WHERE NOT is_cancelled;
CREATE INDEX idx_bookings_slot           ON bookings(class_slot_id) WHERE status != 'cancelled';
CREATE INDEX idx_bookings_client         ON bookings(client_id, status);
CREATE INDEX idx_invitations_token       ON invitations(token) WHERE used_at IS NULL;

-- =============================================================
-- 5. ROW LEVEL SECURITY
-- =============================================================

ALTER TABLE gym              ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_roles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_clients  ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises        ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_plans    ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_days        ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_exercises   ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_log_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_slots      ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_schedules ENABLE ROW LEVEL SECURITY;

-- Helper: ruolo dell'utente corrente
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: gym_id dell'utente corrente
CREATE OR REPLACE FUNCTION current_user_gym_id()
RETURNS UUID AS $$
  SELECT gym_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ---- profiles ----
CREATE POLICY "admin: full access"
  ON profiles FOR ALL
  USING (current_user_role() = 'admin' AND gym_id = current_user_gym_id());

CREATE POLICY "trainer: read own clients"
  ON profiles FOR SELECT
  USING (
    current_user_role() = 'trainer'
    AND gym_id = current_user_gym_id()
    AND (
      id = auth.uid()
      OR id IN (
        SELECT client_id FROM trainer_clients
        WHERE trainer_id = auth.uid() AND is_active
      )
    )
  );

CREATE POLICY "client: read and update self"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "client: update self"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- ---- exercises ----
CREATE POLICY "admin: full access"
  ON exercises FOR ALL
  USING (current_user_role() = 'admin' AND gym_id = current_user_gym_id());

CREATE POLICY "trainer: crud own + read default"
  ON exercises FOR ALL
  USING (
    gym_id = current_user_gym_id()
    AND (
      is_default = true
      OR created_by = auth.uid()
    )
  )
  WITH CHECK (
    gym_id = current_user_gym_id()
    AND is_default = false
    AND created_by = auth.uid()
  );

CREATE POLICY "client: read only"
  ON exercises FOR SELECT
  USING (gym_id = current_user_gym_id() AND is_active = true);

-- ---- workout_plans ----
CREATE POLICY "admin: read all"
  ON workout_plans FOR SELECT
  USING (current_user_role() = 'admin' AND gym_id = current_user_gym_id());

CREATE POLICY "trainer: crud own clients"
  ON workout_plans FOR ALL
  USING (
    current_user_role() = 'trainer'
    AND gym_id = current_user_gym_id()
    AND trainer_id = auth.uid()
  );

CREATE POLICY "client: read own"
  ON workout_plans FOR SELECT
  USING (current_user_role() = 'client' AND client_id = auth.uid());

-- ---- plan_days ----
CREATE POLICY "access via workout_plan"
  ON plan_days FOR ALL
  USING (
    plan_id IN (
      SELECT id FROM workout_plans
      WHERE
        (current_user_role() = 'admin' AND gym_id = current_user_gym_id())
        OR (current_user_role() = 'trainer' AND trainer_id = auth.uid())
        OR (current_user_role() = 'client' AND client_id = auth.uid())
    )
  );

-- ---- plan_exercises ----
CREATE POLICY "access via plan_day"
  ON plan_exercises FOR ALL
  USING (
    plan_day_id IN (
      SELECT pd.id FROM plan_days pd
      JOIN workout_plans wp ON wp.id = pd.plan_id
      WHERE
        (current_user_role() = 'admin' AND wp.gym_id = current_user_gym_id())
        OR (current_user_role() = 'trainer' AND wp.trainer_id = auth.uid())
        OR (current_user_role() = 'client' AND wp.client_id = auth.uid())
    )
  );

-- ---- workout_logs ----
CREATE POLICY "admin: read all"
  ON workout_logs FOR SELECT
  USING (
    current_user_role() = 'admin'
    AND plan_id IN (SELECT id FROM workout_plans WHERE gym_id = current_user_gym_id())
  );

CREATE POLICY "trainer: read own clients"
  ON workout_logs FOR SELECT
  USING (
    current_user_role() = 'trainer'
    AND client_id IN (
      SELECT client_id FROM trainer_clients
      WHERE trainer_id = auth.uid() AND is_active
    )
  );

CREATE POLICY "client: crud own"
  ON workout_logs FOR ALL
  USING (current_user_role() = 'client' AND client_id = auth.uid());

-- ---- workout_log_sets ----
CREATE POLICY "access via workout_log"
  ON workout_log_sets FOR ALL
  USING (
    workout_log_id IN (
      SELECT id FROM workout_logs
      WHERE
        (current_user_role() = 'admin')
        OR (current_user_role() = 'trainer' AND client_id IN (
          SELECT client_id FROM trainer_clients WHERE trainer_id = auth.uid() AND is_active
        ))
        OR (current_user_role() = 'client' AND client_id = auth.uid())
    )
  );

-- ---- courses ----
CREATE POLICY "admin: full access"
  ON courses FOR ALL
  USING (current_user_role() = 'admin' AND gym_id = current_user_gym_id());

CREATE POLICY "trainer: read + crud if assigned"
  ON courses FOR ALL
  USING (
    gym_id = current_user_gym_id()
    AND (
      current_user_role() = 'client'
      OR (current_user_role() = 'trainer' AND (trainer_id = auth.uid() OR TRUE))
    )
  );

CREATE POLICY "client: read active"
  ON courses FOR SELECT
  USING (gym_id = current_user_gym_id() AND is_active = true);

-- ---- class_slots ----
CREATE POLICY "admin: full access"
  ON class_slots FOR ALL
  USING (
    course_id IN (SELECT id FROM courses WHERE gym_id = current_user_gym_id())
    AND current_user_role() = 'admin'
  );

CREATE POLICY "trainer: read + crud own slots"
  ON class_slots FOR ALL
  USING (
    course_id IN (SELECT id FROM courses WHERE gym_id = current_user_gym_id())
    AND (current_user_role() IN ('trainer', 'client'))
  );

-- ---- bookings ----
CREATE POLICY "admin: read all"
  ON bookings FOR SELECT
  USING (
    current_user_role() = 'admin'
    AND class_slot_id IN (
      SELECT cs.id FROM class_slots cs
      JOIN courses c ON c.id = cs.course_id
      WHERE c.gym_id = current_user_gym_id()
    )
  );

CREATE POLICY "trainer: read own slots"
  ON bookings FOR SELECT
  USING (
    current_user_role() = 'trainer'
    AND class_slot_id IN (
      SELECT id FROM class_slots WHERE trainer_id = auth.uid()
    )
  );

CREATE POLICY "client: crud own"
  ON bookings FOR ALL
  USING (current_user_role() = 'client' AND client_id = auth.uid());

-- ---- invitations ----
CREATE POLICY "admin: full access"
  ON invitations FOR ALL
  USING (current_user_role() = 'admin' AND gym_id = current_user_gym_id());

CREATE POLICY "trainer: create client invites"
  ON invitations FOR INSERT
  WITH CHECK (
    current_user_role() = 'trainer'
    AND gym_id = current_user_gym_id()
    AND role = 'client'
    AND invited_by = auth.uid()
  );

-- ---- gym ----
CREATE POLICY "members: read own gym"
  ON gym FOR SELECT
  USING (id = current_user_gym_id());

CREATE POLICY "admin: update own gym"
  ON gym FOR UPDATE
  USING (id = current_user_gym_id() AND current_user_role() = 'admin');
