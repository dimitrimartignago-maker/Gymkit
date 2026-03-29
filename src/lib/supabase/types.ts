/**
 * Tipi del database GymKit.
 * Generabili via: npx supabase gen types typescript --project-id <id> > src/lib/supabase/types.ts
 * Questo file è la versione manuale — sostituire con il generato una volta connesso il progetto.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Role = "admin" | "trainer" | "client";
export type PlanStatus = "draft" | "active" | "archived";
export type BookingStatus = "confirmed" | "waitlist" | "cancelled" | "no_show";

export interface Database {
  public: {
    Tables: {
      gym: {
        Row: {
          id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          primary_color: string;
          secondary_color: string;
          accent_color: string | null;
          timezone: string;
          booking_cancellation_hours: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          logo_url?: string | null;
          primary_color?: string;
          secondary_color?: string;
          accent_color?: string | null;
          timezone?: string;
          booking_cancellation_hours?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          logo_url?: string | null;
          primary_color?: string;
          secondary_color?: string;
          accent_color?: string | null;
          timezone?: string;
          booking_cancellation_hours?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          gym_id: string;
          first_name: string;
          last_name: string;
          email: string;
          phone: string | null;
          avatar_url: string | null;
          role: Role;
          invited_by: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          gym_id: string;
          first_name: string;
          last_name: string;
          email: string;
          phone?: string | null;
          avatar_url?: string | null;
          role: Role;
          invited_by?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          gym_id?: string;
          first_name?: string;
          last_name?: string;
          email?: string;
          phone?: string | null;
          avatar_url?: string | null;
          role?: Role;
          invited_by?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      invitations: {
        Row: {
          id: string;
          gym_id: string;
          invited_by: string;
          token: string;
          role: Role;
          pre_assigned_trainer: string | null;
          email: string | null;
          used_at: string | null;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          gym_id: string;
          invited_by: string;
          token: string;
          role?: Role;
          pre_assigned_trainer?: string | null;
          email?: string | null;
          used_at?: string | null;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          gym_id?: string;
          invited_by?: string;
          token?: string;
          role?: Role;
          pre_assigned_trainer?: string | null;
          email?: string | null;
          used_at?: string | null;
          expires_at?: string;
        };
        Relationships: [];
      };
      trainer_clients: {
        Row: {
          id: string;
          trainer_id: string;
          client_id: string;
          assigned_at: string;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          trainer_id: string;
          client_id: string;
          assigned_at?: string;
          is_active?: boolean;
        };
        Update: {
          trainer_id?: string;
          client_id?: string;
          assigned_at?: string;
          is_active?: boolean;
        };
        Relationships: [];
      };
      exercises: {
        Row: {
          id: string;
          gym_id: string;
          name: string;
          muscle_group: string;
          equipment: string | null;
          description: string | null;
          media_url: string | null;
          thumbnail_url: string | null;
          parent_exercise_id: string | null;
          cloned_from: string | null;
          created_by: string | null;
          is_default: boolean;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          gym_id: string;
          name: string;
          muscle_group: string;
          equipment?: string | null;
          description?: string | null;
          media_url?: string | null;
          thumbnail_url?: string | null;
          parent_exercise_id?: string | null;
          cloned_from?: string | null;
          created_by?: string | null;
          is_default?: boolean;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          gym_id?: string;
          name?: string;
          muscle_group?: string;
          equipment?: string | null;
          description?: string | null;
          media_url?: string | null;
          thumbnail_url?: string | null;
          parent_exercise_id?: string | null;
          cloned_from?: string | null;
          created_by?: string | null;
          is_default?: boolean;
          is_active?: boolean;
        };
        Relationships: [];
      };
      workout_plans: {
        Row: {
          id: string;
          gym_id: string;
          client_id: string;
          trainer_id: string;
          name: string;
          description: string | null;
          version: number;
          status: PlanStatus;
          starts_at: string | null;
          expires_at: string | null;
          previous_version_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          gym_id: string;
          client_id: string;
          trainer_id: string;
          name: string;
          description?: string | null;
          version?: number;
          status?: PlanStatus;
          starts_at?: string | null;
          expires_at?: string | null;
          previous_version_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          gym_id?: string;
          client_id?: string;
          trainer_id?: string;
          name?: string;
          description?: string | null;
          version?: number;
          status?: PlanStatus;
          starts_at?: string | null;
          expires_at?: string | null;
          previous_version_id?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      plan_days: {
        Row: {
          id: string;
          plan_id: string;
          name: string;
          day_order: number;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          plan_id: string;
          name: string;
          day_order: number;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          plan_id?: string;
          name?: string;
          day_order?: number;
          notes?: string | null;
        };
        Relationships: [];
      };
      plan_exercises: {
        Row: {
          id: string;
          plan_day_id: string;
          exercise_id: string;
          exercise_order: number;
          sets: number;
          reps: string;
          rest_seconds: number | null;
          load_prescription: string | null;
          notes: string | null;
          superset_group: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          plan_day_id: string;
          exercise_id: string;
          exercise_order: number;
          sets: number;
          reps: string;
          rest_seconds?: number | null;
          load_prescription?: string | null;
          notes?: string | null;
          superset_group?: string | null;
          created_at?: string;
        };
        Update: {
          plan_day_id?: string;
          exercise_id?: string;
          exercise_order?: number;
          sets?: number;
          reps?: string;
          rest_seconds?: number | null;
          load_prescription?: string | null;
          notes?: string | null;
          superset_group?: string | null;
        };
        Relationships: [];
      };
      workout_logs: {
        Row: {
          id: string;
          client_id: string;
          plan_id: string;
          plan_day_id: string;
          started_at: string;
          completed_at: string | null;
          overall_notes: string | null;
          overall_rating: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          plan_id: string;
          plan_day_id: string;
          started_at?: string;
          completed_at?: string | null;
          overall_notes?: string | null;
          overall_rating?: number | null;
          created_at?: string;
        };
        Update: {
          client_id?: string;
          plan_id?: string;
          plan_day_id?: string;
          started_at?: string;
          completed_at?: string | null;
          overall_notes?: string | null;
          overall_rating?: number | null;
        };
        Relationships: [];
      };
      workout_log_sets: {
        Row: {
          id: string;
          workout_log_id: string;
          plan_exercise_id: string;
          set_number: number;
          reps_done: number | null;
          load_used: number | null;
          load_unit: string;
          rpe: number | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workout_log_id: string;
          plan_exercise_id: string;
          set_number: number;
          reps_done?: number | null;
          load_used?: number | null;
          load_unit?: string;
          rpe?: number | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          workout_log_id?: string;
          plan_exercise_id?: string;
          set_number?: number;
          reps_done?: number | null;
          load_used?: number | null;
          load_unit?: string;
          rpe?: number | null;
          notes?: string | null;
        };
        Relationships: [];
      };
      courses: {
        Row: {
          id: string;
          gym_id: string;
          name: string;
          description: string | null;
          color: string | null;
          max_capacity: number;
          default_duration_minutes: number;
          trainer_id: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          gym_id: string;
          name: string;
          description?: string | null;
          color?: string | null;
          max_capacity: number;
          default_duration_minutes?: number;
          trainer_id?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          gym_id?: string;
          name?: string;
          description?: string | null;
          color?: string | null;
          max_capacity?: number;
          default_duration_minutes?: number;
          trainer_id?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      class_slots: {
        Row: {
          id: string;
          course_id: string;
          trainer_id: string | null;
          starts_at: string;
          ends_at: string;
          max_capacity_override: number | null;
          is_cancelled: boolean;
          cancellation_reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          trainer_id?: string | null;
          starts_at: string;
          ends_at: string;
          max_capacity_override?: number | null;
          is_cancelled?: boolean;
          cancellation_reason?: string | null;
          created_at?: string;
        };
        Update: {
          course_id?: string;
          trainer_id?: string | null;
          starts_at?: string;
          ends_at?: string;
          max_capacity_override?: number | null;
          is_cancelled?: boolean;
          cancellation_reason?: string | null;
        };
        Relationships: [];
      };
      bookings: {
        Row: {
          id: string;
          class_slot_id: string;
          client_id: string;
          status: BookingStatus;
          waitlist_position: number | null;
          booked_at: string;
          cancelled_at: string | null;
        };
        Insert: {
          id?: string;
          class_slot_id: string;
          client_id: string;
          status?: BookingStatus;
          waitlist_position?: number | null;
          booked_at?: string;
          cancelled_at?: string | null;
        };
        Update: {
          class_slot_id?: string;
          client_id?: string;
          status?: BookingStatus;
          waitlist_position?: number | null;
          booked_at?: string;
          cancelled_at?: string | null;
        };
        Relationships: [];
      };
      course_schedules: {
        Row: {
          id: string;
          course_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          trainer_id: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          trainer_id?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          course_id?: string;
          day_of_week?: number;
          start_time?: string;
          end_time?: string;
          trainer_id?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      custom_roles: {
        Row: {
          id: string;
          gym_id: string;
          name: string;
          permissions: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          gym_id: string;
          name: string;
          permissions?: Json;
          created_at?: string;
        };
        Update: {
          gym_id?: string;
          name?: string;
          permissions?: Json;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
