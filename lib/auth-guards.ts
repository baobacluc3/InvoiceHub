import { UserRole, UserStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user || user.status !== UserStatus.ACTIVE) return null;

  return user;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  return user;
}

export async function requireRole(roles: UserRole[]) {
  const user = await requireAuth();
  if (!roles.includes(user.role)) redirect("/dashboard");
  return user;
}
