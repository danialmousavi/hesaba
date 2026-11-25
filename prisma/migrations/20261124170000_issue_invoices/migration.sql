ALTER TYPE "InvoiceStatus" ADD VALUE 'ISSUED';
ALTER TABLE "Invoice" ADD COLUMN "number" INTEGER, ADD COLUMN "journalEntryId" TEXT;
CREATE UNIQUE INDEX "Invoice_organizationId_fiscalYearId_number_key" ON "Invoice"("organizationId", "fiscalYearId", "number");
CREATE UNIQUE INDEX "Invoice_org_year_entry_key" ON "Invoice"("organizationId", "fiscalYearId", "journalEntryId");
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_org_year_entry_fkey" FOREIGN KEY ("organizationId", "fiscalYearId", "journalEntryId") REFERENCES "JournalEntry"("organizationId", "fiscalYearId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Compare enum values as text so this migration can run inside a single transaction.
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_status_journal_check" CHECK (
  ("status"::text = 'DRAFT' AND "number" IS NULL AND "journalEntryId" IS NULL)
  OR ("status"::text = 'ISSUED' AND "number" IS NOT NULL AND "number" > 0 AND "journalEntryId" IS NOT NULL)
);

CREATE FUNCTION "protect_issued_invoice"() RETURNS trigger AS $$
DECLARE entry_status "JournalEntryStatus"; entry_date DATE;
BEGIN
  IF TG_OP <> 'INSERT' AND OLD."status"::text = 'ISSUED' THEN
    RAISE EXCEPTION 'Issued invoices cannot be modified or deleted' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  IF NEW."status"::text = 'ISSUED' THEN
    SELECT e."status", e."date" INTO entry_status, entry_date FROM "JournalEntry" e
      WHERE e."organizationId" = NEW."organizationId" AND e."fiscalYearId" = NEW."fiscalYearId" AND e.id = NEW."journalEntryId" FOR SHARE;
    IF NOT FOUND OR entry_status <> 'POSTED' OR entry_date <> NEW."date" THEN
      RAISE EXCEPTION 'Issued invoice requires a posted journal with matching date and year' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "Invoice_protect_issued" BEFORE INSERT OR UPDATE OR DELETE ON "Invoice" FOR EACH ROW EXECUTE FUNCTION "protect_issued_invoice"();

CREATE FUNCTION "protect_issued_invoice_line"() RETURNS trigger AS $$
DECLARE parent_status "InvoiceStatus";
BEGIN
  IF TG_OP <> 'INSERT' THEN
    SELECT "status" INTO parent_status FROM "Invoice" WHERE "organizationId" = OLD."organizationId" AND id = OLD."invoiceId" FOR UPDATE;
    IF FOUND AND parent_status::text = 'ISSUED' THEN RAISE EXCEPTION 'Issued invoice lines cannot be changed' USING ERRCODE = '23514'; END IF;
  END IF;
  IF TG_OP <> 'DELETE' THEN
    SELECT "status" INTO parent_status FROM "Invoice" WHERE "organizationId" = NEW."organizationId" AND id = NEW."invoiceId" FOR UPDATE;
    IF FOUND AND parent_status::text = 'ISSUED' THEN RAISE EXCEPTION 'Issued invoice lines cannot be changed' USING ERRCODE = '23514'; END IF;
    RETURN NEW;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "InvoiceLine_protect_issued" BEFORE INSERT OR UPDATE OR DELETE ON "InvoiceLine" FOR EACH ROW EXECUTE FUNCTION "protect_issued_invoice_line"();
