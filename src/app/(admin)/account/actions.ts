"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateProfile(data: {
  first_name: string;
  last_name: string;
  phone: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non autenticato." };

    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: data.first_name.trim(),
        last_name: data.last_name.trim(),
        phone: data.phone.trim() || null,
      })
      .eq("id", user.id);

    if (error) return { success: false, error: error.message };
    revalidatePath("/account");
    return { success: true };
  } catch {
    return { success: false, error: "Errore imprevisto." };
  }
}
