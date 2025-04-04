/*
  Warnings:

  - A unique constraint covering the columns `[contractRequisiteId]` on the table `contract` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "contract" ADD COLUMN     "contractRequisiteId" INTEGER;

-- CreateTable
CREATE TABLE "contract_requisite" (
    "id" SERIAL NOT NULL,
    "payment_method_id" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,

    CONSTRAINT "contract_requisite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contract_contractRequisiteId_key" ON "contract"("contractRequisiteId");

-- AddForeignKey
ALTER TABLE "contract_requisite" ADD CONSTRAINT "contract_requisite_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "payment_method"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract" ADD CONSTRAINT "contract_contractRequisiteId_fkey" FOREIGN KEY ("contractRequisiteId") REFERENCES "contract_requisite"("id") ON DELETE SET NULL ON UPDATE CASCADE;
