CREATE TYPE "FiscalYearEventType" AS ENUM ('CREATED', 'CLOSED');

CREATE TABLE "FiscalYearEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "fiscalYearId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "type" "FiscalYearEventType" NOT NULL,
    "details" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FiscalYearEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FiscalYearEvent_organizationId_fiscalYearId_createdAt_idx" ON "FiscalYearEvent"("organizationId", "fiscalYearId", "createdAt");
ALTER TABLE "FiscalYearEvent" ADD CONSTRAINT "FiscalYearEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
