"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCompanyUser } from "@/lib/session";
import { assertSiteAccess } from "@/lib/permissions";

const meetingSchema = z.object({
  date: z.string().trim().min(1, "Tarih gerekli"),
  agenda: z.string().trim().optional(),
  participants: z.string().trim().optional(),
  minutesText: z.string().trim().optional(),
  minutesFileUrl: z.string().trim().optional(),
});

export async function createMeetingAction(
  siteId: string,
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const user = await requireCompanyUser();
  await assertSiteAccess(user, siteId);

  const parsed = meetingSchema.safeParse({
    date: formData.get("date"),
    agenda: formData.get("agenda"),
    participants: formData.get("participants"),
    minutesText: formData.get("minutesText"),
    minutesFileUrl: formData.get("minutesFileUrl"),
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Girilen bilgiler geçersiz.";
  }

  await prisma.meeting.create({
    data: {
      siteId,
      date: new Date(parsed.data.date),
      agenda: parsed.data.agenda || null,
      participants: parsed.data.participants || null,
      minutesText: parsed.data.minutesText || null,
      minutesFileUrl: parsed.data.minutesFileUrl || null,
    },
  });

  revalidatePath(`/sites/${siteId}/meetings`);
}

export async function deleteMeetingAction(siteId: string, meetingId: string) {
  const user = await requireCompanyUser();
  await assertSiteAccess(user, siteId);

  await prisma.meeting.delete({ where: { id: meetingId, siteId } });

  revalidatePath(`/sites/${siteId}/meetings`);
}

const decisionSchema = z.object({
  decisionNumber: z.string().trim().min(1, "Karar no gerekli"),
  date: z.string().trim().min(1, "Tarih gerekli"),
  text: z.string().trim().min(1, "Karar metni gerekli"),
  meetingId: z.string().trim().optional(),
});

export async function createDecisionAction(
  siteId: string,
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const user = await requireCompanyUser();
  await assertSiteAccess(user, siteId);

  const parsed = decisionSchema.safeParse({
    decisionNumber: formData.get("decisionNumber"),
    date: formData.get("date"),
    text: formData.get("text"),
    meetingId: formData.get("meetingId"),
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Girilen bilgiler geçersiz.";
  }

  if (parsed.data.meetingId) {
    const meeting = await prisma.meeting.findUnique({ where: { id: parsed.data.meetingId } });
    if (!meeting || meeting.siteId !== siteId) return "Geçersiz toplantı seçimi.";
  }

  await prisma.decision.create({
    data: {
      siteId,
      meetingId: parsed.data.meetingId || null,
      decisionNumber: parsed.data.decisionNumber,
      date: new Date(parsed.data.date),
      text: parsed.data.text,
    },
  });

  revalidatePath(`/sites/${siteId}/meetings`);
}

export async function deleteDecisionAction(siteId: string, decisionId: string) {
  const user = await requireCompanyUser();
  await assertSiteAccess(user, siteId);

  await prisma.decision.delete({ where: { id: decisionId, siteId } });

  revalidatePath(`/sites/${siteId}/meetings`);
}
