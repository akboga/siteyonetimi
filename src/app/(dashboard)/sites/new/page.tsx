import { requireRole } from "@/lib/session";
import { createSiteAction } from "@/actions/sites";
import { SiteForm } from "@/components/site-form";

export default async function NewSitePage() {
  await requireRole("COMPANY_ADMIN");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Yeni Site</h1>
        <p className="text-sm text-muted-foreground">Şirketinize yeni bir site ekleyin.</p>
      </div>
      <SiteForm action={createSiteAction} submitLabel="Siteyi Oluştur" />
    </div>
  );
}
