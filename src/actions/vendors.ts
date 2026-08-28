"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";

const vendorSchema = z.object({
  name: z.string().trim().min(1, "Firma adı gerekli"),
  serviceType: z.string().trim().min(1, "Hizmet türü gerekli"),
  contactInfo: z.string().trim().optional(),
  contractStart: z.string().trim().optional(),
  contractEnd: z.string().trim().optional(),
  contractFileUrl: z.string().trim().optional(),
});

async function getCompanySiteIds(companyId: string) {
  const sites = await prisma.site.findMany({ where: { companyId }, select: { id: true } });
  return new Set(sites.map((s) => s.id));
}

export async function createVendorAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const admin = await requireRole("COMPANY_ADMIN");
  if (!admin.companyId) return "Şirket bulunamadı.";

  const parsed = vendorSchema.safeParse({
    name: formData.get("name"),
    serviceType: formData.get("serviceType"),
    contactInfo: formData.get("contactInfo"),
    contractStart: formData.get("contractStart"),
    contractEnd: formData.get("contractEnd"),
    contractFileUrl: formData.get("contractFileUrl"),
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Girilen bilgiler geçersiz.";
  }

  const companySiteIds = await getCompanySiteIds(admin.companyId);
  const siteIds = formData.getAll("siteIds").filter((id): id is string => typeof id === "string" && companySiteIds.has(id));

  await prisma.vendor.create({
    data: {
      companyId: admin.companyId,
      name: parsed.data.name,
      serviceType: parsed.data.serviceType,
      contactInfo: parsed.data.contactInfo || null,
      contractStart: parsed.data.contractStart ? new Date(parsed.data.contractStart) : null,
      contractEnd: parsed.data.contractEnd ? new Date(parsed.data.contractEnd) : null,
      contractFileUrl: parsed.data.contractFileUrl || null,
      sites: { connect: siteIds.map((id) => ({ id })) },
    },
  });

  revalidatePath("/vendors");
}

export async function updateVendorSitesAction(vendorId: string, formData: FormData) {
  const admin = await requireRole("COMPANY_ADMIN");
  if (!admin.companyId) return;

  const vendor = await prisma.vendor.findUniqueOrThrow({ where: { id: vendorId } });
  if (vendor.companyId !== admin.companyId) throw new Error("Bu tedarikçi üzerinde işlem yapamazsınız.");

  const companySiteIds = await getCompanySiteIds(admin.companyId);
  const siteIds = formData.getAll("siteIds").filter((id): id is string => typeof id === "string" && companySiteIds.has(id));

  await prisma.vendor.update({
    where: { id: vendorId },
    data: { sites: { set: siteIds.map((id) => ({ id })) } },
  });

  revalidatePath("/vendors");
}

export async function deleteVendorAction(vendorId: string) {
  const admin = await requireRole("COMPANY_ADMIN");
  if (!admin.companyId) return;

  const vendor = await prisma.vendor.findUniqueOrThrow({ where: { id: vendorId } });
  if (vendor.companyId !== admin.companyId) throw new Error("Bu tedarikçi üzerinde işlem yapamazsınız.");

  await prisma.vendor.delete({ where: { id: vendorId } });

  revalidatePath("/vendors");
}
