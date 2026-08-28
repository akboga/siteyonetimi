import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const packages = [
    { name: "Basic", unitLimit: 100, monthlyPrice: 500, isCustom: false, sortOrder: 1 },
    { name: "Premium", unitLimit: 400, monthlyPrice: 1500, isCustom: false, sortOrder: 2 },
    { name: "Ultra", unitLimit: 750, monthlyPrice: 2500, isCustom: false, sortOrder: 3 },
    { name: "Profesyonel", unitLimit: 1500, monthlyPrice: 4000, isCustom: false, sortOrder: 4 },
    { name: "Özel", unitLimit: null, monthlyPrice: null, isCustom: true, sortOrder: 5 },
  ];
  for (const pkg of packages) {
    await prisma.subscriptionPackage.upsert({
      where: { name: pkg.name },
      update: { unitLimit: pkg.unitLimit, monthlyPrice: pkg.monthlyPrice, isCustom: pkg.isCustom, sortOrder: pkg.sortOrder },
      create: pkg,
    });
  }
  const superAdminPassword = await bcrypt.hash("superadmin123", 12);
  await prisma.user.upsert({
    where: { email: "admin@apsis.app" },
    update: {},
    create: {
      name: "Apsis Süper Admin",
      email: "admin@apsis.app",
      passwordHash: superAdminPassword,
      role: "SUPER_ADMIN",
    },
  });

  const companyAdminPassword = await bcrypt.hash("sirket123", 12);
  const company = await prisma.company.upsert({
    where: { taxNumber: "1234567890" },
    update: {},
    create: {
      name: "Örnek Yönetim A.Ş.",
      taxNumber: "1234567890",
      contactEmail: "info@ornekyonetim.com",
      users: {
        create: {
          name: "Ayşe Yılmaz",
          email: "yonetici@ornekyonetim.com",
          passwordHash: companyAdminPassword,
          role: "COMPANY_ADMIN",
        },
      },
    },
  });

  await prisma.company.updateMany({
    where: { packageId: null },
    data: { packageId: (await prisma.subscriptionPackage.findUniqueOrThrow({ where: { name: "Basic" } })).id },
  });

  const existingSite = await prisma.site.findFirst({ where: { companyId: company.id } });
  if (!existingSite) {
    const site = await prisma.site.create({
      data: {
        name: "Yeşil Vadi Konutları",
        address: "Örnek Mah. Bahçe Sok. No:1, İstanbul",
        companyId: company.id,
      },
    });

    const block = await prisma.block.create({
      data: { name: "A Blok", siteId: site.id },
    });

    const unit = await prisma.unit.create({
      data: {
        siteId: site.id,
        blockId: block.id,
        unitNumber: "3",
        floor: "1",
        areaM2: 120,
        type: "MESKEN",
      },
    });

    await prisma.resident.create({
      data: {
        unitId: unit.id,
        fullName: "Mehmet Demir",
        phone: "0555 555 55 55",
        relationType: "MALIK",
        moveInDate: new Date("2020-01-15"),
      },
    });
  }

  console.log("Seed tamamlandı.");
  console.log("Süper Admin: admin@apsis.app / superadmin123");
  console.log("Şirket Yöneticisi: yonetici@ornekyonetim.com / sirket123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
