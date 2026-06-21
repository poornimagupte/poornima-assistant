"use client";

import { useState, useRef, useTransition } from "react";
import { Circle, CheckCircle2, Bell, Plus, ChevronDown, ChevronRight } from "lucide-react";
import type { TaskWithReminders, Project } from "@/lib/types";
import { createTask, toggleTask } from "@/app/actions";
import { TaskEditor } from "./task-editor";

const PRIORITY_DOT: Record<string, string> = {
  high: "bg-red-500",
  med: "bg-amber-500",
  low: "bg-sky-500",
};

type Bucket = "Overdue" | "Today" | "This week" | "Later" | "No date";
const ORDER: Bucket[] = ["Overdue", "Today", "This week", "Later", "No date"];

function bucketOf(due: string | null): Bucket {
  if (!due) return "No date";
  const d = new Date(due);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startTomorrow = new Date(startToday);
  startTomorrow.setDate(startTomorrow.getDate() + 1);
  const in7 = new Date(startToday);
  in7.setDate(in7.getDate() + 7);

  if (d < startToday) return "Overdue";
  if (d < startTomorrow) return "Today";
  if (d < in7) return "This week";
  return "Later";
}

function dueLabel(due: string | null): string {
  if (!due) return "";
  const d = new Date(due);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
  }).format(d);
}

export function TaskManager({
  tasks,
  completed,
  projects,
}: {
  tasks: TaskWithReminders[];
  completed: TaskWithReminders[];
  projects: Project[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(
    tasks[0]?.id ?? null
  );
  const [showCompleted, setShowCompleted] = useState(false);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const grouped = ORDER.map((b) => ({
    bucket: b,
    items: tasks.filter((t) => bucketOf(t.due_at) === b),
  })).filter((g) => g.items.length > 0);

  const selected = tasks.find((t) => t.id === selectedId) ?? null;

  return (
    <div className="grid gap-3 md:grid-cols-[1fr_1.1fr]">
      <section className="card p-4">
        <form
          ref={formRef}
          action={(fd) =>
            startTransition(async () => {
              await createTask(fd);
              formRef.current?.reset();
            })
          }
          className="mb-3 flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2"
        >
          <Plus size={15} strokeWidth={1.75} className="text-faint" />
          <input
            name="title"
            autoComplete="off"
            placeholder="Add a task…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-faint"
          />
          <button
            type="submit"
            disabled={pending}
            className="text-xs text-muted hover:text-text disabled:opacity-50"
          >
            Add
          </button>
        </form>

        {grouped.length === 0 ? (
          <p className="py-10 text-center text-sm text-faint">
            No tasks yet. Add one above.
          </p>
        ) : (
          <div className="space-y-4">
            {grouped.map(({ bucket, items }) => (
              <div key={bucket}>
                <p
                  className={`mb-1 px-1 text-xs font-medium ${
                    bucket === "Overdue" ? "text-red-500" : "text-faint"
                  }`}
                >
                  {bucket}
                </p>
                <ul>
                  {items.map((t) => (
                    <li key={t.id}>
                      <div
                        onClick={() => setSelectedId(t.id)}
                        className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 ${
                          selectedId === t.id ? "bg-surface-2" : "hover:bg-surface-2"
                        }`}
                      >
                        <form
                          action={toggleTask}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input type="hidden" name="id" value={t.id} />
                          <input type="hidden" name="done" value="true" />
                          <button
                            type="submit"
                            aria-label="Mark done"
                            className="flex text-faint hover:text-accent"
                          >
                            <Circle size={16} strokeWidth={1.75} />
                          </button>
                        </form>

                        {t.priority && (
                          <span
                            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                              PRIORITY_DOT[t.priority]
                            }`}
                          />
                        )}

                        <span className="flex-1 truncate text-sm">
                          {t.title}
                        </span>

                        {t.reminders.length > 0 && (
                          <Bell
                            size={13}
                            strokeWidth={1.75}
                            className="text-faint"
                          />
                        )}
                        {t.due_at && (
                          <span
                            className={`text-xs ${
                              bucket === "Overdue" ? "text-red-500" : "text-faint"
                            }`}
                          >
                            {dueLabel(t.due_at)}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* Completed section */}
        {completed.length > 0 && (
          <div className="mt-4 border-t border-border pt-3">
            <button
              onClick={() => setShowCompleted((v) => !v)}
              className="flex items-center gap-1.5 px-1 text-xs font-medium text-faint hover:text-muted"
            >
              {showCompleted ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              Completed ({completed.length})
            </button>
            {showCompleted && (
              <ul className="mt-2 space-y-0.5">
                {completed.map((t) => (
                  <li key={t.id} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
                    <form action={toggleTask} onClick={(e) => e.stopPropagation()}>
                      <input type="hidden" name="id" value={t.id} />
                      <input type="hidden" name="done" value="false" />
                      <button
                        type="submit"
                        aria-label="Mark undone"
                        className="flex text-accent hover:text-faint"
                      >
                        <CheckCircle2 size={16} strokeWidth={1.75} />
                      </button>
                    </form>
                    <span className="flex-1 truncate text-sm text-muted line-through">
                      {t.title}
                    </span>
                    {t.completed_at && (
                      <span className="text-xs text-faint">
                        {new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(t.completed_at))}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      {selected ? (
        <TaskEditor key={selected.id} task={selected} projects={projects} />
      ) : (
        <div className="card flex items-center justify-center p-5 text-sm text-faint">
          Select a task to edit it.
        </div>
      )}
    </div>
  );
}
