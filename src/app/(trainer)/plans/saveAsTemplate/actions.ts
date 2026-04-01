"use server";

import { clonePlan } from "@/lib/actions/plans";

export async function saveAsTemplate(
  planId: string
): Promise<{ success: true; templateId: string } | { success: false; error: string }> {
  const result = await clonePlan(planId, { clientId: null });
  if (!result.success) return result;
  return { success: true, templateId: result.planId };
}
