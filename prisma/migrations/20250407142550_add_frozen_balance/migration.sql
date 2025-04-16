-- AlterTable
ALTER TABLE "wallets" ADD COLUMN     "frozen_balance" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "frozen_balance" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "contract_id" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "frozen_balance_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "frozen_balance" ADD CONSTRAINT "frozen_balance_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "frozen_balance" ADD CONSTRAINT "frozen_balance_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
