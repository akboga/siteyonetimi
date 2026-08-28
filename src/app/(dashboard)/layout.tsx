import { LayoutDashboard, Building2, Package, Users, BarChart3, Settings } from "lucide-react";
import { requireCompanyUser } from "@/lib/session";
import { logoutAction } from "@/actions/auth";
import { prisma } from "@/lib/db";
import { AppShell, type NavItem } from "@/components/app-shell";

const navItems: (NavItem & { adminOnly?: boolean })[] = [
  { href: "/dashboard", label: "Genel Bakış", icon: <LayoutDashboard className="size-4 shrink-0" /> },
  { href: "/sites", label: "Siteler", icon: <Building2 className="size-4 shrink-0" /> },
  { href: "/vendors", label: "Tedarikçiler", icon: <Package className="size-4 shrink-0" /> },
  { href: "/reports", label: "Raporlar", icon: <BarChart3 className="size-4 shrink-0" /> },
  { href: "/staff", label: "Personel", icon: <Users className="size-4 shrink-0" />, adminOnly: true },
  { href: "/settings", label: "Şirket Ayarları", icon: <Settings className="size-4 shrink-0" />, adminOnly: true },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireCompanyUser();
  // İsim/e-posta değişikliklerinin sidebar'da anında görünmesi için JWT session
  // claim'i yerine DB'den taze okunuyor (session sadece bir sonraki girişte güncellenir).
  const fresh = await prisma.user.findUnique({ where: { id: user.id }, select: { name: true, email: true } });

  return (
    <AppShell
      brandTag="Yönetim Paneli"
      navItems={navItems.filter((item) => !item.adminOnly || user.role === "COMPANY_ADMIN")}
      user={{ ...user, name: fresh?.name ?? user.name, email: fresh?.email ?? user.email }}
      roleLabel={user.role === "COMPANY_ADMIN" ? "Şirket Yöneticisi" : "Personel"}
      logoutAction={logoutAction}
    >
      {children}
    </AppShell>
  );
}
