import { ArrowRight, X, Inbox } from "lucide-react";
import type { Capture } from "@/lib/types";
import { archiveCapture, captureToTask } from "@/app/actions";

// The inbox. Each item can become a task or be archived — server-action
// forms, no client JS needed.
export function CaptureList({ captures }: { captures: Capture[] }) {
  return (
    <section className="card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Inbox size={17} strokeWidth={1.75} className="text-muted" />
        <h2 className="text-base font-medium">Inbox</h2>
        {captures.length > 0 && (
          <span className="ml-auto text-xs text-faint">{captures.length}</span>
        )}
      </div>

      {captures.length === 0 ? (
        <p className="py-6 text-center text-sm text-faint">
          Nothing to triage. Capture a thought above.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {captures.map((c) => (
            <li
              key={c.id}
              className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-2"
            >
              <span className="flex-1 text-sm">{c.content}</span>

              <form action={captureToTask}>
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="content" value={c.content} />
                <button
                  type="submit"
                  title="Make it a task"
                  className="rounded p-1 text-faint opacity-0 group-hover:opacity-100 hover:text-accent"
                >
                  <ArrowRight size={15} strokeWidth={1.75} />
                </button>
              </form>

              <form action={archiveCapture}>
                <input type="hidden" name="id" value={c.id} />
                <button
                  type="submit"
                  title="Archive"
                  className="rounded p-1 text-faint opacity-0 group-hover:opacity-100 hover:text-text"
                >
                  <X size={15} strokeWidth={1.75} />
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
