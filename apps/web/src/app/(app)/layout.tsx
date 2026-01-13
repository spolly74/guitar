import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  MusicNote,
  CalendarCheck,
  Path,
  ClockCounterClockwise,
  Gear,
  SignOut,
} from "@phosphor-icons/react/dist/ssr";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/today-v2", label: "Today", icon: CalendarCheck },
  { href: "/learning-paths", label: "Paths", icon: Path },
  { href: "/history", label: "History", icon: ClockCounterClockwise },
  { href: "/settings", label: "Settings", icon: Gear },
];

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-8">
            <Link
              href="/today-v2"
              className="flex items-center gap-2 text-foreground"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <MusicNote weight="bold" className="h-4 w-4" />
              </div>
              <span className="font-semibold tracking-tight">Practice</span>
            </Link>
            <nav className="hidden items-center gap-1 sm:flex">
              {NAV.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground-muted transition-colors hover:bg-background-subtle hover:text-foreground"
                  >
                    <Icon weight="regular" className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-foreground-muted sm:inline">
              {data.user.email}
            </span>
            <form action="/auth/signout" method="post">
              <button
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground-muted transition-colors hover:bg-background-subtle hover:text-foreground"
                type="submit"
              >
                <SignOut weight="regular" className="h-4 w-4" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
