import { Clock, MapPin } from "lucide-react";
import type { Task, CalendarEvent } from "@/lib/types";
import { TaskRow } from "./task-row";
import { formatTime } from "@/lib/date";

type RailItem =
  | { kind: "task"; sortKey: string; task: Task }
  | { kind: "event"; sortKey: string; event: CalendarEvent };

function CalendarEventRow({
  event,
  timeZone,
}: {
  event: CalendarEvent;
  timeZone: string;
}) {
  const time = event.allDay ? null : formatTime(event.start, timeZone);
  return (
    <div className="flex items-start gap-3 py-2">
      <span className="w-12 shrink-0 pt-0.5 text-xs text-faint">{time ?? "all day"}</span>
      <div className="shrink-0 pt-1">
        <div className="h-[17px] w-[17px] rounded-full border-2 border-info" />
      </div>
      <div className="min-w-0 border-l-2 border-info pl-3">
        <p className="text-sm font-medium leading-snug">{event.title}</p>
        {event.location && (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
            <MapPin size={11} strokeWidth={1.75} />
            {event.location}
          </p>
        )}
      </div>
    </div>
  );
}

export function TodayPanel({
  tasks,
  calendarEvents,
  timeZone,
}: {
  tasks: Task[];
  calendarEvents: CalendarEvent[];
  timeZone: string;
}) {
  const rail: RailItem[] = [
    ...tasks.map((t): RailItem => ({
      kind: "task",
      sortKey: t.scheduled_at ?? t.due_at ?? "9999",
      task: t,
    })),
    ...calendarEvents.map((e): RailItem => ({
      kind: "event",
      sortKey: e.start,
      event: e,
    })),
  ].sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  const isConnected = calendarEvents.length >= 0 && calendarEvents !== null;

  return (
    <section className="card p-4 md:p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={18} strokeWidth={1.75} className="text-muted" />
          <h2 className="text-base font-medium">Today</h2>
        </div>
        {isConnected && (
          <span className="flex items-center gap-1 text-xs text-muted">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-info" />
            Calendar
          </span>
        )}
      </div>

      {rail.length === 0 ? (
        <p className="py-8 text-center text-sm text-faint">
          Nothing scheduled yet. Add a due date to a task to see it here.
        </p>
      ) : (
        <div className="divide-y divide-border">
          {rail.map((item) =>
            item.kind === "task" ? (
              <TaskRow key={item.task.id} task={item.task} timeZone={timeZone} />
            ) : (
              <CalendarEventRow key={item.event.id} event={item.event} timeZone={timeZone} />
            )
          )}
        </div>
      )}
    </section>
  );
}
