CREATE TYPE "FinancialTransactionType" AS ENUM ('INCOME', 'EXPENSE');
CREATE TYPE "FinancialTransactionStatus" AS ENUM ('DRAFT', 'POSTED');
CREATE TYPE "FinancialPaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'OTHER');

CREATE UNIQUE INDEX "JournalEntry_organizationId_fiscalYearId_id_key" ON "JournalEntry"("organizationId", "fiscalYearId", "id");

CREATE TABLE "FinancialTransaction" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "fiscalYearId" TEXT NOT NULL,
    "type" "FinancialTransactionType" NOT NULL,
    "status" "FinancialTransactionStatus" NOT NULL DEFAULT 'DRAFT',
    "date" DATE NOT NULL,
    "amount" DECIMAL(20,0) NOT NULL,
    "description" TEXT NOT NULL,
    "paymentMethod" "FinancialPaymentMethod" NOT NULL,
    "categoryAccountId" TEXT NOT NULL,
    "settlementAccountId" TEXT NOT NULL,
    "journalEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FinancialTransaction_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "FinancialTransaction_amount_check" CHECK ("amount" > 0),
    CONSTRAINT "FinancialTransaction_description_check" CHECK (length(btrim("description")) > 0),
    CONSTRAINT "FinancialTransaction_accounts_check" CHECK ("categoryAccountId" <> "settlementAccountId"),
    CONSTRAINT "FinancialTransaction_status_check" CHECK (("status" = 'DRAFT' AND "journalEntryId" IS NULL) OR ("status" = 'POSTED' AND "journalEntryId" IS NOT NULL))
);

CREATE UNIQUE INDEX "FinancialTransaction_organizationId_journalEntryId_key" ON "FinancialTransaction"("organizationId", "journalEntryId");
CREATE UNIQUE INDEX "FinancialTransaction_org_year_entry_key" ON "FinancialTransaction"("organizationId", "fiscalYearId", "journalEntryId");
CREATE INDEX "FinancialTransaction_organizationId_fiscalYearId_date_idx" ON "FinancialTransaction"("organizationId", "fiscalYearId", "date");
CREATE INDEX "FinancialTransaction_organizationId_type_status_idx" ON "FinancialTransaction"("organizationId", "type", "status");
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_organizationId_fiscalYearId_fkey" FOREIGN KEY ("organizationId", "fiscalYearId") REFERENCES "FiscalYear"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_organizationId_categoryAccountId_fkey" FOREIGN KEY ("organizationId", "categoryAccountId") REFERENCES "LedgerAccount"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_organizationId_settlementAccountId_fkey" FOREIGN KEY ("organizationId", "settlementAccountId") REFERENCES "LedgerAccount"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_org_year_entry_fkey" FOREIGN KEY ("organizationId", "fiscalYearId", "journalEntryId") REFERENCES "JournalEntry"("organizationId", "fiscalYearId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION "protect_financial_transaction"() RETURNS trigger AS $$
DECLARE
  entry_status "JournalEntryStatus";
  entry_date DATE;
BEGIN
  IF TG_OP <> 'INSERT' AND OLD."status" = 'POSTED' THEN
    RAISE EXCEPTION 'Posted financial transactions cannot be modified or deleted' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  IF NEW."status" = 'POSTED' AND NEW."journalEntryId" IS NOT NULL THEN
    SELECT e."status", e."date" INTO entry_status, entry_date
      FROM "JournalEntry" e
      WHERE e."organizationId" = NEW."organizationId" AND e."fiscalYearId" = NEW."fiscalYearId" AND e.id = NEW."journalEntryId"
      FOR KEY SHARE;
    IF NOT FOUND OR entry_status <> 'POSTED' OR entry_date <> NEW."date" THEN
      RAISE EXCEPTION 'Financial transaction requires a posted journal entry with the same fiscal year and date' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "FinancialTransaction_protect_posted"
BEFORE INSERT OR UPDATE OR DELETE ON "FinancialTransaction"
FOR EACH ROW EXECUTE FUNCTION "protect_financial_transaction"();
