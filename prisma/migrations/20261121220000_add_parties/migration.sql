CREATE TABLE "Party" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isCustomer" BOOLEAN NOT NULL DEFAULT false,
    "isSupplier" BOOLEAN NOT NULL DEFAULT false,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Party_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Party_role_check" CHECK ("isCustomer" OR "isSupplier"),
    CONSTRAINT "Party_name_check" CHECK (length(btrim("name")) > 0)
);

CREATE UNIQUE INDEX "Party_organizationId_id_key" ON "Party"("organizationId", "id");
CREATE INDEX "Party_organizationId_name_idx" ON "Party"("organizationId", "name");
CREATE INDEX "Party_organizationId_isCustomer_isActive_idx" ON "Party"("organizationId", "isCustomer", "isActive");
CREATE INDEX "Party_organizationId_isSupplier_isActive_idx" ON "Party"("organizationId", "isSupplier", "isActive");

ALTER TABLE "Party" ADD CONSTRAINT "Party_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
