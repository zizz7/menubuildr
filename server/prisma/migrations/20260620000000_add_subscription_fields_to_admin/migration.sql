-- AlterTable
ALTER TABLE "admins" ADD COLUMN     "stripe_customer_id" TEXT,
ADD COLUMN     "stripe_subscription_id" TEXT,
ADD COLUMN     "subscription_plan" TEXT,
ADD COLUMN     "subscription_status" TEXT NOT NULL DEFAULT 'none';

-- CreateIndex
CREATE UNIQUE INDEX "admins_stripe_customer_id_key" ON "admins"("stripe_customer_id");
