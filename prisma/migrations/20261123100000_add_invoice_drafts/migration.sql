CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT');

CREATE TABLE "Invoice" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "fiscalYearId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "customerName" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Invoice_customerName_check" CHECK (length(btrim("customerName")) > 0)
);

CREATE TABLE "InvoiceLine" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "productCode" TEXT NOT NULL,
  "productName" TEXT NOT NULL,
  "productType" "ProductType" NOT NULL,
  "unit" TEXT NOT NULL,
  "quantity" DECIMAL(18,3) NOT NULL,
  "unitPrice" DECIMAL(20,0) NOT NULL,
  "discountAmount" DECIMAL(20,0) NOT NULL DEFAULT 0,
  "taxAmount" DECIMAL(20,0) NOT NULL DEFAULT 0,
  CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InvoiceLine_position_check" CHECK ("position" > 0),
  CONSTRAINT "InvoiceLine_snapshot_check" CHECK (length(btrim("productCode")) > 0 AND length(btrim("productName")) > 0 AND length(btrim("unit")) > 0),
  CONSTRAINT "InvoiceLine_amounts_check" CHECK ("quantity" > 0 AND "unitPrice" >= 0 AND "discountAmount" >= 0 AND "taxAmount" >= 0)
);

CREATE UNIQUE INDEX "Invoice_organizationId_id_key" ON "Invoice"("organizationId", "id");
CREATE INDEX "Invoice_organizationId_fiscalYearId_date_idx" ON "Invoice"("organizationId", "fiscalYearId", "date");
CREATE INDEX "Invoice_organizationId_customerId_status_idx" ON "Invoice"("organizationId", "customerId", "status");
CREATE UNIQUE INDEX "InvoiceLine_organizationId_invoiceId_position_key" ON "InvoiceLine"("organizationId", "invoiceId", "position");
CREATE INDEX "InvoiceLine_organizationId_productId_idx" ON "InvoiceLine"("organizationId", "productId");
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_organizationId_fiscalYearId_fkey" FOREIGN KEY ("organizationId", "fiscalYearId") REFERENCES "FiscalYear"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_organizationId_customerId_fkey" FOREIGN KEY ("organizationId", "customerId") REFERENCES "Party"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_organizationId_invoiceId_fkey" FOREIGN KEY ("organizationId", "invoiceId") REFERENCES "Invoice"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_organizationId_productId_fkey" FOREIGN KEY ("organizationId", "productId") REFERENCES "Product"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
