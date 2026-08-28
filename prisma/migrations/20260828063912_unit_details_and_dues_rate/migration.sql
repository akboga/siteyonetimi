-- CreateEnum
CREATE TYPE "RoomLayout" AS ENUM ('BIR_ARTI_BIR', 'IKI_ARTI_BIR', 'UC_ARTI_BIR', 'DIGER');

-- AlterTable
ALTER TABLE "Unit" ADD COLUMN     "roomLayout" "RoomLayout";

-- CreateTable
CREATE TABLE "SiteDuesRate" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "siteId" TEXT NOT NULL,

    CONSTRAINT "SiteDuesRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SiteDuesRate_siteId_idx" ON "SiteDuesRate"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "DuesRecord_unitId_period_key" ON "DuesRecord"("unitId", "period");

-- AddForeignKey
ALTER TABLE "SiteDuesRate" ADD CONSTRAINT "SiteDuesRate_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

