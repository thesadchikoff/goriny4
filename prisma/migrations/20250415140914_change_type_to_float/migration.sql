-- AlterTable
ALTER TABLE "_subscribers" ADD CONSTRAINT "_subscribers_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_subscribers_AB_unique";

-- AlterTable
ALTER TABLE "codes" ALTER COLUMN "amount_coins" SET DATA TYPE DOUBLE PRECISION;
