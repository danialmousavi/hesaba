CREATE TYPE "PartyAccountPurpose" AS ENUM ('RECEIVABLE', 'PAYABLE');
CREATE TYPE "PartyAccountEventType" AS ENUM ('LINKED', 'UNLINKED', 'CHANGED');

CREATE TABLE "PartyAccount" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "purpose" "PartyAccountPurpose" NOT NULL,
    "firstUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PartyAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PartyAccountEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "purpose" "PartyAccountPurpose" NOT NULL,
    "type" "PartyAccountEventType" NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "oldAccountId" TEXT,
    "newAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PartyAccountEvent_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PartyAccountEvent_change_check" CHECK (
      ("type" = 'LINKED' AND "oldAccountId" IS NULL AND "newAccountId" IS NOT NULL) OR
      ("type" = 'UNLINKED' AND "oldAccountId" IS NOT NULL AND "newAccountId" IS NULL) OR
      ("type" = 'CHANGED' AND "oldAccountId" IS NOT NULL AND "newAccountId" IS NOT NULL AND "oldAccountId" <> "newAccountId")
    )
);

CREATE UNIQUE INDEX "PartyAccount_organizationId_partyId_purpose_key" ON "PartyAccount"("organizationId", "partyId", "purpose");
CREATE UNIQUE INDEX "PartyAccount_organizationId_accountId_key" ON "PartyAccount"("organizationId", "accountId");
CREATE INDEX "PartyAccountEvent_organizationId_partyId_createdAt_idx" ON "PartyAccountEvent"("organizationId", "partyId", "createdAt");

ALTER TABLE "PartyAccount" ADD CONSTRAINT "PartyAccount_organizationId_partyId_fkey" FOREIGN KEY ("organizationId", "partyId") REFERENCES "Party"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PartyAccount" ADD CONSTRAINT "PartyAccount_organizationId_accountId_fkey" FOREIGN KEY ("organizationId", "accountId") REFERENCES "LedgerAccount"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PartyAccountEvent" ADD CONSTRAINT "PartyAccountEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PartyAccountEvent" ADD CONSTRAINT "PartyAccountEvent_organizationId_partyId_fkey" FOREIGN KEY ("organizationId", "partyId") REFERENCES "Party"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
