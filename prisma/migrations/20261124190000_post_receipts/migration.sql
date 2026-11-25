ALTER TYPE "PaymentStatus" ADD VALUE 'POSTED';
ALTER TABLE "Payment" ADD COLUMN "requestKey" TEXT, ADD COLUMN "requestHash" TEXT, ADD COLUMN "journalEntryId" TEXT;
CREATE UNIQUE INDEX "Payment_org_request_key" ON "Payment"("organizationId", "requestKey");
CREATE UNIQUE INDEX "Payment_org_year_entry_key" ON "Payment"("organizationId", "fiscalYearId", "journalEntryId");
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_org_year_entry_fkey" FOREIGN KEY ("organizationId", "fiscalYearId", "journalEntryId") REFERENCES "JournalEntry"("organizationId", "fiscalYearId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_posted_check" CHECK (
  ("status"::text = 'DRAFT' AND "requestKey" IS NULL AND "requestHash" IS NULL AND "journalEntryId" IS NULL)
  OR ("status"::text = 'POSTED' AND "type" = 'RECEIPT' AND "requestKey" IS NOT NULL AND length("requestKey") = 36 AND "requestHash" IS NOT NULL AND length("requestHash") = 64 AND "journalEntryId" IS NOT NULL)
);

CREATE FUNCTION "protect_posted_payment"() RETURNS trigger AS $$
DECLARE entry_status "JournalEntryStatus"; entry_date DATE;
BEGIN
  IF TG_OP <> 'INSERT' AND OLD."status"::text = 'POSTED' THEN
    RAISE EXCEPTION 'Posted payments cannot be changed or deleted' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  IF NEW."status"::text = 'POSTED' THEN
    SELECT e."status", e."date" INTO entry_status, entry_date FROM "JournalEntry" e
      WHERE e."organizationId" = NEW."organizationId" AND e."fiscalYearId" = NEW."fiscalYearId" AND e.id = NEW."journalEntryId" FOR SHARE;
    IF NOT FOUND OR entry_status <> 'POSTED' OR entry_date <> NEW."date" THEN
      RAISE EXCEPTION 'Posted payment requires a matching posted journal' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "Payment_protect_posted" BEFORE INSERT OR UPDATE OR DELETE ON "Payment" FOR EACH ROW EXECUTE FUNCTION "protect_posted_payment"();

CREATE FUNCTION "protect_posted_payment_allocation"() RETURNS trigger AS $$
DECLARE parent_status "PaymentStatus";
BEGIN
  IF TG_OP <> 'INSERT' THEN
    SELECT "status" INTO parent_status FROM "Payment" WHERE "organizationId" = OLD."organizationId" AND id = OLD."paymentId" FOR UPDATE;
    IF FOUND AND parent_status::text = 'POSTED' THEN RAISE EXCEPTION 'Posted payment allocations cannot be changed' USING ERRCODE = '23514'; END IF;
  END IF;
  IF TG_OP <> 'DELETE' THEN
    SELECT "status" INTO parent_status FROM "Payment" WHERE "organizationId" = NEW."organizationId" AND id = NEW."paymentId" FOR UPDATE;
    IF FOUND AND parent_status::text = 'POSTED' THEN RAISE EXCEPTION 'Posted payment allocations cannot be changed' USING ERRCODE = '23514'; END IF;
    RETURN NEW;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "PaymentAllocation_protect_posted" BEFORE INSERT OR UPDATE OR DELETE ON "PaymentAllocation" FOR EACH ROW EXECUTE FUNCTION "protect_posted_payment_allocation"();
