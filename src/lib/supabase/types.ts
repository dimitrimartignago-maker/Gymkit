/**
 * Tipi generati da Supabase CLI.
 * Eseguire: npx supabase gen types typescript --project-id <id> > src/lib/supabase/types.ts
 *
 * Placeholder finché il DB non è provisioned.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
