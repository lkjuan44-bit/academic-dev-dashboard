import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DashboardEditor } from "@/components/dashboard/DashboardEditor";

interface DashboardPageProps {
  searchParams: Promise<{
    notice?: string;
    error?: string;
  }>;
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const [courses, tasks, params] = await Promise.all([
    prisma.course.findMany({
      where: { userId: session.user.id },
      include: { grades: true, schedules: true },
      orderBy: { name: "asc" },
    }),
    prisma.task.findMany({
      where: { userId: session.user.id },
      include: { course: { select: { name: true, color: true } } },
      orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
    }),
    searchParams,
  ]);

  return (
    <DashboardEditor
      courses={courses}
      tasks={tasks}
      notice={params.notice}
      error={params.error}
      userName={session.user.name ?? "estudiante"}
      userImage={session.user.image}
    />
  );
}
