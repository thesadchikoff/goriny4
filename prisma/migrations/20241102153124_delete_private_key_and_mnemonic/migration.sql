-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_wallet_id_fkey";

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
