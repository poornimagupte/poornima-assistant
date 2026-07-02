"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Pencil, Trash2, X, ExternalLink, Upload, Tag } from "lucide-react";
import type { StashItem } from "@/lib/types";
import { addStashItem, updateStashItem, deleteStashItem } from "@/app/actions";
import { createClient } from "@/lib/supabase/client";
import { parseEnex } from "@/lib/enex";
import { ExternalAnchor } from "@/components/external-link";

// ─── add / edit form ─────────────────────────────────────────────────────────

function StashForm({ item, onClose }: { item?: StashItem; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const isEdit = !!item;

  return (
    <form
      action={(fd) => startTransition(async () => {
        if (isEdit) await updateStashItem(fd);
        else await addStashItem(fd);
        onClose();
      })}
      className="card p-4 space-y-3 mb-4"
    >
      {isEdit && <input type="hidden" name="id" value={item.id} />}
      <h3 className="text-sm font-medium">{isEdit ? "Edit" : "Add to stash"}</h3>

      <div className="space-y-2">
        <div>
          <label className="label">Title</label>
          <input name="title" defaultValue={item?.title ?? ""} required
            placeholder="What is this?" className="input w-full" />
        </div>
        <div>
          <label className="label">Body (markdown)</label>
          <textarea name="body" defaultValue={item?.body ?? ""} rows={5}
            placeholder="The thing itself — snippet, quote, instructions…"
            className="input w-full resize-y" />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <label className="label">Source URL (optional)</label>
            <input name="source_url" type="url" defaultValue={item?.source_url ?? ""}
              placeholder="https://…" className="input w-full" />
          </div>
          <div>
            <label className="label">Tags (comma separated)</label>
            <input name="tags" defaultValue={item?.tags.join(", ") ?? ""}
              placeholder="recipes, ai, travel" className="input w-full" />
          </div>
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Saving…" : isEdit ? "Save" : "Add"}
        </button>
      </div>
    </form>
  );
}

// ─── Evernote import ─────────────────────────────────────────────────────────

const BATCH_SIZE = 100;

function EvernoteImport({ onDone }: { onDone: () => void }) {
  const [state, setState] = useState<
    | { phase: "idle" }
    | { phase: "parsing" }
    | { phase: "confirm"; count: number; xml: string }
    | { phase: "importing"; done: number; total: number }
    | { phase: "finished"; count: number }
    | { phase: "error"; message: string }
  >({ phase: "idle" });
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setState({ phase: "parsing" });
    try {
      const xml = await file.text();
      const notes = parseEnex(xml);
      if (notes.length === 0) {
        setState({ phase: "error", message: "No notes found in this file." });
        return;
      }
      setState({ phase: "confirm", count: notes.length, xml });
    } catch (e) {
      setState({ phase: "error", message: (e as Error).message });
    }
  }

  async function runImport(xml: string) {
    const notes = parseEnex(xml);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setState({ phase: "error", message: "Not signed in." });
      return;
    }

    setState({ phase: "importing", done: 0, total: notes.length });

    for (let i = 0; i < notes.length; i += BATCH_SIZE) {
      const batch = notes.slice(i, i + BATCH_SIZE).map((n) => ({
        user_id: user.id,
        title: n.title,
        body: n.body || null,
        source_url: n.sourceUrl,
        tags: n.tags,
        source: "evernote" as const,
        created_at: n.createdAt,
      }));
      const { error } = await supabase.from("stash_items").insert(batch);
      if (error) {
        setState({ phase: "error", message: `Import failed at note ${i + 1}: ${error.message}` });
        return;
      }
      setState({ phase: "importing", done: Math.min(i + BATCH_SIZE, notes.length), total: notes.length });
    }

    setState({ phase: "finished", count: notes.length });
    onDone();
  }

  return (
    <div className="card p-4 mb-4 space-y-3">
      <h3 className="text-sm font-medium">Import from Evernote</h3>

      {state.phase === "idle" && (
        <>
          <p className="text-xs text-muted">
            In Evernote: select notes (or a whole notebook) → File → Export → save as <code>.enex</code>.
            Titles, content, tags, dates and source URLs all come through.
          </p>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-4 py-6 justify-center text-sm text-muted hover:border-border-strong hover:bg-surface-2 transition-colors">
            <Upload size={16} strokeWidth={1.75} />
            Choose .enex file…
            <input
              ref={fileRef}
              type="file"
              accept=".enex,application/xml,text/xml"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </label>
        </>
      )}

      {state.phase === "parsing" && <p className="text-sm text-muted">Reading file…</p>}

      {state.phase === "confirm" && (
        <div className="space-y-2">
          <p className="text-sm">
            Found <strong>{state.count.toLocaleString()} notes</strong>. Import them all into your stash?
          </p>
          <div className="flex gap-2">
            <button onClick={() => runImport(state.xml)} className="btn-primary text-sm">
              Import {state.count.toLocaleString()} notes
            </button>
            <button onClick={() => setState({ phase: "idle" })} className="btn-ghost text-sm">Cancel</button>
          </div>
        </div>
      )}

      {state.phase === "importing" && (
        <div className="space-y-2">
          <p className="text-sm text-muted">Importing… {state.done.toLocaleString()} / {state.total.toLocaleString()}</p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full bg-accent transition-all"
              style={{ width: `${(state.done / state.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {state.phase === "finished" && (
        <p className="text-sm text-accent">✓ Imported {state.count.toLocaleString()} notes. Refresh to see them.</p>
      )}

      {state.phase === "error" && (
        <div className="space-y-2">
          <p className="text-sm text-red-500">{state.message}</p>
          <button onClick={() => setState({ phase: "idle" })} className="btn-ghost text-sm">Try again</button>
        </div>
      )}
    </div>
  );
}

// ─── single card ─────────────────────────────────────────────────────────────

function StashCard({ item, onTagClick }: { item: StashItem; onTagClick: (t: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [, startTransition] = useTransition();

  if (editing) return <StashForm item={item} onClose={() => setEditing(false)} />;

  const body = item.body ?? "";
  const isLong = body.length > 280;
  const preview = expanded || !isLong ? body : body.slice(0, 280) + "…";

  return (
    <div className="card p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug">{item.title}</p>
        <span className="shrink-0 text-xs text-faint">
          {new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" })
            .format(new Date(item.created_at))}
        </span>
      </div>

      {body && (
        <p
          className="text-xs text-muted whitespace-pre-wrap leading-relaxed cursor-pointer"
          onClick={() => isLong && setExpanded((v) => !v)}
        >
          {preview}
          {isLong && !expanded && <span className="text-accent ml-1">more</span>}
        </p>
      )}

      <div className="flex items-center gap-1.5 flex-wrap pt-1">
        {item.tags.map((t) => (
          <button
            key={t}
            onClick={() => onTagClick(t)}
            className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted hover:text-accent"
          >
            {t}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-0.5">
          {item.source_url && (
            <ExternalAnchor href={item.source_url}
              className="rounded p-1.5 text-faint hover:text-accent">
              <ExternalLink size={13} strokeWidth={1.75} />
            </ExternalAnchor>
          )}
          <button onClick={() => setEditing(true)}
            className="rounded p-1.5 text-faint hover:text-text">
            <Pencil size={13} strokeWidth={1.75} />
          </button>
          {confirmDelete ? (
            <>
              <form action={(fd) => startTransition(() => deleteStashItem(fd))}>
                <input type="hidden" name="id" value={item.id} />
                <button type="submit" className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50">Delete</button>
              </form>
              <button onClick={() => setConfirmDelete(false)} className="rounded px-2 py-1 text-xs text-muted">Cancel</button>
            </>
          ) : (
            <button onClick={() => setConfirmDelete(true)}
              className="rounded p-1.5 text-faint hover:text-red-500">
              <Trash2 size={13} strokeWidth={1.75} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── board ───────────────────────────────────────────────────────────────────

export function StashBoard({
  items,
  totalCount,
  allTags,
  activeQuery,
  activeTag,
}: {
  items: StashItem[];
  totalCount: number;
  allTags: string[];
  activeQuery: string;
  activeTag: string;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);

  function navigate(q: string, tag: string) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (tag) params.set("tag", tag);
    router.push(`/stash${params.toString() ? "?" + params.toString() : ""}`);
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-4 flex items-center gap-2 flex-wrap">
        <form
          action={(fd) => navigate(String(fd.get("q") ?? ""), activeTag)}
          className="flex flex-1 min-w-[200px] items-center gap-2 rounded-lg bg-surface-2 px-3 py-2"
        >
          <Search size={15} strokeWidth={1.75} className="text-faint shrink-0" />
          <input
            name="q"
            defaultValue={activeQuery}
            placeholder="Search your stash…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-faint"
          />
          {activeQuery && (
            <button type="button" onClick={() => navigate("", activeTag)}
              className="text-faint hover:text-text">
              <X size={14} strokeWidth={1.75} />
            </button>
          )}
        </form>

        <button onClick={() => { setImporting(v => !v); setAdding(false); }}
          className="btn-ghost flex items-center gap-1.5 border border-border rounded-lg">
          <Upload size={14} strokeWidth={1.75} />
          Evernote
        </button>
        <button onClick={() => { setAdding(v => !v); setImporting(false); }}
          className="btn-primary flex items-center gap-1.5">
          {adding ? <X size={15} strokeWidth={1.75} /> : <Plus size={15} strokeWidth={1.75} />}
          {adding ? "Cancel" : "Add"}
        </button>
      </div>

      {/* Tag filter row */}
      {allTags.length > 0 && (
        <div className="mb-4 flex items-center gap-1.5 flex-wrap">
          <Tag size={13} strokeWidth={1.75} className="text-faint" />
          {activeTag && (
            <button onClick={() => navigate(activeQuery, "")}
              className="rounded-full bg-accent-soft text-accent px-2.5 py-0.5 text-xs font-medium flex items-center gap-1">
              {activeTag} <X size={11} strokeWidth={2} />
            </button>
          )}
          {allTags.filter(t => t !== activeTag).slice(0, 20).map((t) => (
            <button key={t} onClick={() => navigate(activeQuery, t)}
              className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs text-muted hover:text-accent">
              {t}
            </button>
          ))}
        </div>
      )}

      {importing && <EvernoteImport onDone={() => router.refresh()} />}
      {adding && <StashForm onClose={() => setAdding(false)} />}

      {/* Result count */}
      <p className="mb-3 text-xs text-faint">
        {totalCount.toLocaleString()} item{totalCount !== 1 ? "s" : ""}
        {(activeQuery || activeTag) && " matching"}
        {totalCount > items.length && ` — showing first ${items.length}`}
      </p>

      {/* Cards */}
      {items.length === 0 ? (
        <p className="py-16 text-center text-sm text-faint">
          {activeQuery || activeTag ? "Nothing matches. Try a different search." : "Your stash is empty. Add something or import from Evernote."}
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <StashCard key={item.id} item={item} onTagClick={(t) => navigate(activeQuery, t)} />
          ))}
        </div>
      )}
    </div>
  );
}
