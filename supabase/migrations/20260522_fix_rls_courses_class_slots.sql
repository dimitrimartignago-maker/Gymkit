-- =============================================================
-- GymKit — Fix RLS: courses e class_slots
-- Eseguire nel SQL Editor di Supabase (Project → SQL Editor)
-- =============================================================

-- =============================================================
-- FIX 2 — courses
-- Problema: la policy "trainer: read + crud if assigned" usava
-- FOR ALL con OR TRUE, dando accesso illimitato a trainer e
-- mescolando erroneamente la logica client.
-- =============================================================

DROP POLICY IF EXISTS "trainer: read + crud if assigned" ON courses;

-- Trainer: SELECT su tutti i corsi della propria palestra
CREATE POLICY "trainer: read all gym courses"
  ON courses FOR SELECT
  USING (
    current_user_role() = 'trainer'
    AND gym_id = current_user_gym_id()
  );

-- Trainer: UPDATE solo sui corsi dove è il trainer assegnato
CREATE POLICY "trainer: update own courses"
  ON courses FOR UPDATE
  USING (
    current_user_role() = 'trainer'
    AND gym_id = current_user_gym_id()
    AND trainer_id = auth.uid()
  )
  WITH CHECK (
    current_user_role() = 'trainer'
    AND gym_id = current_user_gym_id()
    AND trainer_id = auth.uid()
  );

-- Nota: le policy esistenti rimangono invariate:
--   "admin: full access"  → FOR ALL, admin con gym_id corretto
--   "client: read active" → FOR SELECT, corsi attivi della propria palestra

-- =============================================================
-- FIX 3 — class_slots
-- Problema: la policy "trainer: read + crud own slots" usava
-- FOR ALL per trainer+client, permettendo a entrambi di
-- INSERT/UPDATE/DELETE qualsiasi slot della palestra.
-- =============================================================

DROP POLICY IF EXISTS "trainer: read + crud own slots" ON class_slots;

-- Trainer e Client: SELECT su slot della propria palestra
CREATE POLICY "trainer+client: read gym slots"
  ON class_slots FOR SELECT
  USING (
    current_user_role() IN ('trainer', 'client')
    AND course_id IN (
      SELECT id FROM courses WHERE gym_id = current_user_gym_id()
    )
  );

-- Trainer: UPDATE solo sugli slot dove è il trainer assegnato
CREATE POLICY "trainer: update own slots"
  ON class_slots FOR UPDATE
  USING (
    current_user_role() = 'trainer'
    AND trainer_id = auth.uid()
  )
  WITH CHECK (
    current_user_role() = 'trainer'
    AND trainer_id = auth.uid()
  );

-- Trainer: DELETE solo sugli slot dove è il trainer assegnato
CREATE POLICY "trainer: delete own slots"
  ON class_slots FOR DELETE
  USING (
    current_user_role() = 'trainer'
    AND trainer_id = auth.uid()
  );

-- Nota: le policy esistenti rimangono invariate:
--   "admin: full access" → FOR ALL, admin con gym_id corretto
-- Client: nessun INSERT/UPDATE/DELETE (nessuna policy aggiuntiva)
