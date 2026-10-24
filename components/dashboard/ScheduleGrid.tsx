"use client";

import { useEffect, useMemo, useState } from "react";

export const WEEKDAYS = [
  { key: "MONDAY", label: "Lunes", jsDay: 1 },
  { key: "TUESDAY", label: "Martes", jsDay: 2 },
  { key: "WEDNESDAY", label: "Miércoles", jsDay: 3 },
  { key: "THURSDAY", label: "Jueves", jsDay: 4 },
  { key: "FRIDAY", label: "Viernes", jsDay: 5 },
  { key: "SATURDAY", label: "Sábado", jsDay: 6 },
] as const;

const DAY_START = 7 * 60;
const DAY_END = 22 * 60;
const SLOT_MINUTES = 30;
const SLOT_COUNT = (DAY_END - DAY_START) / SLOT_MINUTES;
const FALLBACK_COLOR = "#577568";

export type WeekdayKey = (typeof WEEKDAYS)[number]["key"];

export interface ScheduleBlock {
  id: string;
  dayOfWeek: WeekdayKey;
  startMinute: number;
  endMinute: number;
  location?: string | null;
  course: {
    id: string;
    name: string;
    code: string;
    color: string;
  };
}

interface ScheduleGridProps {
  schedules: readonly ScheduleBlock[];
}

interface UpcomingClass {
  schedule: ScheduleBlock;
  startsAt: Date;
}

function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function safeColor(color: string): string {
  if (/^#[0-9a-f]{3}$/i.test(color)) {
    return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
  }
  return /^#[0-9a-f]{6}$/i.test(color) ? color : FALLBACK_COLOR;
}

function isRenderable(schedule: ScheduleBlock): boolean {
  return (
    Number.isInteger(schedule.startMinute) &&
    Number.isInteger(schedule.endMinute) &&
    schedule.startMinute >= 0 &&
    schedule.endMinute <= 24 * 60 &&
    schedule.endMinute > schedule.startMinute &&
    schedule.endMinute > DAY_START &&
    schedule.startMinute < DAY_END
  );
}

function findNextClass(
  schedules: readonly ScheduleBlock[],
  now: Date,
): UpcomingClass | null {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  for (let offset = 0; offset < 7; offset += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() + offset);
    const weekday = WEEKDAYS.find((day) => day.jsDay === date.getDay());
    if (!weekday) {
      continue;
    }

    const upcoming = schedules
      .filter(
        (schedule) =>
          schedule.dayOfWeek === weekday.key && isRenderable(schedule),
      )
      .map((schedule) => {
        const startsAt = new Date(date);
        startsAt.setMinutes(schedule.startMinute, 0, 0);
        return { schedule, startsAt };
      })
      .filter(({ startsAt }) => startsAt.getTime() > now.getTime())
      .sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime());

    if (upcoming[0]) {
      return upcoming[0];
    }
  }

  return null;
}

function ScheduleBlockCard({ schedule }: { schedule: ScheduleBlock }) {
  const visibleStart = Math.max(schedule.startMinute, DAY_START);
  const visibleEnd = Math.min(schedule.endMinute, DAY_END);
  const rowStart = Math.floor((visibleStart - DAY_START) / SLOT_MINUTES) + 1;
  const rowEnd = Math.ceil((visibleEnd - DAY_START) / SLOT_MINUTES) + 1;
  const color = safeColor(schedule.course.color);

  return (
    <article
      className="z-10 mx-1 overflow-hidden rounded-lg border px-2 py-1 text-xs shadow-sm"
      style={{
        gridRow: `${rowStart} / ${rowEnd}`,
        backgroundColor: `${color}20`,
        borderColor: `${color}70`,
        color,
      }}
      aria-label={`${schedule.course.name}, ${formatTime(schedule.startMinute)} a ${formatTime(schedule.endMinute)}`}
    >
      <p className="truncate font-semibold">{schedule.course.name}</p>
      <p className="truncate opacity-80">
        {formatTime(schedule.startMinute)}–{formatTime(schedule.endMinute)}
      </p>
      {schedule.location ? (
        <p className="truncate opacity-75">{schedule.location}</p>
      ) : null}
    </article>
  );
}

export function ScheduleGrid({ schedules }: ScheduleGridProps) {
  const [now, setNow] = useState<Date | null>(null);
  const validSchedules = useMemo(
    () => schedules.filter(isRenderable),
    [schedules],
  );

  useEffect(() => {
    const updateTime = () => setNow(new Date());
    updateTime();
    const timer = window.setInterval(updateTime, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const nextClass = useMemo(
    () => (now ? findNextClass(validSchedules, now) : null),
    [now, validSchedules],
  );
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("es", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [],
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-moss">
            Semana académica
          </p>
          <h2 className="mt-1 text-xl font-semibold text-ink">Mi horario</h2>
        </div>
        <aside
          className="min-w-56 rounded-xl bg-paper px-4 py-3"
          aria-live="polite"
          aria-label="Siguiente clase"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Siguiente clase
          </p>
          {nextClass ? (
            <>
              <p className="mt-1 font-semibold text-ink">
                {nextClass.schedule.course.name}
              </p>
              <p className="mt-0.5 text-sm capitalize text-slate-600">
                {dateFormatter.format(nextClass.startsAt)}
              </p>
              {nextClass.schedule.location ? (
                <p className="mt-0.5 text-xs text-slate-500">
                  {nextClass.schedule.location}
                </p>
              ) : null}
            </>
          ) : (
            <p className="mt-1 text-sm text-slate-600">
              {now ? "No hay clases programadas." : "Buscando tu próxima clase…"}
            </p>
          )}
        </aside>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-[3.5rem_repeat(6,minmax(0,1fr))]">
            <div className="sticky top-0 z-20 border-b border-slate-200 bg-white" />
            {WEEKDAYS.map((day) => (
              <div
                key={day.key}
                className="sticky top-0 z-20 border-b border-slate-200 bg-white px-2 pb-3 text-center text-sm font-semibold text-slate-600"
              >
                {day.label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-[3.5rem_repeat(6,minmax(0,1fr))]">
            <div
              className="relative grid"
              style={{ gridTemplateRows: `repeat(${SLOT_COUNT}, 2rem)` }}
              aria-hidden="true"
            >
              {Array.from({ length: SLOT_COUNT }, (_, index) => (
                <span
                  key={index}
                  className="relative -top-2 pr-2 text-right text-[10px] text-slate-400"
                >
                  {index % 2 === 0
                    ? formatTime(DAY_START + index * SLOT_MINUTES)
                    : ""}
                </span>
              ))}
              <span className="absolute -bottom-2 right-2 text-[10px] text-slate-400">
                {formatTime(DAY_END)}
              </span>
            </div>
            {WEEKDAYS.map((day) => (
              <div
                key={day.key}
                className="relative grid border-l border-slate-100"
                style={{ gridTemplateRows: `repeat(${SLOT_COUNT}, 2rem)` }}
                aria-label={`${day.label}, de 07:00 a 22:00`}
              >
                {Array.from({ length: SLOT_COUNT }, (_, index) => (
                  <div
                    key={index}
                    className={`border-t ${index % 2 === 1 ? "border-slate-100" : "border-slate-200"}`}
                  />
                ))}
                {validSchedules
                  .filter((schedule) => schedule.dayOfWeek === day.key)
                  .map((schedule) => (
                    <ScheduleBlockCard key={schedule.id} schedule={schedule} />
                  ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
