import { CourseGradeCard } from "@/components/dashboard/CourseGradeCard";
import {
  ScheduleGrid,
  type ScheduleBlock,
} from "@/components/dashboard/ScheduleGrid";

const courses = [
  {
    id: "course-algorithms",
    name: "Estructuras de datos",
    code: "CS-204",
    color: "#4e7c69",
    averageGrade: 4.1,
    minPassingGrade: 3,
    completedWeight: 55,
  },
  {
    id: "course-mathematics",
    name: "Matemáticas discretas",
    code: "MA-112",
    color: "#7763a8",
    averageGrade: 2.8,
    minPassingGrade: 3,
    completedWeight: 40,
  },
  {
    id: "course-design",
    name: "Diseño de interfaces",
    code: "UX-130",
    color: "#c2764d",
    averageGrade: 3.4,
    minPassingGrade: 3,
    completedWeight: 70,
  },
];

const schedules: ScheduleBlock[] = [
  {
    id: "schedule-algorithms-mon",
    dayOfWeek: "MONDAY",
    startMinute: 8 * 60,
    endMinute: 10 * 60,
    location: "Aula 204",
    course: {
      id: courses[0].id,
      name: courses[0].name,
      code: courses[0].code,
      color: courses[0].color,
    },
  },
  {
    id: "schedule-math-tue",
    dayOfWeek: "TUESDAY",
    startMinute: 10 * 60,
    endMinute: 12 * 60,
    location: "Bloque B · 301",
    course: {
      id: courses[1].id,
      name: courses[1].name,
      code: courses[1].code,
      color: courses[1].color,
    },
  },
  {
    id: "schedule-design-wed",
    dayOfWeek: "WEDNESDAY",
    startMinute: 13 * 60,
    endMinute: 15 * 60,
    location: "Laboratorio 2",
    course: {
      id: courses[2].id,
      name: courses[2].name,
      code: courses[2].code,
      color: courses[2].color,
    },
  },
  {
    id: "schedule-algorithms-thu",
    dayOfWeek: "THURSDAY",
    startMinute: 8 * 60,
    endMinute: 10 * 60,
    location: "Aula 204",
    course: {
      id: courses[0].id,
      name: courses[0].name,
      code: courses[0].code,
      color: courses[0].color,
    },
  },
  {
    id: "schedule-math-fri",
    dayOfWeek: "FRIDAY",
    startMinute: 14 * 60,
    endMinute: 16 * 60,
    location: "Bloque B · 301",
    course: {
      id: courses[1].id,
      name: courses[1].name,
      code: courses[1].code,
      color: courses[1].color,
    },
  },
  {
    id: "schedule-design-sat",
    dayOfWeek: "SATURDAY",
    startMinute: 9 * 60,
    endMinute: 11 * 60,
    location: "En línea",
    course: {
      id: courses[2].id,
      name: courses[2].name,
      code: courses[2].code,
      color: courses[2].color,
    },
  },
];

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-paper px-4 py-8 text-ink sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold tracking-wide text-moss">
              TU ESPACIO DE ESTUDIO
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Hola
            </h1>
            <p className="mt-2 text-slate-600">
              Un vistazo claro a tu semana y tu progreso.
            </p>
          </div>
          <p className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
            Dashboard personal
          </p>
        </header>

        <section aria-labelledby="courses-title" className="mb-8">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-moss">
              Seguimiento
            </p>
            <h2 id="courses-title" className="mt-1 text-xl font-semibold">
              Mis cursos
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {courses.map((course) => (
              <CourseGradeCard
                key={course.id}
                courseName={course.name}
                courseCode={course.code}
                courseColor={course.color}
                averageGrade={course.averageGrade}
                minPassingGrade={course.minPassingGrade}
                completedWeight={course.completedWeight}
              />
            ))}
          </div>
        </section>

        <ScheduleGrid schedules={schedules} />
      </div>
    </main>
  );
}
