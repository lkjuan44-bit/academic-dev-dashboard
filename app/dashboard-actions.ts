"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const courseSchema = z.object({
  name: z.string().trim().min(1).max(100),
  code: z.string().trim().min(1).max(24).transform((value) => value.toUpperCase()),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  minPassingGrade: z.coerce.number().min(0).max(5),
});

const gradeSchema = z.object({
  id: z.string().optional(),
  courseId: z.string().min(1),
  title: z.string().trim().min(1).max(100),
  score: z.union([z.literal(""), z.coerce.number().min(0).max(5)]),
  weight: z.coerce.number().gt(0).max(100),
});

const startTimeSchema = z.string().regex(/^(?:0[7-9]|1\d|2[01]):[0-5]\d$/);
const endTimeSchema = z.string().regex(/^(?:(?:0[7-9]|1\d|2[01]):[0-5]\d|22:00)$/);

const scheduleSchema = z.object({
  id: z.string().optional(),
  courseId: z.string().min(1),
  dayOfWeek: z.enum([
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
  ]),
  startTime: startTimeSchema,
  endTime: endTimeSchema,
  location: z.string().trim().max(100),
});

const taskSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1000),
  courseId: z.string(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]),
  dueAt: z.string().refine(
    (value) => value === "" || Number.isFinite(new Date(value).getTime()),
  ),
});

type NoticeCode =
  | "course-saved"
  | "course-deleted"
  | "grade-saved"
  | "grade-deleted"
  | "schedule-saved"
  | "schedule-deleted"
  | "task-saved"
  | "task-deleted";
type ErrorCode =
  | "invalid"
  | "duplicate"
  | "weight"
  | "course"
  | "record"
  | "time"
  | "schedule"
  | "generic";

function getFormValues(formData: FormData): Record<string, FormDataEntryValue> {
  return Object.fromEntries(formData.entries());
}

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session.user.id;
}

function finishWithNotice(code: NoticeCode): never {
  revalidatePath("/");
  redirect(`/?notice=${code}`);
}

function finishWithError(code: ErrorCode): never {
  redirect(`/?error=${code}`);
}

function isDuplicateCodeError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function minutesFromTime(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

async function assertOwnedCourse(courseId: string, userId: string) {
  const course = await prisma.course.findFirst({
    where: { id: courseId, userId },
    select: { id: true },
  });
  if (!course) {
    return false;
  }
  return true;
}

export async function saveCourse(formData: FormData) {
  const userId = await requireUserId();
  const values = getFormValues(formData);
  const id = typeof values.id === "string" ? values.id : "";
  const parsed = courseSchema.safeParse(values);
  if (!parsed.success) {
    finishWithError("invalid");
  }

  try {
    if (id) {
      const updated = await prisma.course.updateMany({
        where: { id, userId },
        data: parsed.data,
      });
      if (updated.count === 0) {
        finishWithError("record");
      }
    } else {
      await prisma.course.create({ data: { ...parsed.data, userId } });
    }
  } catch (error) {
    if (isDuplicateCodeError(error)) {
      finishWithError("duplicate");
    }
    throw error;
  }

  finishWithNotice("course-saved");
}

export async function deleteCourse(formData: FormData) {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  if (!id) {
    finishWithError("invalid");
  }

  const deleted = await prisma.course.deleteMany({ where: { id, userId } });
  if (deleted.count === 0) {
    finishWithError("record");
  }
  finishWithNotice("course-deleted");
}

export async function saveGrade(formData: FormData) {
  const userId = await requireUserId();
  const values = getFormValues(formData);
  const parsed = gradeSchema.safeParse(values);
  if (!parsed.success) {
    finishWithError("invalid");
  }
  const { id, courseId, title, score, weight } = parsed.data;

  if (!(await assertOwnedCourse(courseId, userId))) {
    finishWithError("course");
  }

  const otherGrades = await prisma.grade.aggregate({
    where: {
      courseId,
      ...(id ? { id: { not: id } } : {}),
    },
    _sum: { weight: true },
  });
  if ((otherGrades._sum.weight ?? 0) + weight > 100) {
    finishWithError("weight");
  }

  const gradeData = {
    courseId,
    title,
    score: score === "" ? null : score,
    weight,
    evaluatedAt: score === "" ? null : new Date(),
  };

  if (id) {
    const updated = await prisma.grade.updateMany({
      where: { id, course: { userId } },
      data: gradeData,
    });
    if (updated.count === 0) {
      finishWithError("record");
    }
  } else {
    await prisma.grade.create({ data: { ...gradeData, courseId } });
  }

  finishWithNotice("grade-saved");
}

export async function deleteGrade(formData: FormData) {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  if (!id) {
    finishWithError("invalid");
  }

  const deleted = await prisma.grade.deleteMany({
    where: { id, course: { userId } },
  });
  if (deleted.count === 0) {
    finishWithError("record");
  }
  finishWithNotice("grade-deleted");
}

export async function saveSchedule(formData: FormData) {
  const userId = await requireUserId();
  const values = getFormValues(formData);
  const parsed = scheduleSchema.safeParse(values);
  if (!parsed.success) {
    finishWithError("invalid");
  }
  const { id, courseId, dayOfWeek, startTime, endTime, location } = parsed.data;
  const startMinute = minutesFromTime(startTime);
  const endMinute = minutesFromTime(endTime);

  if (endMinute <= startMinute) {
    finishWithError("time");
  }
  if (!(await assertOwnedCourse(courseId, userId))) {
    finishWithError("course");
  }

  const overlapping = await prisma.schedule.findFirst({
    where: {
      course: { userId },
      dayOfWeek,
      ...(id ? { id: { not: id } } : {}),
      startMinute: { lt: endMinute },
      endMinute: { gt: startMinute },
    },
    select: { id: true },
  });
  if (overlapping) {
    finishWithError("schedule");
  }

  const scheduleData = {
    courseId,
    dayOfWeek,
    startMinute,
    endMinute,
    location: location || null,
  };

  if (id) {
    const updated = await prisma.schedule.updateMany({
      where: { id, course: { userId } },
      data: scheduleData,
    });
    if (updated.count === 0) {
      finishWithError("record");
    }
  } else {
    await prisma.schedule.create({
      data: { ...scheduleData, courseId },
    });
  }

  finishWithNotice("schedule-saved");
}

export async function deleteSchedule(formData: FormData) {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  if (!id) {
    finishWithError("invalid");
  }

  const deleted = await prisma.schedule.deleteMany({
    where: { id, course: { userId } },
  });
  if (deleted.count === 0) {
    finishWithError("record");
  }
  finishWithNotice("schedule-deleted");
}

export async function saveTask(formData: FormData) {
  const userId = await requireUserId();
  const values = getFormValues(formData);
  const parsed = taskSchema.safeParse(values);
  if (!parsed.success) {
    finishWithError("invalid");
  }
  const { id, title, description, courseId, status, dueAt } = parsed.data;

  if (courseId && !(await assertOwnedCourse(courseId, userId))) {
    finishWithError("course");
  }

  const taskData = {
    title,
    description: description || null,
    courseId: courseId || null,
    status,
    dueAt: dueAt ? new Date(dueAt) : null,
  };

  if (id) {
    const updated = await prisma.task.updateMany({
      where: { id, userId },
      data: taskData,
    });
    if (updated.count === 0) {
      finishWithError("record");
    }
  } else {
    await prisma.task.create({
      data: { ...taskData, userId },
    });
  }

  finishWithNotice("task-saved");
}

export async function deleteTask(formData: FormData) {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  if (!id) {
    finishWithError("invalid");
  }

  const deleted = await prisma.task.deleteMany({ where: { id, userId } });
  if (deleted.count === 0) {
    finishWithError("record");
  }
  finishWithNotice("task-deleted");
}
