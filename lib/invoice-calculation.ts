/** Monetary inputs and outputs are decimal strings in whole rials. */
export type InvoiceLineInput = {
  quantity: string;
  unitPrice: string;
  discountAmount: string;
  taxAmount: string;
};

export type InvoiceLineAmounts = {
  subtotal: string;
  discountAmount: string;
  taxableAmount: string;
  taxAmount: string;
  total: string;
};

export class InvoiceCalculationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvoiceCalculationError";
  }
}

const MAX_AMOUNT = 10n ** 20n - 1n;

function amount(value: string, field: string): bigint {
  if (typeof value !== "string" || !/^(0|[1-9]\d{0,19})$/.test(value)) {
    throw new InvoiceCalculationError(`${field} must be a nonnegative integer string of at most 20 digits`);
  }
  return BigInt(value);
}

function quantityInThousandths(value: string): bigint {
  if (typeof value !== "string" || !/^(0|[1-9]\d{0,14})(\.\d{1,3})?$/.test(value)) {
    throw new InvoiceCalculationError("quantity must have at most 15 integer and 3 fractional digits");
  }
  const [whole, fraction = ""] = value.split(".");
  const scaled = BigInt(whole) * 1000n + BigInt(fraction.padEnd(3, "0"));
  if (scaled === 0n) throw new InvoiceCalculationError("quantity must be positive");
  return scaled;
}

function bounded(value: bigint, field: string): bigint {
  if (value > MAX_AMOUNT) throw new InvoiceCalculationError(`${field} exceeds the 20-digit rial limit`);
  return value;
}

export function calculateInvoiceLine(input: InvoiceLineInput): InvoiceLineAmounts {
  if (!input || typeof input !== "object") throw new InvoiceCalculationError("line is required");
  const quantity = quantityInThousandths(input.quantity);
  const price = amount(input.unitPrice, "unitPrice");
  const discount = amount(input.discountAmount, "discountAmount");
  const tax = amount(input.taxAmount, "taxAmount");

  // Nonnegative half-rial ties round up, independently for each line.
  const subtotal = bounded((quantity * price + 500n) / 1000n, "subtotal");
  if (discount > subtotal) throw new InvoiceCalculationError("discountAmount exceeds the line subtotal");
  const taxable = subtotal - discount;
  const total = bounded(taxable + tax, "line total");
  return {
    subtotal: subtotal.toString(),
    discountAmount: discount.toString(),
    taxableAmount: taxable.toString(),
    taxAmount: tax.toString(),
    total: total.toString(),
  };
}

export function calculateInvoice(lines: InvoiceLineInput[]) {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new InvoiceCalculationError("invoice must contain at least one line");
  }
  const calculatedLines = lines.map(calculateInvoiceLine);
  const totals = { subtotal: 0n, discountAmount: 0n, taxableAmount: 0n, taxAmount: 0n, total: 0n };
  for (const line of calculatedLines) {
    for (const field of Object.keys(totals) as (keyof typeof totals)[]) {
      totals[field] = bounded(totals[field] + BigInt(line[field]), `invoice ${field}`);
    }
  }
  return {
    lines: calculatedLines,
    totals: {
      subtotal: totals.subtotal.toString(),
      discountAmount: totals.discountAmount.toString(),
      taxableAmount: totals.taxableAmount.toString(),
      taxAmount: totals.taxAmount.toString(),
      total: totals.total.toString(),
    },
  };
}
