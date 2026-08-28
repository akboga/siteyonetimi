"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireCompanyUser, requireRole } from "@/lib/session";
import { assertSiteAccess } from "@/lib/permissions";

const siteSchema = z.object({
  name: z.string().trim().min(2, "Site adı en az 2 karakter olmalı"),
  address: z.string().trim().optional(),
  managementPlanNo: z.string().trim().optional(),
  lateFeeRatePercent: z.coerce.number().min(0).max(100).optional().or(z.literal("").transform(() => undefined)),
});

export async function createSiteAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const user = await requireRole("COMPANY_ADMIN");

  const parsed = siteSchema.safeParse({
    name: formData.get("name"),
    address: formData.get("address"),
    managementPlanNo: formData.get("managementPlanNo"),
    lateFeeRatePercent: formData.get("lateFeeRatePercent"),
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Girilen bilgiler geçersiz.";
  }

  const site = await prisma.site.create({
    data: {
      name: parsed.data.name,
      address: parsed.data.address || null,
      managementPlanNo: parsed.data.managementPlanNo || null,
      lateFeeRatePercent: parsed.data.lateFeeRatePercent,
      companyId: user.companyId!,
    },
  });

  revalidatePath("/sites");
  redirect(`/sites/${site.id}`);
}

export async function updateSiteAction(
  siteId: string,
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const user = await requireCompanyUser();
  await assertSiteAccess(user, siteId);

  const parsed = siteSchema.safeParse({
    name: formData.get("name"),
    address: formData.get("address"),
    managementPlanNo: formData.get("managementPlanNo"),
    lateFeeRatePercent: formData.get("lateFeeRatePercent"),
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Girilen bilgiler geçersiz.";
  }

  await prisma.site.update({
    where: { id: siteId },
    data: {
      name: parsed.data.name,
      address: parsed.data.address || null,
      managementPlanNo: parsed.data.managementPlanNo || null,
      lateFeeRatePercent: parsed.data.lateFeeRatePercent ?? null,
    },
  });

  revalidatePath("/sites");
  revalidatePath(`/sites/${siteId}`);
  redirect(`/sites/${siteId}`);
}

export async function deleteSiteAction(siteId: string) {
  const user = await requireRole("COMPANY_ADMIN");
  if (!user.companyId) redirect("/login");
  await assertSiteAccess({ ...user, companyId: user.companyId }, siteId);

  await prisma.site.delete({ where: { id: siteId } });

  revalidatePath("/sites");
  redirect("/sites");
}
