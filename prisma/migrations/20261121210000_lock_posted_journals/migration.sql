CREATE FUNCTION "protect_posted_journal_entry"() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW."status" = 'POSTED' THEN
      RAISE EXCEPTION 'Journal entries must be created as drafts' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;
  IF OLD."status" = 'POSTED' THEN
    RAISE EXCEPTION 'Posted journal entries cannot be modified or deleted' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "JournalEntry_protect_posted"
BEFORE INSERT OR UPDATE OR DELETE ON "JournalEntry"
FOR EACH ROW EXECUTE FUNCTION "protect_posted_journal_entry"();

CREATE FUNCTION "protect_posted_journal_line"() RETURNS trigger AS $$
DECLARE
  entry_status "JournalEntryStatus";
  target RECORD;
BEGIN
  FOR target IN
    SELECT e."status" FROM "JournalEntry" e
    WHERE (TG_OP <> 'INSERT' AND e."organizationId" = OLD."organizationId" AND e.id = OLD."entryId")
       OR (TG_OP <> 'DELETE' AND e."organizationId" = NEW."organizationId" AND e.id = NEW."entryId")
    ORDER BY e."organizationId", e.id FOR UPDATE
  LOOP
    entry_status := target."status";
    IF entry_status = 'POSTED' THEN
      RAISE EXCEPTION 'Lines of posted journal entries cannot be modified' USING ERRCODE = '23514';
    END IF;
  END LOOP;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "JournalLine_protect_posted"
BEFORE INSERT OR UPDATE OR DELETE ON "JournalLine"
FOR EACH ROW EXECUTE FUNCTION "protect_posted_journal_line"();
