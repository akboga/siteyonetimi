-- CreateTable
CREATE TABLE "DuesPayment" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "paymentMethod" "DuesPaymentMethod" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duesRecordId" TEXT NOT NULL,

    CONSTRAINT "DuesPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DuesPayment_duesRecordId_idx" ON "DuesPayment"("duesRecordId");

-- AddForeignKey
ALTER TABLE "DuesPayment" ADD CONSTRAINT "DuesPayment_duesRecordId_fkey" FOREIGN KEY ("duesRecordId") REFERENCES "DuesRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
