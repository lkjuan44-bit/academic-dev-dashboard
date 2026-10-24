import { BookOpen, TrendingUp } from "lucide-react";

export interface CourseGradeCardProps {
  courseName: string;
  courseCode: string;
  courseColor: string;
  averageGrade: number | null;
  minPassingGrade?: number;
  completedWeight?: number;
}

function gradeStatus(grade: number | null, minimum: number) {
  if (grade === null) {
    return {
      label: "Sin calificaciones",
      tone: "bg-slate-100 text-slate-600",
      bar: "bg-slate-300",
    };
  }
  if (grade < minimum) {
    return {
      label: "Por debajo del mínimo",
      tone: "bg-rose-50 text-rose-700",
      bar: "bg-rose-500",
    };
  }
  if (grade < Math.min(minimum + 0.5, 5)) {
    return {
      label: "En el umbral",
      tone: "bg-amber-50 text-amber-700",
      bar: "bg-amber-500",
    };
  }
  return {
    label: "Buen progreso",
    tone: "bg-emerald-50 text-emerald-700",
    bar: "bg-emerald-600",
  };
}

function safeColor(color: string): string {
  if (/^#[0-9a-f]{3}$/i.test(color)) {
    return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
  }
  return /^#[0-9a-f]{6}$/i.test(color) ? color : "#577568";
}

export function CourseGradeCard({
  courseName,
  courseCode,
  courseColor,
  averageGrade,
  minPassingGrade = 3,
  completedWeight = 0,
}: CourseGradeCardProps) {
  const validGrade =
    averageGrade !== null &&
    Number.isFinite(averageGrade) &&
    averageGrade >= 0 &&
    averageGrade <= 5
      ? averageGrade
      : null;
  const validMinimum =
    Number.isFinite(minPassingGrade) && minPassingGrade >= 0 && minPassingGrade <= 5
      ? minPassingGrade
      : 3;
  const validWeight =
    Number.isFinite(completedWeight) && completedWeight >= 0 && completedWeight <= 100
      ? completedWeight
      : 0;
  const status = gradeStatus(validGrade, validMinimum);
  const color = safeColor(courseColor);
  const gradeProgress = validGrade === null ? 0 : (validGrade / 5) * 100;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="grid size-10 shrink-0 place-items-center rounded-xl"
            style={{ color, backgroundColor: `${color}20` }}
            aria-hidden="true"
          >
            <BookOpen size={19} />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">{courseName}</p>
            <p className="text-xs font-medium tracking-wide text-slate-500">
              {courseCode}
            </p>
          </div>
        </div>
        <TrendingUp className="mt-1 shrink-0 text-slate-400" size={17} aria-hidden="true" />
      </div>

      <div className="mt-6 flex items-end justify-between">
        <div>
          <p className="text-xs text-slate-500">Promedio acumulado</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums text-ink">
            {validGrade === null ? "—" : validGrade.toFixed(2)}
            <span className="ml-1 text-sm font-medium text-slate-400">/ 5.00</span>
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${status.tone}`}>
          {status.label}
        </span>
      </div>

      <div className="mt-4">
        <div
          className="h-2 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-label={`Promedio de ${courseName}`}
          aria-valuemin={0}
          aria-valuemax={5}
          aria-valuenow={validGrade ?? 0}
        >
          <div
            className={`h-full rounded-full transition-[width] ${status.bar}`}
            style={{ width: `${gradeProgress}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-slate-500">
          <span>Mínimo para aprobar: {validMinimum.toFixed(1)}</span>
          <span>{validWeight.toFixed(0)}% evaluado</span>
        </div>
      </div>
    </article>
  );
}
