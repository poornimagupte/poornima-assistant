import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { StashItem } from "@/lib/types";
import { Sidebar } from "@/components/sidebar";
import { StashBoard } from "@/components/stash-board";

const PAGE_SIZE = 50;

export default async function StashPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string }>;
}) {
  const { q, tag } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("display_name").eq("id", user.id).single();

  let query = supabase
    .from("stash_items")
    .select("*", { count: "exact" })
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

  if (q) query = query.textSearch("fts", q, { type: "websearch" });
  if (tag) query = query.contains("tags", [tag]);

  const { data: items, count } = await query;

  // Distinct tags for the filter row (from a capped sample to stay fast).
  const { data: tagRows } = await supabase
    .from("stash_items")
    .select("tags")
    .is("deleted_at", null)
    .limit(1000);
  const allTags = [...new Set((tagRows ?? []).flatMap((r) => r.tags as string[]))].sort();

  return (
    <div className="min-h-screen flex">
      <Sidebar name={profile?.display_name ?? user.email ?? "you"} />
      <main className="flex-1 px-6 py-8 md:px-10 max-w-4xl">
        <header className="mb-6">
          <h1 className="text-2xl font-medium">Stash</h1>
          <p className="mt-1 text-sm text-muted">
            Things you want to find again — flat, searchable, no folders.
          </p>
        </header>
        <StashBoard
          items={(items as StashItem[]) ?? []}
          totalCount={count ?? 0}
          allTags={allTags}
          activeQuery={q ?? ""}
          activeTag={tag ?? ""}
        />
      </main>
    </div>
  );
}
