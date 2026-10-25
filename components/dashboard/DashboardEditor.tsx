import Image from "next/image";
import Link from "next/link";
import { BookOpen, CalendarDays, Plus, Trash2 } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { CourseGradeCard } from "@/components/dashboard/CourseGradeCard";
import { ScheduleGrid, type ScheduleBlock } from "@/components/dashboard/ScheduleGrid";
import { ConfirmSubmitButton } from "@/components/dashboard/ConfirmSubmitButton";
import {
  deleteCourse,
  deleteGrade,
  deleteSchedule,
  deleteTask,
  saveCourse,
  saveGrade,
  saveSchedule,
  saveTask,
} from "@/app/dashboard-actions";
import { signOutFromDashboard } from "@/app/login/actions";
import {
  calculateWeightedAverage,
  type WeightedGrade,
} from "@/lib/utils/grade-calculator";

type CourseWithDetails = Prisma.CourseGetPayload<{
  include: { grades: true; schedules: true };
}>;

type TaskWithCourse = Prisma.TaskGetPayload<{
  include: { course: { select: { name: true; color: true } } };
}>;

interface DashboardEditorProps {
  courses: CourseWithDetails[];
  tasks: TaskWithCourse[];
  notice?: string;
  error?: string;
  userName: string;
  userImage: string | null | undefined;
}

const weekdayOptions = [
  ["MONDAY", "Lunes"],
  ["TUESDAY", "Martes"],
  ["WEDNESDAY", "Miércoles"],
  ["THURSDAY", "Jueves"],
  ["FRIDAY", "Viernes"],
  ["SATURDAY", "Sábado"],
] as const;

const taskStatuses = [
  ["TODO", "Pendiente"],
  ["IN_PROGRESS", "En progreso"],
  ["DONE", "Hecha"],
] as const;

const noticeLabels: Record<string, string> = {
  "course-saved": "Curso guardado.",
  "course-deleted": "Curso eliminado.",
  "grade-saved": "Corte guardado.",
  "grade-deleted": "Corte eliminado.",
  "schedule-saved": "Clase guardada.",
  "schedule-deleted": "Clase eliminada.",
  "task-saved": "Tarea guardada.",
  "task-deleted": "Tarea eliminada.",
};

const errorLabels: Record<string, string> = {
  invalid: "Revisa los datos del formulario e inténtalo de nuevo.",
  duplicate: "Ya tienes un curso con ese código.",
  weight: "Los cortes de un curso no pueden sumar más del 100%.",
  course: "No se encontró el curso seleccionado.",
  record: "No se encontró el elemento que intentas editar.",
  time: "La hora de fin debe ser posterior a la hora de inicio.",
  schedule: "No se permiten dos clases que se solapen ese día.",
  generic: "No se pudo guardar. Comprueba los datos e inténtalo de nuevo.",
};

const fieldClass =
  "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-moss focus:ring-2 focus:ring-moss/15";
const labelClass = "block text-xs font-medium text-slate-600";
const buttonClass =
  "inline-flex items-center justify-center gap-1.5 rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-white transition hover:bg-moss focus:outline-none focus:ring-2 focus:ring-moss focus:ring-offset-2 disabled:opacity-50";
const secondaryButtonClass =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-moss focus:ring-offset-2";
const dangerButtonClass =
  "inline-flex items-center justify-center gap-1 rounded-lg px-2.5 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2";

function localDateTime(value: Date | null): string {
  if (!value) {
    return "";
  }
  const offsetDate = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 16);
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required = false,
  min,
  max,
  step,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number;
  required?: boolean;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  placeholder?: string;
}) {
  return (
    <label className={labelClass}>
      {label}
      <input
        className={fieldClass}
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
      />
    </label>
  );
}

function CourseSelect({
  courses,
  defaultValue,
  allowNone = false,
}: {
  courses: CourseWithDetails[];
  defaultValue?: string;
  allowNone?: boolean;
}) {
  return (
    <label className={labelClass}>
      Curso
      <select
        className={fieldClass}
        name="courseId"
        defaultValue={defaultValue ?? ""}
        required={!allowNone}
      >
        {allowNone ? <option value="">Sin curso asignado</option> : null}
        {courses.map((course) => (
          <option key={course.id} value={course.id}>
            {course.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function DeleteButton({
  action,
  id,
  item,
}: {
  action: (formData: FormData) => void | Promise<void>;
  id: string;
  item: string;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <ConfirmSubmitButton
        className={dangerButtonClass}
        type="submit"
        confirmation={`¿Eliminar ${item}? Esta acción no se puede deshacer.`}
        aria-label={`Eliminar ${item}`}
      >
        <Trash2 size={14} aria-hidden="true" />
        Eliminar
      </ConfirmSubmitButton>
    </form>
  );
}

function CourseEditor({
  course,
  courses,
}: {
  course: CourseWithDetails;
  courses: CourseWithDetails[];
}) {
  const gradeInputs: WeightedGrade[] = course.grades.map((grade) => ({
    score: grade.score,
    weight: grade.weight,
  }));
  const weightedAverage = calculateWeightedAverage(gradeInputs);
  const completedWeight = gradeInputs
    .filter((grade) => grade.score !== null)
    .reduce((sum, grade) => sum + grade.weight, 0);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="h-1.5" style={{ backgroundColor: course.color }} />
      <div className="p-5">
        <CourseGradeCard
          courseName={course.name}
          courseCode={course.code}
          courseColor={course.color}
          averageGrade={weightedAverage}
          minPassingGrade={course.minPassingGrade}
          completedWeight={completedWeight}
        />
        <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4">
          <details>
            <summary className="cursor-pointer text-sm font-semibold text-ink">
              Editar curso
            </summary>
            <form action={saveCourse} className="mt-3 grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="id" value={course.id} />
              <Field label="Nombre" name="name" defaultValue={course.name} required />
              <Field label="Código" name="code" defaultValue={course.code} required />
              <Field
                label="Color"
                name="color"
                type="color"
                defaultValue={course.color}
                required
              />
              <Field
                label="Nota mínima (0–5)"
                name="minPassingGrade"
                type="number"
                defaultValue={course.minPassingGrade}
                min={0}
                max={5}
                step={0.1}
                required
              />
              <button className={`${buttonClass} sm:col-span-2`} type="submit">
                Guardar curso
              </button>
            </form>
          </details>

          <details>
            <summary className="cursor-pointer text-sm font-semibold text-ink">
              Cortes y notas ({course.grades.length})
            </summary>
            <div className="mt-3 space-y-3">
              {course.grades.map((grade) => (
                <div
                  className="rounded-xl border border-slate-100 bg-paper p-3"
                  key={grade.id}
                >
                  <form action={saveGrade} className="grid gap-3 sm:grid-cols-2">
                    <input type="hidden" name="id" value={grade.id} />
                    <input type="hidden" name="courseId" value={course.id} />
                    <Field label="Nombre del corte" name="title" defaultValue={grade.title} required />
                    <Field
                      label="Nota (0–5; vacío si falta)"
                      name="score"
                      type="number"
                      defaultValue={grade.score ?? ""}
                      min={0}
                      max={5}
                      step={0.1}
                    />
                    <Field
                      label="Peso (%)"
                      name="weight"
                      type="number"
                      defaultValue={grade.weight}
                      min={0.1}
                      max={100}
                      step={0.1}
                      required
                    />
                    <div className="flex items-end justify-between gap-2">
                      <button className={secondaryButtonClass} type="submit">
                        Guardar cambios
                      </button>
                      <DeleteButton action={deleteGrade} id={grade.id} item="este corte" />
                    </div>
                  </form>
                </div>
              ))}
              <form action={saveGrade} className="grid gap-3 rounded-xl border border-dashed border-slate-300 p-3 sm:grid-cols-2">
                <input type="hidden" name="courseId" value={course.id} />
                <Field label="Nuevo corte" name="title" placeholder="Parcial 1" required />
                <Field label="Nota (opcional)" name="score" type="number" min={0} max={5} step={0.1} />
                <Field label="Peso (%)" name="weight" type="number" min={0.1} max={100} step={0.1} required />
                <button className={`${buttonClass} self-end`} type="submit">
                  <Plus size={14} aria-hidden="true" />
                  Añadir corte
                </button>
              </form>
            </div>
          </details>

          <details>
            <summary className="cursor-pointer text-sm font-semibold text-ink">
              Horarios ({course.schedules.length})
            </summary>
            <div className="mt-3 space-y-3">
              {course.schedules.map((schedule) => (
                <div
                  className="rounded-xl border border-slate-100 bg-paper p-3"
                  key={schedule.id}
                >
                  <form action={saveSchedule} className="grid gap-3 sm:grid-cols-2">
                    <input type="hidden" name="id" value={schedule.id} />
                    <CourseSelect courses={courses} defaultValue={course.id} />
                    <label className={labelClass}>
                      Día
                      <select className={fieldClass} name="dayOfWeek" defaultValue={schedule.dayOfWeek}>
                        {weekdayOptions.map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </label>
                    <Field label="Inicio" name="startTime" type="time" defaultValue={`${String(Math.floor(schedule.startMinute / 60)).padStart(2, "0")}:${String(schedule.startMinute % 60).padStart(2, "0")}`} required />
                    <Field label="Fin" name="endTime" type="time" defaultValue={`${String(Math.floor(schedule.endMinute / 60)).padStart(2, "0")}:${String(schedule.endMinute % 60).padStart(2, "0")}`} required />
                    <Field label="Aula o ubicación" name="location" defaultValue={schedule.location ?? ""} />
                    <div className="flex items-end justify-between gap-2">
                      <button className={secondaryButtonClass} type="submit">Guardar cambios</button>
                      <DeleteButton action={deleteSchedule} id={schedule.id} item="esta clase" />
                    </div>
                  </form>
                </div>
              ))}
              <form action={saveSchedule} className="grid gap-3 rounded-xl border border-dashed border-slate-300 p-3 sm:grid-cols-2">
                <CourseSelect courses={courses} defaultValue={course.id} />
                <label className={labelClass}>
                  Día
                  <select className={fieldClass} name="dayOfWeek" defaultValue="MONDAY">
                    {weekdayOptions.map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>
                <Field label="Inicio" name="startTime" type="time" defaultValue="08:00" required />
                <Field label="Fin" name="endTime" type="time" defaultValue="10:00" required />
                <Field label="Aula o ubicación" name="location" placeholder="Aula 101" />
                <button className={`${buttonClass} self-end`} type="submit">
                  <Plus size={14} aria-hidden="true" />
                  Añadir horario
                </button>
              </form>
            </div>
          </details>
          <DeleteButton action={deleteCourse} id={course.id} item={`el curso ${course.name}`} />
        </div>
      </div>
    </div>
  );
}

function TaskEditor({
  task,
  courses,
}: {
  task: TaskWithCourse;
  courses: CourseWithDetails[];
}) {
  return (
    <details className="rounded-xl border border-slate-200 bg-white p-4">
      <summary className="flex cursor-pointer list-none items-center gap-3">
        <span
          className={`size-2.5 shrink-0 rounded-full ${task.status === "DONE" ? "bg-emerald-500" : task.status === "IN_PROGRESS" ? "bg-amber-500" : "bg-slate-300"}`}
          aria-hidden="true"
        />
        <span className={`min-w-0 flex-1 truncate font-medium ${task.status === "DONE" ? "text-slate-400 line-through" : "text-ink"}`}>
          {task.title}
        </span>
        <span className="hidden text-xs text-slate-500 sm:inline">
          {task.course?.name ?? "Personal"}
        </span>
        <span className="text-xs text-slate-400">
          {task.status === "DONE" ? "Hecha" : task.status === "IN_PROGRESS" ? "En progreso" : "Pendiente"}
        </span>
      </summary>
      <form action={saveTask} className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
        <input type="hidden" name="id" value={task.id} />
        <Field label="Tarea" name="title" defaultValue={task.title} required />
        <CourseSelect courses={courses} defaultValue={task.courseId ?? ""} allowNone />
        <Field label="Descripción" name="description" defaultValue={task.description ?? ""} />
        <label className={labelClass}>
          Estado
          <select className={fieldClass} name="status" defaultValue={task.status}>
            {taskStatuses.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <Field label="Fecha límite" name="dueAt" type="datetime-local" defaultValue={localDateTime(task.dueAt)} />
        <div className="flex items-end justify-between gap-2">
          <button className={secondaryButtonClass} type="submit">Guardar cambios</button>
          <DeleteButton action={deleteTask} id={task.id} item="esta tarea" />
        </div>
      </form>
    </details>
  );
}

export function DashboardEditor({
  courses,
  tasks,
  notice,
  error,
  userName,
  userImage,
}: DashboardEditorProps) {
  const schedules: ScheduleBlock[] = courses.flatMap((course) =>
    course.schedules.map((schedule) => ({
      id: schedule.id,
      dayOfWeek: schedule.dayOfWeek,
      startMinute: schedule.startMinute,
      endMinute: schedule.endMinute,
      location: schedule.location,
      course: {
        id: course.id,
        name: course.name,
        code: course.code,
        color: course.color,
      },
    })),
  );
  const completedTasks = tasks.filter((task) => task.status === "DONE").length;

  return (
    <main className="min-h-screen bg-paper px-4 py-8 text-ink sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold tracking-wide text-moss">
              TU ESPACIO DE ESTUDIO
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Hola, {userName.split(" ")[0]}
            </h1>
            <p className="mt-2 text-slate-600">
              Tus cursos, calificaciones, clases y tareas en un solo lugar.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white py-1.5 pl-2 pr-3">
            {userImage ? (
              <Image
                src={userImage}
                alt=""
                width={32}
                height={32}
                className="size-8 rounded-full"
                unoptimized
              />
            ) : (
              <span className="grid size-8 place-items-center rounded-full bg-moss text-sm font-semibold text-white">
                {userName.slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="max-w-32 truncate text-xs font-medium text-slate-600">
              {userName}
            </span>
            <form action={signOutFromDashboard}>
              <button className={secondaryButtonClass} type="submit">
                Salir
              </button>
            </form>
          </div>
        </header>

        {notice && noticeLabels[notice] ? (
          <p role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {noticeLabels[notice]}
          </p>
        ) : null}
        {error && errorLabels[error] ? (
          <p role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {errorLabels[error]}
          </p>
        ) : null}

        <section className="mb-8" aria-labelledby="courses-title">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-moss">
                Seguimiento
              </p>
              <h2 id="courses-title" className="mt-1 text-xl font-semibold">
                Mis cursos
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              {courses.length} {courses.length === 1 ? "curso" : "cursos"}
            </p>
          </div>

          {courses.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {courses.map((course) => (
                <CourseEditor key={course.id} course={course} courses={courses} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center">
              <BookOpen className="mx-auto text-moss" size={25} aria-hidden="true" />
              <h3 className="mt-3 font-semibold">Agrega tu primer curso</h3>
              <p className="mt-1 text-sm text-slate-500">
                Después podrás registrar sus cortes, notas y horarios.
              </p>
            </div>
          )}

          <details className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
            <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-ink">
              <Plus size={18} aria-hidden="true" />
              Crear curso
            </summary>
            <form action={saveCourse} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Nombre" name="name" placeholder="Estructuras de datos" required />
              <Field label="Código" name="code" placeholder="CS-204" required />
              <Field label="Color" name="color" type="color" defaultValue="#577568" required />
              <Field label="Nota mínima (0–5)" name="minPassingGrade" type="number" defaultValue={3} min={0} max={5} step={0.1} required />
              <button className={`${buttonClass} sm:col-span-2 lg:col-span-4`} type="submit">
                Guardar curso
              </button>
            </form>
          </details>
        </section>

        <section className="mb-8" aria-labelledby="schedule-title">
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays size={18} className="text-moss" aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-moss">
                Organización
              </p>
              <h2 id="schedule-title" className="mt-1 text-xl font-semibold">
                Mi horario
              </h2>
            </div>
          </div>
          {schedules.length ? (
            <ScheduleGrid schedules={schedules} />
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-6 text-sm text-slate-600">
              Añade un horario desde la sección de horarios de cualquiera de tus cursos.
            </div>
          )}
        </section>

        <section aria-labelledby="tasks-title">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-moss">
                Plan de acción
              </p>
              <h2 id="tasks-title" className="mt-1 text-xl font-semibold">
                Mis tareas
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              {completedTasks} de {tasks.length} completadas
            </p>
          </div>

          <div className="grid gap-2">
            {tasks.map((task) => (
              <TaskEditor key={task.id} task={task} courses={courses} />
            ))}
            <details className="rounded-2xl border border-slate-200 bg-white p-5">
              <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-ink">
                <Plus size={18} aria-hidden="true" />
                Crear tarea
              </summary>
              <form action={saveTask} className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field label="Tarea" name="title" placeholder="Preparar el primer parcial" required />
                <CourseSelect courses={courses} allowNone />
                <Field label="Descripción" name="description" placeholder="Añade contexto o pasos útiles" />
                <label className={labelClass}>
                  Estado
                  <select className={fieldClass} name="status" defaultValue="TODO">
                    {taskStatuses.map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>
                <Field label="Fecha límite" name="dueAt" type="datetime-local" />
                <button className={`${buttonClass} self-end`} type="submit">
                  Guardar tarea
                </button>
              </form>
            </details>
          </div>
        </section>

        <footer className="mt-10 border-t border-slate-200 pt-5 text-center text-xs text-slate-400">
          <Link href="/login" className="transition hover:text-moss">
            Panel privado · sesión protegida
          </Link>
        </footer>
      </div>
    </main>
  );
}
