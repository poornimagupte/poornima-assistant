"use client";

import { useState, useTransition, useRef } from "react";
import { Plus, Pencil, Trash2, ChevronRight, X } from "lucide-react";
import type { BlogPost, WritingStage, ContentType } from "@/lib/types";
import { addWritingIdea, updateWritingIdea, advanceWritingStage, deleteWritingIdea } from "@/app/actions";

// ─── constants ───────────────────────────────────────────────────────────────

const STAGES: { key: WritingStage; label: string; color: string }[] = [
  { key: "idea",      label: "Ideas",     color: "border-l-faint" },
  { key: "outlining", label: "Outlining", color: "border-l-sky-400" },
  { key: "drafting",  label: "Drafting",  color: "border-l-amber-400" },
  { key: "editing",   label: "Editing",   color: "border-l-purple-400" },
  { key: "published", label: "Published", color: "border-l-accent" },
];

const NEXT_STAGE: Partial<Record<WritingStage, WritingStage>> = {
  idea: "outlining",
  outlining: "drafting",
  drafting: "editing",
  editing: "published",
};

const CONTENT_TYPES: { key: ContentType; label: string; emoji: string }[] = [
  { key: "blog",       label: "Blog post",       emoji: "✍️" },
  { key: "linkedin",   label: "LinkedIn",        emoji: "💼" },
  { key: "conference", label: "Conference paper", emoji: "🎓" },
  { key: "talk",       label: "Talk / Abstract", emoji: "🎤" },
  { key: "newsletter", label: "Newsletter",      emoji: "📧" },
  { key: "other",      label: "Other",           emoji: "📝" },
];

const TYPE_MAP = Object.fromEntries(CONTENT_TYPES.map(t => [t.key, t]));

// ─── add / edit form ─────────────────────────────────────────────────────────

function PostForm({ post, onClose }: { post?: BlogPost; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const isEdit = !!post;

  return (
    <form
      action={(fd) => startTransition(async () => {
        if (isEdit) await updateWritingIdea(fd);
        else await addWritingIdea(fd);
        onClose();
      })}
      className="card p-4 space-y-3 mb-4"
    >
      {isEdit && <input type="hidden" name="id" value={post.id} />}
      <h3 className="text-sm font-medium">{isEdit ? "Edit" : "Add idea"}</h3>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Title / Idea</label>
          <input name="title" defaultValue={post?.title ?? ""} required
            placeholder="What do you want to write about?" className="input w-full" />
        </div>

        <div>
          <label className="label">Type</label>
          <select name="content_type" defaultValue={post?.content_type ?? "blog"} className="input w-full">
            {CONTENT_TYPES.map(t => (
              <option key={t.key} value={t.key}>{t.emoji} {t.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Stage</label>
          <select name="stage" defaultValue={post?.stage ?? "idea"} className="input w-full">
            {STAGES.map(s => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="label">Notes / outline</label>
          <textarea name="body" defaultValue={post?.body ?? ""} rows={4}
            placeholder="Key points, angle, audience, references…"
            className="input w-full resize-none" />
        </div>

        <div>
          <label className="label">Target date (optional)</label>
          <input name="target_date" type="date" defaultValue={post?.target_date ?? ""} className="input w-full" />
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

// ─── single post card ────────────────────────────────────────────────────────

function PostCard({ post }: { post: BlogPost }) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [, startTransition] = useTransition();

  const type = TYPE_MAP[post.content_type];
  const nextStage = NEXT_STAGE[post.stage];
  const stageInfo = STAGES.find(s => s.key === post.stage)!;

  if (editing) return (
    <div className="mb-2">
      <PostForm post={post} onClose={() => setEditing(false)} />
    </div>
  );

  return (
    <div className={`card border-l-2 p-3 space-y-2 ${stageInfo.color}`}>
      {/* Type badge + title */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="text-xs text-faint">{type?.emoji} {type?.label}</span>
          <p className="text-sm font-medium leading-snug mt-0.5">{post.title}</p>
        </div>
      </div>

      {/* Notes preview */}
      {post.body && (
        <p className="text-xs text-muted line-clamp-2 whitespace-pre-wrap">{post.body}</p>
      )}

      {/* Target date */}
      {post.target_date && (
        <p className="text-xs text-faint">
          🗓 {new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(post.target_date))}
        </p>
      )}

      {/* Actions row */}
      <div className="flex items-center gap-1 pt-1 border-t border-border">
        {nextStage && (
          <form action={(fd) => startTransition(() => advanceWritingStage(fd))}>
            <input type="hidden" name="id" value={post.id} />
            <input type="hidden" name="stage" value={nextStage} />
            <button type="submit"
              className="flex items-center gap-1 text-xs text-muted hover:text-accent px-1.5 py-1 rounded hover:bg-surface-2">
              <ChevronRight size={13} strokeWidth={1.75} />
              {STAGES.find(s => s.key === nextStage)?.label}
            </button>
          </form>
        )}
        <div className="ml-auto flex items-center gap-0.5">
          <button onClick={() => setEditing(true)}
            className="rounded p-1.5 text-faint hover:text-text hover:bg-surface-2">
            <Pencil size={13} strokeWidth={1.75} />
          </button>
          {confirmDelete ? (
            <>
              <form action={(fd) => startTransition(() => deleteWritingIdea(fd))}>
                <input type="hidden" name="id" value={post.id} />
                <button type="submit" className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50">Delete</button>
              </form>
              <button onClick={() => setConfirmDelete(false)} className="rounded px-2 py-1 text-xs text-muted hover:bg-surface-2">Cancel</button>
            </>
          ) : (
            <button onClick={() => setConfirmDelete(true)}
              className="rounded p-1.5 text-faint hover:text-red-500 hover:bg-surface-2">
              <Trash2 size={13} strokeWidth={1.75} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── pipeline board ──────────────────────────────────────────────────────────

export function WritingPipeline({ posts }: { posts: BlogPost[] }) {
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState<ContentType | "all">("all");

  const filtered = filter === "all" ? posts : posts.filter(p => p.content_type === filter);

  const byStage = (stage: WritingStage) =>
    filtered.filter(p => p.stage === stage);

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-5 flex items-center justify-between gap-3 flex-wrap">
        {/* Content type filter */}
        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${filter === "all" ? "bg-surface-2 font-medium" : "text-muted hover:bg-surface-2"}`}
          >
            All
          </button>
          {CONTENT_TYPES.map(t => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${filter === t.key ? "bg-surface-2 font-medium" : "text-muted hover:bg-surface-2"}`}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setAdding(v => !v)}
          className="btn-primary flex items-center gap-1.5 shrink-0"
        >
          {adding ? <X size={15} strokeWidth={1.75} /> : <Plus size={15} strokeWidth={1.75} />}
          {adding ? "Cancel" : "Add idea"}
        </button>
      </div>

      {adding && <PostForm onClose={() => setAdding(false)} />}

      {/* Pipeline columns */}
      <div className="grid gap-4 md:grid-cols-5">
        {STAGES.map(stage => {
          const items = byStage(stage.key);
          return (
            <div key={stage.key}>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold text-faint uppercase tracking-wide">
                  {stage.label}
                </p>
                {items.length > 0 && (
                  <span className="text-xs text-faint">{items.length}</span>
                )}
              </div>
              <div className="space-y-2 min-h-[80px]">
                {items.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-faint">
                    Empty
                  </div>
                ) : (
                  items.map(post => <PostCard key={post.id} post={post} />)
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
