/*
  Warnings:

  - You are about to drop the column `mnemonic_phrase` on the `wallets` table. All the data in the column will be lost.
  - You are about to drop the column `private_key` on the `wallets` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "wallets_private_key_key";

-- AlterTable
ALTER TABLE "wallets" DROP COLUMN "mnemonic_phrase",
DROP COLUMN "private_key";
