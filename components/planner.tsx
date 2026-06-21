"use client";

import { useState, useTransition, useRef, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, X, GripVertical } from "lucide-react";
import type { Task } from "@/lib/types";
import { scheduleTask } from "@/app/actions";

const START_HOUR = 6;
const END_HOUR = 22;

const pad = (n: number) => String(n).padStart(2, "0");
const dayKey = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const PRIORITY_BORDER: Record<string, string> = {
  high: "border-l-red-500",
  med:  "border-l-amber-500",
  low:  "border-l-sky-500",
};

// ─── mouse-based drag state ───────────────────────────────────────────────────
interface DragState {
  id: string;
  title: string;
  startX: number;
  startY: number;
  curX: number;
  curY: number;
  active: boolean; // true once cursor has moved enough to count as a drag
}

export function Planner({ tasks }: { tasks: Task[] }) {
  const [day, setDay] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  });
  const [, startTransition] = useTransition();

  // drag state lives in a ref so mouse handlers don't stale-close over it
  const dragRef = useRef<DragState | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number; title: string } | null>(null);
  const [hoverHour, setHoverHour] = useState<number | null>(null);

  // refs for each hour row so we can hit-test on mousemove
  const hourRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const selectedKey = dayKey(day);
  const unscheduled = tasks.filter((t) => !t.scheduled_at);
  const scheduled   = tasks.filter(
    (t) => t.scheduled_at && dayKey(new Date(t.scheduled_at)) === selectedKey
  );

  function scheduleAt(id: string, hour: number) {
    const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour);
    const fd = new FormData();
    fd.set("id", id);
    fd.set("scheduled_at", at.toISOString());
    startTransition(() => scheduleTask(fd));
  }

  function unschedule(id: string) {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("scheduled_at", "");
    startTransition(() => scheduleTask(fd));
  }

  function shiftDay(delta: number) {
    setDay((d) => {
      const n = new Date(d);
      n.setDate(n.getDate() + delta);
      return n;
    });
  }

  // ─── mouse event handlers ────────────────────────────────────────────────────
  const onMouseMove = useCallback((e: MouseEvent) => {
    const ds = dragRef.current;
    if (!ds) return;

    const dx = e.clientX - ds.startX;
    const dy = e.clientY - ds.startY;
    if (!ds.active && Math.sqrt(dx * dx + dy * dy) < 6) return;

    dragRef.current = { ...ds, active: true, curX: e.clientX, curY: e.clientY };
    setGhost({ x: e.clientX, y: e.clientY, title: ds.title });

    // hit-test hour rows
    let found: number | null = null;
    hourRefs.current.forEach((el, hour) => {
      const r = el.getBoundingClientRect();
      if (e.clientY >= r.top && e.clientY <= r.bottom &&
          e.clientX >= r.left && e.clientX <= r.right) {
        found = hour;
      }
    });
    setHoverHour(found);
  }, []);

  const onMouseUp = useCallback(() => {
    const ds = dragRef.current;
    if (ds?.active && hoverHour !== null) {
      scheduleAt(ds.id, hoverHour);
    }
    dragRef.current = null;
    setGhost(null);
    setHoverHour(null);
  }, [hoverHour]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  function startDrag(e: React.MouseEvent, task: Task) {
    e.preventDefault();
    dragRef.current = {
      id: task.id,
      title: task.title,
      startX: e.clientX,
      startY: e.clientY,
      curX: e.clientX,
      curY: e.clientY,
      active: false,
    };
  }

  // ─── render ──────────────────────────────────────────────────────────────────
  const tasksAtHour = (h: number) =>
    scheduled.filter((t) => new Date(t.scheduled_at!).getHours() === h);

  const dayLabel = new Intl.DateTimeFormat("en-GB", {
    weekday: "long", day: "numeric", month: "long",
  }).format(day);
  const isToday = selectedKey === dayKey(new Date());

  return (
    <>
      {/* Floating ghost */}
      {ghost && (
        <div
          style={{ left: ghost.x + 12, top: ghost.y - 14, position: "fixed", zIndex: 9999 }}
          className="pointer-events-none max-w-[180px] truncate rounded-lg border border-border bg-surface px-2.5 py-1 text-xs shadow-lg"
        >
          {ghost.title}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-[260px_1fr]">
        {/* Unscheduled tray */}
        <section className="card h-fit p-4">
          <h2 className="mb-1 text-base font-medium">Unscheduled</h2>
          <p className="mb-3 text-xs text-faint">Drag onto the day to block time.</p>

          {unscheduled.length === 0 ? (
            <p className="py-6 text-center text-sm text-faint">
              Everything&apos;s planned.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {unscheduled.map((t) => (
                <li
                  key={t.id}
                  onMouseDown={(e) => startDrag(e, t)}
                  className={`flex cursor-grab select-none items-center gap-1.5 rounded-lg border border-l-2 border-border bg-surface px-2 py-1.5 active:cursor-grabbing ${
                    t.priority ? PRIORITY_BORDER[t.priority] : "border-l-border"
                  }`}
                >
                  <GripVertical size={14} strokeWidth={1.75} className="shrink-0 text-faint" />
                  <span className="flex-1 truncate text-sm">{t.title}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Day grid */}
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <h2 className="text-base font-medium">{isToday ? "Today" : dayLabel}</h2>
              {isToday && <p className="text-xs text-faint">{dayLabel}</p>}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => shiftDay(-1)}
                aria-label="Previous day"
                className="rounded-lg p-1.5 text-muted hover:bg-surface-2"
              >
                <ChevronLeft size={16} strokeWidth={1.75} />
              </button>
              <button
                onClick={() => setDay(new Date(new Date().setHours(0, 0, 0, 0)))}
                className="rounded-lg px-2.5 py-1 text-xs text-muted hover:bg-surface-2"
              >
                Today
              </button>
              <button
                onClick={() => shiftDay(1)}
                aria-label="Next day"
                className="rounded-lg p-1.5 text-muted hover:bg-surface-2"
              >
                <ChevronRight size={16} strokeWidth={1.75} />
              </button>
            </div>
          </div>

          <div>
            {Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => {
              const hour = START_HOUR + i;
              const here = tasksAtHour(hour);
              const isHover = hoverHour === hour && ghost !== null;
              return (
                <div
                  key={hour}
                  ref={(el) => {
                    if (el) hourRefs.current.set(hour, el);
                    else hourRefs.current.delete(hour);
                  }}
                  className={`flex min-h-[44px] gap-3 border-b border-border px-4 py-1.5 last:border-b-0 transition-colors ${
                    isHover ? "bg-accent-soft" : "hover:bg-surface-2/50"
                  }`}
                >
                  <span className="w-10 shrink-0 pt-1 text-xs text-faint">
                    {pad(hour)}:00
                  </span>
                  <div className="flex flex-1 flex-wrap gap-1.5">
                    {here.map((t) => (
                      <span
                        key={t.id}
                        onMouseDown={(e) => startDrag(e, t)}
                        className={`flex cursor-grab select-none items-center gap-1.5 rounded-lg border border-l-2 bg-accent-soft px-2.5 py-1 text-xs text-accent active:cursor-grabbing ${
                          t.priority ? PRIORITY_BORDER[t.priority] : "border-l-accent"
                        }`}
                      >
                        {t.title}
                        <button
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={() => unschedule(t.id)}
                          aria-label="Unschedule"
                          className="text-accent/70 hover:text-accent"
                        >
                          <X size={12} strokeWidth={2} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}
