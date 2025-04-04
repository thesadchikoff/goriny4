/*
  Warnings:

  - You are about to drop the `Config` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Requisite` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Ticket` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Requisite" DROP CONSTRAINT "Requisite_payment_method_id_fkey";

-- DropForeignKey
ALTER TABLE "Requisite" DROP CONSTRAINT "Requisite_userId_fkey";

-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_initiatorId_fkey";

-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_performerId_fkey";

-- DropTable
DROP TABLE "Config";

-- DropTable
DROP TABLE "Requisite";

-- DropTable
DROP TABLE "Ticket";

-- CreateTable
CREATE TABLE "requisites" (
    "id" SERIAL NOT NULL,
    "payment_method_id" INTEGER NOT NULL,
    "phoneOrbankCardNumber" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "requisites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config" (
    "id" SERIAL NOT NULL,
    "bot_name" TEXT NOT NULL,
    "fee_for_transaction" INTEGER,
    "admin_wallet_address" TEXT,

    CONSTRAINT "config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" SERIAL NOT NULL,
    "initiator_id" TEXT NOT NULL,
    "performer_id" TEXT,
    "status" "TicketStatuses" NOT NULL DEFAULT 'PENDING',
    "ticket_message" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "requisites" ADD CONSTRAINT "requisites_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "payment_method"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisites" ADD CONSTRAINT "requisites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_initiator_id_fkey" FOREIGN KEY ("initiator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_performer_id_fkey" FOREIGN KEY ("performer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
