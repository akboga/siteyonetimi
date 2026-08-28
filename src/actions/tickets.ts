"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCompanyUser } from "@/lib/session";
import { assertSiteAccess } from "@/lib/permissions";

const ticketSchema = z.object({
  reportedBy: z.string().trim().min(1, "Bildiren kişi gerekli"),
  category: z.string().trim().min(1, "Kategori gerekli"),
  description: z.string().trim().min(1, "Açıklama gerekli"),
  priority: z.enum(["DUSUK", "ORTA", "YUKSEK", "ACIL"]),
  unitId: z.string().trim().optional(),
});

export async function createTicketAction(
  siteId: string,
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const user = await requireCompanyUser();
  await assertSiteAccess(user, siteId);

  const parsed = ticketSchema.safeParse({
    reportedBy: formData.get("reportedBy"),
    category: formData.get("category"),
    description: formData.get("description"),
    priority: formData.get("priority"),
    unitId: formData.get("unitId"),
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Girilen bilgiler geçersiz.";
  }

  if (parsed.data.unitId) {
    const unit = await prisma.unit.findUnique({ where: { id: parsed.data.unitId } });
    if (!unit || unit.siteId !== siteId) return "Geçersiz daire seçimi.";
  }

  await prisma.ticket.create({
    data: {
      siteId,
      unitId: parsed.data.unitId || null,
      reportedBy: parsed.data.reportedBy,
      category: parsed.data.category,
      description: parsed.data.description,
      priority: parsed.data.priority,
    },
  });

  revalidatePath(`/sites/${siteId}/tickets`);
}

export async function updateTicketStatusAction(
  siteId: string,
  ticketId: string,
  status: "ACIK" | "ISLEMDE" | "COZULDU" | "IPTAL",
) {
  const user = await requireCompanyUser();
  await assertSiteAccess(user, siteId);

  const isClosed = status === "COZULDU" || status === "IPTAL";

  await prisma.ticket.update({
    where: { id: ticketId, siteId },
    data: { status, closedAt: isClosed ? new Date() : null },
  });

  revalidatePath(`/sites/${siteId}/tickets`);
}

const assignSchema = z.object({
  assignedTo: z.string().trim().min(1, "Atanan kişi/firma gerekli"),
});

export async function assignTicketAction(
  siteId: string,
  ticketId: string,
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const user = await requireCompanyUser();
  await assertSiteAccess(user, siteId);

  const parsed = assignSchema.safeParse({ assignedTo: formData.get("assignedTo") });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Girilen bilgiler geçersiz.";
  }

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId, siteId } });
  if (!ticket) return "Talep bulunamadı.";

  await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      assignedTo: parsed.data.assignedTo,
      status: ticket.status === "ACIK" ? "ISLEMDE" : ticket.status,
    },
  });

  revalidatePath(`/sites/${siteId}/tickets`);
}

export async function deleteTicketAction(siteId: string, ticketId: string) {
  const user = await requireCompanyUser();
  await assertSiteAccess(user, siteId);

  await prisma.ticket.delete({ where: { id: ticketId, siteId } });

  revalidatePath(`/sites/${siteId}/tickets`);
}
