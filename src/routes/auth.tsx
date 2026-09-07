import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · Pipeline Tracker" },
      { name: "description", content: "Sign in to the internal Pipeline Tracker." },
      { property: "og:title", content: "Sign in · Pipeline Tracker" },
      { property: "og:description", content: "Sign in to the internal Pipeline Tracker." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);

  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate({ to: "/board" });
  }

  async function createAccount() {
    if (!email || password.length < 8) {
      toast.error("Enter an email and a password of at least 8 characters.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account created — signing you in.");
    navigate({ to: "/board" });
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3"><span className="size-3 bg-primary" /><div><div className="tech-label text-primary">System access // ops 01</div><h1 className="font-display text-3xl font-bold uppercase">Pipeline Tracker</h1></div></div>
        <p className="text-sm text-muted-foreground">Internal access only.</p>

        <form onSubmit={signIn} className="tech-panel mt-6 space-y-4 border-t-2 border-t-primary p-5">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <div className="mt-4 text-xs text-muted-foreground">
          {setupOpen ? (
            <div className="tech-panel p-4">
              <p>
                First-time setup only: enter the email and password above, then create the single
                account for this tool.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                disabled={busy}
                onClick={createAccount}
              >
                Create the account
              </Button>
            </div>
          ) : (
            <button
              type="button"
              className="underline underline-offset-2 hover:text-foreground"
              onClick={() => setSetupOpen(true)}
            >
              First time here? Set up the account
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
