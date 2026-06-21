"use client";

import { useRef, useTransition } from "react";
import { Plus } from "lucide-react";
import { addCapture } from "@/app/actions";

// The always-present dump box. Type anything, hit enter, triage later.
export function QuickCapture() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      ref={formRef}
      action={(fd) =>
        startTransition(async () => {
          await addCapture(fd);
          formRef.current?.reset();
        })
      }
      className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2.5"
    >
      <Plus size={16} strokeWidth={1.75} className="text-faint shrink-0" />
      <input
        name="content"
        autoComplete="off"
        placeholder="Capture anything…"
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-faint"
      />
      <button
        type="submit"
        disabled={pending}
        className="text-xs text-muted hover:text-text disabled:opacity-50"
      >
        {pending ? "Saving…" : "Add"}
      </button>
    </form>
  );
}
