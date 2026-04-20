# Trainer Workout History — Design Spec

**Date:** 2026-04-20
**Status:** Approved
**Scope:** Read-only view of client workout logs for the trainer, with prescription vs actual comparison.

---

## Goal

Allow trainers to see completed workout logs for each client directly from the client detail page, with enough detail (per-set kg, reps, RPE vs prescription) to calibrate future loads.

---

## Navigation

A new **"Storico"** tab is added to `/trainer/clients/[id]`, alongside the existing tabs (Profilo, Piani). The tab is a server component and loads workout data at page load.

No new route is added — the tab is rendered inline on the same page using a `tab` query param (e.g., `?tab=storico`).

---

## List View

When the "Storico" tab is active, the page shows a list of completed workouts for that client, ordered most-recent first.

**Each row displays:**
- Day name (e.g., "Giorno A — Petto")
- Date and duration (derived from `started_at` and `completed_at`)
- Star rating ⭐ (1–5, from `overall_rating`)
- General client note (`overall_notes`, truncated to ~60 chars)

**Limit:** 20 most recent logs. No pagination for now.

Only `completed_at IS NOT NULL` logs are shown (incomplete sessions are excluded).

---

## Detail View

Clicking a row expands it inline (no separate navigation). The list item becomes a detail panel.

**Header:**
- Day name, date, duration
- Star rating
- Full `overall_notes` (if any)

**Per-exercise accordion (collapsed by default):**

Always visible (collapsed state):
- Exercise name
- Summary: `N serie · X kg avg · RPE Y avg`

Expanded (on click):
- Two-column grid, one row per set:
  - **Left column (grey) — Prescritto:** `sets × reps_prescription · load_prescription · RPE prescritto` (from `plan_exercises`)
  - **Right column (coloured) — Eseguito:** `kg × reps_done · RPE effettivo` (from `workout_log_sets`)
- If no prescription data exists for a field (e.g., no `load_prescription`), show `—`
- If `rpe` was not logged, show `—`

Exercise order follows `exercise_order` from `plan_exercises`.

---

## Data Layer

### Query

Single query joining:
```
workout_logs
  → plan_days (via plan_day_id) — for day name
  → workout_log_sets (via workout_log_id)
  → plan_exercises (via plan_exercise_id) — for prescription
  → exercises (via exercise_id) — for exercise name
```

Filtered by `client_id` and `completed_at IS NOT NULL`, ordered by `started_at DESC`, limit 20.

### Server action

New function `getClientWorkoutHistory(clientId: string)` in `src/app/(trainer)/clients/[id]/actions.ts` (create file if not exists).

Returns:
```typescript
interface WorkoutLogSummary {
  id: string;
  plan_day_name: string;       // from plan_days.name
  started_at: string;
  completed_at: string;
  overall_rating: number | null;
  overall_notes: string | null;
  exercises: WorkoutExerciseLog[];
}

interface WorkoutExerciseLog {
  exercise_name: string;
  exercise_order: number;
  sets_prescribed: number;
  reps_prescription: string | null;      // e.g. "8-12"
  load_prescription: string | null;      // e.g. "70% 1RM"
  sets: WorkoutSetLog[];
}

interface WorkoutSetLog {
  set_number: number;
  reps_done: number | null;
  load_used: number | null;
  rpe: number | null;
  notes: string | null;
}
```

### RLS

Existing RLS already allows trainers to read `workout_logs` and `workout_log_sets` for their assigned clients. No DB changes needed.

---

## Files

| File | Action |
|---|---|
| `src/app/(trainer)/clients/[id]/page.tsx` | Add tab param handling, render Storico tab |
| `src/app/(trainer)/clients/[id]/WorkoutHistory.tsx` | New client component: list + accordion detail |
| `src/app/(trainer)/clients/[id]/actions.ts` | New: `getClientWorkoutHistory()` |

No DB migrations required.

---

## Out of Scope

- Editing or annotating logs from the trainer side
- Charts or trend visualisation
- Pagination (20-log limit is sufficient for v1)
- Filtering by date range or exercise
