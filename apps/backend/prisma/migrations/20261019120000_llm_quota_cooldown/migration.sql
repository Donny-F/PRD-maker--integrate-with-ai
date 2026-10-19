-- AlterTable
ALTER TABLE "LlmConfig" ADD COLUMN     "unavailableUntil" TIMESTAMP(3),
ADD COLUMN     "unavailableReason" TEXT;
