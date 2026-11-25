CREATE TABLE "JournalReversal" (
  "organizationId" TEXT NOT NULL,
  "sourceEntryId" TEXT NOT NULL,
  "reversalEntryId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "actorName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JournalReversal_pkey" PRIMARY KEY ("organizationId", "sourceEntryId"),
  CONSTRAINT "JournalReversal_distinct_check" CHECK ("sourceEntryId" <> "reversalEntryId")
);
CREATE UNIQUE INDEX "JournalReversal_organizationId_reversalEntryId_key" ON "JournalReversal"("organizationId", "reversalEntryId");
ALTER TABLE "JournalReversal" ADD CONSTRAINT "JournalReversal_source_fkey" FOREIGN KEY ("organizationId", "sourceEntryId") REFERENCES "JournalEntry"("organizationId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "JournalReversal" ADD CONSTRAINT "JournalReversal_reversal_fkey" FOREIGN KEY ("organizationId", "reversalEntryId") REFERENCES "JournalEntry"("organizationId", "id") ON DELETE CASCADE ON UPDATE RESTRICT;

CREATE FUNCTION "validate_journal_reversal"() RETURNS trigger AS $$
DECLARE original_status "JournalEntryStatus"; reverse_status "JournalEntryStatus";
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT status INTO reverse_status FROM "JournalEntry" WHERE "organizationId"=OLD."organizationId" AND id=OLD."reversalEntryId" FOR UPDATE;
    IF reverse_status = 'POSTED' THEN RAISE EXCEPTION 'Posted reversal links cannot be deleted' USING ERRCODE = '23514'; END IF;
    RETURN OLD;
  END IF;
  IF TG_OP = 'UPDATE' THEN RAISE EXCEPTION 'Journal reversal links cannot be changed' USING ERRCODE = '23514'; END IF;
  SELECT status INTO original_status FROM "JournalEntry" WHERE "organizationId"=NEW."organizationId" AND id=NEW."sourceEntryId" FOR UPDATE;
  SELECT status INTO reverse_status FROM "JournalEntry" WHERE "organizationId"=NEW."organizationId" AND id=NEW."reversalEntryId" FOR UPDATE;
  IF original_status IS DISTINCT FROM 'POSTED'::"JournalEntryStatus" OR reverse_status IS DISTINCT FROM 'DRAFT'::"JournalEntryStatus" THEN
    RAISE EXCEPTION 'Reversal requires posted original and draft reversal' USING ERRCODE = '23514';
  END IF;
  IF EXISTS (SELECT 1 FROM "JournalReversal" WHERE "organizationId"=NEW."organizationId" AND "reversalEntryId"=NEW."sourceEntryId") THEN
    RAISE EXCEPTION 'A reversal cannot be reversed directly' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "JournalReversal_validate" BEFORE INSERT OR UPDATE OR DELETE ON "JournalReversal" FOR EACH ROW EXECUTE FUNCTION "validate_journal_reversal"();

CREATE FUNCTION "protect_reversal_lines"() RETURNS trigger AS $$
BEGIN
  IF (TG_OP <> 'INSERT' AND EXISTS (SELECT 1 FROM "JournalReversal" WHERE "organizationId"=OLD."organizationId" AND "reversalEntryId"=OLD."entryId"))
     OR (TG_OP <> 'DELETE' AND EXISTS (SELECT 1 FROM "JournalReversal" WHERE "organizationId"=NEW."organizationId" AND "reversalEntryId"=NEW."entryId")) THEN
    RAISE EXCEPTION 'Linked reversal lines cannot be modified' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "JournalLine_protect_reversal" BEFORE INSERT OR UPDATE OR DELETE ON "JournalLine" FOR EACH ROW EXECUTE FUNCTION "protect_reversal_lines"();
