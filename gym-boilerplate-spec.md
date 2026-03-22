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
  invited_by UUID REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Per ruoli custom futuri (fisioterapista, nutrizionista, ecc.)
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
-- Libreria esercizi (a livello palestra, pre-caricata con ~150-200 esercizi base)
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES gym(id),
  name TEXT NOT NULL,
  muscle_group TEXT NOT NULL,
  -- petto, dorso, gambe, quadricipiti, femorali, glutei,
  -- spalle, bicipiti, tricipiti, avambracci, core, cardio, full_body
  equipment TEXT,
  -- bilanciere, manubri, cavi, macchina, corpo_libero, kettlebell,
  -- elastici, trx, sbarra, panca, nessuno
  description TEXT,
  media_url TEXT,                    -- pronto per video/gif futuri
  thumbnail_url TEXT,
  parent_exercise_id UUID REFERENCES exercises(id),  -- pronto per varianti
  cloned_from UUID REFERENCES exercises(id),         -- punta all'esercizio default da cui è stato duplicato
  created_by UUID REFERENCES profiles(id),  -- NULL per esercizi pre-caricati
  is_default BOOLEAN DEFAULT false,   -- true = dalla libreria pre-caricata del template
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
  -- POLICY: is_default=true → read-only per i trainer.
  -- Su "modifica", il sistema duplica (cloned_from = id originale, is_default = false)
  -- e il trainer lavora sulla copia.
  -- UX: vista libreria ordina per created_by = trainer corrente FIRST, poi is_default.
);

-- Piano di allenamento (la "scheda")
CREATE TABLE workout_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES gym(id),
  client_id UUID NOT NULL REFERENCES profiles(id),
  trainer_id UUID NOT NULL REFERENCES profiles(id),
  name TEXT NOT NULL,                -- es. "Scheda Massa - Fase 1"
  description TEXT,
  version INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft', 'active', 'archived')),
  starts_at DATE,
  expires_at DATE,
  previous_version_id UUID REFERENCES workout_plans(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Giornate/Split della scheda (es. "Giorno A - Petto/Tricipiti")
CREATE TABLE plan_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                -- "Giorno A", "Upper Body", "Push"
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
  reps TEXT NOT NULL,                -- TEXT per gestire "8-12", "AMRAP", "30sec"
  rest_seconds INT,
  load_prescription TEXT,            -- "70% 1RM", "RPE 8", "20kg", testo libero
  notes TEXT,                        -- note del trainer per quell'esercizio
  superset_group TEXT,               -- esercizi con lo stesso valore → superset
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Log dell'allenamento eseguito (compilato dal cliente)
CREATE TABLE workout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id),
  plan_id UUID NOT NULL REFERENCES workout_plans(id),
  plan_day_id UUID NOT NULL REFERENCES plan_days(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  overall_notes TEXT,                -- "Mi sentivo stanco", feedback libero
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
  load_used DECIMAL,                 -- kg effettivi
  load_unit TEXT DEFAULT 'kg',
  rpe INT CHECK (rpe BETWEEN 1 AND 10),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 1.3 Modulo — Booking Corsi

```sql
-- Definizione corso (es. "Spinning", "Yoga", "CrossFit")
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES gym(id),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,                        -- colore nel calendario
  max_capacity INT NOT NULL,
  default_duration_minutes INT NOT NULL DEFAULT 60,
  trainer_id UUID REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Slot singolo nel calendario (un'istanza specifica di un corso)
CREATE TABLE class_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id),
  trainer_id UUID REFERENCES profiles(id),  -- override del trainer del corso
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  max_capacity_override INT,          -- override della capacità del corso
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
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=lunedì
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
CREATE INDEX idx_workout_logs_client ON workout_logs(client_id);
CREATE INDEX idx_workout_logs_plan_day ON workout_logs(plan_day_id);
CREATE INDEX idx_class_slots_date ON class_slots(starts_at) WHERE NOT is_cancelled;
CREATE INDEX idx_bookings_slot ON bookings(class_slot_id) WHERE status != 'cancelled';
CREATE INDEX idx_bookings_client ON bookings(client_id, status);
CREATE INDEX idx_invitations_token ON invitations(token) WHERE used_at IS NULL;
```

### 1.5 Row Level Security (RLS) — Principi

Ogni tabella ha RLS abilitato. Logica per ruolo:

| Tabella | Admin | Trainer | Client |
|---|---|---|---|
| profiles | CRUD tutti | Read propri clienti | Read/Update solo sé |
| exercises | CRUD | CRUD (crea nuovi, edita propri) | Read only |
| workout_plans | Read tutti | CRUD propri clienti | Read own |
| plan_days / plan_exercises | Segue workout_plans | Segue workout_plans | Read own plan |
| workout_logs / log_sets | Read tutti | Read propri clienti | CRUD own |
| courses / class_slots | CRUD | Read (+ CRUD se assegnato) | Read |
| bookings | Read tutti | Read propri slot | CRUD own |
| invitations | CRUD | Create (solo role=client) | Nessuno |

---

## 2. Design System

### 2.1 Principi

- **Mobile-first.** Il cliente usa il telefono in palestra. Tutto deve funzionare con una mano, pollice su schermo da 6".
- **Alto contrasto.** Palestre = luce variabile, schermi con ditate. Testi grandi, bottoni generosi, niente grigio chiaro su bianco.
- **Velocità percepita.** Skeleton loaders, optimistic updates sul logging. Il cliente non deve aspettare tra una serie e l'altra.
- **Brandabile.** Colori primario/secondario dal config. Il resto è neutro.

### 2.2 Token di Design

```css
:root {
  /* Colori — sovrascritti dal config per palestra */
  --color-primary: var(--gym-primary, #1A1A2E);
  --color-primary-light: var(--gym-primary-light, #16213E);
  --color-accent: var(--gym-accent, #E94560);
  --color-bg: #0F0F0F;
  --color-surface: #1A1A1A;
  --color-surface-raised: #252525;
  --color-text: #F5F5F5;
  --color-text-secondary: #A0A0A0;
  --color-success: #4ADE80;
  --color-warning: #FBBF24;
  --color-error: #F87171;

  /* Tipografia */
  --font-display: 'DM Sans', sans-serif;      /* headings, numeri grandi */
  --font-body: 'DM Sans', sans-serif;          /* corpo testo */
  --font-mono: 'JetBrains Mono', monospace;    /* dati numerici, carichi, reps */

  /* Spacing scale (4px base) */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;

  /* Radii */
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.3);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.4);
  --shadow-lg: 0 8px 24px rgba(0,0,0,0.5);

  /* Sizing */
  --button-height-sm: 36px;
  --button-height-md: 48px;
  --button-height-lg: 56px;     /* primary actions su mobile */
  --input-height: 48px;
  --nav-height: 64px;
  --bottom-bar-height: 72px;
}
```

### 2.3 Componenti Core

**Bottom Navigation (client):**
4 tab → Scheda | Booking | Log | Profilo
Icone grandi (24px), label sotto, area tap minima 48x48px.

**Top Bar (trainer/admin):**
Sidebar collassabile su desktop, bottom nav su mobile.
Sezioni: Clienti | Schede | Corsi | Esercizi | Impostazioni

**Card Esercizio (nella scheda):**
```
┌─────────────────────────────────┐
│ Panca Piana — Bilanciere    ⓘ  │
│                                 │
│  4 × 8-10   ⏱ 90s   📝 RPE 8  │
│                                 │
│  Nota trainer: "Arco scapolare,│
│  fermo al petto 1s"            │
└─────────────────────────────────┘
```

**Card Log Set (durante allenamento):**
```
┌─────────────────────────────────┐
│  Set 1/4                        │
│                                 │
│  [ 10 ] reps    [ 80 ] kg      │
│                                 │
│  RPE  ○5 ○6 ○7 ●8 ○9 ○10      │
│                                 │
│  [    ✓ Completa Set    ]       │
└─────────────────────────────────┘
```
Input numerici grandi, incrementabili con +/- buttons. Niente tastiera se possibile.

**Calendario Booking:**
Vista settimanale, slot come blocchi colorati per corso.
Tap → dettaglio (posti disponibili, trainer, prenota/cancella).

### 2.4 Flussi UX Chiave

**Cliente: Esegui allenamento**
```
Scheda attiva → Seleziona giornata → Lista esercizi →
Tap "Inizia Allenamento" → Logging set by set →
Completa → Rating + note opzionali → Salva log
```

**Trainer: Crea scheda**
```
Seleziona cliente → Nuova scheda (nome, durata) →
Aggiungi giornate → Per ogni giornata: cerca esercizio da libreria →
Configura (serie, reps, carico, note) → Riordina drag&drop →
Pubblica → Cliente la vede
```

**Cliente: Prenota corso**
```
Tab Booking → Calendario settimanale → Tap slot →
Vede: corso, trainer, posti liberi → Prenota →
Conferma immediata (o waitlist se pieno) →
Reminder push X ore prima (futuro)
```

### 2.5 Tema Dark vs Light

Default: **dark**. Le palestre sono ambienti scuri. Il cliente usa l'app tra le serie con le pupille dilatate. Un tema light acceca.

Toggle disponibile per il trainer che lavora in ufficio/reception con luce naturale.

### 2.6 PWA Config

```json
{
  "name": "{{gym.name}}",
  "short_name": "{{gym.slug}}",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0F0F0F",
  "theme_color": "{{gym.primary_color}}",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192" },
    { "src": "/icons/icon-512.png", "sizes": "512x512" }
  ]
}
```

Service worker per cache della scheda attiva → consultabile offline.

---

## 3. Architettura File (Next.js App Router)

```
/src
  /app
    /(auth)
      /login/page.tsx
      /register/[token]/page.tsx     ← registrazione via invite link
    /(client)
      /layout.tsx                     ← bottom nav client
      /workout/page.tsx               ← scheda attiva
      /workout/[dayId]/log/page.tsx   ← logging allenamento
      /booking/page.tsx               ← calendario corsi
      /booking/[slotId]/page.tsx      ← dettaglio + prenota
      /profile/page.tsx
    /(trainer)
      /layout.tsx                     ← sidebar/nav trainer
      /clients/page.tsx
      /clients/[id]/page.tsx
      /plans/new/page.tsx             ← crea scheda
      /plans/[id]/edit/page.tsx
      /exercises/page.tsx             ← libreria
      /schedule/page.tsx              ← gestione slot corsi
    /(admin)
      /layout.tsx
      /dashboard/page.tsx
      /trainers/page.tsx
      /courses/page.tsx
      /settings/page.tsx
  /components
    /ui                               ← design system base
    /workout                          ← componenti modulo schede
    /booking                          ← componenti modulo booking
  /config
    /gym-config.ts                    ← configurazione istanza
    /modules.ts                       ← registry moduli attivi
    /permissions.ts                   ← matrice ruoli/permessi
  /lib
    /supabase
      /client.ts
      /server.ts
      /types.ts                       ← tipi generati da Supabase
    /hooks
      /use-workout-log.ts
      /use-booking.ts
      /use-permissions.ts
  /middleware.ts                       ← auth + redirect per ruolo
```

---

## 4. Decisioni Architetturali Prese

| # | Decisione | Motivazione |
|---|---|---|
| 1 | Template one-shot, non SaaS | Modello di vendita scelto |
| 2 | PWA, no nativo | Singolo codebase, deploy istantaneo, Capacitor come escape hatch |
| 3 | Supabase Auth + RLS | Auth gestita, sicurezza a livello DB, zero backend custom |
| 4 | Libreria esercizi pre-caricata (~150-200) a livello palestra | Riduce tempo di setup, evita conflitti su riassegnazione clienti, trainer aggiunge i suoi (is_default=false) |
| 5 | Onboarding ibrido QR/link | Bassa frizione, trainer mantiene controllo |
| 6 | Config strutturale = dev, operatività = admin | Limita complessità pannello admin, genera revenue su modifiche |
| 7 | Dark mode di default | Contesto d'uso (palestra, luce bassa) |
| 8 | Cliente logga da solo | Trainer non appesantito, cliente responsabilizzato |
| 9 | Scheda con versioning | Storico preservato, progressione tracciabile |
| 10 | reps come TEXT | Supporta "8-12", "AMRAP", "30sec", non solo numeri |
