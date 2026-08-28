"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireCompanyUser } from "@/lib/session";
import { assertSiteAccess } from "@/lib/permissions";

const unitSchema = z.object({
  unitNumber: z.string().trim().min(1, "Daire no gerekli"),
  floor: z.string().trim().optional(),
  blockName: z.string().trim().optional(),
  type: z.enum(["MESKEN", "ISYERI", "DEPO", "DIGER"]),
  roomLayout: z.enum(["BIR_ARTI_BIR", "IKI_ARTI_BIR", "UC_ARTI_BIR", "DIGER"]).optional(),
  areaM2: z.coerce.number().positive().optional().or(z.literal("").transform(() => undefined)),
  fullName: z.string().trim().min(2, "Ad soyad en az 2 karakter olmalı"),
  relationType: z.enum(["MALIK", "KIRACI"]),
  phone: z.string().trim().optional(),
  email: z.email("Geçerli bir e-posta girin").optional().or(z.literal("")),
});

export async function createUnitAction(
  siteId: string,
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const user = await requireCompanyUser();
  await assertSiteAccess(user, siteId);

  const parsed = unitSchema.safeParse({
    unitNumber: formData.get("unitNumber"),
    floor: formData.get("floor"),
    blockName: formData.get("blockName"),
    type: formData.get("type"),
    roomLayout: formData.get("roomLayout"),
    areaM2: formData.get("areaM2"),
    fullName: formData.get("fullName"),
    relationType: formData.get("relationType"),
    phone: formData.get("phone"),
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Girilen bilgiler geçersiz.";
  }

  let blockId: string | null = null;
  if (parsed.data.blockName) {
    const block = await prisma.block.upsert({
      where: { siteId_name: { siteId, name: parsed.data.blockName } },
      update: {},
      create: { siteId, name: parsed.data.blockName },
    });
    blockId = block.id;
  }

  await prisma.unit.create({
    data: {
      siteId,
      blockId,
      unitNumber: parsed.data.unitNumber,
      floor: parsed.data.floor || null,
      type: parsed.data.type,
      roomLayout: parsed.data.type === "MESKEN" ? (parsed.data.roomLayout ?? null) : null,
      areaM2: parsed.data.areaM2 ?? null,
      residents: {
        create: {
          fullName: parsed.data.fullName,
          phone: parsed.data.phone || null,
          email: parsed.data.email || null,
          relationType: parsed.data.relationType,
        },
      },
    },
  });

  revalidatePath(`/sites/${siteId}`);
  redirect(`/sites/${siteId}`);
}

const updateUnitSchema = z.object({
  unitNumber: z.string().trim().min(1, "Daire no gerekli"),
  floor: z.string().trim().optional(),
  type: z.enum(["MESKEN", "ISYERI", "DEPO", "DIGER"]),
  roomLayout: z.enum(["BIR_ARTI_BIR", "IKI_ARTI_BIR", "UC_ARTI_BIR", "DIGER"]).optional(),
  areaM2: z.coerce.number().positive().optional().or(z.literal("").transform(() => undefined)),
});

export async function updateUnitAction(
  unitId: string,
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const user = await requireCompanyUser();
  const unit = await prisma.unit.findUniqueOrThrow({ where: { id: unitId }, select: { siteId: true } });
  await assertSiteAccess(user, unit.siteId);

  const parsed = updateUnitSchema.safeParse({
    unitNumber: formData.get("unitNumber"),
    floor: formData.get("floor"),
    type: formData.get("type"),
    roomLayout: formData.get("roomLayout"),
    areaM2: formData.get("areaM2"),
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Girilen bilgiler geçersiz.";
  }

  await prisma.unit.update({
    where: { id: unitId },
    data: {
      unitNumber: parsed.data.unitNumber,
      floor: parsed.data.floor || null,
      type: parsed.data.type,
      roomLayout: parsed.data.type === "MESKEN" ? (parsed.data.roomLayout ?? null) : null,
      areaM2: parsed.data.areaM2 ?? null,
    },
  });

  revalidatePath(`/units/${unitId}`);
  revalidatePath(`/sites/${unit.siteId}`);
}

export async function deleteUnitAction(siteId: string, unitId: string) {
  const user = await requireCompanyUser();
  await assertSiteAccess(user, siteId);

  await prisma.unit.delete({ where: { id: unitId, siteId } });

  revalidatePath(`/sites/${siteId}`);
}
