CREATE TABLE "JournalEvent" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "entryId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "actorName" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JournalEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "JournalEvent_organizationId_entryId_createdAt_idx" ON "JournalEvent"("organizationId", "entryId", "createdAt");
ALTER TABLE "JournalEvent" ADD CONSTRAINT "JournalEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "JournalEvent" ADD CONSTRAINT "JournalEvent_organizationId_entryId_fkey" FOREIGN KEY ("organizationId", "entryId") REFERENCES "JournalEntry"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
