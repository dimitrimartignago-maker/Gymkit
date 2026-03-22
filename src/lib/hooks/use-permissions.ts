"use client";

import type { Role } from "@/config/permissions";
import { isRouteAllowed } from "@/config/permissions";
import { usePathname } from "next/navigation";

// Placeholder — il ruolo reale viene letto dal profilo Supabase
export function usePermissions(role: Role) {
  const pathname = usePathname();
  return {
    canAccess: (path?: string) => isRouteAllowed(role, path ?? pathname),
  };
}
