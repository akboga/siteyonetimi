"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";

const packageSchema = z.object({
  name: z.string().trim().min(2, "Paket adı en az 2 karakter olmalı"),
  isCustom: z.coerce.boolean(),
  unitLimit: z.coerce.number().int().positive("Daire limiti sıfırdan büyük olmalı").optional(),
  monthlyPrice: z.coerce.number().positive("Aylık ücret sıfırdan büyük olmalı").optional(),
  sortOrder: z.coerce.number().int().optional(),
});

function parsePackageForm(formData: FormData) {
  return packageSchema.safeParse({
    name: formData.get("name"),
    isCustom: formData.get("isCustom") === "on",
    unitLimit: formData.get("unitLimit") || undefined,
    monthlyPrice: formData.get("monthlyPrice") || undefined,
    sortOrder: formData.get("sortOrder") || undefined,
  });
}

export async function createPackageAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  await requireRole("SUPER_ADMIN");

  const parsed = parsePackageForm(formData);
  if (!parsed.success) return parsed.error.issues[0]?.message ?? "Girilen bilgiler geçersiz.";
  if (!parsed.data.isCustom && (!parsed.data.unitLimit || !parsed.data.monthlyPrice)) {
    return "Özel paket değilse daire limiti ve aylık ücret zorunludur.";
  }

  const existing = await prisma.subscriptionPackage.findUnique({ where: { name: parsed.data.name } });
  if (existing) return "Bu isimde bir paket zaten var.";

  await prisma.subscriptionPackage.create({
    data: {
      name: parsed.data.name,
      isCustom: parsed.data.isCustom,
      unitLimit: parsed.data.isCustom ? null : parsed.data.unitLimit,
      monthlyPrice: parsed.data.isCustom ? null : parsed.data.monthlyPrice,
      sortOrder: parsed.data.sortOrder ?? 0,
    },
  });

  revalidatePath("/superadmin/pricing");
}

export async function updatePackageAction(
  packageId: string,
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  await requireRole("SUPER_ADMIN");

  const parsed = parsePackageForm(formData);
  if (!parsed.success) return parsed.error.issues[0]?.message ?? "Girilen bilgiler geçersiz.";
  if (!parsed.data.isCustom && (!parsed.data.unitLimit || !parsed.data.monthlyPrice)) {
    return "Özel paket değilse daire limiti ve aylık ücret zorunludur.";
  }

  await prisma.subscriptionPackage.update({
    where: { id: packageId },
    data: {
      name: parsed.data.name,
      isCustom: parsed.data.isCustom,
      unitLimit: parsed.data.isCustom ? null : parsed.data.unitLimit,
      monthlyPrice: parsed.data.isCustom ? null : parsed.data.monthlyPrice,
      sortOrder: parsed.data.sortOrder ?? 0,
    },
  });

  revalidatePath("/superadmin/pricing");
}
