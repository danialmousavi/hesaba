CREATE TYPE "JournalEntryStatus" AS ENUM ('DRAFT', 'POSTED');

CREATE UNIQUE INDEX "FiscalYear_organizationId_id_key" ON "FiscalYear"("organizationId", "id");
CREATE UNIQUE INDEX "LedgerAccount_organizationId_id_key" ON "LedgerAccount"("organizationId", "id");

CREATE TABLE "JournalEntry" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "fiscalYearId" TEXT NOT NULL,
  "number" INTEGER NOT NULL,
  "date" DATE NOT NULL,
  "description" TEXT NOT NULL,
  "status" "JournalEntryStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "JournalEntry_number_positive_check" CHECK ("number" > 0)
);
CREATE UNIQUE INDEX "JournalEntry_organizationId_fiscalYearId_number_key" ON "JournalEntry"("organizationId", "fiscalYearId", "number");
CREATE UNIQUE INDEX "JournalEntry_organizationId_id_key" ON "JournalEntry"("organizationId", "id");
CREATE INDEX "JournalEntry_organizationId_date_idx" ON "JournalEntry"("organizationId", "date");

CREATE TABLE "JournalLine" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "entryId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "description" TEXT,
  "debit" DECIMAL(20,0) NOT NULL DEFAULT 0,
  "credit" DECIMAL(20,0) NOT NULL DEFAULT 0,
  CONSTRAINT "JournalLine_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "JournalLine_one_side_positive_check" CHECK (("debit" > 0 AND "credit" = 0) OR ("credit" > 0 AND "debit" = 0))
);
CREATE INDEX "JournalLine_organizationId_entryId_idx" ON "JournalLine"("organizationId", "entryId");
CREATE INDEX "JournalLine_organizationId_accountId_idx" ON "JournalLine"("organizationId", "accountId");

ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_organizationId_fiscalYearId_fkey" FOREIGN KEY ("organizationId", "fiscalYearId") REFERENCES "FiscalYear"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_organizationId_entryId_fkey" FOREIGN KEY ("organizationId", "entryId") REFERENCES "JournalEntry"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_organizationId_accountId_fkey" FOREIGN KEY ("organizationId", "accountId") REFERENCES "LedgerAccount"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
