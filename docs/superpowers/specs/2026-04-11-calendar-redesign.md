# Calendar Redesign — Spec
**Date:** 2026-04-11
**Status:** Approved

---

## Problema

Il calendario attuale ha due livelli distinti (`course_schedules` + `class_slots`) che causano confusione:
- Le ricorrenze create non appaiono direttamente sul calendario
- Richiede un bottone "genera settimana" separato
- Il concetto di "schedule" vs "slot" non è intuitivo per l'admin

---

## Obiettivo

Un'unica funzione di creazione che permette di generare slot singoli o ricorrenti. Il calendario diventa navigabile (settimana / giorno). Nessun concetto di "ricorrenza template" esposto all'utente.

---

## Decisioni di design

| Decisione | Scelta |
|---|---|
| Vista | Settimanale (default) + Giornaliera |
| Vista mensile | Esclusa — aggiungibile in futuro |
| Modello dati | Approccio B: solo `class_slots`, niente `course_schedules` |
| Trainer per slot | Multipli — via tabella junction `class_slot_trainers` |
| UI trainer | Dropdown + tag rimovibili |

---

## Modello dati

### Nuova tabella: `class_slot_trainers`
```sql
create table class_slot_trainers (
  slot_id   uuid references class_slots(id) on delete cascade,
  trainer_id uuid references profiles(id) on delete cascade,
  primary key (slot_id, trainer_id)
);
```

### Tabella `class_slots` — invariata
Il campo `trainer_id` esistente viene deprecato: la nuova UI non lo scrive più e non lo legge. Rimane nel DB per non rompere query esistenti. I trainer si leggono esclusivamente da `class_slot_trainers`.

### Tabella `course_schedules`
Non viene eliminata fisicamente (ci sono bookings/riferimenti storici), ma la nuova UI non la usa più. Il bottone "Genera settimana" viene rimosso.

---

## Componenti UI

### 1. Header calendario

```
[‹]  14 – 20 apr 2026  [›]  [Oggi]          [Settimana | Giorno]    [+ Nuovo Slot]
```

- **Prev/Next**: cambia settimana (o giorno in day-view)
- **Oggi**: torna alla settimana/giorno corrente
- **Toggle vista**: Settimana / Giorno — cambia `?view=week|day` nel searchParam
- **+ Nuovo Slot**: apre la modal di creazione

### 2. Griglia calendario

- **Week view**: 7 colonne (Lun→Dom), asse Y = ore (06:00–23:00), slot posizionati con `top` e `height` calcolati dall'orario
- **Day view**: 1 colonna, stessa griglia oraria — più spazio per visualizzare i dettagli degli slot
- Click su uno slot → apre il dettaglio slot (modal o panel)
- Click su una cella oraria → apre la modal di creazione con data/ora pre-compilati

### 3. Modal "Nuovo Slot"

**Campi sempre visibili:**
- `corso` — select obbligatorio
- `data inizio` — date picker obbligatorio (in day view: pre-compilato col giorno corrente)
- `dalle` / `alle` — time input (default 09:00–10:00; se clic su cella oraria: pre-compilato)
- `trainer` — dropdown multi-select con tag rimovibili (opzionale)

**Toggle "Ripeti"** (default OFF):
- Quando ON espone:
  - `Giorni` — 7 pill L/M/M/G/V/S/D, il giorno della data inizio è pre-selezionato
  - `Ripeti fino al` — date picker obbligatorio quando Ripeti è ON
- Preview in tempo reale: `N slot verranno creati (giorni · data_inizio → data_fine)`
- Il bottone diventa `Crea N Slot` quando Ripeti è ON, `Crea Slot` quando è OFF

**Comportamento creazione:**
- Ripeti OFF → inserisce 1 riga in `class_slots` + N righe in `class_slot_trainers`
- Ripeti ON → genera tutti i `class_slots` per le occorrenze (data_inizio → data_fine, nei giorni selezionati), saltando silenziosamente i duplicati (stesso `course_id` + `starts_at`); per ogni slot inserisce le righe in `class_slot_trainers`
- Tutti gli inserimenti avvengono in un'unica Server Action

### 4. Dettaglio slot (modal esistente — modifiche minori)

- Mostra trainer come lista (non singolo)
- Modifica: aggiunge/rimuove trainer dalla junction table
- Cancellazione: invariata

---

## Server Actions

### `createSlots(data: CreateSlotsInput): Promise<{ success: boolean; count: number; error?: string }>`

```ts
interface CreateSlotsInput {
  course_id: string;
  start_date: string;       // "YYYY-MM-DD"
  start_time: string;       // "HH:MM"
  end_time: string;         // "HH:MM"
  trainer_ids: string[];    // può essere vuoto
  repeat: false | {
    days_of_week: number[]; // 1=Lun … 7=Dom
    until: string;          // "YYYY-MM-DD"
  };
}
```

- Unica action per slot singolo e ricorrente
- Verifica ownership (gym dell'admin == gym del corso)
- Salta duplicati (stesso `course_id` + `starts_at`) senza errore
- Ritorna `{ success: true, created: N, skipped: M }` dove `created` = slot nuovi inseriti, `skipped` = duplicati ignorati

### `updateSlot` — aggiornamento firma

Aggiunge `trainer_ids: string[]` ai dati modificabili; sostituisce le righe in `class_slot_trainers` (delete + insert).

---

## Pagina calendario (Server Component)

- Legge `?week=YYYY-MM-DD` e `?view=week|day` dai searchParams
- In day view legge `?date=YYYY-MM-DD`
- Passa `view` e `date` al `CalendarClient`
- Query slot include join su `class_slot_trainers` → array trainer per slot
- Il tipo `SlotWithDetails` cambia: `trainer_name: string | null` → `trainer_names: string[]`

---

## Fuori scope

- Vista mensile
- Modifica "tutta la serie" (gli slot ricorrenti sono indipendenti)
- Notifiche ai clienti quando uno slot viene cancellato
- Import/export calendario

---

## File coinvolti

| File | Cambiamento |
|---|---|
| `supabase/migrations/` | Nuova migrazione: tabella `class_slot_trainers` |
| `src/app/(admin)/calendar/page.tsx` | Legge `view` + `date` dai searchParams; query aggiornata |
| `src/app/(admin)/calendar/CalendarClient.tsx` | Redesign completo: rimuove schedules, aggiunge day view, nuova modal |
| `src/app/(admin)/calendar/actions.ts` | Nuova `createSlots`, aggiornamento `updateSlot` |
| `src/lib/supabase/types.ts` | Aggiornamento tipi dopo migrazione |
