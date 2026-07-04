import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { BlogPost } from "@/lib/types";
import { AppShell } from "@/components/app-shell";
import { WritingPipeline } from "@/components/writing-pipeline";

export default async function WritingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("display_name").eq("id", user.id).single();

  const { data: posts } = await supabase
    .from("blog_posts")
    .select("*")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  return (
    <AppShell name={profile?.display_name ?? user.email ?? "you"} maxWidth="">
        <header className="mb-6">
          <h1 className="text-2xl font-medium">Writing</h1>
          <p className="mt-1 text-sm text-muted">
            Ideas, drafts, and published pieces — all in one pipeline.
          </p>
        </header>
        <WritingPipeline posts={(posts as BlogPost[]) ?? []} />
      </AppShell>
  );
}
