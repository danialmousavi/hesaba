import assert from "node:assert/strict";
import { renderInvoicePdfHtml } from "../lib/invoice-pdf-document.ts";

const invoice = { status: "ISSUED", number: 12, date: "2026-05-01", customerName: "مشتری <خاص>", description: "شرح & جزئیات", lines: [{ id: "line", position: 1, productCode: "P1", productName: "کالای فارسی", quantity: "1.250", unit: "عدد", unitPrice: "1000", discountAmount: "50", taxAmount: "120", amounts: { total: "1320" } }], totals: { subtotal: "1250", discountAmount: "50", taxableAmount: "1200", taxAmount: "120", total: "1320" } };
const html = renderInvoicePdfHtml(invoice, "فروشنده <ویژه>", "QUJD", "REVG");
assert.ok(html.includes("فاکتور فروش") && html.includes("کالای فارسی") && html.includes("۱٬۳۲۰") && html.includes("۱٫۲۵"));
assert.ok(html.includes("۱۱ اردیبهشت ۱۴۰۵") && html.includes("وضعیت: صادرشده"));
assert.ok(html.includes("مشتری &lt;خاص&gt;") && html.includes("فروشنده &lt;ویژه&gt;") && html.includes("شرح &amp; جزئیات"));
assert.ok(html.includes("font-src data:") && html.includes("data:font/ttf;base64,QUJD"));
assert.ok(renderInvoicePdfHtml({ ...invoice, status: "DRAFT", number: null }, "فروشنده", "QUJD", "REVG").includes("پیش‌نویس — صادر نشده"));
assert.ok(renderInvoicePdfHtml({ ...invoice, status: "CANCELLED" }, "فروشنده", "QUJD", "REVG").includes("باطل‌شده"));
console.log("Invoice PDF document checks passed.");
