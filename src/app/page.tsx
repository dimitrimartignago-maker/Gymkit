import { redirect } from "next/navigation";

// Root redirect — middleware handles role-based routing after auth check
export default function RootPage() {
  redirect("/workout");
}
