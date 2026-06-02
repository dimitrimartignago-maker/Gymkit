# Calendar Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two-level calendar system (course_schedules + class_slots) with a single creation flow that supports one-time and recurring slots, week/day navigation, and multiple trainers per slot.

**Architecture:** DB gains `class_slot_trainers` junction table and `recurrence_id` on `class_slots`. A single `createSlots` server action handles both one-time and recurring creation. `CalendarClient` is redesigned with a unified creation modal, week/day view toggle, and per-slot series scope for edit/cancel.

**Tech Stack:** Next.js 14 App Router, Supabase (PostgreSQL), TypeScript, Tailwind CSS, React hooks (useState, useTransition, useMemo)

---

### Task 1: DB Migration

**Files:**
- Create: `supabase/migrations/20260411_calendar_redesign.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- supabase/migrations/20260411_calendar_redesign.sql

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
```

- [ ] **Step 2: Apply the migration**

```bash
cd /Users/dimitrimartignago/Gymkit && supabase db push
```
Expected: `Applying migration 20260411_calendar_redesign.sql... done`

- [ ] **Step 3: Verify in Supabase Studio**

Check that:
- `class_slots.recurrence_id` column exists (uuid, nullable)
- `class_slot_trainers` table exists with `slot_id` + `trainer_id` columns

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260411_calendar_redesign.sql
git commit -m "feat(db): add class_slot_trainers table and recurrence_id to class_slots"
```

---

### Task 2: Regenerate Supabase Types

**Files:**
- Modify: `src/lib/supabase/types.ts`

- [ ] **Step 1: Regenerate types**

```bash
cd /Users/dimitrimartignago/Gymkit && supabase gen types typescript --linked > src/lib/supabase/types.ts
```

- [ ] **Step 2: Verify new types are present**

```bash
grep -n "class_slot_trainers\|recurrence_id" src/lib/supabase/types.ts | head -10
```
Expected: Lines showing `class_slot_trainers` table definition and `recurrence_id` field on `class_slots`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase/types.ts
git commit -m "chore: regenerate Supabase types after calendar migration"
```

---

### Task 3: Update `actions.ts`

**Files:**
- Modify: `src/app/(admin)/calendar/actions.ts`

- [ ] **Step 1: Replace the entire file**

```typescript
"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
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

export interface CreateSlotsInput {
  course_id: string;
  start_date: string;       // "YYYY-MM-DD"
  start_time: string;       // "HH:MM"
  end_time: string;         // "HH:MM"
  trainer_ids: string[];
  repeat: false | {
    days_of_week: number[]; // 1=Lun … 7=Dom
    until: string;          // "YYYY-MM-DD"
  };
}

/** Returns all YYYY-MM-DD dates from startDate to until (inclusive) that fall on daysOfWeek */
function generateDates(startDate: string, daysOfWeek: number[], until: string): string[] {
  const dates: string[] = [];
  const end = new Date(until + "T00:00:00");
  const cur = new Date(startDate + "T00:00:00");
  while (cur <= end) {
    const jsDay = cur.getDay(); // 0=Sun
    const dow = jsDay === 0 ? 7 : jsDay; // 1=Mon…7=Sun
    if (daysOfWeek.includes(dow)) {
      dates.push(cur.toISOString().split("T")[0]);
    }
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

export async function createSlots(
  data: CreateSlotsInput
): Promise<{ success: boolean; created?: number; skipped?: number; error?: string }> {
  try {
    const { supabase, profile } = await getAdmin();

    // Verify course belongs to admin's gym
    const { data: course } = await supabase
      .from("courses")
      .select("id")
      .eq("id", data.course_id)
      .eq("gym_id", profile.gym_id)
      .maybeSingle();
    if (!course) return { success: false, error: "Corso non trovato o non autorizzato." };

    const dates: string[] = data.repeat === false
      ? [data.start_date]
      : generateDates(data.start_date, data.repeat.days_of_week, data.repeat.until);

    const recurrenceId = data.repeat !== false ? randomUUID() : null;
    let created = 0;
    let skipped = 0;

    for (const date of dates) {
      const starts_at = `${date}T${data.start_time}:00`;
      const ends_at = `${date}T${data.end_time}:00`;

      // Skip duplicates silently
      const { data: existing } = await supabase
        .from("class_slots")
        .select("id")
        .eq("course_id", data.course_id)
        .eq("starts_at", starts_at)
        .maybeSingle();

      if (existing) { skipped++; continue; }

      const { data: newSlot, error: insertError } = await supabase
        .from("class_slots")
        .insert({ course_id: data.course_id, starts_at, ends_at, recurrence_id: recurrenceId })
        .select("id")
        .single();

      if (insertError || !newSlot) {
        return { success: false, error: "Errore nella creazione degli slot." };
      }

      if (data.trainer_ids.length > 0) {
        const { error: trainerError } = await supabase
          .from("class_slot_trainers")
          .insert(data.trainer_ids.map((tid) => ({ slot_id: newSlot.id, trainer_id: tid })));
        if (trainerError) {
          return { success: false, error: "Errore nell'assegnazione dei trainer." };
        }
      }

      created++;
    }

    revalidatePath("/calendar");
    return { success: true, created, skipped };
  } catch {
    return { success: false, error: "Errore imprevisto." };
  }
}

async function verifySlotOwnership(
  supabase: ReturnType<typeof createAdminClient>,
  slotId: string,
  gymId: string
): Promise<boolean> {
  const { data: slot } = await supabase
    .from("class_slots")
    .select("course_id")
    .eq("id", slotId)
    .maybeSingle();
  if (!slot) return false;
  const { data: course } = await supabase
    .from("courses")
    .select("id")
    .eq("id", slot.course_id)
    .eq("gym_id", gymId)
    .maybeSingle();
  return !!course;
}

export async function updateSlot(
  slotId: string,
  data: { start_time: string; end_time: string; trainer_ids: string[] },
  scope: "single" | "series"
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, profile } = await getAdmin();
    if (!(await verifySlotOwnership(supabase, slotId, profile.gym_id))) {
      return { success: false, error: "Non autorizzato." };
    }

    let slotIds: string[] = [slotId];

    if (scope === "series") {
      const { data: targetSlot } = await supabase
        .from("class_slots")
        .select("recurrence_id")
        .eq("id", slotId)
        .single();
      if (!targetSlot?.recurrence_id) {
        return { success: false, error: "Slot non parte di una serie." };
      }
      const { data: seriesSlots } = await supabase
        .from("class_slots")
        .select("id")
        .eq("recurrence_id", targetSlot.recurrence_id)
        .eq("is_cancelled", false);
      slotIds = (seriesSlots ?? []).map((s) => s.id);
    }

    for (const id of slotIds) {
      const { data: slot } = await supabase
        .from("class_slots")
        .select("starts_at")
        .eq("id", id)
        .single();
      if (!slot) continue;

      const date = slot.starts_at.substring(0, 10);
      const { error: updateError } = await supabase
        .from("class_slots")
        .update({
          starts_at: `${date}T${data.start_time}:00`,
          ends_at: `${date}T${data.end_time}:00`,
        })
        .eq("id", id);
      if (updateError) return { success: false, error: "Errore nella modifica." };

      // Replace trainers: delete + insert
      await supabase.from("class_slot_trainers").delete().eq("slot_id", id);
      if (data.trainer_ids.length > 0) {
        await supabase
          .from("class_slot_trainers")
          .insert(data.trainer_ids.map((tid) => ({ slot_id: id, trainer_id: tid })));
      }
    }

    revalidatePath("/calendar");
    return { success: true };
  } catch {
    return { success: false, error: "Errore imprevisto." };
  }
}

export async function cancelSlot(
  slotId: string,
  reason: string,
  scope: "single" | "series"
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, profile } = await getAdmin();
    if (!(await verifySlotOwnership(supabase, slotId, profile.gym_id))) {
      return { success: false, error: "Non autorizzato." };
    }

    if (scope === "single") {
      const { error } = await supabase
        .from("class_slots")
        .update({ is_cancelled: true, cancellation_reason: reason.trim() || null })
        .eq("id", slotId);
      if (error) return { success: false, error: "Errore nella cancellazione." };
    } else {
      const { data: targetSlot } = await supabase
        .from("class_slots")
        .select("recurrence_id")
        .eq("id", slotId)
        .single();
      if (!targetSlot?.recurrence_id) {
        return { success: false, error: "Slot non parte di una serie." };
      }
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("class_slots")
        .update({ is_cancelled: true, cancellation_reason: reason.trim() || null })
        .eq("recurrence_id", targetSlot.recurrence_id)
        .gt("starts_at", now);
      if (error) return { success: false, error: "Errore nella cancellazione della serie." };
    }

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
    const { data: rawData, error } = await supabase
      .from("bookings")
      .select("id, status, booked_at, profiles!bookings_client_id_fkey(first_name, last_name)")
      .eq("class_slot_id", slotId)
      .neq("status", "cancelled")
      .order("booked_at");
    if (error) return { success: false, error: "Errore nel recupero prenotazioni." };
    const data = rawData as Array<{
      id: string;
      status: string;
      booked_at: string;
      profiles: { first_name: string; last_name: string } | null;
    }> | null;
    const bookings: SlotBooking[] = (data ?? []).map((b) => {
      const p = b.profiles;
      return { id: b.id, client_name: p ? `${p.first_name} ${p.last_name}` : "—", status: b.status, booked_at: b.booked_at };
    });
    return { success: true, bookings };
  } catch {
    return { success: false, error: "Errore imprevisto." };
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/dimitrimartignago/Gymkit && npx tsc --noEmit 2>&1 | head -20
```
Expected: No errors in `actions.ts`. (CalendarClient errors are ok, fixed in Task 5.)

- [ ] **Step 3: Commit**

```bash
git add src/app/(admin)/calendar/actions.ts
git commit -m "feat(calendar): replace createSlot/createSchedule with createSlots, add scope to updateSlot/cancelSlot"
```

---

### Task 4: Update `page.tsx`

**Files:**
- Modify: `src/app/(admin)/calendar/page.tsx`

- [ ] **Step 1: Replace the entire file**

```typescript
import { getAdminContext } from "@/lib/supabase/get-admin-context";
import type { Database } from "@/lib/supabase/types";
import { CalendarClient, type SlotWithDetails } from "./CalendarClient";

type CourseRow = Database["public"]["Tables"]["courses"]["Row"];

type SlotRaw = {
  id: string;
  course_id: string;
  starts_at: string;
  ends_at: string;
  max_capacity_override: number | null;
  is_cancelled: boolean;
  cancellation_reason: string | null;
  recurrence_id: string | null;
  courses: { id: string; name: string; color: string | null; max_capacity: number } | null;
  bookings: { id: string; status: string }[];
  class_slot_trainers: { trainer_id: string }[];
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
  searchParams: { week?: string; view?: string; date?: string };
}

export default async function AdminCalendarPage({ searchParams }: Props) {
  const view = searchParams.view === "day" ? "day" : "week";
  const weekStart = getWeekStart(searchParams.week);
  const viewDate = view === "day"
    ? (searchParams.date ?? new Date().toISOString().split("T")[0])
    : weekStart;

  // Date range for query
  const rangeStart = (view === "day" ? viewDate : weekStart) + "T00:00:00";
  const rangeEndDate = (() => {
    if (view === "day") {
      const d = new Date(viewDate + "T00:00:00");
      d.setDate(d.getDate() + 1);
      return d.toISOString().split("T")[0];
    }
    const d = new Date(weekStart + "T00:00:00");
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  })();

  const { supabase, profile } = await getAdminContext();

  const [slotsRes, coursesRes, trainersRes] = await Promise.all([
    supabase
      .from("class_slots")
      .select(`
        id, course_id, starts_at, ends_at, max_capacity_override,
        is_cancelled, cancellation_reason, recurrence_id,
        courses(id, name, color, max_capacity),
        bookings(id, status),
        class_slot_trainers(trainer_id)
      `)
      .gte("starts_at", rangeStart)
      .lt("starts_at", rangeEndDate + "T00:00:00")
      .order("starts_at"),
    supabase
      .from("courses")
      .select("*")
      .eq("gym_id", profile.gym_id)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .eq("gym_id", profile.gym_id)
      .eq("role", "trainer")
      .eq("is_active", true),
  ]);

  const rawSlots = (slotsRes.data ?? []) as unknown as SlotRaw[];
  const courses  = (coursesRes.data ?? []) as CourseRow[];
  const trainers = (trainersRes.data ?? []) as { id: string; first_name: string; last_name: string }[];

  const trainerMap = Object.fromEntries(
    trainers.map((t) => [t.id, `${t.first_name} ${t.last_name}`])
  );

  const slots: SlotWithDetails[] = rawSlots.map((s) => {
    const confirmedCount = s.bookings.filter((b) => b.status === "confirmed").length;
    const waitlistCount  = s.bookings.filter((b) => b.status === "waitlist").length;
    const capacity = s.max_capacity_override ?? s.courses?.max_capacity ?? 0;
    const trainerIds = s.class_slot_trainers.map((t) => t.trainer_id);
    const trainerNames = trainerIds
      .map((id) => trainerMap[id])
      .filter(Boolean) as string[];
    return {
      id: s.id,
      course_id: s.course_id,
      recurrence_id: s.recurrence_id,
      trainer_ids: trainerIds,
      starts_at: s.starts_at,
      ends_at: s.ends_at,
      is_cancelled: s.is_cancelled,
      cancellation_reason: s.cancellation_reason,
      capacity,
      confirmed_count: confirmedCount,
      waitlist_count: waitlistCount,
      course_name: s.courses?.name ?? "Corso",
      course_color: s.courses?.color ?? "#3b82f6",
      trainer_names: trainerNames,
    };
  });

  return (
    <CalendarClient
      weekStart={weekStart}
      view={view}
      viewDate={viewDate}
      slots={slots}
      courses={courses}
      trainers={trainers}
    />
  );
}
```

- [ ] **Step 2: Compile check**

```bash
cd /Users/dimitrimartignago/Gymkit && npx tsc --noEmit 2>&1 | head -20
```
Expected: Errors only about `CalendarClient` props mismatch (ok, fixed in Task 5).

- [ ] **Step 3: Commit**

```bash
git add src/app/(admin)/calendar/page.tsx
git commit -m "feat(calendar): update page.tsx — view/day params, trainer join, remove schedules query"
```

---

### Task 5: Rewrite `CalendarClient.tsx`

**Files:**
- Modify: `src/app/(admin)/calendar/CalendarClient.tsx`

- [ ] **Step 1: Replace the entire file**

```typescript
"use client";

import { AdminSlotAttendees } from "@/components/booking/AdminSlotAttendees";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { Database } from "@/lib/supabase/types";
import { ChevronLeft, ChevronRight, Edit2, Users, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { cancelSlot, createSlots, updateSlot } from "./actions";

type CourseRow = Database["public"]["Tables"]["courses"]["Row"];

export interface SlotWithDetails {
  id: string;
  course_id: string;
  recurrence_id: string | null;
  trainer_ids: string[];
  starts_at: string;
  ends_at: string;
  is_cancelled: boolean;
  cancellation_reason: string | null;
  capacity: number;
  confirmed_count: number;
  waitlist_count: number;
  course_name: string;
  course_color: string;
  trainer_names: string[];
}

type TrainerProfile = { id: string; first_name: string; last_name: string };
type SeriesScope = "single" | "series";

const IT_DAY_LABELS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"]; // index 0=Mon

const DAYS_OF_WEEK = [
  { dow: 1, label: "L" },
  { dow: 2, label: "M" },
  { dow: 3, label: "M" },
  { dow: 4, label: "G" },
  { dow: 5, label: "V" },
  { dow: 6, label: "S" },
  { dow: 7, label: "D" },
];

const HOUR_START = 6;
const HOUR_END = 23;
const HOUR_HEIGHT = 64;
const TOTAL_HEIGHT = (HOUR_END - HOUR_START) * HOUR_HEIGHT;
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => i + HOUR_START);

function extractTime(iso: string): string { return iso.substring(11, 16); }
function extractDate(iso: string): string { return iso.substring(0, 10); }

function getMinutes(iso: string): number {
  return parseInt(iso.substring(11, 13), 10) * 60 + parseInt(iso.substring(14, 16), 10);
}

function localDateStr(d: Date): string {
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}

function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart + "T00:00:00");
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
  return `${fmt(start)} – ${fmt(end)}`;
}

function formatDay(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("it-IT", {
    weekday: "long", day: "numeric", month: "long",
  });
}

function offsetWeek(weekStart: string, delta: number): string {
  const d = new Date(weekStart + "T00:00:00");
  d.setDate(d.getDate() + delta * 7);
  return localDateStr(d);
}

function offsetDay(dateStr: string, delta: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + delta);
  return localDateStr(d);
}

function weekStartOf(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return localDateStr(d);
}

function todayStr(): string { return localDateStr(new Date()); }

interface Props {
  weekStart: string;
  view: "week" | "day";
  viewDate: string;
  slots: SlotWithDetails[];
  courses: CourseRow[];
  trainers: TrainerProfile[];
}

type ModalState =
  | { type: "newSlot" }
  | { type: "slotDetail"; slot: SlotWithDetails }
  | null;

export function CalendarClient({ weekStart, view, viewDate, slots, courses, trainers }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [modal, setModal] = useState<ModalState>(null);
  const [toastMsg, setToastMsg] = useState("");
  const [error, setError] = useState("");

  // ── New Slot form ──────────────────────────────────────────────────────────
  const [slotForm, setSlotForm] = useState({
    course_id: courses[0]?.id ?? "",
    date: "",
    start_time: "09:00",
    end_time: "10:00",
    trainer_ids: [] as string[],
    repeat: false,
    repeat_days: [] as number[],
    repeat_until: "",
  });

  // ── Edit form ──────────────────────────────────────────────────────────────
  const [editMode, setEditMode] = useState(false);
  const [editScope, setEditScope] = useState<SeriesScope>("single");
  const [editForm, setEditForm] = useState({
    start_time: "09:00",
    end_time: "10:00",
    trainer_ids: [] as string[],
  });

  // ── Cancel state ───────────────────────────────────────────────────────────
  const [cancelReason, setCancelReason] = useState("");
  const [cancelScope, setCancelScope] = useState<SeriesScope>("single");

  function patchSlot(p: Partial<typeof slotForm>) { setSlotForm((f) => ({ ...f, ...p })); }
  function patchEdit(p: Partial<typeof editForm>) { setEditForm((f) => ({ ...f, ...p })); }

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  }

  // Dates to display (7 for week, 1 for day)
  const displayDates = useMemo(() => {
    if (view === "day") return [new Date(viewDate + "T00:00:00")];
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart + "T00:00:00");
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [view, viewDate, weekStart]);

  // Slots grouped by display date
  const slotsByDate = useMemo(() =>
    displayDates.map((date) => {
      const ds = localDateStr(date);
      return slots.filter((s) => extractDate(s.starts_at) === ds);
    }), [displayDates, slots]);

  // Preview count for repeat creation
  const slotPreviewCount = useMemo(() => {
    if (!slotForm.repeat || !slotForm.date || !slotForm.repeat_until || slotForm.repeat_days.length === 0) return 0;
    let count = 0;
    const end = new Date(slotForm.repeat_until + "T00:00:00");
    const cur = new Date(slotForm.date + "T00:00:00");
    while (cur <= end) {
      const dow = cur.getDay() === 0 ? 7 : cur.getDay();
      if (slotForm.repeat_days.includes(dow)) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  }, [slotForm.repeat, slotForm.date, slotForm.repeat_until, slotForm.repeat_days]);

  // ── Navigation ─────────────────────────────────────────────────────────────
  function navigatePrev() {
    if (view === "week") router.push(`/calendar?view=week&week=${offsetWeek(weekStart, -1)}`);
    else { const d = offsetDay(viewDate, -1); router.push(`/calendar?view=day&date=${d}&week=${weekStartOf(d)}`); }
  }
  function navigateNext() {
    if (view === "week") router.push(`/calendar?view=week&week=${offsetWeek(weekStart, 1)}`);
    else { const d = offsetDay(viewDate, 1); router.push(`/calendar?view=day&date=${d}&week=${weekStartOf(d)}`); }
  }
  function navigateToday() {
    const today = todayStr();
    if (view === "week") router.push(`/calendar?view=week&week=${weekStartOf(today)}`);
    else router.push(`/calendar?view=day&date=${today}&week=${weekStartOf(today)}`);
  }
  function switchView(v: "week" | "day") {
    if (v === "week") router.push(`/calendar?view=week&week=${weekStart}`);
    else router.push(`/calendar?view=day&date=${viewDate}&week=${weekStart}`);
  }

  // ── Handlers ───────────────────────────────────────────────────────────────
  function openNewSlot(prefilledDate?: string) {
    const date = prefilledDate ?? (view === "day" ? viewDate : "");
    const dowOfDate = date
      ? (() => { const js = new Date(date + "T00:00:00").getDay(); return [js === 0 ? 7 : js]; })()
      : [];
    patchSlot({ date, start_time: "09:00", end_time: "10:00", trainer_ids: [], repeat: false, repeat_days: dowOfDate, repeat_until: "" });
    setError("");
    setModal({ type: "newSlot" });
  }

  function handleCreateSlots() {
    if (!slotForm.course_id || !slotForm.date) { setError("Corso e data sono obbligatori."); return; }
    if (slotForm.repeat && (!slotForm.repeat_until || slotForm.repeat_days.length === 0)) {
      setError("Seleziona i giorni e la data di fine ripetizione."); return;
    }
    setError("");
    startTransition(async () => {
      const result = await createSlots({
        course_id: slotForm.course_id,
        start_date: slotForm.date,
        start_time: slotForm.start_time,
        end_time: slotForm.end_time,
        trainer_ids: slotForm.trainer_ids,
        repeat: slotForm.repeat
          ? { days_of_week: slotForm.repeat_days, until: slotForm.repeat_until }
          : false,
      });
      if (!result.success) { setError(result.error ?? "Errore."); return; }
      setModal(null);
      showToast(slotForm.repeat
        ? `${result.created} slot creati${result.skipped ? `, ${result.skipped} già esistenti` : ""}.`
        : "Slot creato.");
      router.refresh();
    });
  }

  function openEditMode(slot: SlotWithDetails) {
    setEditForm({ start_time: extractTime(slot.starts_at), end_time: extractTime(slot.ends_at), trainer_ids: slot.trainer_ids });
    setEditScope("single");
    setEditMode(true);
    setError("");
  }

  function handleUpdateSlot() {
    const slot = modal?.type === "slotDetail" ? modal.slot : null;
    if (!slot) return;
    setError("");
    startTransition(async () => {
      const result = await updateSlot(slot.id, editForm, editScope);
      if (!result.success) { setError(result.error ?? "Errore."); return; }
      setModal(null);
      setEditMode(false);
      showToast(editScope === "series" ? "Serie modificata." : "Slot modificato.");
      router.refresh();
    });
  }

  function handleCancelSlot() {
    const slot = modal?.type === "slotDetail" ? modal.slot : null;
    if (!slot) return;
    setError("");
    startTransition(async () => {
      const result = await cancelSlot(slot.id, cancelReason, cancelScope);
      if (!result.success) { setError(result.error ?? "Errore."); return; }
      setModal(null);
      setCancelReason("");
      showToast(cancelScope === "series" ? "Serie cancellata." : "Slot cancellato.");
      router.refresh();
    });
  }

  function toggleRepeatDay(dow: number) {
    patchSlot({ repeat_days: slotForm.repeat_days.includes(dow) ? slotForm.repeat_days.filter((d) => d !== dow) : [...slotForm.repeat_days, dow] });
  }

  const availableTrainers = trainers.filter((t) => !slotForm.trainer_ids.includes(t.id));
  const availableEditTrainers = trainers.filter((t) => !editForm.trainer_ids.includes(t.id));

  const inputClass = "h-[var(--input-height)] w-full rounded-[var(--radius-md)] px-4 bg-[var(--color-surface-raised)] text-[var(--color-text)] border border-[var(--color-border)] focus:border-[var(--color-accent)] outline-none text-sm transition-colors";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Header */}
      <div className="flex-shrink-0 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="flex items-center gap-3 px-4 md:px-6 py-4 flex-wrap">

          {/* Prev / label / Next / Oggi */}
          <div className="flex items-center gap-1.5 mr-auto">
            <button onClick={navigatePrev} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors">
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-semibold text-[var(--color-text)] min-w-[150px] text-center">
              {view === "week" ? formatWeekRange(weekStart) : formatDay(viewDate)}
            </span>
            <button onClick={navigateNext} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors">
              <ChevronRight size={18} />
            </button>
            <button onClick={navigateToday} className="px-3 py-1.5 rounded-lg bg-[var(--color-surface-raised)] text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors ml-1">
              Oggi
            </button>
          </div>

          {/* View toggle */}
          <div className="flex bg-[var(--color-surface-raised)] rounded-lg p-0.5 border border-[var(--color-border)]">
            {(["week", "day"] as const).map((v) => (
              <button key={v} onClick={() => switchView(v)}
                className={["px-4 py-1.5 rounded-md text-xs font-medium transition-colors",
                  view === v ? "bg-[var(--color-accent)] text-white" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)]",
                ].join(" ")}
              >
                {v === "week" ? "Settimana" : "Giorno"}
              </button>
            ))}
          </div>

          <Button size="sm" onClick={() => openNewSlot()}>+ Nuovo Slot</Button>
        </div>
        {error && <p className="px-4 pb-3 text-sm text-[var(--color-error)]">{error}</p>}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-auto">

        {/* Day headers */}
        <div className="sticky top-0 z-10 flex bg-[var(--color-surface)] border-b border-[var(--color-border)]">
          <div className="w-12 flex-shrink-0" />
          {displayDates.map((date) => {
            const ds = localDateStr(date);
            const isToday = ds === todayStr();
            const dayLabel = view === "week"
              ? IT_DAY_LABELS[date.getDay() === 0 ? 6 : date.getDay() - 1]
              : date.toLocaleDateString("it-IT", { weekday: "long" });
            return (
              <div key={ds} onClick={() => openNewSlot(ds)}
                className="flex-1 min-w-[100px] py-2 text-center cursor-pointer hover:bg-[var(--color-surface-raised)] transition-colors"
              >
                <div className="text-xs text-[var(--color-text-secondary)]">{dayLabel}</div>
                <div className={["text-sm font-semibold", isToday ? "text-[var(--color-accent)]" : "text-[var(--color-text)]"].join(" ")}>
                  {date.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        <div className="flex">
          {/* Hour labels */}
          <div className="w-12 flex-shrink-0 relative" style={{ height: TOTAL_HEIGHT }}>
            {HOURS.map((h) => (
              <div key={h} className="absolute right-2 text-[10px] text-[var(--color-text-secondary)] select-none"
                style={{ top: (h - HOUR_START) * HOUR_HEIGHT - 7 }}>
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {/* Day columns */}
          {displayDates.map((date, dayIdx) => (
            <div key={localDateStr(date)}
              className="flex-1 min-w-[100px] relative border-l border-[var(--color-border)]"
              style={{ height: TOTAL_HEIGHT }}
            >
              {HOURS.map((h) => (
                <div key={h} className="absolute w-full border-t border-[var(--color-border)]"
                  style={{ top: (h - HOUR_START) * HOUR_HEIGHT }} />
              ))}
              {HOURS.map((h) => (
                <div key={`${h}h`} className="absolute w-full border-t border-[var(--color-border)] opacity-30"
                  style={{ top: (h - HOUR_START) * HOUR_HEIGHT + HOUR_HEIGHT / 2 }} />
              ))}

              {slotsByDate[dayIdx].filter((s) => !s.is_cancelled).map((slot) => {
                const startMins = getMinutes(slot.starts_at);
                const endMins = getMinutes(slot.ends_at);
                const rawTop = ((startMins - HOUR_START * 60) / 60) * HOUR_HEIGHT;
                const rawHeight = Math.max(((endMins - startMins) / 60) * HOUR_HEIGHT, 24);
                const top = Math.max(rawTop, 0);
                const height = Math.min(rawHeight - (top - rawTop), TOTAL_HEIGHT - top - 2);
                if (height <= 0) return null;

                return (
                  <button key={slot.id}
                    onClick={() => { setCancelReason(""); setEditMode(false); setError(""); setCancelScope("single"); setEditScope("single"); setModal({ type: "slotDetail", slot }); }}
                    className="absolute left-0.5 right-0.5 rounded text-left transition-opacity hover:opacity-80 overflow-hidden"
                    style={{ top: top + 1, height: height - 2, backgroundColor: `${slot.course_color}28`, borderLeft: `3px solid ${slot.course_color}`, zIndex: 2 }}
                  >
                    <div className="px-1 pt-0.5">
                      <div className="text-[10px] font-semibold truncate" style={{ color: slot.course_color }}>
                        {extractTime(slot.starts_at)} {slot.course_name}
                      </div>
                      {height >= 40 && (
                        <div className="flex items-center gap-0.5 mt-0.5">
                          <Users size={9} className="text-[var(--color-text-secondary)]" />
                          <span className="text-[9px] text-[var(--color-text-secondary)]">{slot.confirmed_count}/{slot.capacity}</span>
                          {slot.waitlist_count > 0 && <span className="text-[9px] text-[var(--color-text-secondary)]">+{slot.waitlist_count}L</span>}
                        </div>
                      )}
                      {height >= 56 && slot.trainer_names.length > 0 && (
                        <div className="text-[9px] text-[var(--color-text-secondary)] truncate mt-0.5">{slot.trainer_names.join(", ")}</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-[calc(var(--bottom-bar-height)+16px)] left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-sm text-[var(--color-text)] shadow-lg whitespace-nowrap">
          {toastMsg}
        </div>
      )}

      {/* MODAL: Nuovo Slot */}
      <Modal open={modal?.type === "newSlot"} onClose={() => setModal(null)} title="Nuovo Slot">
        <div className="flex flex-col gap-4 pt-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs uppercase tracking-wide opacity-60">Corso *</label>
            <select value={slotForm.course_id} onChange={(e) => patchSlot({ course_id: e.target.value })} className={inputClass}>
              <option value="">— Seleziona corso —</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="flex gap-3">
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="text-xs uppercase tracking-wide opacity-60">Data inizio *</label>
              <input type="date" value={slotForm.date}
                onChange={(e) => {
                  const date = e.target.value;
                  const js = new Date(date + "T00:00:00").getDay();
                  const dow = js === 0 ? 7 : js;
                  patchSlot({ date, repeat_days: slotForm.repeat_days.length === 0 ? [dow] : slotForm.repeat_days });
                }}
                className={inputClass}
              />
            </div>
            <div className="w-24 flex flex-col gap-1.5">
              <label className="text-xs uppercase tracking-wide opacity-60">Dalle</label>
              <input type="time" value={slotForm.start_time} onChange={(e) => patchSlot({ start_time: e.target.value })} className={inputClass} />
            </div>
            <div className="w-24 flex flex-col gap-1.5">
              <label className="text-xs uppercase tracking-wide opacity-60">Alle</label>
              <input type="time" value={slotForm.end_time} onChange={(e) => patchSlot({ end_time: e.target.value })} className={inputClass} />
            </div>
          </div>

          {/* Trainer multi-select */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs uppercase tracking-wide opacity-60">Trainer</label>
            {slotForm.trainer_ids.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-1">
                {slotForm.trainer_ids.map((tid) => {
                  const t = trainers.find((x) => x.id === tid);
                  return (
                    <span key={tid} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--color-surface-raised)] text-xs border border-[var(--color-border)]">
                      {t ? `${t.first_name} ${t.last_name}` : tid}
                      <button type="button" onClick={() => patchSlot({ trainer_ids: slotForm.trainer_ids.filter((x) => x !== tid) })} className="opacity-50 hover:opacity-100">×</button>
                    </span>
                  );
                })}
              </div>
            )}
            {availableTrainers.length > 0 && (
              <select value="" onChange={(e) => { if (e.target.value) patchSlot({ trainer_ids: [...slotForm.trainer_ids, e.target.value] }); e.target.value = ""; }} className={inputClass}>
                <option value="">+ Aggiungi trainer…</option>
                {availableTrainers.map((t) => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
              </select>
            )}
          </div>

          {/* Ripeti toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border)] cursor-pointer"
            onClick={() => patchSlot({ repeat: !slotForm.repeat })}>
            <div>
              <div className="text-sm font-medium text-[var(--color-text)]">Ripeti</div>
              <div className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                {slotForm.repeat ? "Genera più slot automaticamente" : "Crea lo slot una sola volta"}
              </div>
            </div>
            <div className={["w-10 h-5 rounded-full transition-colors relative flex-shrink-0", slotForm.repeat ? "bg-[var(--color-accent)]" : "bg-[var(--color-border)]"].join(" ")}>
              <div className={["w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all shadow", slotForm.repeat ? "right-0.5" : "left-0.5"].join(" ")} />
            </div>
          </div>

          {slotForm.repeat && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs uppercase tracking-wide opacity-60">Giorni *</label>
                <div className="flex gap-1.5">
                  {DAYS_OF_WEEK.map(({ dow, label }) => (
                    <button key={dow} type="button" onClick={() => toggleRepeatDay(dow)}
                      className={["w-9 h-9 rounded-full text-xs font-semibold transition-colors",
                        slotForm.repeat_days.includes(dow) ? "bg-[var(--color-accent)] text-white" : "bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)]",
                      ].join(" ")}
                    >{label}</button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs uppercase tracking-wide opacity-60">Ripeti fino al *</label>
                <input type="date" value={slotForm.repeat_until} min={slotForm.date}
                  onChange={(e) => patchSlot({ repeat_until: e.target.value })} className={inputClass} />
              </div>
              {slotPreviewCount > 0 && (
                <div className="p-3 rounded-lg text-sm" style={{ background: "rgba(var(--color-accent-rgb),0.1)", border: "1px solid rgba(var(--color-accent-rgb),0.3)" }}>
                  <span className="font-bold text-[var(--color-accent)]">{slotPreviewCount} slot</span> verranno creati
                </div>
              )}
            </>
          )}

          {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}
          <Button fullWidth loading={isPending} onClick={handleCreateSlots}>
            {slotForm.repeat && slotPreviewCount > 0 ? `Crea ${slotPreviewCount} Slot` : "Crea Slot"}
          </Button>
        </div>
      </Modal>

      {/* MODAL: Dettaglio Slot */}
      <Modal open={modal?.type === "slotDetail"} onClose={() => { setModal(null); setEditMode(false); }}
        title={modal?.type === "slotDetail" ? modal.slot.course_name : "Slot"}>
        {modal?.type === "slotDetail" && (
          <div className="flex flex-col gap-5 pt-2">
            {!editMode ? (
              <>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      {new Date(extractDate(modal.slot.starts_at) + "T12:00:00").toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}
                      {" · "}{extractTime(modal.slot.starts_at)} – {extractTime(modal.slot.ends_at)}
                    </p>
                    {modal.slot.trainer_names.length > 0 && (
                      <p className="text-sm text-[var(--color-text-secondary)]">Trainer: {modal.slot.trainer_names.join(", ")}</p>
                    )}
                    {modal.slot.recurrence_id && (
                      <p className="text-xs text-[var(--color-text-secondary)] opacity-60">Slot ricorrente</p>
                    )}
                    {modal.slot.is_cancelled && (
                      <div className="mt-1 flex items-center gap-2 text-[var(--color-error)] text-sm">
                        <XCircle size={16} />
                        <span>Cancellato{modal.slot.cancellation_reason ? `: ${modal.slot.cancellation_reason}` : ""}</span>
                      </div>
                    )}
                  </div>
                  {!modal.slot.is_cancelled && (
                    <button onClick={() => openEditMode(modal.slot)}
                      className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-sm)] text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-raised)] transition-colors">
                      <Edit2 size={12} />Modifica
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  {[{ value: modal.slot.confirmed_count, label: "Confermati" }, { value: modal.slot.waitlist_count, label: "In attesa" }, { value: Math.max(0, modal.slot.capacity - modal.slot.confirmed_count), label: "Liberi" }].map(({ value, label }) => (
                    <div key={label} className="p-3 rounded-[var(--radius-md)] bg-[var(--color-surface-raised)] flex flex-col gap-0.5">
                      <span className="text-xl font-bold text-[var(--color-text)]">{value}</span>
                      <span className="text-xs text-[var(--color-text-secondary)]">{label}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-2 pt-2 border-t border-[var(--color-border)]">
                  <p className="text-sm font-medium text-[var(--color-text)]">Partecipanti</p>
                  <AdminSlotAttendees slotId={modal.slot.id} />
                </div>

                {!modal.slot.is_cancelled && (
                  <div className="flex flex-col gap-3 pt-2 border-t border-[var(--color-border)]">
                    <p className="text-sm font-medium text-[var(--color-text)]">Cancella slot</p>
                    {modal.slot.recurrence_id && (
                      <div className="flex gap-2">
                        {(["single", "series"] as SeriesScope[]).map((s) => (
                          <button key={s} type="button" onClick={() => setCancelScope(s)}
                            className={["flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors border",
                              cancelScope === s ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)]" : "bg-transparent text-[var(--color-text-secondary)] border-[var(--color-border)]",
                            ].join(" ")}
                          >{s === "single" ? "Solo questo slot" : "Tutta la serie"}</button>
                        ))}
                      </div>
                    )}
                    <input type="text" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="Motivazione (opzionale)"
                      className={inputClass + " placeholder:text-[var(--color-text-secondary)]"} />
                    {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}
                    <Button variant="danger" fullWidth loading={isPending} onClick={handleCancelSlot}>
                      {cancelScope === "series" ? "Cancella Tutta la Serie" : "Cancella Slot"}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex flex-col gap-4">
                  {modal.slot.recurrence_id && (
                    <div className="flex gap-2">
                      {(["single", "series"] as SeriesScope[]).map((s) => (
                        <button key={s} type="button" onClick={() => setEditScope(s)}
                          className={["flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors border",
                            editScope === s ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)]" : "bg-transparent text-[var(--color-text-secondary)] border-[var(--color-border)]",
                          ].join(" ")}
                        >{s === "single" ? "Solo questo slot" : "Tutta la serie"}</button>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-[var(--color-text)]">Inizio</label>
                      <input type="time" value={editForm.start_time} onChange={(e) => patchEdit({ start_time: e.target.value })} className={inputClass} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-[var(--color-text)]">Fine</label>
                      <input type="time" value={editForm.end_time} onChange={(e) => patchEdit({ end_time: e.target.value })} className={inputClass} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-[var(--color-text)]">Trainer</label>
                    {editForm.trainer_ids.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-1">
                        {editForm.trainer_ids.map((tid) => {
                          const t = trainers.find((x) => x.id === tid);
                          return (
                            <span key={tid} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--color-surface-raised)] text-xs border border-[var(--color-border)]">
                              {t ? `${t.first_name} ${t.last_name}` : tid}
                              <button type="button" onClick={() => patchEdit({ trainer_ids: editForm.trainer_ids.filter((x) => x !== tid) })} className="opacity-50 hover:opacity-100">×</button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                    {availableEditTrainers.length > 0 && (
                      <select value="" onChange={(e) => { if (e.target.value) patchEdit({ trainer_ids: [...editForm.trainer_ids, e.target.value] }); e.target.value = ""; }} className={inputClass}>
                        <option value="">+ Aggiungi trainer…</option>
                        {availableEditTrainers.map((t) => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
                      </select>
                    )}
                  </div>
                </div>
                {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}
                <div className="flex gap-2">
                  <Button variant="secondary" fullWidth onClick={() => { setEditMode(false); setError(""); }}>Annulla</Button>
                  <Button fullWidth loading={isPending} onClick={handleUpdateSlot}>
                    {editScope === "series" ? "Salva Serie" : "Salva"}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
```

**Note on the repeat preview styling:** The preview box uses CSS variable `--color-accent-rgb` for rgba. If that variable isn't defined in the theme, replace with a hardcoded `rgba(233,69,96,0.1)` / `rgba(233,69,96,0.3)`.

- [ ] **Step 2: Verify TypeScript compiles with zero errors**

```bash
cd /Users/dimitrimartignago/Gymkit && npx tsc --noEmit 2>&1
```
Expected: No output (zero errors). Fix any type mismatch before continuing.

- [ ] **Step 3: Manual smoke test**

Start the dev server:
```bash
npm run dev
```

Navigate to `http://localhost:3000/calendar` and verify:
1. Header shows: `‹ 14–20 apr 2026 ›` + `Oggi` + `Settimana | Giorno` toggle + `+ Nuovo Slot` button
2. "Genera Slot" and "Ricorrenza" buttons are **gone**
3. Week grid renders existing slots (no ghost dashed slots)
4. Click `+ Nuovo Slot` → modal opens with corso/data/orari/trainer/Ripeti fields
5. Toggle Ripeti ON → day pills + "Ripeti fino al" + preview count appear
6. Create a single slot → appears in grid, toast "Slot creato."
7. Create a recurring slot (Lun+Mer, 2 weeks ahead) → multiple slots appear, toast "N slot creati."
8. Click a slot → detail modal shows: date/time, trainer list, stats, attendees, cancel section
9. Slot in a series → detail shows "Slot ricorrente" label; cancel section shows "Solo questo slot / Tutta la serie" buttons
10. Edit a recurring slot → scope picker shows; saving with "Tutta la serie" updates all times
11. Click `Giorno` toggle → URL changes to `?view=day&date=...`, single-column grid appears
12. Day view prev/next navigates one day at a time; `Oggi` goes to today

- [ ] **Step 4: Commit**

```bash
git add src/app/(admin)/calendar/CalendarClient.tsx
git commit -m "feat(calendar): redesign — day view, unified creation modal, multi-trainer, series scope edit/cancel"
```

---

## Spec Coverage Check

| Spec requirement | Task | Status |
|---|---|---|
| `class_slot_trainers` table | 1 | ✓ |
| `recurrence_id` on `class_slots` | 1 | ✓ |
| `trainer_id` on `class_slots` kept, not written by new UI | 3 | ✓ (`createSlots` does not write `trainer_id`) |
| `createSlots` — single/recurring in one action | 3 | ✓ |
| Duplicate skip (same `course_id` + `starts_at`) | 3 | ✓ |
| `updateSlot(slotId, data, scope)` | 3 | ✓ |
| `cancelSlot(slotId, reason, scope)` | 3 | ✓ |
| Cancel series: only future slots (`starts_at > now()`) | 3 | ✓ |
| Page reads `?view` + `?date` searchParams | 4 | ✓ |
| Slot query includes `class_slot_trainers` join | 4 | ✓ |
| `trainer_name → trainer_names[]` in `SlotWithDetails` | 4+5 | ✓ |
| `recurrence_id` in `SlotWithDetails` | 4+5 | ✓ |
| `trainer_ids[]` in `SlotWithDetails` (for edit pre-fill) | 4+5 | ✓ |
| No `course_schedules` query in page or client | 4+5 | ✓ |
| Header: prev/next + label + Oggi + toggle + "+ Nuovo Slot" | 5 | ✓ |
| "Genera Slot" + "Ricorrenza" buttons removed | 5 | ✓ |
| Week view 7 columns, Day view 1 column | 5 | ✓ |
| Click day header → modal pre-fills date | 5 | ✓ |
| Modal: corso + data + dalle/alle + trainer multi-select | 5 | ✓ |
| Ripeti toggle: day pills + until + live preview | 5 | ✓ |
| Button label "Crea N Slot" when repeat ON | 5 | ✓ |
| Slot detail shows `trainer_names` list | 5 | ✓ |
| Edit/cancel recurring slot: scope picker | 5 | ✓ |
