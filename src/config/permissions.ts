export type Role = "admin" | "trainer" | "client";

/**
 * Matrice ruoli / percorsi protetti.
 * Il middleware usa questa mappa per il redirect post-login.
 */
export const roleHomeRoutes: Record<Role, string> = {
  admin: "/dashboard",
  trainer: "/clients",
  client: "/workout",
};

export const protectedRoutesByRole: Record<Role, string[]> = {
  admin: ["/dashboard", "/trainers", "/courses", "/calendar", "/settings"],
  trainer: ["/clients", "/plans", "/exercises", "/schedule"],
  client: ["/workout", "/booking", "/profile"],
};

export function isRouteAllowed(role: Role, pathname: string): boolean {
  const allowed = protectedRoutesByRole[role];
  return allowed.some((prefix) => pathname.startsWith(prefix));
}
