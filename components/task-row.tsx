"use client";

import { useTransition } from "react";
import { Circle, CheckCircle2 } from "lucide-react";
import type { Task } from "@/lib/types";
import { toggleTask } from "@/app/actions";
import { formatTime } from "@/lib/date";

export function TaskRow({ task, timeZone }: { task: Task; timeZone: string }) {
  const [pending, startTransition] = useTransition();

  const time =
    task.due_at && !task.is_all_day ? formatTime(task.due_at, timeZone) : null;

  return (
    <div className="flex items-start gap-3 py-2">
      <span className="w-12 shrink-0 pt-0.5 text-xs text-faint">
        {time ?? ""}
      </span>
      <form
        action={(fd) => startTransition(() => toggleTask(fd))}
        className="shrink-0 pt-0.5"
      >
        <input type="hidden" name="id" value={task.id} />
        <input type="hidden" name="done" value="true" />
        <button
          type="submit"
          disabled={pending}
          aria-label="Mark done"
          className="text-faint hover:text-accent"
        >
          <Circle size={17} strokeWidth={1.75} />
        </button>
      </form>
      <div className="min-w-0 border-l-2 border-accent pl-3">
        <p className="text-sm font-medium leading-snug">{task.title}</p>
        {task.scheduled_at && (
          <p className="mt-0.5 text-xs text-muted">Time-blocked</p>
        )}
      </div>
    </div>
  );
}
