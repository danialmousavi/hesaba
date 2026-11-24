import assert from "node:assert/strict";
import { calculateInvoice, calculateInvoiceLine, InvoiceCalculationError } from "../lib/invoice-calculation.ts";

const line = (overrides = {}) => ({ quantity: "1", unitPrice: "100", discountAmount: "0", taxAmount: "0", ...overrides });
assert.deepEqual(calculateInvoiceLine(line({ quantity: "1.250", unitPrice: "1000", discountAmount: "50", taxAmount: "120" })), {
  subtotal: "1250", discountAmount: "50", taxableAmount: "1200", taxAmount: "120", total: "1320",
});
assert.equal(calculateInvoiceLine(line({ quantity: "0.499", unitPrice: "1" })).subtotal, "0");
assert.equal(calculateInvoiceLine(line({ quantity: "0.500", unitPrice: "1" })).subtotal, "1");
assert.equal(calculateInvoiceLine(line({ quantity: "0.001", unitPrice: "0" })).total, "0");
assert.deepEqual(calculateInvoice([line({ quantity: "0.500", unitPrice: "1" }), line({ quantity: "0.500", unitPrice: "1" })]).totals, {
  subtotal: "2", discountAmount: "0", taxableAmount: "2", taxAmount: "0", total: "2",
});
assert.equal(calculateInvoiceLine(line({ unitPrice: "99999999999999999999", discountAmount: "99999999999999999999" })).total, "0");
assert.equal(calculateInvoiceLine(line({ quantity: "999999999999999.999", unitPrice: "0" })).subtotal, "0");
assert.equal(calculateInvoiceLine(line({ unitPrice: "9007199254740993", quantity: "1.001" })).subtotal, "9016206453995734");
for (const invalid of ["0", "0.000", "1.0000", "1000000000000000", "1e2", "-1", " 1", "01", "NaN"]) {
  assert.throws(() => calculateInvoiceLine(line({ quantity: invalid })), InvoiceCalculationError);
}
for (const invalid of ["-1", "1.0", "1e2", "", "01", "100000000000000000000", 1]) {
  assert.throws(() => calculateInvoiceLine(line({ unitPrice: invalid })), InvoiceCalculationError);
}
assert.throws(() => calculateInvoice([]), InvoiceCalculationError);
assert.throws(() => calculateInvoiceLine(line({ unitPrice: "10", discountAmount: "11" })), InvoiceCalculationError);
assert.throws(() => calculateInvoiceLine(line({ unitPrice: "99999999999999999999", quantity: "2" })), InvoiceCalculationError);
assert.throws(() => calculateInvoiceLine(line({ unitPrice: "99999999999999999999", taxAmount: "1" })), InvoiceCalculationError);
assert.throws(() => calculateInvoice([line({ unitPrice: "99999999999999999999" }), line({ unitPrice: "1" })]), InvoiceCalculationError);
console.log("Invoice calculation tests passed.");
