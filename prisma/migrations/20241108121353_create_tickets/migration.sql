-- CreateEnum
CREATE TYPE "TicketStatuses" AS ENUM ('PENDING', 'REVIEW', 'SUCCESS', 'DECLINE');

-- CreateTable
CREATE TABLE "Ticket" (
    "id" SERIAL NOT NULL,
    "initiatorId" TEXT NOT NULL,
    "performerId" TEXT NOT NULL,
    "status" "TicketStatuses" NOT NULL DEFAULT 'PENDING',
    "ticket_message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_performerId_fkey" FOREIGN KEY ("performerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
