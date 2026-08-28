"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function loginAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const email = formData.get("email");

  try {
    // redirect: false so we can send the user straight to their role's home
    // page in one hop below. The session cookie set here isn't readable via
    // auth() until the *next* request, so the destination is resolved from
    // the DB instead of the freshly-created session.
    await signIn("credentials", {
      email,
      password: formData.get("password"),
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return "E-posta veya şifre hatalı.";
    }
    throw error;
  }

  const user = typeof email === "string"
    ? await prisma.user.findUnique({ where: { email }, select: { role: true } })
    : null;
  redirect(user?.role === "SUPER_ADMIN" ? "/superadmin/companies" : "/dashboard");
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
