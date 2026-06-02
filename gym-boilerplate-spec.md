# GymKit — Boilerplate Specification

## Concept Summary

Template di app per palestre, venduto one-shot come istanza dedicata. Stack: Next.js + Supabase + Vercel, PWA. Due moduli core (Schede Allenamento + Booking Corsi), architettura modulare per estensioni future.

---

## 1. Supabase Data Model

### 1.1 Core — Identità e Ruoli

```sql
-- Configurazione palestra (1 record per istanza)
CREATE TABLE gym (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#000000',
  secondary_color TEXT DEFAULT '#FFFFFF',
  accent_color TEXT DEFAULT '#E94560',        -- colore accent (bottoni, highlights)
  timezone TEXT DEFAULT 'Europe/Rome',
  booking_cancellation_hours INT DEFAULT 2,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Profili utente (estende auth.users di Supabase)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  gym_id UUID NOT NULL REFERENCES gym(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'trainer', 'client')),
  goals TEXT,                        -- obiettivi del cliente (testo libero)
  invited_by UUID REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Per ruoli custom futuri
CREATE TABLE custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES gym(id),
  name TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Associazione trainer → clienti
CREATE TABLE trainer_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES profiles(id),
  client_id UUID NOT NULL REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(trainer_id, client_id)
);

-- Link di invito
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES gym(id),
  invited_by UUID NOT NULL REFERENCES profiles(id),
  token TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'client',
  pre_assigned_trainer UUID REFERENCES profiles(id),
  email TEXT,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 1.2 Modulo — Schede Allenamento

```sql
-- Libreria esercizi
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES gym(id),
  name TEXT NOT NULL,
  muscle_group TEXT NOT NULL,
  equipment TEXT,
  description TEXT,
  media_url TEXT,
  thumbnail_url TEXT,
  parent_exercise_id UUID REFERENCES exercises(id),
  cloned_from UUID REFERENCES exercises(id),
  created_by UUID REFERENCES profiles(id),
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Piano di allenamento (la "scheda")
-- client_id = NULL → il piano è un template
CREATE TABLE workout_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES gym(id),
  client_id UUID REFERENCES profiles(id),            -- NULL = template
  trainer_id UUID NOT NULL REFERENCES profiles(id),
  name TEXT NOT NULL,
  description TEXT,
  version INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft', 'active', 'archived')),
  starts_at DATE,
  expires_at DATE,
  previous_version_id UUID REFERENCES workout_plans(id),
  source_template_id UUID REFERENCES workout_plans(id),  -- template da cui è stata clonata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Giornate/Split della scheda
CREATE TABLE plan_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  day_order INT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Blocco esercizio dentro una giornata
CREATE TABLE plan_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_day_id UUID NOT NULL REFERENCES plan_days(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id),
  exercise_order INT NOT NULL,
  sets INT NOT NULL,
  reps TEXT NOT NULL,
  rest_seconds INT,
  load_prescription TEXT,
  notes TEXT,
  superset_group TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Log dell'allenamento eseguito
CREATE TABLE workout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id),
  plan_id UUID NOT NULL REFERENCES workout_plans(id),
  plan_day_id UUID NOT NULL REFERENCES plan_days(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  overall_notes TEXT,
  overall_rating INT CHECK (overall_rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Dettaglio per ogni esercizio loggato
CREATE TABLE workout_log_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_log_id UUID NOT NULL REFERENCES workout_logs(id) ON DELETE CASCADE,
  plan_exercise_id UUID NOT NULL REFERENCES plan_exercises(id),
  set_number INT NOT NULL,
  reps_done INT,
  load_used DECIMAL,
  load_unit TEXT DEFAULT 'kg',
  rpe INT CHECK (rpe BETWEEN 1 AND 10),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 1.3 Modulo — Booking Corsi

```sql
-- Definizione corso
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES gym(id),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  max_capacity INT NOT NULL,
  default_duration_minutes INT NOT NULL DEFAULT 60,
  trainer_id UUID REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Slot singolo nel calendario
CREATE TABLE class_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id),
  trainer_id UUID REFERENCES profiles(id),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  max_capacity_override INT,
  is_cancelled BOOLEAN DEFAULT false,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Prenotazione
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_slot_id UUID NOT NULL REFERENCES class_slots(id),
  client_id UUID NOT NULL REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'waitlist', 'cancelled', 'no_show')),
  waitlist_position INT,
  booked_at TIMESTAMPTZ DEFAULT now(),
  cancelled_at TIMESTAMPTZ,
  UNIQUE(class_slot_id, client_id)
);

-- Ricorrenze per generazione automatica slot
CREATE TABLE course_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id),
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  trainer_id UUID REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 1.4 Indici Critici

```sql
CREATE INDEX idx_profiles_gym_role ON profiles(gym_id, role);
CREATE INDEX idx_trainer_clients_trainer ON trainer_clients(trainer_id) WHERE is_active;
CREATE INDEX idx_trainer_clients_client ON trainer_clients(client_id) WHERE is_active;
CREATE INDEX idx_exercises_gym ON exercises(gym_id) WHERE is_active;
CREATE INDEX idx_exercises_muscle ON exercises(gym_id, muscle_group);
CREATE INDEX idx_workout_plans_client ON workout_plans(client_id, status);
CREATE INDEX idx_workout_plans_trainer ON workout_plans(trainer_id);
CREATE INDEX idx_workout_plans_templates ON workout_plans(trainer_id) WHERE client_id IS NULL;
CREATE INDEX idx_workout_logs_client ON workout_logs(client_id);
CREATE INDEX idx_workout_logs_plan_day ON workout_logs(plan_day_id);
CREATE INDEX idx_class_slots_date ON class_slots(starts_at) WHERE NOT is_cancelled;
CREATE INDEX idx_bookings_slot ON bookings(class_slot_id) WHERE status != 'cancelled';
CREATE INDEX idx_bookings_client ON bookings(client_id, status);
CREATE INDEX idx_invitations_token ON invitations(token) WHERE used_at IS NULL;
```

### 1.5 Row Level Security (RLS) — Principi

Ogni tabella ha RLS abilitato. La logica di sicurezza si basa su funzioni helper che interrogano il profilo dell'utente autenticato.

**Helper Functions:**
```sql
CREATE OR REPLACE FUNCTION current_user_role() RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION current_user_gym_id() RETURNS UUID AS $$
  SELECT gym_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

### 1.6 Row Level Security (RLS) — Implementazione

Le policy utilizzano gli helper per garantire che gli utenti accedano solo ai dati del proprio `gym_id` e rispettino i permessi del proprio `role`.

**Esempio policy `profiles`:**
```sql
-- Admin gestisce tutti i profili del proprio gym
CREATE POLICY "admin: full access" ON profiles FOR ALL
  USING (current_user_role() = 'admin' AND gym_id = current_user_gym_id());

-- Trainer legge i propri clienti
CREATE POLICY "trainer: read own clients" ON profiles FOR SELECT
  USING (
    current_user_role() = 'trainer'
    AND gym_id = current_user_gym_id()
    AND (id = auth.uid() OR id IN (SELECT client_id FROM trainer_clients WHERE trainer_id = auth.uid() AND is_active))
  );

-- Client legge e aggiorna solo sé stesso
CREATE POLICY "client: read and update self" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "client: update self" ON profiles FOR UPDATE USING (id = auth.uid());
```

### 1.7 Admin Client (Service Role)

Per le operazioni amministrative e le Server Actions che richiedono privilegi elevati (es. clonazione piani, soft-delete), viene utilizzato un client Supabase con `service_role` key. Questo client bypassa RLS e deve essere utilizzato esclusivamente lato server.

---

## 2. Design System

### 2.1 Principi

- **Mobile-first.** Ottimizzato per uso con una mano su schermi 6".
- **Alto contrasto.** Testi grandi e bottoni generosi per ambienti con luce variabile.
- **Brandabile.** Colori primario e accent iniettati dinamicamente.

### 2.2 Token di Design

```css
:root {
  /* Colori brand — iniettati dal root layout leggendo gym.primary_color / gym.accent_color */
  --color-primary: var(--gym-primary, #000000);
  --color-accent: var(--gym-accent, #E94560);

  /* Tema dark (default) */
  --color-bg: #0F0F0F;
  --color-surface: #1A1A1A;
  --color-text: #F5F5F5;
  --color-text-secondary: #A0A0A0;
  --color-border: rgba(255, 255, 255, 0.1);

  /* Stato */
  --color-success: #4ADE80;
  --color-warning: #FBBF24;
  --color-error: #F87171;
}

.light {
  --color-bg: #F5F5F5;
  --color-surface: #FFFFFF;
  --color-text: #1A1A1A;
  --color-text-secondary: #6B7280;
  --color-border: rgba(0, 0, 0, 0.1);
}
```

### 2.3 Tema Dark vs Light

Default: **dark**. Toggle disponibile per tutti i ruoli.
L'implementazione utilizza un hook `use-theme.ts` che persiste la preferenza in `localStorage` e applica la classe `.light` al tag `<html>`.

I colori dinamici sono iniettati in `src/app/layout.tsx` tramite stili inline:
```tsx
const gymStyle: any = {};
if (gym?.primary_color) gymStyle["--gym-primary"] = gym.primary_color;
if (gym?.accent_color) gymStyle["--gym-accent"] = gym.accent_color;
// ...
<html lang="it" style={gymStyle}>
```

---

## 3. Architettura File (Next.js App Router)

```
/src
  /app
    /(admin)                          ← Route Group Admin
      /members/page.tsx               ← Gestione utenti + Soft Delete
      /trainers/page.tsx              ← Gestione trainer
      /courses/page.tsx               ← Gestione corsi
      /settings/page.tsx              ← Config colori (primary/accent)
      /account/page.tsx               ← Profilo admin
    /(trainer)                        ← Route Group Trainer
      /clients/page.tsx               ← Lista clienti assegnati
      /exercises/page.tsx             ← Libreria esercizi (default + custom)
      /templates/page.tsx             ← Gestione template (client_id IS NULL)
      /schedule/page.tsx              ← Gestione calendario corsi
    /(client)                         ← Route Group Client
      /workout/page.tsx               ← Scheda attiva
      /booking/page.tsx               ← Calendario prenotazioni
      /profile/page.tsx               ← Profilo + Impostazioni
    /(auth)                           ← Login e Registrazione
  /components
    /ui                               ← Base UI (Button, Input, Card, Modal)
    /workout                          ← PlanBuilder, ExercisePicker
    /booking                          ← SlotAttendees
  /lib
    /actions                          ← Server Actions (auth, plans, etc.)
    /supabase                         ← Context helpers (admin, trainer, client)
    /hooks                            ← use-theme, use-booking, use-permissions
  /middleware.ts                       ← RBAC + Route Protection
```

### 3.1 Middleware & RBAC

Il middleware (`src/middleware.ts`) gestisce la protezione delle rotte tramite una mappa `ROUTE_ROLE_MAP`. Verifica l'autenticazione tramite `supabase.auth.getUser()` e controlla il ruolo e lo stato `is_active` dell'utente interrogando la tabella `profiles` (tramite service role client per efficienza).

---

## 4. Stack Tecnologico

- **Framework:** Next.js 14.2.35 (App Router)
- **Linguaggio:** TypeScript
- **UI & Styling:** React 18, Tailwind CSS 3.4.1, Lucide React
- **Backend & Database:** Supabase (PostgreSQL)
- **Auth & SSR:** @supabase/ssr 0.9.0, @supabase/supabase-js 2.99.3
- **PWA:** next-pwa 5.6.0

---

## 5. Decisioni Architetturali

| # | Decisione | Dettaglio |
|---|---|---|
| 1 | RBAC Middleware | Rotte protette via prefisso e mappa ruoli; controllo `is_active` ad ogni richiesta. |
| 2 | Multi-tenancy | `gym_id` obbligatorio in tutte le tabelle core, filtrato in RLS e query. |
| 3 | Soft Delete | Implementato via `is_active` per utenti, esercizi e corsi; previene perdita dati storici. |
| 4 | Templates | I template sono `workout_plans` con `client_id` NULL; clonati per creare schede reali. |
| 5 | Dynamic Theme | Colori brand (`primary`, `accent`) salvati in DB e iniettati come CSS vars nel layout root. |
| 6 | Service Role | Utilizzato lato server per operazioni di sistema e per bypassare limitazioni RLS complesse. |
| 7 | Server Actions | Utilizzate per tutte le mutazioni dati, con validazione ruolo e ownership integrata. |
