import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS for trusted server-side writes.
// Never expose this key to the browser.
function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.session) {
      const { session, user } = data;

      // Save Google tokens using the service-role client so RLS doesn't block
      // the write (the session cookie hasn't propagated to the request yet).
      const providerToken = session.provider_token;
      const providerRefreshToken = session.provider_refresh_token;
      if (providerToken && providerRefreshToken) {
        const expiresAt = new Date(
          Date.now() + (session.expires_in ?? 3600) * 1000
        ).toISOString();
        const { error: upsertError } = await adminClient()
          .from("google_credentials")
          .upsert(
            {
              user_id: user.id,
              access_token: providerToken,
              refresh_token: providerRefreshToken,
              expires_at: expiresAt,
            },
            { onConflict: "user_id" }
          );
        if (upsertError) {
          console.error("[callback] token upsert failed:", upsertError.message);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
