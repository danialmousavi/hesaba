CREATE TYPE "ProductType" AS ENUM ('GOODS', 'SERVICE');

CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ProductType" NOT NULL,
    "unit" TEXT NOT NULL,
    "salePrice" DECIMAL(20,0) NOT NULL,
    "purchasePrice" DECIMAL(20,0),
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Product_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Product_code_check" CHECK (length(btrim("code")) > 0),
    CONSTRAINT "Product_name_check" CHECK (length(btrim("name")) > 0),
    CONSTRAINT "Product_unit_check" CHECK (length(btrim("unit")) > 0),
    CONSTRAINT "Product_prices_check" CHECK ("salePrice" >= 0 AND ("purchasePrice" IS NULL OR "purchasePrice" >= 0))
);

CREATE UNIQUE INDEX "Product_organizationId_id_key" ON "Product"("organizationId", "id");
CREATE UNIQUE INDEX "Product_organizationId_code_key" ON "Product"("organizationId", "code");
CREATE INDEX "Product_organizationId_name_idx" ON "Product"("organizationId", "name");
CREATE INDEX "Product_organizationId_type_isActive_idx" ON "Product"("organizationId", "type", "isActive");

ALTER TABLE "Product" ADD CONSTRAINT "Product_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
