CREATE TYPE "PaymentType" AS ENUM ('RECEIPT', 'PAYMENT');
CREATE TYPE "PaymentStatus" AS ENUM ('DRAFT');

CREATE UNIQUE INDEX "Invoice_org_customer_id_key" ON "Invoice"("organizationId", "customerId", "id");

CREATE TABLE "Payment" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "fiscalYearId" TEXT NOT NULL,
  "partyId" TEXT NOT NULL,
  "type" "PaymentType" NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'DRAFT',
  "date" DATE NOT NULL,
  "amount" DECIMAL(20,0) NOT NULL,
  "method" "FinancialPaymentMethod" NOT NULL,
  "settlementAccountId" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Payment_amount_positive_check" CHECK ("amount" > 0)
);

CREATE TABLE "PaymentAllocation" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "partyId" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "paymentType" "PaymentType" NOT NULL DEFAULT 'RECEIPT',
  "invoiceId" TEXT NOT NULL,
  "amount" DECIMAL(20,0) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentAllocation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PaymentAllocation_amount_positive_check" CHECK ("amount" > 0),
  CONSTRAINT "PaymentAllocation_receipt_check" CHECK ("paymentType" = 'RECEIPT')
);

CREATE UNIQUE INDEX "Payment_org_party_id_type_key" ON "Payment"("organizationId", "partyId", "id", "type");
CREATE INDEX "Payment_organizationId_fiscalYearId_date_idx" ON "Payment"("organizationId", "fiscalYearId", "date");
CREATE INDEX "Payment_organizationId_partyId_type_idx" ON "Payment"("organizationId", "partyId", "type");
CREATE UNIQUE INDEX "PaymentAllocation_org_payment_invoice_key" ON "PaymentAllocation"("organizationId", "paymentId", "invoiceId");
CREATE INDEX "PaymentAllocation_organizationId_invoiceId_idx" ON "PaymentAllocation"("organizationId", "invoiceId");

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_organizationId_fiscalYearId_fkey" FOREIGN KEY ("organizationId", "fiscalYearId") REFERENCES "FiscalYear"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_organizationId_partyId_fkey" FOREIGN KEY ("organizationId", "partyId") REFERENCES "Party"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_organizationId_settlementAccountId_fkey" FOREIGN KEY ("organizationId", "settlementAccountId") REFERENCES "LedgerAccount"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_payment_fkey" FOREIGN KEY ("organizationId", "partyId", "paymentId", "paymentType") REFERENCES "Payment"("organizationId", "partyId", "id", "type") ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_invoice_fkey" FOREIGN KEY ("organizationId", "partyId", "invoiceId") REFERENCES "Invoice"("organizationId", "customerId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;
