import { requireRole } from "@/lib/session";
import { CompanyForm } from "@/components/company-form";

export default async function NewCompanyPage() {
  await requireRole("SUPER_ADMIN");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Yeni Yönetim Şirketi</h1>
        <p className="text-sm text-muted-foreground">
          Şirket oluşturulduğunda, girdiğiniz bilgilerle ilk Şirket Yöneticisi hesabı da oluşturulur.
        </p>
      </div>
      <CompanyForm />
    </div>
  );
}
