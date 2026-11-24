ALTER TABLE "Invoice" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_revision_check" CHECK ("revision" >= 0);
