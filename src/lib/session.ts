import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import type { UserRole } from "@/generated/prisma/enums";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyId: string | null;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  if (!session?.user) return null;
  return session.user;
}

/** Oturum yoksa /login'e yönlendirir. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Oturum + rol kontrolü; rol uyuşmuyorsa dashboard'a yönlendirir. */
export async function requireRole(...roles: UserRole[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/dashboard");
  return user;
}

/** COMPANY_ADMIN veya COMPANY_STAFF olup companyId'si dolu olan kullanıcıyı garantiler. */
export async function requireCompanyUser(): Promise<CurrentUser & { companyId: string }> {
  const user = await requireRole("COMPANY_ADMIN", "COMPANY_STAFF");
  if (!user.companyId) redirect("/login");
  return { ...user, companyId: user.companyId };
}
