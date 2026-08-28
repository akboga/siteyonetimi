"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCompanyUser } from "@/lib/session";
import { assertSiteAccess } from "@/lib/permissions";

const PERIOD_MONTHS: Record<string, number> = {
  AYLIK: 1,
  UC_AYLIK: 3,
  YILLIK: 12,
};

function addMonths(date: Date, months: number) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

const scheduleSchema = z.object({
  equipment: z.string().trim().min(1, "Ekipman/alan adı gerekli"),
  period: z.enum(["AYLIK", "UC_AYLIK", "YILLIK"]),
  nextDueDate: z.string().trim().optional(),
});

export async function createMaintenanceScheduleAction(
  siteId: string,
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const user = await requireCompanyUser();
  await assertSiteAccess(user, siteId);

  const parsed = scheduleSchema.safeParse({
    equipment: formData.get("equipment"),
    period: formData.get("period"),
    nextDueDate: formData.get("nextDueDate"),
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Girilen bilgiler geçersiz.";
  }

  await prisma.maintenanceSchedule.create({
    data: {
      siteId,
      equipment: parsed.data.equipment,
      period: parsed.data.period,
      nextDueDate: parsed.data.nextDueDate ? new Date(parsed.data.nextDueDate) : null,
    },
  });

  revalidatePath(`/sites/${siteId}/maintenance`);
}

export async function deleteMaintenanceScheduleAction(siteId: string, scheduleId: string) {
  const user = await requireCompanyUser();
  await assertSiteAccess(user, siteId);

  await prisma.maintenanceSchedule.delete({ where: { id: scheduleId, siteId } });

  revalidatePath(`/sites/${siteId}/maintenance`);
}

async function getScheduleSiteId(scheduleId: string) {
  const schedule = await prisma.maintenanceSchedule.findUniqueOrThrow({
    where: { id: scheduleId },
    select: { siteId: true, period: true },
  });
  return schedule;
}

const logSchema = z.object({
  performedDate: z.string().trim().min(1, "Yapılma tarihi gerekli"),
  performedBy: z.string().trim().optional(),
  cost: z.coerce.number().min(0).optional().or(z.literal("").transform(() => undefined)),
  notes: z.string().trim().optional(),
  attachmentUrl: z.string().trim().optional(),
});

/** Bakım gerçekleştirildiğinde kayıt oluşturur ve planın son/sıradaki tarihini günceller. */
export async function logMaintenanceAction(
  scheduleId: string,
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const user = await requireCompanyUser();
  const schedule = await getScheduleSiteId(scheduleId);
  await assertSiteAccess(user, schedule.siteId);

  const parsed = logSchema.safeParse({
    performedDate: formData.get("performedDate"),
    performedBy: formData.get("performedBy"),
    cost: formData.get("cost"),
    notes: formData.get("notes"),
    attachmentUrl: formData.get("attachmentUrl"),
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Girilen bilgiler geçersiz.";
  }

  const performedDate = new Date(parsed.data.performedDate);
  const nextDueDate = addMonths(performedDate, PERIOD_MONTHS[schedule.period]);

  await prisma.$transaction([
    prisma.maintenanceLog.create({
      data: {
        scheduleId,
        performedDate,
        performedBy: parsed.data.performedBy || null,
        cost: parsed.data.cost,
        notes: parsed.data.notes || null,
        attachmentUrl: parsed.data.attachmentUrl || null,
      },
    }),
    prisma.maintenanceSchedule.update({
      where: { id: scheduleId },
      data: { lastDoneDate: performedDate, nextDueDate },
    }),
  ]);

  revalidatePath(`/sites/${schedule.siteId}/maintenance`);
}

export async function deleteMaintenanceLogAction(scheduleId: string, logId: string) {
  const user = await requireCompanyUser();
  const schedule = await getScheduleSiteId(scheduleId);
  await assertSiteAccess(user, schedule.siteId);

  await prisma.maintenanceLog.delete({ where: { id: logId, scheduleId } });

  revalidatePath(`/sites/${schedule.siteId}/maintenance`);
}
