-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "customMonthlyPrice" DECIMAL(12,2),
ADD COLUMN     "customUnitLimit" INTEGER,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "packageId" TEXT,
ADD COLUMN     "requestedAt" TIMESTAMP(3),
ADD COLUMN     "requestedPackageId" TEXT;

-- CreateTable
CREATE TABLE "SubscriptionPackage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unitLimit" INTEGER,
    "monthlyPrice" DECIMAL(12,2),
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPackage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPackage_name_key" ON "SubscriptionPackage"("name");

-- CreateIndex
CREATE INDEX "Company_packageId_idx" ON "Company"("packageId");

-- CreateIndex
CREATE INDEX "Company_requestedPackageId_idx" ON "Company"("requestedPackageId");

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "SubscriptionPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_requestedPackageId_fkey" FOREIGN KEY ("requestedPackageId") REFERENCES "SubscriptionPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
