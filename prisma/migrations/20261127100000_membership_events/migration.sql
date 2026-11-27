-- CreateEnum
CREATE TYPE "MembershipEventType" AS ENUM ('GRANTED', 'ROLE_CHANGED', 'REVOKED');

-- CreateTable
CREATE TABLE "MembershipEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "membershipId" TEXT,
    "type" "MembershipEventType" NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "memberUserId" TEXT NOT NULL,
    "memberName" TEXT NOT NULL,
    "memberEmail" TEXT NOT NULL,
    "previousRole" "OrganizationRole",
    "nextRole" "OrganizationRole",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembershipEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MembershipEvent_organizationId_createdAt_idx" ON "MembershipEvent"("organizationId", "createdAt");
CREATE INDEX "MembershipEvent_organizationId_memberUserId_createdAt_idx" ON "MembershipEvent"("organizationId", "memberUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "MembershipEvent" ADD CONSTRAINT "MembershipEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
