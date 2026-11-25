ALTER TYPE "InvoiceStatus" ADD VALUE 'CANCELLED';

CREATE TABLE "InvoiceCancellation" (
  "organizationId" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "reversalEntryId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "actorName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InvoiceCancellation_pkey" PRIMARY KEY ("organizationId", "invoiceId"),
  CONSTRAINT "InvoiceCancellation_reason_check" CHECK (length(btrim("reason")) BETWEEN 1 AND 500),
  CONSTRAINT "InvoiceCancellation_invoice_fkey" FOREIGN KEY ("organizationId", "invoiceId") REFERENCES "Invoice"("organizationId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "InvoiceCancellation_journal_fkey" FOREIGN KEY ("organizationId", "reversalEntryId") REFERENCES "JournalEntry"("organizationId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE UNIQUE INDEX "InvoiceCancellation_organizationId_reversalEntryId_key" ON "InvoiceCancellation"("organizationId", "reversalEntryId");

ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_status_journal_check";
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_status_journal_check" CHECK (
  ("status"::text = 'DRAFT' AND "number" IS NULL AND "journalEntryId" IS NULL)
  OR ("status"::text IN ('ISSUED', 'CANCELLED') AND "number" > 0 AND "number" IS NOT NULL AND "journalEntryId" IS NOT NULL)
);

CREATE FUNCTION "validate_invoice_cancellation"() RETURNS trigger AS $$
DECLARE inv "Invoice"%ROWTYPE; reversal "JournalEntry"%ROWTYPE; year_status "FiscalYearStatus";
BEGIN
  IF TG_OP <> 'INSERT' THEN RAISE EXCEPTION 'Invoice cancellations cannot be changed or deleted' USING ERRCODE = '23514'; END IF;
  SELECT * INTO inv FROM "Invoice" WHERE "organizationId" = NEW."organizationId" AND id = NEW."invoiceId" FOR UPDATE;
  SELECT * INTO reversal FROM "JournalEntry" WHERE "organizationId" = NEW."organizationId" AND id = NEW."reversalEntryId" FOR SHARE;
  SELECT status INTO year_status FROM "FiscalYear" WHERE "organizationId" = NEW."organizationId" AND id = inv."fiscalYearId" FOR SHARE;
  IF inv."status"::text IS DISTINCT FROM 'ISSUED' OR reversal.status IS DISTINCT FROM 'POSTED'::"JournalEntryStatus" OR reversal."fiscalYearId" IS DISTINCT FROM inv."fiscalYearId" OR reversal.date < inv.date OR year_status IS DISTINCT FROM 'OPEN'::"FiscalYearStatus" OR NOT EXISTS (SELECT 1 FROM "JournalReversal" WHERE "organizationId" = NEW."organizationId" AND "sourceEntryId" = inv."journalEntryId" AND "reversalEntryId" = reversal.id) OR EXISTS (SELECT 1 FROM "PaymentAllocation" WHERE "organizationId" = NEW."organizationId" AND "invoiceId" = inv.id) THEN
    RAISE EXCEPTION 'Invoice cancellation requires an unpaid issued invoice and a posted reversal in its open fiscal year' USING ERRCODE = '23514';
  END IF;
  IF EXISTS ((SELECT "accountId", description, debit, credit FROM "JournalLine" WHERE "organizationId" = NEW."organizationId" AND "entryId" = inv."journalEntryId" EXCEPT ALL SELECT "accountId", description, credit, debit FROM "JournalLine" WHERE "organizationId" = NEW."organizationId" AND "entryId" = reversal.id) UNION ALL (SELECT "accountId", description, credit, debit FROM "JournalLine" WHERE "organizationId" = NEW."organizationId" AND "entryId" = reversal.id EXCEPT ALL SELECT "accountId", description, debit, credit FROM "JournalLine" WHERE "organizationId" = NEW."organizationId" AND "entryId" = inv."journalEntryId")) THEN
    RAISE EXCEPTION 'Invoice cancellation journal must reverse the original' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "InvoiceCancellation_validate" BEFORE INSERT OR UPDATE OR DELETE ON "InvoiceCancellation" FOR EACH ROW EXECUTE FUNCTION "validate_invoice_cancellation"();

CREATE FUNCTION "check_invoice_cancellation_completed"() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "Invoice" WHERE "organizationId" = NEW."organizationId" AND id = NEW."invoiceId" AND status::text = 'CANCELLED') THEN RAISE EXCEPTION 'Invoice cancellation must complete atomically' USING ERRCODE = '23514'; END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
CREATE CONSTRAINT TRIGGER "InvoiceCancellation_complete" AFTER INSERT ON "InvoiceCancellation" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_invoice_cancellation_completed"();

CREATE FUNCTION "prevent_cancelled_invoice_allocation"() RETURNS trigger AS $$
DECLARE invoice_status "InvoiceStatus";
BEGIN
  SELECT status INTO invoice_status FROM "Invoice" WHERE "organizationId" = NEW."organizationId" AND id = NEW."invoiceId" FOR UPDATE;
  IF invoice_status::text = 'CANCELLED' THEN RAISE EXCEPTION 'Cancelled invoices cannot receive allocations' USING ERRCODE = '23514'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "PaymentAllocation_prevent_cancelled" BEFORE INSERT OR UPDATE ON "PaymentAllocation" FOR EACH ROW EXECUTE FUNCTION "prevent_cancelled_invoice_allocation"();

CREATE OR REPLACE FUNCTION "protect_issued_invoice"() RETURNS trigger AS $$
DECLARE entry_status "JournalEntryStatus"; entry_date DATE;
BEGIN
  IF TG_OP <> 'INSERT' AND OLD."status"::text IN ('ISSUED', 'CANCELLED') THEN
    IF TG_OP <> 'UPDATE' OR OLD."status"::text <> 'ISSUED' OR NEW."status"::text <> 'CANCELLED' OR (to_jsonb(NEW) - ARRAY['status','revision','updatedAt']) IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['status','revision','updatedAt']) OR NEW.revision <> OLD.revision + 1 OR NOT EXISTS (SELECT 1 FROM "InvoiceCancellation" WHERE "organizationId" = OLD."organizationId" AND "invoiceId" = OLD.id) THEN
      RAISE EXCEPTION 'Issued invoices cannot be modified or deleted' USING ERRCODE = '23514';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  IF NEW."status"::text = 'CANCELLED' AND (TG_OP = 'INSERT' OR OLD."status"::text <> 'ISSUED') THEN RAISE EXCEPTION 'Invalid invoice cancellation transition' USING ERRCODE = '23514'; END IF;
  IF NEW."status"::text = 'ISSUED' THEN
    SELECT e."status", e."date" INTO entry_status, entry_date FROM "JournalEntry" e WHERE e."organizationId" = NEW."organizationId" AND e."fiscalYearId" = NEW."fiscalYearId" AND e.id = NEW."journalEntryId" FOR SHARE;
    IF NOT FOUND OR entry_status <> 'POSTED' OR entry_date <> NEW."date" THEN RAISE EXCEPTION 'Issued invoice requires a posted journal with matching date and year' USING ERRCODE = '23514'; END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "protect_issued_invoice_line"() RETURNS trigger AS $$
DECLARE parent_status "InvoiceStatus";
BEGIN
  IF TG_OP <> 'INSERT' THEN
    SELECT status INTO parent_status FROM "Invoice" WHERE "organizationId" = OLD."organizationId" AND id = OLD."invoiceId" FOR UPDATE;
    IF FOUND AND parent_status::text IN ('ISSUED', 'CANCELLED') THEN RAISE EXCEPTION 'Issued invoice lines cannot be changed' USING ERRCODE = '23514'; END IF;
  END IF;
  IF TG_OP <> 'DELETE' THEN
    SELECT status INTO parent_status FROM "Invoice" WHERE "organizationId" = NEW."organizationId" AND id = NEW."invoiceId" FOR UPDATE;
    IF FOUND AND parent_status::text IN ('ISSUED', 'CANCELLED') THEN RAISE EXCEPTION 'Issued invoice lines cannot be changed' USING ERRCODE = '23514'; END IF;
    RETURN NEW;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
