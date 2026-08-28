import { Building, Receipt, Tag } from "lucide-react";
import { requireRole } from "@/lib/session";
import { logoutAction } from "@/actions/auth";
import { AppShell, type NavItem } from "@/components/app-shell";

const navItems: NavItem[] = [
  { href: "/superadmin/companies", label: "Yönetim Şirketleri", icon: <Building className="size-4 shrink-0" /> },
  { href: "/superadmin/invoices", label: "Faturalar", icon: <Receipt className="size-4 shrink-0" /> },
  { href: "/superadmin/pricing", label: "Fiyatlandırma", icon: <Tag className="size-4 shrink-0" /> },
];

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("SUPER_ADMIN");

  return (
    <AppShell
      brandTag="Süper Admin"
      navItems={navItems}
      user={user}
      roleLabel="Süper Admin"
      logoutAction={logoutAction}
    >
      {children}
    </AppShell>
  );
}
