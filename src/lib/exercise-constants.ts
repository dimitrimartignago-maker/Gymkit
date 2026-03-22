export const MUSCLE_GROUPS = [
  { value: "petto",        label: "Petto" },
  { value: "dorso",        label: "Dorso" },
  { value: "quadricipiti", label: "Quadricipiti" },
  { value: "femorali",     label: "Femorali" },
  { value: "glutei",       label: "Glutei" },
  { value: "spalle",       label: "Spalle" },
  { value: "bicipiti",     label: "Bicipiti" },
  { value: "tricipiti",    label: "Tricipiti" },
  { value: "avambracci",   label: "Avambracci" },
  { value: "core",         label: "Core" },
  { value: "cardio",       label: "Cardio" },
  { value: "full_body",    label: "Full Body" },
  { value: "gambe",        label: "Gambe" },
] as const;

export const EQUIPMENT_OPTIONS = [
  { value: "bilanciere",   label: "Bilanciere" },
  { value: "manubri",      label: "Manubri" },
  { value: "cavi",         label: "Cavi" },
  { value: "macchina",     label: "Macchina" },
  { value: "corpo_libero", label: "Corpo Libero" },
  { value: "kettlebell",   label: "Kettlebell" },
  { value: "elastici",     label: "Elastici" },
  { value: "trx",          label: "TRX" },
  { value: "sbarra",       label: "Sbarra" },
  { value: "panca",        label: "Panca" },
  { value: "nessuno",      label: "Nessuno" },
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number]["value"];
export type Equipment = (typeof EQUIPMENT_OPTIONS)[number]["value"];
