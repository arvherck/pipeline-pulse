import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/board", label: "Board" },

  { to: "/table", label: "Table" },
  { to: "/import", label: "Import data" },
  { to: "/settings", label: "Settings" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-1.5 md:h-11 md:flex-nowrap md:gap-6 md:py-0">
          <span className="shrink-0 text-sm font-semibold tracking-tight">Pipeline Tracker</span>
          <nav className="flex min-w-0 flex-wrap items-center gap-1">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded px-2.5 py-1 text-[13px] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground data-[status=active]:bg-accent data-[status=active]:text-accent-foreground data-[status=active]:font-medium"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <LastImportNote variant="short" className="hidden lg:inline" />
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-7 shrink-0 text-xs text-muted-foreground"
            onClick={signOut}
          >
            Sign out
          </Button>
        </div>
      </header>

      <main className="px-4 py-4">{children}</main>
    </div>
  );
}
