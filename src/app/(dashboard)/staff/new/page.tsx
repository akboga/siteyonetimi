import { requireRole } from "@/lib/session";
import { StaffForm } from "@/components/staff-form";

export default async function NewStaffPage() {
  await requireRole("COMPANY_ADMIN");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Yeni Personel</h1>
        <p className="text-sm text-muted-foreground">
          Personel oluşturulduktan sonra hangi sitelere erişebileceğini belirleyebilirsiniz.
        </p>
      </div>
      <StaffForm />
    </div>
  );
}
