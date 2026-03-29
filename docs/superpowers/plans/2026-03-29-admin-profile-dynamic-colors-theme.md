# Admin Profile + Dynamic Colors + Dark/Light Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add admin profile page, read gym brand colors from DB into CSS vars, and implement a dark/light theme toggle across all layouts.

**Architecture:** Three independent features sharing a common prerequisite (CSS variable refactor for border/overlay colors). The theme system uses a client-side hook + localStorage with no SSR dependency. DB colors are injected server-side via inline style on `<html>`. No test framework present — verification is `npm run build` + `npm run lint`.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS v3, Supabase SSR, lucide-react, localStorage

---

## File Map

| Action | File |
|--------|------|
| Modify | `src/lib/supabase/types.ts` — add `accent_color` to gym Row/Insert/Update |
| Modify | `src/app/globals.css` — add `.light` theme + `--color-border`/`--color-overlay` CSS vars |
| Modify | `src/app/layout.tsx` — make async, fetch gym colors, inject inline style |
| Create | `src/lib/hooks/use-theme.ts` — useTheme hook |
| Create | `src/components/ui/ThemeToggle.tsx` — Sun/Moon toggle button |
| Modify | `src/components/ui/index.ts` — export ThemeToggle |
| Create | `src/app/(admin)/profile/page.tsx` — admin profile page |
| Modify | `src/app/(admin)/layout.tsx` — add Profilo nav + ThemeToggle |
| Modify | `src/app/(trainer)/layout.tsx` — add ThemeToggle |
| Modify | `src/app/(client)/profile/page.tsx` — add ThemeToggle section |
| Modify | `src/app/(admin)/settings/SettingsClient.tsx` — add accent_color picker |
| Modify | `src/app/(admin)/settings/actions.ts` — save accent_color |
| Modify | Many files — replace `border-white/10` etc. with CSS var equivalents |

---

## Task 1: Update types + Add CSS variables for border/overlay

**Files:**
- Modify: `src/lib/supabase/types.ts`
- Modify: `src/app/globals.css`

### Objective
Add `accent_color` to the gym type. Add CSS variables for borders and overlays (needed by theme + all file replacements in Task 3).

- [ ] **Step 1: Add `accent_color` to gym types**

In `src/lib/supabase/types.ts`, find the `gym` table definition and add `accent_color` to Row, Insert, and Update:

```typescript
// In Row:
accent_color: string | null;

// In Insert:
accent_color?: string | null;

// In Update:
accent_color?: string | null;
```

- [ ] **Step 2: Update globals.css — add CSS vars and `.light` theme**

Replace the entire contents of `src/app/globals.css` with:

```css
/* @import DEVE venire prima di qualsiasi altra regola CSS */
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=JetBrains+Mono:wght@400;500&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  /* Colori brand — sovrascritti dal DB per palestra */
  --color-primary: var(--gym-primary, #1A1A2E);
  --color-primary-light: var(--gym-primary-light, #16213E);
  --color-accent: var(--gym-accent, #E94560);

  /* Tema dark (default) */
  --color-bg: #0F0F0F;
  --color-surface: #1A1A1A;
  --color-surface-raised: #252525;
  --color-text: #F5F5F5;
  --color-text-secondary: #A0A0A0;

  /* Bordi e overlay — variabili per tema */
  --color-border: rgba(255, 255, 255, 0.1);
  --color-border-soft: rgba(255, 255, 255, 0.05);
  --color-border-strong: rgba(255, 255, 255, 0.2);
  --color-overlay: rgba(255, 255, 255, 0.05);
  --color-overlay-md: rgba(255, 255, 255, 0.1);
  --color-overlay-lg: rgba(255, 255, 255, 0.15);

  /* Stato */
  --color-success: #4ADE80;
  --color-warning: #FBBF24;
  --color-error: #F87171;

  /* Tipografia */
  --font-display: 'DM Sans', sans-serif;
  --font-body: 'DM Sans', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

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
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.5);

  /* Sizing */
  --button-height-sm: 36px;
  --button-height-md: 48px;
  --button-height-lg: 56px;
  --input-height: 48px;
  --nav-height: 64px;
  --bottom-bar-height: 72px;
}

/* Tema light — aggiunge classe "light" su <html> */
.light {
  --color-bg: #F5F5F5;
  --color-surface: #FFFFFF;
  --color-surface-raised: #F0F0F0;
  --color-text: #1A1A1A;
  --color-text-secondary: #6B7280;

  --color-border: rgba(0, 0, 0, 0.1);
  --color-border-soft: rgba(0, 0, 0, 0.05);
  --color-border-strong: rgba(0, 0, 0, 0.15);
  --color-overlay: rgba(0, 0, 0, 0.04);
  --color-overlay-md: rgba(0, 0, 0, 0.08);
  --color-overlay-lg: rgba(0, 0, 0, 0.12);

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.08);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.12);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.16);

  color-scheme: light;
}

html {
  color-scheme: dark;
}

body {
  background-color: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-body);
}

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd ~/Gymkit && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors (or only pre-existing ones).

---

## Task 2: Replace hardcoded white/black opacity utilities with CSS vars

**Files:** (all modified, no new files)
- `src/components/ui/Button.tsx`
- `src/components/ui/Badge.tsx`
- `src/components/ui/BottomNav.tsx`
- `src/components/ui/Modal.tsx`
- `src/components/ui/Input.tsx`
- `src/app/(admin)/layout.tsx`
- `src/app/(admin)/settings/SettingsClient.tsx`
- `src/app/(admin)/trainers/TrainersClient.tsx`
- `src/app/(admin)/courses/CoursesClient.tsx`
- `src/app/(trainer)/layout.tsx`
- `src/app/(trainer)/exercises/ExercisesClient.tsx`
- `src/app/(trainer)/schedule/ScheduleClient.tsx`
- `src/app/(trainer)/plans/new/page.tsx`
- `src/app/(trainer)/plans/[id]/edit/page.tsx`
- `src/app/(client)/profile/page.tsx`
- `src/app/(client)/booking/page.tsx`
- `src/app/(client)/booking/[slotId]/BookingClient.tsx`
- `src/app/(client)/workout/[dayId]/log/LogClient.tsx`
- `src/components/workout/PlanBuilder.tsx`
- `src/components/workout/ExercisePicker.tsx`

### Replacement rules

| Old Tailwind utility | New CSS-var utility |
|---|---|
| `border-white/10` | `border-[var(--color-border)]` |
| `divide-white/10` | `divide-[var(--color-border)]` |
| `border-white/5` | `border-[var(--color-border-soft)]` |
| `border-white/15` | `border-[var(--color-border)]` (close enough) |
| `border-white/20` | `border-[var(--color-border-strong)]` |
| `hover:bg-white/5` | `hover:bg-[var(--color-overlay)]` |
| `hover:bg-white/10` | `hover:bg-[var(--color-overlay-md)]` |
| `active:bg-white/5` | `active:bg-[var(--color-overlay)]` |
| `active:bg-white/10` | `active:bg-[var(--color-overlay-md)]` |
| `bg-white/5` (static) | `bg-[var(--color-overlay)]` |
| `bg-white/10` (static) | `bg-[var(--color-overlay-md)]` |
| `bg-white/15` (static) | `bg-[var(--color-overlay-lg)]` |
| `hover:bg-white/3` | `hover:bg-[var(--color-overlay)]` |
| `border-dashed border-white/10` | `border-dashed border-[var(--color-border)]` |

**Note:** Leave `bg-black/60` (modal backdrop) and `text-white/20` (low-priority decorative) as-is — they're intentional fixed values.

- [ ] **Step 1: Replace in UI components**

Edit `src/components/ui/Button.tsx`:
- `border border-white/10 hover:bg-white/10 active:bg-white/5` → `border border-[var(--color-border)] hover:bg-[var(--color-overlay-md)] active:bg-[var(--color-overlay)]`
- `hover:bg-white/5 active:bg-white/10` → `hover:bg-[var(--color-overlay)] active:bg-[var(--color-overlay-md)]`

Edit `src/components/ui/Badge.tsx`:
- `bg-white/10` → `bg-[var(--color-overlay-md)]`

Edit `src/components/ui/BottomNav.tsx`:
- `border-t border-white/10` → `border-t border-[var(--color-border)]`

Edit `src/components/ui/Modal.tsx`:
- `hover:bg-white/10` → `hover:bg-[var(--color-overlay-md)]`

Edit `src/components/ui/Input.tsx` (3 occurrences of `border-white/10`):
- All `border-white/10` → `border-[var(--color-border)]`

- [ ] **Step 2: Replace in layout files**

Edit `src/app/(admin)/layout.tsx`:
- All `border-white/10` → `border-[var(--color-border)]`

Edit `src/app/(trainer)/layout.tsx`:
- All `border-white/10` → `border-[var(--color-border)]`

- [ ] **Step 3: Replace in client pages**

Edit `src/app/(client)/profile/page.tsx`:
- `divide-white/10` → `divide-[var(--color-border)]`

Edit `src/app/(client)/booking/page.tsx`:
- All `border-white/10` → `border-[var(--color-border)]`

Edit `src/app/(client)/booking/[slotId]/BookingClient.tsx`:
- `bg-white/15` (×2) → `bg-[var(--color-overlay-lg)]`
- `border-white/10` → `border-[var(--color-border)]`

Edit `src/app/(client)/workout/[dayId]/log/LogClient.tsx`:
- All `border-white/10` → `border-[var(--color-border)]`
- `bg-white/10` → `bg-[var(--color-overlay-md)]`
- `bg-white/15` → `bg-[var(--color-overlay-lg)]`

- [ ] **Step 4: Replace in admin client files**

Edit `src/app/(admin)/settings/SettingsClient.tsx`:
- All `border-white/10` → `border-[var(--color-border)]`

Edit `src/app/(admin)/trainers/TrainersClient.tsx`:
- All `border-white/10` → `border-[var(--color-border)]`
- `border-white/5` → `border-[var(--color-border-soft)]`
- `hover:bg-white/10` → `hover:bg-[var(--color-overlay-md)]`
- `hover:bg-white/3` → `hover:bg-[var(--color-overlay)]`

Edit `src/app/(admin)/courses/CoursesClient.tsx`:
- All `border-white/10` → `border-[var(--color-border)]`
- `border-white/5` → `border-[var(--color-border-soft)]`
- `hover:bg-white/3` → `hover:bg-[var(--color-overlay)]`

- [ ] **Step 5: Replace in trainer client files**

Edit `src/app/(trainer)/exercises/ExercisesClient.tsx`:
- All `border-white/10` → `border-[var(--color-border)]`
- `bg-white/10` → `bg-[var(--color-overlay-md)]`
- `bg-white/5` → `bg-[var(--color-overlay)]`

Edit `src/app/(trainer)/schedule/ScheduleClient.tsx`:
- All `border-white/10` → `border-[var(--color-border)]`
- `border-white/15` → `border-[var(--color-border)]`

Edit `src/app/(trainer)/plans/new/page.tsx`:
- `border-white/10` → `border-[var(--color-border)]`

Edit `src/app/(trainer)/plans/[id]/edit/page.tsx`:
- `border-white/10` → `border-[var(--color-border)]`

- [ ] **Step 6: Replace in workout components**

Edit `src/components/workout/PlanBuilder.tsx`:
- All `border-white/10` → `border-[var(--color-border)]`
- `border-white/20` → `border-[var(--color-border-strong)]`
- `bg-white/10` → `bg-[var(--color-overlay-md)]`

Edit `src/components/workout/ExercisePicker.tsx`:
- All `border-white/10` → `border-[var(--color-border)]`
- `bg-white/10` → `bg-[var(--color-overlay-md)]`

- [ ] **Step 7: Build check**

```bash
cd ~/Gymkit && npm run build 2>&1 | tail -20
```

Expected: successful build, no TypeScript errors.

- [ ] **Step 8: Commit**

```bash
cd ~/Gymkit && git add -A && git commit -m "refactor: replace hardcoded white opacity utilities with CSS vars for theme support"
```

---

## Task 3: Dynamic colors from DB in root layout

**Files:**
- Modify: `src/app/layout.tsx`

### Objective
Root layout fetches `primary_color` and `accent_color` from the `gym` table and injects them as inline CSS custom properties on `<html>`.

- [ ] **Step 1: Update root layout**

Replace `src/app/layout.tsx` with:

```typescript
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "GymKit",
  description: "App per la gestione della palestra",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#1A1A2E",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let gymStyle: Record<string, string> = {};

  try {
    const supabase = await createClient();
    const { data: gym } = await supabase
      .from("gym")
      .select("primary_color, accent_color")
      .limit(1)
      .single();

    if (gym) {
      if (gym.primary_color) gymStyle["--gym-primary"] = gym.primary_color;
      if (gym.accent_color) gymStyle["--gym-accent"] = gym.accent_color;
      // Note: --gym-primary-light has no DB column; it always uses the CSS fallback value.
    }
  } catch {
    // DB not reachable — CSS fallbacks apply
  }

  return (
    <html lang="it" className="dark" style={gymStyle as CSSProperties}>
      <body className="antialiased font-body bg-[var(--color-bg)] text-[var(--color-text)]">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Build check**

```bash
cd ~/Gymkit && npm run build 2>&1 | tail -20
```

Expected: successful build.

- [ ] **Step 3: Commit**

```bash
cd ~/Gymkit && git add src/app/layout.tsx && git commit -m "feat: inject gym brand colors from DB as CSS custom properties"
```

---

## Task 4: useTheme hook + ThemeToggle component

**Files:**
- Create: `src/lib/hooks/use-theme.ts`
- Create: `src/components/ui/ThemeToggle.tsx`
- Modify: `src/components/ui/index.ts`

- [ ] **Step 1: Create useTheme hook**

Create `src/lib/hooks/use-theme.ts`:

```typescript
"use client";

import { useEffect, useState } from "react";

type Theme = "dark" | "light";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const stored = localStorage.getItem("gymkit-theme") as Theme | null;
    const initial = stored === "light" ? "light" : "dark";
    setTheme(initial);
    applyTheme(initial);
  }, []);

  function applyTheme(t: Theme) {
    const html = document.documentElement;
    if (t === "light") {
      html.classList.add("light");
    } else {
      html.classList.remove("light");
    }
  }

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("gymkit-theme", next);
    applyTheme(next);
  }

  return { theme, toggle };
}
```

- [ ] **Step 2: Create ThemeToggle component**

Create `src/components/ui/ThemeToggle.tsx`:

```typescript
"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/hooks/use-theme";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const { theme, toggle } = useTheme();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Attiva tema chiaro" : "Attiva tema scuro"}
      className={[
        "flex items-center justify-center w-9 h-9 rounded-md transition-colors",
        "text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-overlay-md)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
```

- [ ] **Step 3: Export from index**

In `src/components/ui/index.ts`, add:

```typescript
export { ThemeToggle } from "./ThemeToggle";
```

- [ ] **Step 4: Build check**

```bash
cd ~/Gymkit && npm run build 2>&1 | tail -20
```

Expected: successful build.

- [ ] **Step 5: Commit**

```bash
cd ~/Gymkit && git add src/lib/hooks/use-theme.ts src/components/ui/ThemeToggle.tsx src/components/ui/index.ts && git commit -m "feat: add useTheme hook and ThemeToggle component"
```

---

## Task 5: Admin profile page

**Files:**
- Create: `src/app/(admin)/profile/page.tsx`
- Modify: `src/app/(admin)/layout.tsx` — add Profilo to nav + ThemeToggle

- [ ] **Step 1: Create admin profile page**

Create `src/app/(admin)/profile/page.tsx`:

```typescript
import { Card, ThemeToggle } from "@/components/ui";
import { getAdminContext } from "@/lib/supabase/get-admin-context";
import { LogOut, Mail, Phone, User } from "lucide-react";
import { signOut } from "@/lib/actions/auth";

export default async function AdminProfilePage() {
  // Reuse supabase client from getAdminContext — avoids a second client instantiation
  const { user, supabase } = await getAdminContext();

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, email, phone, role")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  const initials =
    (profile.first_name?.[0] ?? "") + (profile.last_name?.[0] ?? "");

  return (
    <div className="p-4 md:p-6 flex flex-col gap-6 max-w-xl">
      <h1 className="text-xl font-semibold text-[var(--color-text)]">
        Profilo
      </h1>

      {/* Avatar + name */}
      <div className="flex flex-col items-center gap-3 py-4">
        <div className="w-20 h-20 rounded-full bg-[var(--color-accent)]/20 flex items-center justify-center text-[var(--color-accent)] font-bold text-2xl">
          {initials.toUpperCase() || <User size={32} />}
        </div>
        <div className="text-center">
          <p className="font-semibold text-lg text-[var(--color-text)]">
            {profile.first_name} {profile.last_name}
          </p>
          <p className="text-sm text-[var(--color-text-secondary)] capitalize">
            {profile.role}
          </p>
        </div>
      </div>

      {/* Info card */}
      <Card className="flex flex-col gap-0 divide-y divide-[var(--color-border)] p-0 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-4">
          <Mail size={18} className="text-[var(--color-text-secondary)] shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-xs text-[var(--color-text-secondary)]">Email</span>
            <span className="text-sm text-[var(--color-text)] truncate">{profile.email}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-4">
          <Phone size={18} className="text-[var(--color-text-secondary)] shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-xs text-[var(--color-text-secondary)]">Telefono</span>
            <span className="text-sm text-[var(--color-text)] truncate">
              {profile.phone ?? "—"}
            </span>
          </div>
        </div>
      </Card>

      {/* Preferenze */}
      <Card className="flex flex-col gap-0 divide-y divide-[var(--color-border)] p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-[var(--color-text)]">Tema</span>
          <ThemeToggle />
        </div>
      </Card>

      {/* Logout */}
      <form action={signOut}>
        <button
          type="submit"
          className="flex items-center justify-center gap-2 w-full h-12 rounded-[var(--radius-md)] border border-[var(--color-error)]/40 text-[var(--color-error)] text-sm font-semibold hover:bg-[var(--color-error)]/10 active:bg-[var(--color-error)]/20 transition-colors"
        >
          <LogOut size={18} />
          Esci dall&apos;account
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Update admin layout — add Profilo nav + ThemeToggle**

In `src/app/(admin)/layout.tsx`:

1. Add `import { ThemeToggle } from "@/components/ui/ThemeToggle";` to imports
2. Add `{ href: "/profile", label: "Profilo" }` as the last item in `adminNavItems`
3. In the sidebar, add `<ThemeToggle />` between the nav and the logout form. Replace the `<div className="px-3 pb-4">` section with:

```typescript
<div className="px-3 pb-4 flex flex-col gap-1">
  <div className="flex items-center justify-between px-3 py-1">
    <span className="text-xs text-[var(--color-text-secondary)]">Tema</span>
    <ThemeToggle />
  </div>
  <form action={signOut}>
    <button
      type="submit"
      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10 transition-colors text-sm"
    >
      <LogOut size={16} />
      Esci
    </button>
  </form>
</div>
```

- [ ] **Step 3: Build check**

```bash
cd ~/Gymkit && npm run build 2>&1 | tail -20
```

Expected: successful build.

- [ ] **Step 4: Commit**

```bash
cd ~/Gymkit && git add src/app/(admin)/profile/page.tsx src/app/(admin)/layout.tsx && git commit -m "feat: add admin profile page with theme toggle"
```

---

## Task 6: ThemeToggle in trainer and client layouts

**Files:**
- Modify: `src/app/(trainer)/layout.tsx`
- Modify: `src/app/(client)/profile/page.tsx`

- [ ] **Step 1: Add ThemeToggle to trainer layout**

In `src/app/(trainer)/layout.tsx`:

1. Add `import { ThemeToggle } from "@/components/ui/ThemeToggle";`
2. In the desktop sidebar, replace the `<div className="px-3 pb-4">` section with:

```typescript
<div className="px-3 pb-4 flex flex-col gap-1">
  <div className="flex items-center justify-between px-3 py-1">
    <span className="text-xs text-[var(--color-text-secondary)]">Tema</span>
    <ThemeToggle />
  </div>
  <form action={signOut}>
    <button
      type="submit"
      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10 transition-colors text-sm"
    >
      <LogOut size={16} />
      Esci
    </button>
  </form>
</div>
```

3. In the mobile header, add `<ThemeToggle />` next to the logout button:

```typescript
<header
  className="md:hidden flex items-center justify-between px-4 bg-[var(--color-surface)] border-b border-[var(--color-border)]"
  style={{ height: "var(--nav-height)" }}
>
  <span className="font-display font-bold text-base text-[var(--color-text)]">
    GymKit <span className="text-xs text-[var(--color-accent)] font-normal">trainer</span>
  </span>
  <div className="flex items-center gap-1">
    <ThemeToggle />
    <form action={signOut}>
      <button
        type="submit"
        className="flex items-center justify-center w-9 h-9 rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10 transition-colors"
      >
        <LogOut size={18} />
      </button>
    </form>
  </div>
</header>
```

- [ ] **Step 2: Add ThemeToggle to client profile page**

In `src/app/(client)/profile/page.tsx`:

1. Add `import { ThemeToggle } from "@/components/ui/ThemeToggle";`
2. After the info Card (before the logout form), add a preferences card:

```typescript
{/* Preferenze */}
<Card className="flex flex-col gap-0 divide-y divide-[var(--color-border)] p-0 overflow-hidden">
  <div className="flex items-center justify-between px-4 py-3">
    <span className="text-sm text-[var(--color-text)]">Tema</span>
    <ThemeToggle />
  </div>
</Card>
```

- [ ] **Step 3: Build check**

```bash
cd ~/Gymkit && npm run build 2>&1 | tail -20
```

Expected: successful build.

- [ ] **Step 4: Commit**

```bash
cd ~/Gymkit && git add src/app/(trainer)/layout.tsx src/app/(client)/profile/page.tsx && git commit -m "feat: add theme toggle to trainer layout and client profile"
```

---

## Task 7: accent_color in Settings

**Files:**
- Modify: `src/app/(admin)/settings/SettingsClient.tsx`
- Modify: `src/app/(admin)/settings/actions.ts`

- [ ] **Step 1: Update settings actions to save accent_color**

In `src/app/(admin)/settings/actions.ts`:

1. Add `accent_color: string;` to `GymSettingsData` interface
2. Add `accent_color: data.accent_color,` to the `supabase.from("gym").update(...)` call

Updated interface:
```typescript
interface GymSettingsData {
  name: string;
  slug: string;
  primary_color: string;
  accent_color: string;
  booking_cancellation_hours: number;
}
```

Updated update call:
```typescript
const { error } = await supabase
  .from("gym")
  .update({
    name: data.name.trim(),
    slug: data.slug.trim().toLowerCase().replace(/\s+/g, "-"),
    primary_color: data.primary_color,
    accent_color: data.accent_color,
    booking_cancellation_hours: data.booking_cancellation_hours,
  })
  .eq("id", gymId);
```

- [ ] **Step 2: Add accent_color picker to SettingsClient**

In `src/app/(admin)/settings/SettingsClient.tsx`:

**Prerequisite:** Task 2 must be complete before this step. If running this task in isolation, also replace the two remaining `border-white/10` instances in this file (section headings at ~lines 74 and 96) with `border-[var(--color-border)]`.

**Caution:** The existing section at line ~95 has a comment `{/* Colore accent */}` but actually controls `primaryColor`. Do NOT modify that section — it controls the primary brand color. Add the new section *below* it for `accentColor`.

1. Add `accentColor` and `customAccentColor` state (initialized from `gym.accent_color ?? "#E94560"`)
2. Pass `accent_color: accentColor` in the `updateGymSettings` call
3. After the "Colore principale" section, add a new "Colore accent" section with the same color picker pattern:

```typescript
const [accentColor, setAccentColor] = useState(gym.accent_color ?? "#E94560");
const [customAccentColor, setCustomAccentColor] = useState(gym.accent_color ?? "#E94560");
```

In `handleSave`:
```typescript
const result = await updateGymSettings(gym.id, {
  name,
  slug,
  primary_color: primaryColor,
  accent_color: accentColor,
  booking_cancellation_hours: cancellationHours,
});
```

New section after the primary color section:
```typescript
{/* Colore accent */}
<section className="flex flex-col gap-4">
  <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide border-b border-[var(--color-border)] pb-2">
    Colore accent
  </h2>

  <div className="flex flex-col gap-3">
    <div className="flex gap-2 flex-wrap">
      {PRESET_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => { setAccentColor(c); setCustomAccentColor(c); }}
          className={[
            "w-9 h-9 rounded-full transition-all",
            accentColor === c
              ? "ring-2 ring-white ring-offset-2 ring-offset-[var(--color-surface)] scale-110"
              : "hover:scale-105",
          ].join(" ")}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>

    <div className="flex items-center gap-3">
      <input
        type="color"
        value={customAccentColor}
        onChange={(e) => { setCustomAccentColor(e.target.value); setAccentColor(e.target.value); }}
        className="w-10 h-10 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-transparent cursor-pointer p-0.5"
      />
      <span className="text-sm text-[var(--color-text-secondary)] font-mono">
        {accentColor.toUpperCase()}
      </span>
      <div
        className="flex-1 h-10 rounded-[var(--radius-md)]"
        style={{ backgroundColor: accentColor }}
      />
    </div>
  </div>
</section>
```

- [ ] **Step 3: Build check**

```bash
cd ~/Gymkit && npm run build 2>&1 | tail -20
```

Expected: successful build.

- [ ] **Step 4: Commit**

```bash
cd ~/Gymkit && git add src/app/(admin)/settings/SettingsClient.tsx src/app/(admin)/settings/actions.ts && git commit -m "feat: add accent_color field to gym settings"
```

---

## Task 8: Final verification

- [ ] **Step 1: Full build**

```bash
cd ~/Gymkit && npm run build 2>&1
```

Expected: `✓ Compiled successfully` with no TypeScript errors.

- [ ] **Step 2: Lint**

```bash
cd ~/Gymkit && npm run lint 2>&1
```

Expected: no errors.

- [ ] **Step 3: Final commit (if any unstaged changes)**

```bash
cd ~/Gymkit && git status
```

If clean: done. If dirty: add and commit stragglers.

- [ ] **Step 4: Summary tag commit**

```bash
cd ~/Gymkit && git log --oneline -8
```

Verify all feature commits are present.
