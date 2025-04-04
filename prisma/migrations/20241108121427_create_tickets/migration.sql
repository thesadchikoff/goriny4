-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_performerId_fkey";

-- AlterTable
ALTER TABLE "Ticket" ALTER COLUMN "performerId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_performerId_fkey" FOREIGN KEY ("performerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
