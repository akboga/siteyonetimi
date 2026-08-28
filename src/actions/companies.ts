"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";

const createCompanySchema = z.object({
  name: z.string().trim().min(2, "Şirket adı en az 2 karakter olmalı"),
  taxNumber: z.string().trim().optional(),
  contactEmail: z.email("Geçerli bir e-posta girin").optional().or(z.literal("")),
  contactPhone: z.string().trim().optional(),
  adminName: z.string().trim().min(2, "Yönetici adı en az 2 karakter olmalı"),
  adminEmail: z.email("Geçerli bir e-posta girin"),
  adminPassword: z.string().min(8, "Şifre en az 8 karakter olmalı"),
});

export async function createCompanyAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  await requireRole("SUPER_ADMIN");

  const parsed = createCompanySchema.safeParse({
    name: formData.get("name"),
    taxNumber: formData.get("taxNumber"),
    contactEmail: formData.get("contactEmail"),
    contactPhone: formData.get("contactPhone"),
    adminName: formData.get("adminName"),
    adminEmail: formData.get("adminEmail"),
    adminPassword: formData.get("adminPassword"),
  });

  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Girilen bilgiler geçersiz.";
  }

  const existingUser = await prisma.user.findUnique({ where: { email: parsed.data.adminEmail } });
  if (existingUser) {
    return "Bu e-posta adresiyle zaten bir kullanıcı var.";
  }

  const passwordHash = await bcrypt.hash(parsed.data.adminPassword, 12);

  await prisma.company.create({
    data: {
      name: parsed.data.name,
      taxNumber: parsed.data.taxNumber || null,
      contactEmail: parsed.data.contactEmail || null,
      contactPhone: parsed.data.contactPhone || null,
      users: {
        create: {
          name: parsed.data.adminName,
          email: parsed.data.adminEmail,
          passwordHash,
          role: "COMPANY_ADMIN",
        },
      },
    },
  });

  revalidatePath("/superadmin/companies");
  redirect("/superadmin/companies");
}

const companySettingsSchema = z.object({
  name: z.string().trim().min(2, "Şirket adı en az 2 karakter olmalı"),
  taxNumber: z.string().trim().optional(),
  contactEmail: z.email("Geçerli bir e-posta girin").optional().or(z.literal("")),
  contactPhone: z.string().trim().optional(),
  billingAddress: z.string().trim().optional(),
});

/** Şirket Yöneticisi'nin kendi şirket bilgilerini (fatura adresi vb.) düzenlemesi için. */
export async function updateCompanySettingsAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const admin = await requireRole("COMPANY_ADMIN");
  if (!admin.companyId) return "Şirket bulunamadı.";

  const parsed = companySettingsSchema.safeParse({
    name: formData.get("name"),
    taxNumber: formData.get("taxNumber"),
    contactEmail: formData.get("contactEmail"),
    contactPhone: formData.get("contactPhone"),
    billingAddress: formData.get("billingAddress"),
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Girilen bilgiler geçersiz.";
  }

  await prisma.company.update({
    where: { id: admin.companyId },
    data: {
      name: parsed.data.name,
      taxNumber: parsed.data.taxNumber || null,
      contactEmail: parsed.data.contactEmail || null,
      contactPhone: parsed.data.contactPhone || null,
      billingAddress: parsed.data.billingAddress || null,
    },
  });

  revalidatePath("/settings");
}

export async function toggleCompanyStatusAction(companyId: string) {
  await requireRole("SUPER_ADMIN");

  const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId } });
  await prisma.company.update({
    where: { id: companyId },
    data: { subscriptionStatus: company.subscriptionStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE" },
  });

  revalidatePath("/superadmin/companies");
}

const upgradeRequestSchema = z.object({
  packageId: z.string().min(1, "Bir paket seçin"),
});

/** Şirket yöneticisinin, ödemeye tabi olduğu için superadmin onayı gerektiren bir paket yükseltme talebi açması. */
export async function requestPackageUpgradeAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const admin = await requireRole("COMPANY_ADMIN");
  if (!admin.companyId) return "Şirket bulunamadı.";

  const company = await prisma.company.findUniqueOrThrow({ where: { id: admin.companyId } });
  if (company.requestedPackageId) return "Zaten onay bekleyen bir yükseltme talebiniz var.";

  const parsed = upgradeRequestSchema.safeParse({ packageId: formData.get("packageId") });
  if (!parsed.success) return parsed.error.issues[0]?.message ?? "Girilen bilgiler geçersiz.";
  if (parsed.data.packageId === company.packageId) return "Zaten bu pakettesiniz.";

  await prisma.company.update({
    where: { id: admin.companyId },
    data: { requestedPackageId: parsed.data.packageId, requestedAt: new Date() },
  });

  revalidatePath("/settings");
  revalidatePath("/superadmin/pricing");
}

const approveUpgradeSchema = z.object({
  customUnitLimit: z.coerce.number().int().positive().optional(),
  customMonthlyPrice: z.coerce.number().positive().optional(),
});

/** Superadmin, bekleyen bir paket yükseltme talebini onaylar. İstenen paket "Özel" ise daire limiti/ücreti bu formdan alınır. */
export async function approvePackageUpgradeAction(
  companyId: string,
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  await requireRole("SUPER_ADMIN");

  const company = await prisma.company.findUniqueOrThrow({
    where: { id: companyId },
    include: { requestedPackage: true },
  });
  if (!company.requestedPackageId || !company.requestedPackage) return "Bekleyen bir talep bulunamadı.";

  const data: {
    packageId: string;
    requestedPackageId: null;
    requestedAt: null;
    customUnitLimit?: number | null;
    customMonthlyPrice?: number | null;
  } = {
    packageId: company.requestedPackageId,
    requestedPackageId: null,
    requestedAt: null,
  };

  if (company.requestedPackage.isCustom) {
    const parsed = approveUpgradeSchema.safeParse({
      customUnitLimit: formData.get("customUnitLimit") || undefined,
      customMonthlyPrice: formData.get("customMonthlyPrice") || undefined,
    });
    if (!parsed.success) return parsed.error.issues[0]?.message ?? "Girilen bilgiler geçersiz.";
    if (!parsed.data.customUnitLimit || !parsed.data.customMonthlyPrice) {
      return "Özel paket için daire limiti ve aylık ücret girilmeli.";
    }
    data.customUnitLimit = parsed.data.customUnitLimit;
    data.customMonthlyPrice = parsed.data.customMonthlyPrice;
  } else {
    data.customUnitLimit = null;
    data.customMonthlyPrice = null;
  }

  await prisma.company.update({ where: { id: companyId }, data });

  revalidatePath("/superadmin/pricing");
  revalidatePath("/settings");
}

/** Superadmin, bekleyen bir paket yükseltme talebini reddeder — mevcut paket değişmez. */
export async function rejectPackageUpgradeAction(companyId: string) {
  await requireRole("SUPER_ADMIN");

  await prisma.company.update({
    where: { id: companyId },
    data: { requestedPackageId: null, requestedAt: null },
  });

  revalidatePath("/superadmin/pricing");
  revalidatePath("/settings");
}
