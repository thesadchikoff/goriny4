-- AlterTable
ALTER TABLE "users" ADD COLUMN     "last_update_notification" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "bot_updates" (
    "id" SERIAL NOT NULL,
    "version" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "bot_updates_pkey" PRIMARY KEY ("id")
);
