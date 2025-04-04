-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "login" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "currency_id" INTEGER,
    "wallet_id" TEXT,
    "total_amount_add" INTEGER NOT NULL DEFAULT 0,
    "total_amount_replenish" INTEGER NOT NULL DEFAULT 0,
    "cuid" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "BuyContractTransactionId" TEXT,
    "SellContractTransactionId" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "codes" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "creatorId" TEXT,
    "amount_coins" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "currencies" (
    "id" SERIAL NOT NULL,
    "value" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "currencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "private_key" TEXT NOT NULL,
    "mnemonic_phrase" TEXT,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfers" (
    "id" SERIAL NOT NULL,
    "from_user" TEXT NOT NULL,
    "count" DOUBLE PRECISION NOT NULL,
    "to_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Requisite" (
    "id" SERIAL NOT NULL,
    "payment_method_id" INTEGER NOT NULL,
    "phoneOrbankCardNumber" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Requisite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_method" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,

    CONSTRAINT "payment_method_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract" (
    "id" SERIAL NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "view_mode" BOOLEAN NOT NULL DEFAULT false,
    "max_price" DOUBLE PRECISION,
    "code" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "payment_method_id" INTEGER NOT NULL,
    "currency" TEXT,
    "comment" TEXT,

    CONSTRAINT "contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "address_book" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "address_book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_transaction" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "seller_id" TEXT,
    "buyer_id" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "purchase_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "is_accepted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "contract_id" INTEGER NOT NULL,
    "disputeId" INTEGER,

    CONSTRAINT "contract_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Config" (
    "id" SERIAL NOT NULL,
    "bot_name" TEXT NOT NULL,
    "fee_for_transaction" INTEGER,
    "admin_wallet_address" TEXT,

    CONSTRAINT "Config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispute" (
    "id" SERIAL NOT NULL,
    "contract_transaction_id" TEXT,

    CONSTRAINT "dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_subscribers" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_login_key" ON "users"("login");

-- CreateIndex
CREATE UNIQUE INDEX "users_wallet_id_key" ON "users"("wallet_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_cuid_key" ON "users"("cuid");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_address_key" ON "wallets"("address");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_private_key_key" ON "wallets"("private_key");

-- CreateIndex
CREATE UNIQUE INDEX "contract_transaction_seller_id_key" ON "contract_transaction"("seller_id");

-- CreateIndex
CREATE UNIQUE INDEX "contract_transaction_buyer_id_key" ON "contract_transaction"("buyer_id");

-- CreateIndex
CREATE UNIQUE INDEX "contract_transaction_disputeId_key" ON "contract_transaction"("disputeId");

-- CreateIndex
CREATE UNIQUE INDEX "dispute_contract_transaction_id_key" ON "dispute"("contract_transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "_subscribers_AB_unique" ON "_subscribers"("A", "B");

-- CreateIndex
CREATE INDEX "_subscribers_B_index" ON "_subscribers"("B");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codes" ADD CONSTRAINT "codes_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_from_user_fkey" FOREIGN KEY ("from_user") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requisite" ADD CONSTRAINT "Requisite_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "payment_method"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requisite" ADD CONSTRAINT "Requisite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract" ADD CONSTRAINT "contract_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract" ADD CONSTRAINT "contract_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "payment_method"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "address_book" ADD CONSTRAINT "address_book_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_transaction" ADD CONSTRAINT "contract_transaction_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_transaction" ADD CONSTRAINT "contract_transaction_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_transaction" ADD CONSTRAINT "contract_transaction_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispute" ADD CONSTRAINT "dispute_contract_transaction_id_fkey" FOREIGN KEY ("contract_transaction_id") REFERENCES "contract_transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_subscribers" ADD CONSTRAINT "_subscribers_A_fkey" FOREIGN KEY ("A") REFERENCES "codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_subscribers" ADD CONSTRAINT "_subscribers_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
