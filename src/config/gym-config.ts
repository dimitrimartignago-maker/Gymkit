export const gymConfig = {
  name: process.env.NEXT_PUBLIC_GYM_NAME ?? "GymKit",
  slug: process.env.NEXT_PUBLIC_GYM_SLUG ?? "gymkit",
  primaryColor: process.env.NEXT_PUBLIC_GYM_PRIMARY_COLOR ?? "#1A1A2E",
  secondaryColor: process.env.NEXT_PUBLIC_GYM_SECONDARY_COLOR ?? "#FFFFFF",
  accentColor: process.env.NEXT_PUBLIC_GYM_ACCENT_COLOR ?? "#E94560",
  timezone: process.env.NEXT_PUBLIC_GYM_TIMEZONE ?? "Europe/Rome",
  bookingCancellationHours: Number(
    process.env.NEXT_PUBLIC_GYM_CANCELLATION_HOURS ?? 2
  ),
} as const;

export type GymConfig = typeof gymConfig;
