-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "currency" TEXT DEFAULT 'SAR',
ADD COLUMN     "documentNumber" TEXT,
ADD COLUMN     "documentType" TEXT,
ADD COLUMN     "nationality" TEXT;
