"use client";

import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  async function signInWithGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: "https://www.googleapis.com/auth/calendar.readonly",
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="card w-full max-w-sm p-8 text-center">
        <h1 className="text-2xl font-medium">Poornima's Assistant</h1>
        <p className="mt-2 text-sm text-muted">
          Your calendar, tasks, hobbies, and household — one quiet screen.
        </p>
        <button
          onClick={signInWithGoogle}
          className="mt-7 w-full rounded-lg border border-border-strong px-4 py-2.5 text-sm font-medium hover:bg-surface-2 transition-colors"
        >
          Continue with Google
        </button>
      </div>
    </main>
  );
}
