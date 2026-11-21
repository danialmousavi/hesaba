-- CreateEnum
CREATE TYPE "FiscalYearStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateTable
CREATE TABLE "FiscalYear" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "status" "FiscalYearStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FiscalYear_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FiscalYear_organizationId_status_idx" ON "FiscalYear"("organizationId", "status");

-- CreateIndex
CREATE INDEX "FiscalYear_organizationId_startDate_idx" ON "FiscalYear"("organizationId", "startDate");

-- CreateIndex
CREATE UNIQUE INDEX "FiscalYear_organizationId_name_key" ON "FiscalYear"("organizationId", "name");

-- Keep the fiscal-year date range valid even when data is written outside the application.
ALTER TABLE "FiscalYear"
ADD CONSTRAINT "FiscalYear_date_range_check" CHECK ("endDate" > "startDate");

-- An organization can work in only one open fiscal year at a time.
CREATE UNIQUE INDEX "FiscalYear_one_open_per_organization_key"
ON "FiscalYear"("organizationId")
WHERE "status" = 'OPEN';

-- AddForeignKey
ALTER TABLE "FiscalYear" ADD CONSTRAINT "FiscalYear_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
