import type { SupabaseClient } from "@supabase/supabase-js";
import type { CalendarEvent } from "@/lib/types";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
const GOOGLE_CLIENT_SECRET = process.env.SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET ?? "";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

interface StoredCredentials {
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

async function refreshAccessToken(
  refreshToken: string
): Promise<{ access_token: string; expires_at: string } | null> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) return null;
  const json = await res.json();
  return {
    access_token: json.access_token,
    expires_at: new Date(Date.now() + json.expires_in * 1000).toISOString(),
  };
}

export async function fetchTodayEvents(
  supabase: SupabaseClient,
  userId: string,
  timeMin: string,
  timeMax: string,
  timeZone: string
): Promise<CalendarEvent[]> {
  const { data: creds } = await supabase
    .from("google_credentials")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .single<StoredCredentials>();

  if (!creds) return [];

  let accessToken = creds.access_token;

  // Refresh if expired (with a 60s buffer).
  if (new Date(creds.expires_at).getTime() - 60_000 < Date.now()) {
    const refreshed = await refreshAccessToken(creds.refresh_token);
    if (!refreshed) return [];
    accessToken = refreshed.access_token;
    await supabase
      .from("google_credentials")
      .update({ access_token: refreshed.access_token, expires_at: refreshed.expires_at })
      .eq("user_id", userId);
  }

  const params = new URLSearchParams({
    timeMin,
    timeMax,
    timeZone,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "20",
  });

  const res = await fetch(`${CALENDAR_API}/calendars/primary/events?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    next: { revalidate: 0 },
  });

  if (!res.ok) return [];

  const json = await res.json();
  return (json.items ?? []).map(
    (item: {
      id: string;
      summary?: string;
      start: { dateTime?: string; date?: string };
      end: { dateTime?: string; date?: string };
      location?: string;
    }): CalendarEvent => ({
      id: item.id,
      title: item.summary ?? "(No title)",
      start: item.start.dateTime ?? item.start.date ?? "",
      end: item.end.dateTime ?? item.end.date ?? "",
      allDay: !item.start.dateTime,
      location: item.location,
    })
  );
}
