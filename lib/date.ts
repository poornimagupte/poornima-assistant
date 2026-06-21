// Returns the [start, end) ISO bounds of "today" in the given IANA timezone.
// Used to query tasks due today regardless of where the server runs.
export function todayRange(timeZone = "Asia/Kolkata"): {
  startISO: string;
  endISO: string;
} {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  const dayStr = `${get("year")}-${get("month")}-${get("day")}`;

  // Midnight today and midnight tomorrow, interpreted in the user's tz.
  const start = new Date(`${dayStr}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { startISO: start.toISOString(), endISO: end.toISOString() };
}

export function formatTime(iso: string, timeZone = "Asia/Kolkata"): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}
