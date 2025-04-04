-- DropForeignKey
ALTER TABLE "contract" DROP CONSTRAINT "contract_payment_method_id_fkey";

-- AlterTable
ALTER TABLE "contract" ALTER COLUMN "payment_method_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "contract" ADD CONSTRAINT "contract_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "payment_method"("id") ON DELETE SET NULL ON UPDATE CASCADE;
