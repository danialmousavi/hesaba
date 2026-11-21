CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "FiscalYear"
ADD CONSTRAINT "FiscalYear_no_overlap"
EXCLUDE USING gist (
  "organizationId" WITH =,
  daterange("startDate", "endDate", '[]') WITH &&
);
