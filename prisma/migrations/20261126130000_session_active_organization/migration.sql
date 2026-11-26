ALTER TABLE "Session" ADD COLUMN "activeOrganizationId" TEXT;
CREATE INDEX "Session_activeOrganizationId_idx" ON "Session"("activeOrganizationId");
ALTER TABLE "Session" ADD CONSTRAINT "Session_activeOrganizationId_fkey" FOREIGN KEY ("activeOrganizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
