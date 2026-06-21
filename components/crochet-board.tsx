"use client";

import { useState, useTransition, useRef } from "react";
import { Plus, ExternalLink, Pencil, Trash2, X, RefreshCw, Image, FileText, Upload } from "lucide-react";
import { ExternalAnchor } from "@/components/external-link";
import type { CrochetItem, CrochetKind, CrochetStatus } from "@/lib/types";
import { addCrochetItem, updateCrochetItem, deleteCrochetItem, syncRavelry } from "@/app/actions";
import { createClient } from "@/lib/supabase/client";

// ─── constants ───────────────────────────────────────────────────────────────

const KIND_LABELS: Record<CrochetKind, string> = {
  pattern: "Pattern",
  idea: "Idea",
  project: "Project",
};

const STATUS_LABELS: Record<CrochetStatus, string> = {
  saved: "Saved",
  queued: "Queued",
  making: "Making",
  finished: "Finished",
};

const STATUS_COLORS: Record<CrochetStatus, string> = {
  saved: "text-faint bg-surface-2",
  queued: "text-sky-600 bg-sky-50",
  making: "text-accent bg-accent-soft",
  finished: "text-muted bg-surface-2 line-through",
};

type Tab = "projects" | "patterns" | "ideas";

// ─── item form ───────────────────────────────────────────────────────────────

function ItemForm({
  defaultKind,
  item,
  patterns,
  onClose,
}: {
  defaultKind: CrochetKind;
  item?: CrochetItem;
  patterns: CrochetItem[];
  onClose: () => void;
}) {
  const [kind, setKind] = useState<CrochetKind>(item?.kind ?? defaultKind);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const isEdit = !!item;
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(item?.image_url ?? null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [etsyMode, setEtsyMode] = useState(false);
  const [etsyUrl, setEtsyUrl] = useState("");
  const [fetchedImage, setFetchedImage] = useState<string | null>(null);
  const [fetchingImage, setFetchingImage] = useState(false);

  function handleImageFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setFetchedImage(null);
  }

  async function uploadFile(userId: string, file: File, folder: string): Promise<string | null> {
    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `${userId}/${folder}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("patterns").upload(path, file);
    if (error) { console.error("Upload failed:", error.message); return null; }
    const { data } = await supabase.storage.from("patterns").createSignedUrl(path, 60 * 60 * 24 * 365);
    return data?.signedUrl ?? null;
  }

  function handleSubmit(fd: FormData) {
    setUploading(true);
    startTransition(async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const [pdfUrl, imgUrl] = await Promise.all([
          pdfFile ? uploadFile(user.id, pdfFile, "pdf") : Promise.resolve(item?.pdf_url ?? null),
          imageFile ? uploadFile(user.id, imageFile, "img") : Promise.resolve(null),
        ]);
        if (pdfUrl) fd.set("pdf_url", pdfUrl);
        if (imgUrl) fd.set("image_url", imgUrl);
        else if (fetchedImage) fd.set("image_url", fetchedImage);
        else if (item?.image_url && !imageFile) fd.set("image_url", item.image_url);
      }
      if (isEdit) await updateCrochetItem(fd);
      else await addCrochetItem(fd);
      setUploading(false);
      onClose();
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="card p-4 space-y-3 mb-4">
      {isEdit && <input type="hidden" name="id" value={item.id} />}
      <h3 className="text-sm font-medium">{isEdit ? "Edit" : "Add"} item</h3>

      {/* Etsy shortcut */}
      {!isEdit && (
        <button
          type="button"
          onClick={() => { setEtsyMode((v) => !v); setKind("pattern"); }}
          className={`w-full rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
            etsyMode
              ? "border-amber-400 bg-amber-50 text-amber-700"
              : "border-border text-muted hover:bg-surface-2"
          }`}
        >
          <span className="font-medium">🛍 Add from Etsy</span>
          <span className="ml-1 text-faint">— paste listing URL + upload the PDF</span>
        </button>
      )}

      {etsyMode && (
        <div className="space-y-2">
          <div>
            <label className="label">Etsy listing URL</label>
            <input
              type="url"
              placeholder="https://www.etsy.com/listing/…"
              value={etsyUrl}
              onChange={async (e) => {
                const val = e.target.value;
                setEtsyUrl(val);
                setFetchedImage(null);
                if (val.startsWith("http")) {
                  setFetchingImage(true);
                  try {
                    const res = await fetch(`/api/og-image?url=${encodeURIComponent(val)}`);
                    const data = await res.json();
                    if (data.image) setFetchedImage(data.image);
                  } catch { /* silent */ }
                  setFetchingImage(false);
                }
              }}
              className="input w-full"
            />
            <p className="mt-1 text-xs text-faint">Saved as the reference link. Upload the PDF below.</p>
          </div>

          {/* Thumbnail preview */}
          {fetchingImage && <p className="text-xs text-faint">Fetching thumbnail…</p>}
          {fetchedImage && (
            <div className="flex items-center gap-3 rounded-lg border border-border p-2">
              <img src={fetchedImage} alt="Preview" className="h-16 w-16 rounded object-cover shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-accent">✓ Thumbnail found</p>
                <p className="text-xs text-faint">Will be saved as the card image.</p>
              </div>
            </div>
          )}
        </div>
      )}
      {etsyMode && <input type="hidden" name="source_url" value={etsyUrl} />}
      {etsyMode && fetchedImage && <input type="hidden" name="image_url" value={fetchedImage} />}

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Title</label>
          <input name="title" defaultValue={item?.title ?? ""} required placeholder="Name or description" className="input" />
        </div>

        <div>
          <label className="label">Kind</label>
          <select name="kind" value={kind} onChange={(e) => setKind(e.target.value as CrochetKind)} className="input w-full">
            {(Object.keys(KIND_LABELS) as CrochetKind[]).map((k) => (
              <option key={k} value={k}>{KIND_LABELS[k]}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Status</label>
          <select name="status" defaultValue={item?.status ?? (kind === "project" ? "making" : "saved")} className="input w-full">
            {(Object.keys(STATUS_LABELS) as CrochetStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>

        {!etsyMode && (
          <div className="sm:col-span-2">
            <label className="label">Pattern link (URL)</label>
            <input name="source_url" defaultValue={item?.source_url ?? ""} type="url" placeholder="https://…" className="input" />
          </div>
        )}

        {!etsyMode && (
          <div className="sm:col-span-2">
            <label className="label">Image (drag & drop, paste, or click to upload)</label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files[0];
                if (file) handleImageFile(file);
              }}
              onPaste={(e) => {
                const file = Array.from(e.clipboardData.files).find(f => f.type.startsWith("image/"));
                if (file) handleImageFile(file);
              }}
              tabIndex={0}
              className={`relative flex items-center justify-center overflow-hidden rounded-lg border-2 border-dashed transition-colors cursor-pointer ${
                dragOver ? "border-accent bg-accent-soft" : "border-border hover:border-border-strong"
              }`}
              style={{ minHeight: "100px" }}
            >
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="Preview" className="max-h-40 w-full object-cover rounded-lg" />
                  <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity rounded-lg">
                    <span className="text-white text-xs font-medium">Change image</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageFile(f); }} />
                  </label>
                </>
              ) : (
                <label className="flex cursor-pointer flex-col items-center gap-1 py-4 text-faint">
                  <Image size={22} strokeWidth={1.25} />
                  <span className="text-xs">Drop image, paste, or click to browse</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageFile(f); }} />
                </label>
              )}
            </div>
          </div>
        )}

        <div>
          <label className="label">Yarn</label>
          <input name="yarn" defaultValue={item?.yarn ?? ""} placeholder="e.g. Aran weight, cream" className="input" />
        </div>

        <div>
          <label className="label">Hook size</label>
          <input name="hook_size" defaultValue={item?.hook_size ?? ""} placeholder="e.g. 4mm" className="input" />
        </div>

        {kind === "project" && patterns.length > 0 && (
          <div className="sm:col-span-2">
            <label className="label">Based on pattern (optional)</label>
            <select name="pattern_id" defaultValue={item?.pattern_id ?? ""} className="input w-full">
              <option value="">— none —</option>
              {patterns.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
        )}

        <div className="sm:col-span-2">
          <label className="label">Notes</label>
          <textarea name="notes" defaultValue={item?.notes ?? ""} rows={3} placeholder="Stitch count, modifications, progress notes…" className="input w-full resize-none" />
        </div>

        <div className={`sm:col-span-2 rounded-lg ${etsyMode ? "border border-amber-300 bg-amber-50 p-2" : ""}`}>
          <label className="label">{etsyMode ? "⬆ Upload the PDF from Etsy (required)" : "PDF pattern (upload from your computer)"}</label>
          <div className="flex items-center gap-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-muted hover:bg-surface transition-colors">
              <Upload size={14} strokeWidth={1.75} />
              {pdfFile ? pdfFile.name : item?.pdf_url ? "Replace PDF…" : "Choose PDF…"}
              <input
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
              />
            </label>
            {item?.pdf_url && !pdfFile && (
              <a href={item.pdf_url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline flex items-center gap-1">
                <FileText size={13} strokeWidth={1.75} /> View current
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
        <button type="submit" disabled={pending || uploading} className="btn-primary">
          {uploading ? "Uploading…" : pending ? "Saving…" : isEdit ? "Save changes" : "Add"}
        </button>
      </div>
    </form>
  );
}

// ─── single card ─────────────────────────────────────────────────────────────

function CrochetCard({
  item,
  patterns,
}: {
  item: CrochetItem;
  patterns: CrochetItem[];
}) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [, startTransition] = useTransition();

  if (editing) {
    return <ItemForm defaultKind={item.kind} item={item} patterns={patterns} onClose={() => setEditing(false)} />;
  }

  const linkedPattern = item.pattern_id ? patterns.find((p) => p.id === item.pattern_id) : null;

  return (
    <div className="card p-4 flex flex-col gap-3">
      {/* Image */}
      <div className="group/img relative overflow-hidden rounded-lg bg-surface-2" style={{ minHeight: "80px" }}>
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.title}
            className="w-full object-cover"
            style={{ maxHeight: "180px" }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="flex items-center justify-center py-6">
            <Image size={24} strokeWidth={1.25} className="text-faint" />
          </div>
        )}
        {/* Edit image overlay */}
        <button
          onClick={() => setEditing(true)}
          className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity rounded-lg"
        >
          <span className="text-white text-xs font-medium flex items-center gap-1">
            <Pencil size={12} strokeWidth={2} />
            {item.image_url ? "Change image" : "Add image"}
          </span>
        </button>
      </div>

      {/* Title + status */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium leading-snug truncate">{item.title}</p>
          {linkedPattern && (
            <p className="text-xs text-faint mt-0.5">↳ {linkedPattern.title}</p>
          )}
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[item.status]}`}>
          {STATUS_LABELS[item.status]}
        </span>
      </div>

      {/* Meta */}
      {(item.yarn || item.hook_size) && (
        <div className="flex flex-wrap gap-2">
          {item.yarn && <span className="text-xs text-muted">🧶 {item.yarn}</span>}
          {item.hook_size && <span className="text-xs text-muted">🪝 {item.hook_size}</span>}
        </div>
      )}

      {/* Notes */}
      {item.notes && (
        <p className="text-xs text-muted line-clamp-3 whitespace-pre-wrap">{item.notes}</p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-auto pt-2 border-t border-border">
        {item.source_url && (
          <ExternalAnchor href={item.source_url}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:bg-surface-2 hover:text-text transition-colors">
            <ExternalLink size={13} strokeWidth={1.75} />
            Link
          </ExternalAnchor>
        )}
        {item.pdf_url && (
          <ExternalAnchor href={item.pdf_url} isPdf
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:bg-surface-2 hover:text-text transition-colors">
            <FileText size={13} strokeWidth={1.75} />
            Open PDF
          </ExternalAnchor>
        )}
        <div className="ml-auto flex items-center gap-1">
          {confirmDelete ? (
            <>
              <form action={(fd) => startTransition(() => deleteCrochetItem(fd))}>
                <input type="hidden" name="id" value={item.id} />
                <button type="submit" className="rounded px-2 py-0.5 text-xs text-red-500 hover:bg-red-50 font-medium">
                  Delete
                </button>
              </form>
              <button onClick={() => setConfirmDelete(false)} className="rounded px-2 py-0.5 text-xs text-muted hover:bg-surface-2">
                Cancel
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)} className="rounded p-1 text-faint hover:text-text">
                <Pencil size={14} strokeWidth={1.75} />
              </button>
              <button onClick={() => setConfirmDelete(true)} className="rounded p-1 text-faint hover:text-red-500">
                <Trash2 size={14} strokeWidth={1.75} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── board ───────────────────────────────────────────────────────────────────

export function CrochetBoard({ items }: { items: CrochetItem[] }) {
  const [tab, setTab] = useState<Tab>("projects");
  const [adding, setAdding] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [, startSyncTransition] = useTransition();

  function handleSync() {
    setSyncing(true);
    setSyncMsg(null);
    startSyncTransition(async () => {
      const result = await syncRavelry();
      setSyncing(false);
      if ("error" in result) setSyncMsg(`Error: ${result.error}`);
      else setSyncMsg(`Synced ${result.count} items from Ravelry`);
      setTimeout(() => setSyncMsg(null), 4000);
    });
  }

  const projects = items.filter((i) => i.kind === "project");
  const patterns = items.filter((i) => i.kind === "pattern");
  const ideas    = items.filter((i) => i.kind === "idea");

  const tabItems: Record<Tab, CrochetItem[]> = { projects, patterns, ideas };
  const tabKind: Record<Tab, CrochetKind> = { projects: "project", patterns: "pattern", ideas: "idea" };

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: "projects", label: "Projects",  count: projects.length },
    { key: "patterns", label: "Patterns",  count: patterns.length },
    { key: "ideas",    label: "Ideas",     count: ideas.length },
  ];

  return (
    <div>
      {/* Tab bar + add button */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex gap-1">
          {TABS.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => { setTab(key); setAdding(false); }}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                tab === key ? "bg-surface-2 font-medium text-text" : "text-muted hover:bg-surface-2"
              }`}
            >
              {label}
              {count > 0 && <span className="ml-1.5 text-xs text-faint">{count}</span>}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {syncMsg && <span className="text-xs text-muted">{syncMsg}</span>}
          <button
            onClick={handleSync}
            disabled={syncing}
            title="Sync from Ravelry"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted hover:bg-surface-2 disabled:opacity-50"
          >
            <RefreshCw size={14} strokeWidth={1.75} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Syncing…" : "Ravelry"}
          </button>
          <button
            onClick={() => setAdding((v) => !v)}
            className="btn-primary flex items-center gap-1.5"
          >
            {adding ? <X size={15} strokeWidth={1.75} /> : <Plus size={15} strokeWidth={1.75} />}
            {adding ? "Cancel" : `Add ${KIND_LABELS[tabKind[tab]].toLowerCase()}`}
          </button>
        </div>
      </div>

      {/* Add form */}
      {adding && (
        <ItemForm
          defaultKind={tabKind[tab]}
          patterns={patterns}
          onClose={() => setAdding(false)}
        />
      )}

      {/* Grid */}
      {tabItems[tab].length === 0 && !adding ? (
        <p className="py-16 text-center text-sm text-faint">
          No {tab} yet. Add one above.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tabItems[tab].map((item) => (
            <CrochetCard key={item.id} item={item} patterns={patterns} />
          ))}
        </div>
      )}
    </div>
  );
}
