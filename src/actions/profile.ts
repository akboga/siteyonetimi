"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";

const profileSchema = z.object({
  name: z.string().trim().min(2, "Ad soyad en az 2 karakter olmalı"),
  email: z.email("Geçerli bir e-posta girin"),
});

/** Oturum açmış COMPANY_ADMIN kullanıcının kendi adını ve e-postasını (kullanıcı adını) güncellemesi için. */
export async function updateOwnProfileAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const admin = await requireRole("COMPANY_ADMIN");

  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Girilen bilgiler geçersiz.";
  }

  if (parsed.data.email !== admin.email) {
    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (existing) return "Bu e-posta adresiyle zaten bir kullanıcı var.";
  }

  await prisma.user.update({
    where: { id: admin.id },
    data: { name: parsed.data.name, email: parsed.data.email },
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Mevcut şifrenizi girin"),
    newPassword: z.string().min(8, "Yeni şifre en az 8 karakter olmalı"),
    confirmPassword: z.string().min(1, "Yeni şifreyi tekrar girin"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Yeni şifreler eşleşmiyor",
    path: ["confirmPassword"],
  });

/** Oturum açmış COMPANY_ADMIN kullanıcının mevcut şifresini doğrulayıp kendi şifresini değiştirmesi için. */
export async function changePasswordAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const admin = await requireRole("COMPANY_ADMIN");

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Girilen bilgiler geçersiz.";
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: admin.id } });
  const isValid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!isValid) return "Mevcut şifreniz hatalı.";

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.user.update({ where: { id: admin.id }, data: { passwordHash } });

  revalidatePath("/settings");
}
