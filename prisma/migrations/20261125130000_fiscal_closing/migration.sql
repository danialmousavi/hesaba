-- CreateEnum
CREATE TYPE "JournalEntryKind" AS ENUM ('NORMAL', 'CLOSING_TEMPORARY', 'CLOSING_PERMANENT', 'OPENING');

-- AlterTable
ALTER TABLE "JournalEntry" ADD COLUMN     "kind" "JournalEntryKind" NOT NULL DEFAULT 'NORMAL';

-- CreateTable
CREATE TABLE "FiscalClosing" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sourceYearId" TEXT NOT NULL,
    "targetYearId" TEXT NOT NULL,
    "temporaryEntryId" TEXT,
    "permanentEntryId" TEXT,
    "openingEntryId" TEXT,
    "requestKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "previewFingerprint" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "summary" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FiscalClosing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FiscalClosing_organizationId_requestKey_key" ON "FiscalClosing"("organizationId", "requestKey");

-- CreateIndex
CREATE UNIQUE INDEX "FiscalClosing_organizationId_sourceYearId_key" ON "FiscalClosing"("organizationId", "sourceYearId");

-- CreateIndex
CREATE UNIQUE INDEX "FiscalClosing_organizationId_targetYearId_key" ON "FiscalClosing"("organizationId", "targetYearId");

-- CreateIndex
CREATE UNIQUE INDEX "FiscalClosing_organizationId_sourceYearId_temporaryEntryId_key" ON "FiscalClosing"("organizationId", "sourceYearId", "temporaryEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "FiscalClosing_organizationId_sourceYearId_permanentEntryId_key" ON "FiscalClosing"("organizationId", "sourceYearId", "permanentEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "FiscalClosing_organizationId_targetYearId_openingEntryId_key" ON "FiscalClosing"("organizationId", "targetYearId", "openingEntryId");

-- AddForeignKey
ALTER TABLE "FiscalClosing" ADD CONSTRAINT "FiscalClosing_organizationId_sourceYearId_fkey" FOREIGN KEY ("organizationId", "sourceYearId") REFERENCES "FiscalYear"("organizationId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "FiscalClosing" ADD CONSTRAINT "FiscalClosing_organizationId_targetYearId_fkey" FOREIGN KEY ("organizationId", "targetYearId") REFERENCES "FiscalYear"("organizationId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "FiscalClosing" ADD CONSTRAINT "FiscalClosing_organizationId_sourceYearId_temporaryEntryId_fkey" FOREIGN KEY ("organizationId", "sourceYearId", "temporaryEntryId") REFERENCES "JournalEntry"("organizationId", "fiscalYearId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "FiscalClosing" ADD CONSTRAINT "FiscalClosing_organizationId_sourceYearId_permanentEntryId_fkey" FOREIGN KEY ("organizationId", "sourceYearId", "permanentEntryId") REFERENCES "JournalEntry"("organizationId", "fiscalYearId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "FiscalClosing" ADD CONSTRAINT "FiscalClosing_organizationId_targetYearId_openingEntryId_fkey" FOREIGN KEY ("organizationId", "targetYearId", "openingEntryId") REFERENCES "JournalEntry"("organizationId", "fiscalYearId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "FiscalClosing" ADD CONSTRAINT "FiscalClosing_distinct_years_check" CHECK ("sourceYearId" <> "targetYearId");
ALTER TABLE "FiscalClosing" ADD CONSTRAINT "FiscalClosing_paired_entries_check" CHECK (("permanentEntryId" IS NULL) = ("openingEntryId" IS NULL));

CREATE FUNCTION "protect_fiscal_closing"() RETURNS trigger AS $$
DECLARE entry_kind "JournalEntryKind"; entry_status "JournalEntryStatus";
BEGIN
  IF TG_OP <> 'INSERT' THEN RAISE EXCEPTION 'Fiscal closing records cannot be changed or deleted' USING ERRCODE = '23514'; END IF;
  IF NOT EXISTS (SELECT 1 FROM "FiscalYear" WHERE "organizationId"=NEW."organizationId" AND id=NEW."sourceYearId" AND status='CLOSED') OR NOT EXISTS (SELECT 1 FROM "FiscalYear" WHERE "organizationId"=NEW."organizationId" AND id=NEW."targetYearId" AND status='OPEN') THEN RAISE EXCEPTION 'Fiscal closing requires closed source and open target' USING ERRCODE = '23514'; END IF;
  IF NEW."temporaryEntryId" IS NOT NULL THEN
    SELECT kind,status INTO entry_kind,entry_status FROM "JournalEntry" WHERE "organizationId"=NEW."organizationId" AND id=NEW."temporaryEntryId";
    IF entry_kind IS DISTINCT FROM 'CLOSING_TEMPORARY'::"JournalEntryKind" OR entry_status IS DISTINCT FROM 'POSTED'::"JournalEntryStatus" THEN RAISE EXCEPTION 'Invalid temporary closing entry' USING ERRCODE = '23514'; END IF;
  END IF;
  IF NEW."permanentEntryId" IS NOT NULL THEN
    SELECT kind,status INTO entry_kind,entry_status FROM "JournalEntry" WHERE "organizationId"=NEW."organizationId" AND id=NEW."permanentEntryId";
    IF entry_kind IS DISTINCT FROM 'CLOSING_PERMANENT'::"JournalEntryKind" OR entry_status IS DISTINCT FROM 'POSTED'::"JournalEntryStatus" THEN RAISE EXCEPTION 'Invalid permanent closing entry' USING ERRCODE = '23514'; END IF;
    SELECT kind,status INTO entry_kind,entry_status FROM "JournalEntry" WHERE "organizationId"=NEW."organizationId" AND id=NEW."openingEntryId";
    IF entry_kind IS DISTINCT FROM 'OPENING'::"JournalEntryKind" OR entry_status IS DISTINCT FROM 'POSTED'::"JournalEntryStatus" THEN RAISE EXCEPTION 'Invalid opening entry' USING ERRCODE = '23514'; END IF;
    IF EXISTS ((SELECT "accountId",debit,credit FROM "JournalLine" WHERE "organizationId"=NEW."organizationId" AND "entryId"=NEW."permanentEntryId" EXCEPT ALL SELECT "accountId",credit,debit FROM "JournalLine" WHERE "organizationId"=NEW."organizationId" AND "entryId"=NEW."openingEntryId") UNION ALL (SELECT "accountId",credit,debit FROM "JournalLine" WHERE "organizationId"=NEW."organizationId" AND "entryId"=NEW."openingEntryId" EXCEPT ALL SELECT "accountId",debit,credit FROM "JournalLine" WHERE "organizationId"=NEW."organizationId" AND "entryId"=NEW."permanentEntryId")) THEN RAISE EXCEPTION 'Opening entry must reverse closing entry' USING ERRCODE = '23514'; END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "FiscalClosing_protect" BEFORE INSERT OR UPDATE OR DELETE ON "FiscalClosing" FOR EACH ROW EXECUTE FUNCTION "protect_fiscal_closing"();

CREATE FUNCTION "protect_system_journal"() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD.kind <> 'NORMAL' THEN RAISE EXCEPTION 'System journal cannot be deleted' USING ERRCODE = '23514'; END IF;
  IF TG_OP = 'UPDATE' AND NEW.kind <> OLD.kind THEN RAISE EXCEPTION 'Journal kind cannot be changed' USING ERRCODE = '23514'; END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "JournalEntry_protect_kind" BEFORE UPDATE OR DELETE ON "JournalEntry" FOR EACH ROW EXECUTE FUNCTION "protect_system_journal"();

CREATE FUNCTION "prevent_system_journal_reversal"() RETURNS trigger AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "JournalEntry" WHERE "organizationId"=NEW."organizationId" AND id IN (NEW."sourceEntryId",NEW."reversalEntryId") AND kind <> 'NORMAL') THEN RAISE EXCEPTION 'System journal cannot be reversed' USING ERRCODE = '23514'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "JournalReversal_prevent_system" BEFORE INSERT ON "JournalReversal" FOR EACH ROW EXECUTE FUNCTION "prevent_system_journal_reversal"();

CREATE FUNCTION "check_system_journal_link"() RETURNS trigger AS $$
BEGIN
  IF NEW.kind <> 'NORMAL' AND NOT EXISTS (SELECT 1 FROM "FiscalClosing" WHERE "organizationId"=NEW."organizationId" AND ((NEW.kind='CLOSING_TEMPORARY' AND "temporaryEntryId"=NEW.id) OR (NEW.kind='CLOSING_PERMANENT' AND "permanentEntryId"=NEW.id) OR (NEW.kind='OPENING' AND "openingEntryId"=NEW.id))) THEN RAISE EXCEPTION 'System journal must belong to a completed fiscal closing' USING ERRCODE = '23514'; END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
CREATE CONSTRAINT TRIGGER "JournalEntry_system_link" AFTER INSERT ON "JournalEntry" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_system_journal_link"();
