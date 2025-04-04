-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_wallet_id_fkey";

-- DropIndex
DROP INDEX "users_username_key";

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
