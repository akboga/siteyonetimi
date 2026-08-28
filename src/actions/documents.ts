"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCompanyUser } from "@/lib/session";
import { assertSiteAccess } from "@/lib/permissions";

const documentSchema = z.object({
  type: z.string().trim().min(1, "Doküman türü gerekli"),
  fileUrl: z.string().trim().min(1, "Dosya bağlantısı gerekli"),
});

export async function createDocumentAction(
  siteId: string,
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const user = await requireCompanyUser();
  await assertSiteAccess(user, siteId);

  const parsed = documentSchema.safeParse({
    type: formData.get("type"),
    fileUrl: formData.get("fileUrl"),
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Girilen bilgiler geçersiz.";
  }

  await prisma.document.create({
    data: {
      siteId,
      type: parsed.data.type,
      fileUrl: parsed.data.fileUrl,
      uploadedBy: user.name,
    },
  });

  revalidatePath(`/sites/${siteId}/documents`);
}

export async function deleteDocumentAction(siteId: string, documentId: string) {
  const user = await requireCompanyUser();
  await assertSiteAccess(user, siteId);

  await prisma.document.delete({ where: { id: documentId, siteId } });

  revalidatePath(`/sites/${siteId}/documents`);
}
