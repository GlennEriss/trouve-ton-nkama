import { type ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/ui-kit/admin-shell";
import { resolveAdminFromSessionCookie } from "@/modules/iam/application/admin-auth.service";
import { ADMIN_SESSION_COOKIE_NAME } from "@/modules/iam/domain/session";

type AdminLayoutProps = {
  children: ReactNode;
};

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    redirect("/signin");
  }

  try {
    await resolveAdminFromSessionCookie(sessionCookie);
  } catch {
    redirect("/signin");
  }

  return <AdminShell>{children}</AdminShell>;
}
