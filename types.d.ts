import { UserRole, UserStatus } from "@prisma/client";
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      status: UserStatus;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}


declare module "next-auth" {
  interface User {
    role: UserRole;
    status: UserStatus;
  }
}
