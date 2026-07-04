import { Package } from "lucide-react";
import type { StashItem } from "@/lib/types";

// "Random from your stash" — resurfaces something you saved and forgot.
// Renders nothing when the stash is empty.
export function StashResurfaceCard({ item }: { item: StashItem | null }) {
  if (!item) return null;

  const saved = new Intl.DateTimeFormat("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  }).format(new Date(item.created_at));

  const body = item.body ?? "";
  const preview = body.length > 200 ? body.slice(0, 200) + "…" : body;

  return (
    <section className="card p-4 md:p-5">
      <div className="mb-3 flex items-center gap-2">
        <Package size={17} strokeWidth={1.75} className="text-muted" />
        <h2 className="text-base font-medium">From your stash</h2>
      </div>

      <a href="/stash" className="block rounded-lg -mx-2 px-2 py-1 hover:bg-surface-2 transition-colors">
        <p className="text-sm font-medium leading-snug">{item.title}</p>
        {preview && (
          <p className="mt-1 text-xs text-muted whitespace-pre-wrap leading-relaxed">{preview}</p>
        )}
        <p className="mt-1.5 text-xs text-faint">
          Saved {saved}
          {item.tags.length > 0 && <span> · {item.tags.slice(0, 3).join(", ")}</span>}
        </p>
      </a>
    </section>
  );
}
