// Ravelry read-only API helper (Basic Auth, personal app key).
// All calls are server-side only — credentials never reach the browser.

const BASE = "https://api.ravelry.com";
const RAVELRY_USER = process.env.RAVELRY_USER ?? "";

function authHeader() {
  const token = Buffer.from(
    `${process.env.RAVELRY_USERNAME}:${process.env.RAVELRY_PASSWORD}`
  ).toString("base64");
  return { Authorization: `Basic ${token}`, Accept: "application/json" };
}

async function get<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { headers: authHeader(), next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`Ravelry ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

async function fetchAllPages<T>(
  path: string,
  dataKey: string,
  extraParams: Record<string, string> = {}
): Promise<T[]> {
  const results: T[] = [];
  let page = 1;
  while (true) {
    const data = await get<Record<string, unknown>>(path, {
      ...extraParams,
      page: String(page),
      page_size: "100",
    });
    const items = (data[dataKey] as T[]) ?? [];
    results.push(...items);
    const paginator = data.paginator as { last_page?: number } | undefined;
    if (!paginator || page >= (paginator.last_page ?? 1)) break;
    page++;
  }
  return results;
}

// ─── API shapes ──────────────────────────────────────────────────────────────

interface RPhoto { medium_url: string }

interface RPattern {
  id: number;
  name: string;
  permalink: string;
  first_photo?: RPhoto;
}

interface RProject {
  id: number;
  name: string;
  status_name: string | null;
  pattern_name?: string | null;
  first_photo?: RPhoto;
  links?: { self?: { href?: string } };
}

interface RFavorite {
  id: number;
  favorited: {
    name: string;
    permalink?: string;
    first_photo?: RPhoto;
  };
}

// ─── normalised shape ────────────────────────────────────────────────────────

export interface RavelryImportItem {
  external_id: string;
  kind: "pattern" | "project" | "idea";
  title: string;
  status: "saved" | "queued" | "making" | "finished";
  source_url: string | null;
  image_url: string | null;
  yarn: string | null;
  notes: string | null;
}

function projectStatus(s: string | null): "saved" | "queued" | "making" | "finished" {
  const v = (s ?? "").toLowerCase();
  if (v === "finished" || v === "completed") return "finished";
  if (v.includes("progress")) return "making";
  if (v === "queued" || v === "planned") return "queued";
  return "saved";
}

// ─── fetchers ────────────────────────────────────────────────────────────────

export async function fetchRavelryLibrary(): Promise<RavelryImportItem[]> {
  const patterns = await fetchAllPages<RPattern>(
    "/patterns/search.json",
    "patterns",
    { personal_attributes: "library" }
  );
  return patterns.map((p): RavelryImportItem => ({
    external_id: `pattern-${p.id}`,
    kind: "pattern",
    title: p.name,
    status: "saved",
    source_url: `https://www.ravelry.com/patterns/library/${p.permalink}`,
    image_url: p.first_photo?.medium_url ?? null,
    yarn: null,
    notes: null,
  }));
}

export async function fetchRavelryProjects(): Promise<RavelryImportItem[]> {
  const projects = await fetchAllPages<RProject>(
    `/projects/${RAVELRY_USER}/list.json`,
    "projects"
  );
  return projects.map((p): RavelryImportItem => ({
    external_id: `project-${p.id}`,
    kind: "project",
    title: p.name,
    status: projectStatus(p.status_name),
    source_url: p.links?.self?.href ?? null,
    image_url: p.first_photo?.medium_url ?? null,
    yarn: null,
    notes: p.pattern_name ? `Pattern: ${p.pattern_name}` : null,
  }));
}

export async function fetchRavelryFavorites(): Promise<RavelryImportItem[]> {
  const favorites = await fetchAllPages<RFavorite>(
    `/people/${RAVELRY_USER}/favorites/list.json`,
    "favorites",
    { type: "pattern" }
  );
  return favorites.map((f): RavelryImportItem => ({
    external_id: `fav-${f.id}`,
    kind: "idea",
    title: f.favorited.name,
    status: "saved",
    source_url: f.favorited.permalink
      ? `https://www.ravelry.com/patterns/library/${f.favorited.permalink}`
      : null,
    image_url: f.favorited.first_photo?.medium_url ?? null,
    yarn: null,
    notes: null,
  }));
}
