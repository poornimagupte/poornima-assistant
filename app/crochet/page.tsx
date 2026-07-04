import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CrochetItem } from "@/lib/types";
import { AppShell } from "@/components/app-shell";
import { CrochetBoard } from "@/components/crochet-board";

export default async function CrochetPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("display_name").eq("id", user.id).single();

  const { data: items } = await supabase
    .from("crochet_items")
    .select("*")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  return (
    <AppShell name={profile?.display_name ?? user.email ?? "you"} maxWidth="max-w-5xl">
        <header className="mb-6">
          <h1 className="text-2xl font-medium">Crochet</h1>
          <p className="mt-1 text-sm text-muted">
            Patterns, projects, and ideas — all in one place.
          </p>
        </header>
        <CrochetBoard items={(items as CrochetItem[]) ?? []} />
      </AppShell>
  );
}
