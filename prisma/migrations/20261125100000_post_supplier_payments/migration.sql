ALTER TABLE "Payment" DROP CONSTRAINT "Payment_posted_check";
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_posted_check" CHECK (
  ("status"::text = 'DRAFT' AND "requestKey" IS NULL AND "requestHash" IS NULL AND "journalEntryId" IS NULL)
  OR ("status"::text = 'POSTED' AND "type" IN ('RECEIPT', 'PAYMENT') AND "requestKey" IS NOT NULL AND length("requestKey") = 36 AND "requestHash" IS NOT NULL AND length("requestHash") = 64 AND "journalEntryId" IS NOT NULL)
);
