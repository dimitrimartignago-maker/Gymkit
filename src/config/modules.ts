/**
 * Registry dei moduli attivi per questa istanza GymKit.
 * Disabilita un modulo impostando il valore a false — le route
 * corrispondenti vengono gestite dal middleware.
 */
export const modules = {
  workoutPlans: true,   // Schede Allenamento
  booking: true,        // Booking Corsi
} as const;

export type ModuleKey = keyof typeof modules;
