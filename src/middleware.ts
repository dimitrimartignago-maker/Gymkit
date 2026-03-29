import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { roleHomeRoutes, type Role } from "@/config/permissions";

const PUBLIC_ROUTES = ["/login", "/register"];

// Mappa prefisso-route → ruolo richiesto
const ROUTE_ROLE_MAP: Record<string, Role> = {
  "/dashboard": "admin",
  "/trainers": "admin",
  "/courses": "admin",
  "/settings": "admin",
  "/account": "admin",
  "/clients": "trainer",
  "/plans": "trainer",
  "/exercises": "trainer",
  "/schedule": "trainer",
  "/workout": "client",
  "/booking": "client",
  "/profile": "client",
};

function requiredRoleForPath(pathname: string): Role | null {
  for (const [prefix, role] of Object.entries(ROUTE_ROLE_MAP)) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) return role;
  }
  return null;
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANTE: usare getUser() — non getSession() — per validare il JWT lato server
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));

  // Non autenticato su route protetta → login
  if (!user && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const userRole = (profile?.role ?? "client") as Role;

    // Autenticato su route pubblica → home per ruolo
    if (isPublic) {
      return NextResponse.redirect(new URL(roleHomeRoutes[userRole], request.url));
    }

    // Accesso cross-ruolo → redirect alla home del ruolo corretto
    const required = requiredRoleForPath(pathname);
    if (required && required !== userRole) {
      return NextResponse.redirect(new URL(roleHomeRoutes[userRole], request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|workbox-.*).*)",
  ],
};
