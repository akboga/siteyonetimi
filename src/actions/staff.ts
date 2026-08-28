"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";

const staffSchema = z.object({
  name: z.string().trim().min(2, "Ad soyad en az 2 karakter olmalı"),
  email: z.email("Geçerli bir e-posta girin"),
  phone: z.string().trim().optional(),
  password: z.string().min(8, "Şifre en az 8 karakter olmalı"),
});

export async function createStaffAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const admin = await requireRole("COMPANY_ADMIN");

  const parsed = staffSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Girilen bilgiler geçersiz.";
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return "Bu e-posta adresiyle zaten bir kullanıcı var.";

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  const staff = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      passwordHash,
      role: "COMPANY_STAFF",
      companyId: admin.companyId!,
    },
  });

  revalidatePath("/staff");
  redirect(`/staff/${staff.id}`);
}

export async function toggleStaffActiveAction(staffId: string) {
  const admin = await requireRole("COMPANY_ADMIN");

  const staff = await prisma.user.findUniqueOrThrow({ where: { id: staffId } });
  if (staff.companyId !== admin.companyId || staff.role !== "COMPANY_STAFF") {
    throw new Error("Bu kullanıcı üzerinde işlem yapamazsınız.");
  }

  await prisma.user.update({ where: { id: staffId }, data: { isActive: !staff.isActive } });
  revalidatePath("/staff");
  revalidatePath(`/staff/${staffId}`);
}

export async function updateStaffSiteAccessAction(staffId: string, formData: FormData) {
  const admin = await requireRole("COMPANY_ADMIN");

  const staff = await prisma.user.findUniqueOrThrow({ where: { id: staffId } });
  if (staff.companyId !== admin.companyId || staff.role !== "COMPANY_STAFF") {
    throw new Error("Bu kullanıcı üzerinde işlem yapamazsınız.");
  }

  const companySites = await prisma.site.findMany({
    where: { companyId: admin.companyId! },
    select: { id: true },
  });
  const companySiteIds = new Set(companySites.map((s) => s.id));
  const selectedSiteIds = formData.getAll("siteIds").filter((id): id is string => typeof id === "string" && companySiteIds.has(id));

  await prisma.$transaction([
    prisma.userSiteAccess.deleteMany({ where: { userId: staffId } }),
    prisma.userSiteAccess.createMany({
      data: selectedSiteIds.map((siteId) => ({ userId: staffId, siteId })),
    }),
  ]);

  revalidatePath(`/staff/${staffId}`);
}
