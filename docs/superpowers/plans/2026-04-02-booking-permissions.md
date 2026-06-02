# Booking Module Permissions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `can_manage_courses` permission to trainers, refactor trainer schedule to show only own slots with optional CRUD, add attendee list to slot detail, and build a full-access admin `/calendar` page.

**Architecture:** DB migration adds `can_manage_courses` boolean to `profiles`. Trainer schedule page reads this flag from context and passes `canManage` + `ownSlotIds` props to `ScheduleClient`, which gates all write actions behind them. Server actions enforce the same checks server-side. The admin calendar is a parallel route group (`(admin)/calendar`) with its own server component, client component, and actions — no shared mutable state with the trainer route.

**Tech Stack:** Next.js 14 App Router, Supabase (service role via `createAdminClient`), React `useTransition`, `revalidatePath`.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `supabase/migrations/20260402_booking_permissions.sql` | Create | DB migration: add `can_manage_courses` column |
| `src/lib/supabase/types.ts` | Modify | Add `can_manage_courses` to profiles Row/Insert/Update |
| `src/lib/supabase/get-trainer-context.ts` | Modify | Select `can_manage_courses` in profile query |
| `src/app/(admin)/trainers/actions.ts` | Modify | Add `toggleCanManageCourses` action |
| `src/app/(admin)/trainers/page.tsx` | Modify | Select `can_manage_courses` when fetching trainers |
| `src/app/(admin)/trainers/TrainersClient.tsx` | Modify | Add `can_manage_courses` to Trainer type + toggle column |
| `src/app/(trainer)/schedule/actions.ts` | Modify | Add `getSlotBookings`; add permission/ownership checks to `createSlot`, `createSchedule`, `generateSlotsForWeek`, `cancelSlot` |
| `src/components/booking/SlotAttendees.tsx` | Create | Client component: loads + displays attendee list for a slot |
| `src/app/(trainer)/schedule/page.tsx` | Modify | Fetch `can_manage_courses`, compute `ownSlotIds`/`ownCourseIds`, filter slots to own, pass permission props |
| `src/app/(trainer)/schedule/ScheduleClient.tsx` | Modify | Accept `canManage` + `ownSlotIds` props; gate CRUD; show `SlotAttendees` in detail modal |
| `src/app/(admin)/calendar/page.tsx` | Create | Admin server component: fetches all slots/courses, passes to CalendarClient |
| `src/app/(admin)/calendar/CalendarClient.tsx` | Create | Admin client component: full-permission calendar (copy of ScheduleClient logic, canManage always true) |
| `src/app/(admin)/calendar/actions.ts` | Create | Admin calendar actions: same operations but with admin role check instead of `can_manage_courses` |
| `src/middleware.ts` | Modify | Add `/calendar: "admin"` to `ROUTE_ROLE_MAP` |
| `src/app/(admin)/layout.tsx` | Modify | Add "Calendario" nav item → `/calendar` |
| `src/config/permissions.ts` | Modify | Add `/calendar` to admin protected routes |

---

## Task 1: DB Migration + Types

**Files:**
- Create: `supabase/migrations/20260402_booking_permissions.sql`
- Modify: `src/lib/supabase/types.ts`
- Modify: `src/lib/supabase/get-trainer-context.ts`

- [ ] **Step 1: Create migration file**

```sql
-- supabase/migrations/20260402_booking_permissions.sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS can_manage_courses BOOLEAN NOT NULL DEFAULT false;
```

- [ ] **Step 2: Update profiles type in types.ts**

In `src/lib/supabase/types.ts`, add `can_manage_courses` to the three `profiles` blocks:

```typescript
// profiles.Row — add after is_active:
can_manage_courses: boolean;

// profiles.Insert — add after is_active?:
can_manage_courses?: boolean;

// profiles.Update — add after is_active?:
can_manage_courses?: boolean;
```

- [ ] **Step 3: Update getTrainerContext to select can_manage_courses**

In `src/lib/supabase/get-trainer-context.ts`, change:
```typescript
// Old:
.select("id, gym_id, role, first_name, last_name")

// New:
.select("id, gym_id, role, first_name, last_name, can_manage_courses")
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /Users/dimitrimartignago/Gymkit && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors on these three files.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260402_booking_permissions.sql src/lib/supabase/types.ts src/lib/supabase/get-trainer-context.ts
git commit -m "feat: add can_manage_courses to profiles schema and types"
```

---

## Task 2: Admin Trainer Toggle (can_manage_courses)

**Files:**
- Modify: `src/app/(admin)/trainers/actions.ts`
- Modify: `src/app/(admin)/trainers/page.tsx`
- Modify: `src/app/(admin)/trainers/TrainersClient.tsx`

- [ ] **Step 1: Add toggleCanManageCourses action**

In `src/app/(admin)/trainers/actions.ts`, add at the end:

```typescript
export async function toggleCanManageCourses(
  trainerId: string,
  value: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, profile } = await getAdmin();
    const { error } = await supabase
      .from("profiles")
      .update({ can_manage_courses: value })
      .eq("id", trainerId)
      .eq("gym_id", profile.gym_id)
      .eq("role", "trainer");
    if (error) return { success: false, error: "Errore nell'aggiornamento." };
    revalidatePath("/trainers");
    return { success: true };
  } catch {
    return { success: false, error: "Errore imprevisto." };
  }
}
```

- [ ] **Step 2: Update trainers page to select can_manage_courses**

In `src/app/(admin)/trainers/page.tsx`, change the trainers query select string:
```typescript
// Old:
.select("id, first_name, last_name, email, is_active, created_at")

// New:
.select("id, first_name, last_name, email, is_active, can_manage_courses, created_at")
```

Also update the Pick type:
```typescript
// Old:
Pick<ProfileRow, "id" | "first_name" | "last_name" | "email" | "is_active" | "created_at">

// New:
Pick<ProfileRow, "id" | "first_name" | "last_name" | "email" | "is_active" | "can_manage_courses" | "created_at">
```

- [ ] **Step 3: Update TrainersClient — Trainer type and toggle**

In `src/app/(admin)/trainers/TrainersClient.tsx`:

**3a.** Add `can_manage_courses` to Trainer type:
```typescript
type Trainer = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  is_active: boolean;
  can_manage_courses: boolean;
  created_at: string;
};
```

**3b.** Import `toggleCanManageCourses`:
```typescript
import {
  deleteInvitation,
  inviteClient,
  inviteTrainer,
  toggleTrainerStatus,
  toggleCanManageCourses,
} from "./actions";
```

**3c.** Add handler function (after the existing `toggleTrainerStatus` usage pattern in the component):
```typescript
function handleToggleCanManage(trainerId: string, value: boolean) {
  startTransition(async () => {
    const result = await toggleCanManageCourses(trainerId, value);
    if (result.success) {
      setTrainers((prev) =>
        prev.map((t) =>
          t.id === trainerId ? { ...t, can_manage_courses: value } : t
        )
      );
    }
  });
}
```

**3d.** In the trainer table, find the row where `is_active` toggle is rendered and add a "Corsi" column next to it. The table row renders something like:
```typescript
// Locate the table row rendering each trainer and add alongside the is_active toggle:
<button
  onClick={() => handleToggleCanManage(trainer.id, !trainer.can_manage_courses)}
  disabled={isPending}
  title={trainer.can_manage_courses ? "Revoca gestione corsi" : "Concedi gestione corsi"}
  className="text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors disabled:opacity-50"
>
  {trainer.can_manage_courses ? (
    <ToggleRight size={20} className="text-[var(--color-accent)]" />
  ) : (
    <ToggleLeft size={20} />
  )}
</button>
```

Also add a column header "Corsi" in the `<thead>` alongside the existing "Attivo" header.

- [ ] **Step 4: TypeScript check**

```bash
cd /Users/dimitrimartignago/Gymkit && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/(admin)/trainers/actions.ts src/app/(admin)/trainers/page.tsx src/app/(admin)/trainers/TrainersClient.tsx
git commit -m "feat: add can_manage_courses toggle to admin trainers page"
```

---

## Task 3: getSlotBookings Action + Permission Checks

**Files:**
- Modify: `src/app/(trainer)/schedule/actions.ts`

- [ ] **Step 1: Update getTrainer() to select can_manage_courses and add helpers**

In `src/app/(trainer)/schedule/actions.ts`, update the `getTrainer` function and add ownership helpers:

```typescript
async function getTrainer() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non autenticato");
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, gym_id, can_manage_courses")
    .eq("id", user.id)
    .single();
  if (!profile) throw new Error("Profilo non trovato");
  return { supabase: admin, profile };
}

// Returns true if the trainer owns the slot (direct assignment or via course)
async function trainerOwnsSlot(
  admin: ReturnType<typeof createAdminClient>,
  slotId: string,
  trainerId: string
): Promise<boolean> {
  const { data: slot } = await admin
    .from("class_slots")
    .select("trainer_id, courses(trainer_id)")
    .eq("id", slotId)
    .single();
  if (!slot) return false;
  if (slot.trainer_id === trainerId) return true;
  const coursesData = slot.courses as { trainer_id: string | null } | null;
  if (slot.trainer_id === null && coursesData?.trainer_id === trainerId) return true;
  return false;
}
```

- [ ] **Step 2: Add permission checks to createSlot, createSchedule, generateSlotsForWeek**

Also add `revalidatePath("/schedule")` after each successful mutation so Next.js revalidates the trainer schedule page.

In `createSlot`, after `const { supabase, profile } = await getTrainer();` add the permission check, and add `revalidatePath("/schedule")` before `return { success: true }`:
```typescript
if (!profile.can_manage_courses) return { success: false, error: "Permesso negato." };
// ... existing insert ...
// before return { success: true }:
revalidatePath("/schedule");
```

In `createSchedule`, same pattern:
```typescript
if (!profile.can_manage_courses) return { success: false, error: "Permesso negato." };
// ... existing insert ...
revalidatePath("/schedule");
```

In `generateSlotsForWeek`, same:
```typescript
if (!profile.can_manage_courses) return { success: false, error: "Permesso negato." };
// ... existing logic ...
revalidatePath("/schedule");
return { success: true, count: slotsToInsert.length };
```

Also add `import { revalidatePath } from "next/cache";` at the top of `schedule/actions.ts`.

- [ ] **Step 3: Add ownership check to cancelSlot**

In `cancelSlot`, replace the body with:
```typescript
export async function cancelSlot(
  slotId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, profile } = await getTrainer();
    if (!profile.can_manage_courses) return { success: false, error: "Permesso negato." };
    const owns = await trainerOwnsSlot(supabase, slotId, profile.id);
    if (!owns) return { success: false, error: "Puoi cancellare solo i tuoi slot." };
    const { error } = await supabase
      .from("class_slots")
      .update({
        is_cancelled: true,
        cancellation_reason: reason.trim() || null,
      })
      .eq("id", slotId);
    if (error) return { success: false, error: "Errore nella cancellazione." };
    revalidatePath("/schedule");
    return { success: true };
  } catch {
    return { success: false, error: "Errore imprevisto." };
  }
}
```

- [ ] **Step 4: Add getSlotBookings action**

Add at the end of `src/app/(trainer)/schedule/actions.ts`:

```typescript
export type SlotBooking = {
  id: string;
  client_name: string;
  status: string;
  booked_at: string;
};

export async function getSlotBookings(
  slotId: string
): Promise<{ success: boolean; bookings?: SlotBooking[]; error?: string }> {
  try {
    const { supabase } = await getTrainer();
    const { data, error } = await supabase
      .from("bookings")
      .select("id, status, booked_at, profiles!bookings_client_id_fkey(first_name, last_name)")
      .eq("class_slot_id", slotId)
      .neq("status", "cancelled")
      .order("booked_at");
    if (error) return { success: false, error: "Errore nel recupero prenotazioni." };
    const bookings: SlotBooking[] = (data ?? []).map((b) => {
      const p = b.profiles as { first_name: string; last_name: string } | null;
      return {
        id: b.id,
        client_name: p ? `${p.first_name} ${p.last_name}` : "—",
        status: b.status,
        booked_at: b.booked_at,
      };
    });
    return { success: true, bookings };
  } catch {
    return { success: false, error: "Errore imprevisto." };
  }
}
```

- [ ] **Step 5: TypeScript check**

```bash
cd /Users/dimitrimartignago/Gymkit && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/(trainer)/schedule/actions.ts
git commit -m "feat: add can_manage_courses checks and getSlotBookings to schedule actions"
```

---

## Task 4: SlotAttendees Component

**Files:**
- Create: `src/components/booking/SlotAttendees.tsx`

- [ ] **Step 1: Create the component**

```typescript
// src/components/booking/SlotAttendees.tsx
"use client";

import { getSlotBookings, type SlotBooking } from "@/app/(trainer)/schedule/actions";
import { useEffect, useState } from "react";

interface Props {
  slotId: string;
}

export function SlotAttendees({ slotId }: Props) {
  const [bookings, setBookings] = useState<SlotBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    getSlotBookings(slotId).then((result) => {
      if (result.success) {
        setBookings(result.bookings ?? []);
      } else {
        setError(result.error ?? "Errore.");
      }
      setLoading(false);
    });
  }, [slotId]);

  if (loading) {
    return (
      <p className="text-sm text-[var(--color-text-secondary)]">
        Caricamento partecipanti…
      </p>
    );
  }

  if (error) {
    return <p className="text-sm text-[var(--color-error)]">{error}</p>;
  }

  if (bookings.length === 0) {
    return (
      <p className="text-sm text-[var(--color-text-secondary)]">
        Nessuna prenotazione attiva.
      </p>
    );
  }

  const confirmed = bookings.filter((b) => b.status === "confirmed");
  const waitlist = bookings.filter((b) => b.status === "waitlist");

  return (
    <div className="flex flex-col gap-2">
      {confirmed.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide">
            Confermati ({confirmed.length})
          </p>
          {confirmed.map((b) => (
            <div
              key={b.id}
              className="text-sm text-[var(--color-text)] px-2 py-1 rounded-[var(--radius-sm)] bg-[var(--color-surface-raised)]"
            >
              {b.client_name}
            </div>
          ))}
        </div>
      )}
      {waitlist.length > 0 && (
        <div className="flex flex-col gap-1 mt-1">
          <p className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide">
            In attesa ({waitlist.length})
          </p>
          {waitlist.map((b) => (
            <div
              key={b.id}
              className="text-sm text-[var(--color-text-secondary)] px-2 py-1 rounded-[var(--radius-sm)] bg-[var(--color-surface-raised)]"
            >
              {b.client_name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/dimitrimartignago/Gymkit && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/booking/SlotAttendees.tsx
git commit -m "feat: add SlotAttendees component"
```

---

## Task 5: Trainer Schedule Refactor (Own-Slots + Permission Gating)

**Files:**
- Modify: `src/app/(trainer)/schedule/page.tsx`
- Modify: `src/app/(trainer)/schedule/ScheduleClient.tsx`

- [ ] **Step 1: Update schedule page to filter own slots and compute permissions**

In `src/app/(trainer)/schedule/page.tsx`:

**1a.** Update the `class_slots` subquery to include `trainer_id` in the courses sub-select:

The existing query is:
```typescript
supabase
  .from("class_slots")
  .select(`id, course_id, trainer_id, starts_at, ends_at, max_capacity_override, is_cancelled, cancellation_reason, courses(id, name, color, max_capacity), bookings(id, status)`)
```

Change `courses(id, name, color, max_capacity)` → `courses(id, name, color, max_capacity, trainer_id)`:
```typescript
supabase
  .from("class_slots")
  .select(`id, course_id, trainer_id, starts_at, ends_at, max_capacity_override, is_cancelled, cancellation_reason, courses(id, name, color, max_capacity, trainer_id), bookings(id, status)`)
```

**1b.** Update `SlotRaw` in `page.tsx` — add `trainer_id` to courses sub-select shape:
```typescript
type SlotRaw = {
  id: string;
  course_id: string;
  trainer_id: string | null;
  starts_at: string;
  ends_at: string;
  max_capacity_override: number | null;
  is_cancelled: boolean;
  cancellation_reason: string | null;
  courses: { id: string; name: string; color: string | null; max_capacity: number; trainer_id: string | null } | null;
  bookings: { id: string; status: string }[];
};
```

**1c.** After building the `slots` array, compute own-slots and own-courses:
```typescript
// Compute own slot IDs and own course IDs
const ownSlotIds = new Set(
  slots
    .filter(
      (s) =>
        s.trainer_id === profile.id ||
        (s.trainer_id === null &&
          (rawSlots.find((r) => r.id === s.id)?.courses?.trainer_id ?? null) === profile.id)
    )
    .map((s) => s.id)
);

const ownCourseIds = new Set(
  courses
    .filter((c) => (c as { trainer_id: string | null }).trainer_id === profile.id)
    .map((c) => c.id)
);

const canManage = (profile as { can_manage_courses: boolean }).can_manage_courses ?? false;

// Filter slots to only own ones when trainer cannot manage all
const visibleSlots = canManage
  ? slots
  : slots.filter((s) => ownSlotIds.has(s.id));
```

**1d.** Update the `ScheduleClient` render call:
```typescript
return (
  <ScheduleClient
    weekStart={weekStart}
    slots={visibleSlots}
    courses={courses}
    schedules={gymSchedules}
    trainers={trainers}
    trainerId={profile.id}
    canManage={canManage}
    ownSlotIds={Array.from(ownSlotIds)}
    ownCourseIds={Array.from(ownCourseIds)}
  />
);
```

- [ ] **Step 2: Update ScheduleClient Props interface and state**

In `src/app/(trainer)/schedule/ScheduleClient.tsx`, update `Props`:

```typescript
interface Props {
  weekStart: string;
  slots: SlotWithDetails[];
  courses: CourseRow[];
  schedules: ScheduleRow[];
  trainers: TrainerProfile[];
  trainerId: string;
  canManage: boolean;
  ownSlotIds: string[];
  ownCourseIds: string[];
}
```

Update destructuring at the top of `ScheduleClient`:
```typescript
export function ScheduleClient({
  weekStart,
  slots,
  courses,
  schedules,
  trainers,
  trainerId,
  canManage,
  ownSlotIds,
  ownCourseIds,
}: Props) {
```

Add a set for fast lookup:
```typescript
const ownSlotSet = new Set(ownSlotIds);
const ownCourseSet = new Set(ownCourseIds);
```

- [ ] **Step 3: Gate CRUD buttons behind canManage**

Find the Actions section in the header (lines ~275-300):
```typescript
{/* Actions */}
<div className="flex gap-2">
  {canManage && (
    <Button variant="secondary" size="sm" loading={isPending} onClick={handleGenerate}>
      <RefreshCw size={14} />
      Genera Slot
    </Button>
  )}
  {canManage && (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => { setError(""); setModal({ type: "newSchedule" }); }}
    >
      <Calendar size={14} />
      Ricorrenza
    </Button>
  )}
  {canManage && (
    <Button
      size="sm"
      onClick={() => { setError(""); patchSlot({ date: weekStart }); setModal({ type: "newSlot" }); }}
    >
      <CalendarPlus size={14} />
      Slot
    </Button>
  )}
</div>
```

- [ ] **Step 4: Gate day-header click and empty-slot button behind canManage**

In the week grid, update `openSlotForDate` calls:
```typescript
// Day header — only clickable if canManage
<div
  className={[
    "flex items-center justify-between pb-1 border-b border-[var(--color-border)]",
    canManage ? "cursor-pointer group" : "",
  ].join(" ")}
  onClick={canManage ? () => openSlotForDate(date) : undefined}
>
```

The `+ slot` hint span: only show when `canManage`:
```typescript
{canManage && (
  <span className="text-xs text-[var(--color-text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity">
    + slot
  </span>
)}
```

Empty slot button: only render when `canManage`:
```typescript
{daySlots.length === 0 && canManage && (
  <button
    onClick={() => openSlotForDate(date)}
    className="h-10 rounded-[var(--radius-sm)] border border-dashed border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)] transition-colors"
  >
    <span className="text-xs">+ slot</span>
  </button>
)}
```

- [ ] **Step 5: Gate cancel section in slot detail modal behind ownership**

In the slot detail modal cancel section (line ~683):
```typescript
{/* Cancel slot — only for own slots */}
{!modal.slot.is_cancelled && canManage && ownSlotSet.has(modal.slot.id) && (
  <div className="flex flex-col gap-3 pt-2 border-t border-[var(--color-border)]">
    {/* ... existing cancel UI ... */}
  </div>
)}
```

- [ ] **Step 6: Add SlotAttendees to slot detail modal**

Import `SlotAttendees` at the top of ScheduleClient:
```typescript
import { SlotAttendees } from "@/components/booking/SlotAttendees";
```

In the slot detail modal, after the booking stats grid (after line ~681), add:
```typescript
{/* Attendee list */}
<div className="flex flex-col gap-2 pt-2 border-t border-[var(--color-border)]">
  <p className="text-sm font-medium text-[var(--color-text)]">Partecipanti</p>
  <SlotAttendees slotId={modal.slot.id} />
</div>
```

- [ ] **Step 7: TypeScript check**

```bash
cd /Users/dimitrimartignago/Gymkit && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/app/(trainer)/schedule/page.tsx src/app/(trainer)/schedule/ScheduleClient.tsx
git commit -m "feat: filter trainer schedule to own slots, gate CRUD behind can_manage_courses, show attendees"
```

---

## Task 6: Admin /calendar Page

**Files:**
- Create: `src/app/(admin)/calendar/page.tsx`
- Create: `src/app/(admin)/calendar/actions.ts`
- Create: `src/app/(admin)/calendar/CalendarClient.tsx`

The admin calendar is a full-access version of the schedule. `CalendarClient.tsx` is structurally identical to `ScheduleClient.tsx` but:
- Imports actions from `./actions` (admin actions)
- `canManage` is always `true` (all slots are own)
- Shows all gym slots (not filtered by trainer)

- [ ] **Step 1: Create admin calendar actions**

```typescript
// src/app/(admin)/calendar/actions.ts
"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { SlotBooking } from "@/app/(trainer)/schedule/actions";

async function getAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non autenticato");
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, gym_id, role")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "admin") throw new Error("Non autorizzato");
  return { supabase: admin, profile };
}

interface SlotFormData {
  course_id: string;
  starts_at: string;
  ends_at: string;
  trainer_id: string | null;
}

export async function createSlot(
  data: SlotFormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await getAdmin();
    const { error } = await supabase.from("class_slots").insert({
      course_id: data.course_id,
      trainer_id: data.trainer_id || null,
      starts_at: data.starts_at,
      ends_at: data.ends_at,
    });
    if (error) return { success: false, error: "Errore nella creazione." };
    revalidatePath("/calendar");
    return { success: true };
  } catch {
    return { success: false, error: "Errore imprevisto." };
  }
}

interface ScheduleFormData {
  course_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  trainer_id: string | null;
}

export async function createSchedule(
  data: ScheduleFormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await getAdmin();
    const { error } = await supabase.from("course_schedules").insert({
      course_id: data.course_id,
      day_of_week: data.day_of_week,
      start_time: data.start_time,
      end_time: data.end_time,
      trainer_id: data.trainer_id || null,
      is_active: true,
    });
    if (error) return { success: false, error: "Errore nella creazione." };
    revalidatePath("/calendar");
    return { success: true };
  } catch {
    return { success: false, error: "Errore imprevisto." };
  }
}

export async function generateSlotsForWeek(
  weekStart: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const { supabase, profile } = await getAdmin();

    const { data: rawSchedules } = await supabase
      .from("course_schedules")
      .select("id, course_id, day_of_week, start_time, end_time, trainer_id")
      .eq("is_active", true);

    const schedules = rawSchedules ?? [];

    const { data: gymCourses } = await supabase
      .from("courses")
      .select("id")
      .eq("gym_id", profile.gym_id)
      .eq("is_active", true);

    const gymCourseIds = new Set((gymCourses ?? []).map((c) => c.id));
    const monday = new Date(weekStart + "T00:00:00");
    const slotsToInsert: { course_id: string; trainer_id: string | null; starts_at: string; ends_at: string }[] = [];

    for (const sched of schedules) {
      if (!gymCourseIds.has(sched.course_id)) continue;
      const offset = sched.day_of_week - 1;
      const slotDate = new Date(monday);
      slotDate.setDate(monday.getDate() + offset);
      const dateStr = slotDate.toISOString().split("T")[0];
      const startsAt = `${dateStr}T${sched.start_time}`;
      const endsAt = `${dateStr}T${sched.end_time}`;
      const { data: existing } = await supabase
        .from("class_slots")
        .select("id")
        .eq("course_id", sched.course_id)
        .eq("starts_at", startsAt)
        .maybeSingle();
      if (!existing) {
        slotsToInsert.push({ course_id: sched.course_id, trainer_id: sched.trainer_id ?? null, starts_at: startsAt, ends_at: endsAt });
      }
    }

    if (slotsToInsert.length > 0) {
      const { error } = await supabase.from("class_slots").insert(slotsToInsert);
      if (error) return { success: false, error: "Errore nella generazione." };
    }
    revalidatePath("/calendar");
    return { success: true, count: slotsToInsert.length };
  } catch {
    return { success: false, error: "Errore imprevisto." };
  }
}

export async function cancelSlot(
  slotId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await getAdmin();
    const { error } = await supabase
      .from("class_slots")
      .update({ is_cancelled: true, cancellation_reason: reason.trim() || null })
      .eq("id", slotId);
    if (error) return { success: false, error: "Errore nella cancellazione." };
    revalidatePath("/calendar");
    return { success: true };
  } catch {
    return { success: false, error: "Errore imprevisto." };
  }
}

export async function getSlotBookings(
  slotId: string
): Promise<{ success: boolean; bookings?: SlotBooking[]; error?: string }> {
  try {
    const { supabase } = await getAdmin();
    const { data, error } = await supabase
      .from("bookings")
      .select("id, status, booked_at, profiles!bookings_client_id_fkey(first_name, last_name)")
      .eq("class_slot_id", slotId)
      .neq("status", "cancelled")
      .order("booked_at");
    if (error) return { success: false, error: "Errore nel recupero prenotazioni." };
    const bookings: SlotBooking[] = (data ?? []).map((b) => {
      const p = b.profiles as { first_name: string; last_name: string } | null;
      return { id: b.id, client_name: p ? `${p.first_name} ${p.last_name}` : "—", status: b.status, booked_at: b.booked_at };
    });
    return { success: true, bookings };
  } catch {
    return { success: false, error: "Errore imprevisto." };
  }
}
```

- [ ] **Step 2: Create CalendarClient.tsx**

`CalendarClient.tsx` is identical to `ScheduleClient.tsx` except:
1. Imports actions from `./actions` instead of `./actions`
2. Does NOT accept or use `canManage`/`ownSlotIds`/`ownCourseIds` — it always has full access

Copy the full content of `src/app/(trainer)/schedule/ScheduleClient.tsx` to `src/app/(admin)/calendar/CalendarClient.tsx`, then:

- Change the import: `from "./actions"` (instead of `from "../schedule/actions"` — CalendarClient lives in `(admin)/calendar/` and uses its own admin actions)
- Export as `CalendarClient` instead of `ScheduleClient`
- Remove `canManage`, `ownSlotIds`, `ownCourseIds` from Props
- Remove all `{canManage && ...}` conditionals — all buttons always visible
- Remove `ownSlotSet` / `ownCourseSet` usage — cancel button always visible for non-cancelled slots
- Import `SlotAttendees` from `@/components/booking/SlotAttendees` and add attendees section to slot detail modal (same as ScheduleClient Task 5 Step 6)

**Note on SlotAttendees:** `SlotAttendees` imports `getSlotBookings` from `@/app/(trainer)/schedule/actions`. The admin calendar reuses this component as-is — the trainer action only reads data and does not enforce ownership for reads, so this is safe. No change needed to `SlotAttendees.tsx`.

- [ ] **Step 3: Create admin calendar page**

```typescript
// src/app/(admin)/calendar/page.tsx
import { getAdminContext } from "@/lib/supabase/get-admin-context";
import type { Database } from "@/lib/supabase/types";
import { CalendarClient, type SlotWithDetails } from "./CalendarClient";

type CourseRow    = Database["public"]["Tables"]["courses"]["Row"];
type ScheduleRow  = Database["public"]["Tables"]["course_schedules"]["Row"];
type ProfileRow   = Database["public"]["Tables"]["profiles"]["Row"];

type SlotRaw = {
  id: string;
  course_id: string;
  trainer_id: string | null;
  starts_at: string;
  ends_at: string;
  max_capacity_override: number | null;
  is_cancelled: boolean;
  cancellation_reason: string | null;
  courses: { id: string; name: string; color: string | null; max_capacity: number } | null;
  bookings: { id: string; status: string }[];
};

function getWeekStart(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr + "T00:00:00") : new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
}

interface Props {
  searchParams: { week?: string };
}

export default async function AdminCalendarPage({ searchParams }: Props) {
  const weekStart = getWeekStart(searchParams.week);
  const weekEnd = (() => {
    const d = new Date(weekStart + "T00:00:00");
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  })();

  const { supabase, profile } = await getAdminContext();

  const [slotsRes, coursesRes, schedulesRes, trainersRes] = await Promise.all([
    supabase
      .from("class_slots")
      .select(`id, course_id, trainer_id, starts_at, ends_at, max_capacity_override, is_cancelled, cancellation_reason, courses(id, name, color, max_capacity), bookings(id, status)`)
      .gte("starts_at", weekStart + "T00:00:00")
      .lt("starts_at", weekEnd + "T00:00:00")
      .order("starts_at"),
    supabase
      .from("courses")
      .select("*")
      .eq("gym_id", profile.gym_id)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("course_schedules")
      .select("*")
      .eq("is_active", true),
    supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .eq("gym_id", profile.gym_id)
      .eq("role", "trainer")
      .eq("is_active", true),
  ]);

  const rawSlots = (slotsRes.data ?? []) as unknown as SlotRaw[];
  const courses  = (coursesRes.data ?? []) as CourseRow[];
  const schedules = (schedulesRes.data ?? []) as ScheduleRow[];
  const trainers  = (trainersRes.data ?? []) as Pick<ProfileRow, "id" | "first_name" | "last_name">[];

  const gymCourseIds = new Set(courses.map((c) => c.id));
  const gymSchedules = schedules.filter((s) => gymCourseIds.has(s.course_id));
  const trainerMap = Object.fromEntries(
    trainers.map((t) => [t.id, `${t.first_name} ${t.last_name}`])
  );

  const slots: SlotWithDetails[] = rawSlots.map((s) => {
    const confirmedCount = s.bookings.filter((b) => b.status === "confirmed").length;
    const waitlistCount  = s.bookings.filter((b) => b.status === "waitlist").length;
    const capacity = s.max_capacity_override ?? s.courses?.max_capacity ?? 0;
    return {
      id: s.id,
      course_id: s.course_id,
      trainer_id: s.trainer_id,
      starts_at: s.starts_at,
      ends_at: s.ends_at,
      is_cancelled: s.is_cancelled,
      cancellation_reason: s.cancellation_reason,
      capacity,
      confirmed_count: confirmedCount,
      waitlist_count: waitlistCount,
      course_name: s.courses?.name ?? "Corso",
      course_color: s.courses?.color ?? "#3b82f6",
      trainer_name: s.trainer_id ? (trainerMap[s.trainer_id] ?? null) : null,
    };
  });

  return (
    <CalendarClient
      weekStart={weekStart}
      slots={slots}
      courses={courses}
      schedules={gymSchedules}
      trainers={trainers}
      trainerId={profile.id}
    />
  );
}
```

- [ ] **Step 4: TypeScript check**

```bash
cd /Users/dimitrimartignago/Gymkit && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/(admin)/calendar/
git commit -m "feat: add admin /calendar page with full slot management"
```

---

## Task 7: Navigation + Middleware + Permissions

**Files:**
- Modify: `src/middleware.ts`
- Modify: `src/app/(admin)/layout.tsx`
- Modify: `src/config/permissions.ts`

- [ ] **Step 1: Add /calendar to middleware ROUTE_ROLE_MAP**

In `src/middleware.ts`, in `ROUTE_ROLE_MAP`:
```typescript
const ROUTE_ROLE_MAP: Record<string, Role> = {
  "/dashboard": "admin",
  "/trainers": "admin",
  "/courses": "admin",
  "/calendar": "admin",   // ← add this line
  "/settings": "admin",
  "/account": "admin",
  "/members": "admin",
  // ... rest unchanged
};
```

- [ ] **Step 2: Add Calendario to admin nav**

In `src/app/(admin)/layout.tsx`, find `adminNavItems` and add the Calendario entry. Look for the existing nav structure and insert after Dashboard or wherever makes sense (e.g., after Corsi):

```typescript
{
  href: "/calendar",
  label: "Calendario",
  icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
},
```

- [ ] **Step 3: Add /calendar to permissions.ts**

In `src/config/permissions.ts`, update admin protected routes:
```typescript
export const protectedRoutesByRole: Record<Role, string[]> = {
  admin: ["/dashboard", "/trainers", "/courses", "/calendar", "/settings"],
  trainer: ["/clients", "/plans", "/exercises", "/schedule"],
  client: ["/workout", "/booking", "/profile"],
};
```

- [ ] **Step 4: TypeScript check + build check**

```bash
cd /Users/dimitrimartignago/Gymkit && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/middleware.ts src/app/(admin)/layout.tsx src/config/permissions.ts
git commit -m "feat: add /calendar to admin nav, middleware, and permissions"
```

---

## Pre-Flight Checklist

Before testing:

1. **Run Supabase migration** in your local Supabase instance:
   ```bash
   # If using supabase CLI:
   supabase db push
   # Or run the SQL manually in the Supabase dashboard SQL editor:
   # ALTER TABLE profiles ADD COLUMN IF NOT EXISTS can_manage_courses BOOLEAN NOT NULL DEFAULT false;
   ```

2. **Verify trainer profile** has `can_manage_courses = false` by default — trainer schedule should show only own slots with all CRUD hidden.

3. **Enable can_manage_courses for a trainer** via admin → Trainer page → toggle — verify trainer schedule now shows CRUD buttons.

4. **Admin calendar** at `/calendar` should show all gym slots with full CRUD for admin users.

5. **SlotAttendees** should appear in the slot detail modal for both trainer and admin.
