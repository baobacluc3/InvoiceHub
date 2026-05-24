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
      { name: "Acme Holdings", taxCode: "ACME-TAX", address: "100 Main St" },
      { name: "Northwind Services", taxCode: "NORTH-TAX", address: "200 Pine Ave" },
      { name: "Bluewave Consulting", taxCode: "BLUE-TAX", address: "300 Oak Blvd" },
    ],
    skipDuplicates: true,
  });

  await prisma.documentType.createMany({
    data: [
      { code: "INV", name: "Invoice", description: "Accounts payable invoices" },
      { code: "RCT", name: "Receipt", description: "Expense receipts" },
      { code: "CRN", name: "Credit Note", description: "Credit adjustments" },
      { code: "BNK", name: "Bank Statement", description: "Monthly bank statements" },
    ],
    skipDuplicates: true,
  });
}

main().finally(async () => {
  await prisma.$disconnect();
});
