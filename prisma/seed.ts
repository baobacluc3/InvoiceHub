import { PrismaClient, UserRole, UserStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({
    where: { email: "admin@invoicehub.local" },
    update: { role: UserRole.ADMIN, status: UserStatus.ACTIVE },
    create: {
      email: "admin@invoicehub.local",
      name: "InvoiceHub Admin",
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.company.createMany({
    data: [
      { name: "Acme Holdings", code: "ACME" },
      { name: "Northwind Services", code: "NORTH" },
      { name: "Bluewave Consulting", code: "BLUE" },
    ],
    skipDuplicates: true,
  });

  await prisma.documentType.createMany({
    data: [
      { name: "Invoice", description: "Accounts payable invoices" },
      { name: "Receipt", description: "Expense receipts" },
      { name: "Credit Note", description: "Credit adjustments" },
      { name: "Bank Statement", description: "Monthly bank statements" },
    ],
    skipDuplicates: true,
  });
}

main().finally(async () => {
  await prisma.$disconnect();
});
