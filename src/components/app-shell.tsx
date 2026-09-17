import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LastImportNote } from "@/components/last-import-note";
import { pipelineQueryOptions } from "@/lib/use-pipeline";


const NAV = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/board", label: "Board" },

  { to: "/table", label: "Table" },
  { to: "/actions", label: "Actions" },
  { to: "/import", label: "Import data" },
  { to: "/settings", label: "Settings" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data } = useQuery(pipelineQueryOptions);
  const isTest = data?.workspace === "test";

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      {isTest ? (
        <div
          role="status"
          className="border-b-2 border-amber-500/60 bg-amber-500/15 px-5 py-2 text-center font-display text-xs font-semibold uppercase tracking-wide text-amber-900 lg:px-8"
        >
          Test environment — this is not your real data.
        </div>
      ) : null}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-5 gap-y-2 px-5 py-2.5 md:min-h-16 md:flex-nowrap lg:px-8">
          <div className="mr-1 flex shrink-0 items-center gap-3">
            <span className="relative flex size-3 items-center justify-center" aria-hidden>
              <span className="absolute size-3 animate-ping rounded-full bg-primary/20" />
              <span className="size-2 bg-primary" />
            </span>
            <div>
              <span className="flex items-center gap-2 font-display text-base font-bold uppercase leading-none">
                Pipeline Tracker
                {isTest ? (
                  <span className="border border-amber-500/70 bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-900">
                    Test
                  </span>
                ) : null}
              </span>
              <span className="tech-label text-primary">System online // ops 01</span>
            </div>
          </div>
          <nav className="flex min-w-0 flex-wrap items-center gap-1" aria-label="Main navigation">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="relative px-2.5 py-2 font-display text-xs font-semibold uppercase text-muted-foreground transition-colors hover:text-foreground data-[status=active]:text-primary data-[status=active]:after:absolute data-[status=active]:after:inset-x-2.5 data-[status=active]:after:-bottom-2.5 data-[status=active]:after:h-0.5 data-[status=active]:after:bg-primary"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <LastImportNote variant="short" className="hidden lg:inline" />
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto size-8 shrink-0 text-muted-foreground"
            onClick={signOut}
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut />
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1600px] space-y-5 px-5 py-6 lg:px-8">{children}</main>
    </div>
  );
}
