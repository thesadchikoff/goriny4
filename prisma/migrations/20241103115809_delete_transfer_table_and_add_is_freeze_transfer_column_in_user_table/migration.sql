/*
  Warnings:

  - You are about to drop the `transfers` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "transfers" DROP CONSTRAINT "transfers_from_user_fkey";

-- DropForeignKey
ALTER TABLE "transfers" DROP CONSTRAINT "transfers_to_user_id_fkey";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_freeze_transfer" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "transfers";
