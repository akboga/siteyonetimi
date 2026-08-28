import { prisma } from "@/lib/db";
import { requireCompanyUser } from "@/lib/session";
import { assertSiteAccess } from "@/lib/permissions";
import { createUnitAction } from "@/actions/units";
import { UnitForm } from "@/components/unit-form";

export default async function NewUnitPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const user = await requireCompanyUser();
  const site = await assertSiteAccess(user, siteId);
  const blocks = await prisma.block.findMany({
    where: { siteId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Yeni Daire</h1>
        <p className="text-sm text-muted-foreground">{site.name}</p>
      </div>
      <UnitForm action={createUnitAction.bind(null, siteId)} blocks={blocks} />
    </div>
  );
}
