-- CreateTable
CREATE TABLE "ProjectEmployee" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectEmployee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectEmployee_employeeId_projectId_key" ON "ProjectEmployee"("employeeId", "projectId");

-- CreateIndex
CREATE INDEX "ProjectEmployee_projectId_idx" ON "ProjectEmployee"("projectId");

-- CreateIndex
CREATE INDEX "ProjectEmployee_employeeId_idx" ON "ProjectEmployee"("employeeId");

-- Migrate existing data: create ProjectEmployee entries from Employee.projectId
INSERT INTO "ProjectEmployee" ("id", "employeeId", "projectId", "isActive", "activatedAt", "createdAt", "updatedAt")
SELECT
    gen_random_uuid(),
    e."id",
    e."projectId",
    true,
    NOW(),
    NOW(),
    NOW()
FROM "Employee" e
WHERE e."projectId" IS NOT NULL;

-- AddProjectIdToAttendance
ALTER TABLE "Attendance" ADD COLUMN "projectId" TEXT;

-- CreateIndex for projectId on Attendance
CREATE INDEX "Attendance_projectId_idx" ON "Attendance"("projectId");

-- DropForeignKey
ALTER TABLE "Employee" DROP CONSTRAINT "Employee_projectId_fkey";

-- DropIndex
DROP INDEX "Employee_projectId_idx";

-- AlterTable: remove projectId from Employee
ALTER TABLE "Employee" DROP COLUMN "projectId";
