import { GET as trialBalance } from "@/app/api/reports/trial-balance/route";
import { GET as generalLedger } from "@/app/api/reports/general-ledger/route";
import { GET as profitLoss } from "@/app/api/reports/profit-loss/route";

type Amounts = { debit: string; credit: string; debitBalance: string; creditBalance: string };
type Account = { code: string; name: string; type: string };
type Trial = { fiscalYear: { name: string }; beforeClosing: boolean; rows: (Account & Amounts)[]; totals: Amounts };
type Ledger = { fiscalYear: { name: string }; account: Account; rows: (Amounts & { entry: { number: number; date: string; description: string | null }; description: string | null })[]; totals: Amounts };
type Profit = { fiscalYear: { name: string }; rows: (Account & { debit: string; credit: string; net: string })[]; totals: { revenue: string; expenses: string; profit: string } };
type Kind = "trial-balance" | "general-ledger" | "profit-loss";
type Cell = { value: string; numeric?: boolean };
const t = (value: string | number | null | undefined): Cell => ({ value: String(value ?? "") });
const n = (value: string): Cell => ({ value, numeric: true });
const accountTypes: Record<string, string> = { ASSET: "دارایی", LIABILITY: "بدهی", EQUITY: "سرمایه", REVENUE: "درآمد", EXPENSE: "هزینه" };

function csv(rows: Cell[][]) {
  return "\ufeff" + rows.map((row) => row.map(({ value, numeric }) => {
    // Spreadsheet applications may execute formulas embedded in user-supplied text.
    const safe = !numeric && (/^[\s\u0000-\u001f]*[=+\-@]/u.test(value) || /^[\t\r\n]/u.test(value)) ? `'${value}` : value;
    return `"${safe.replaceAll('"', '""')}"`;
  }).join(",")).join("\r\n") + "\r\n";
}

function amounts(a: Amounts) { return [n(a.debit), n(a.credit), n(a.debitBalance), n(a.creditBalance)]; }
const persianDate = (date: string) => new Intl.DateTimeFormat("fa-IR-u-ca-persian-nu-latn", { timeZone: "UTC", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(date));

export async function reportCsv(request: Request, kind: Kind) {
  const params = new URL(request.url).searchParams;
  const allowed = kind === "general-ledger" ? ["fiscalYearId", "accountId"] : kind === "trial-balance" ? ["fiscalYearId", "beforeClosing"] : ["fiscalYearId"];
  if ([...params.keys()].some((key) => !allowed.includes(key) || params.getAll(key).length !== 1)) {
    return Response.json({ error: "پارامترهای گزارش معتبر نیستند." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  const handler = { "trial-balance": trialBalance, "general-ledger": generalLedger, "profit-loss": profitLoss }[kind];
  const response = await handler(request);
  if (!response.ok) return response;
  let rows: Cell[][];
  if (kind === "trial-balance") {
    const report = await response.json() as Trial;
    const basis = report.beforeClosing ? "پیش از اختتامیه" : "همه اسناد نهایی";
    rows = [["سال مالی", "مبنای گزارش", "ردیف", "کد حساب", "نام حساب", "نوع حساب", "گردش بدهکار (ریال)", "گردش بستانکار (ریال)", "مانده بدهکار (ریال)", "مانده بستانکار (ریال)"].map(t),
      ...report.rows.map((a) => [t(report.fiscalYear.name), t(basis), t("حساب"), t(a.code), t(a.name), t(accountTypes[a.type] ?? a.type), ...amounts(a)]),
      [t(report.fiscalYear.name), t(basis), t("جمع"), t(""), t(""), t(""), ...amounts(report.totals)]];
  } else if (kind === "general-ledger") {
    const report = await response.json() as Ledger;
    const prefix = [t(report.fiscalYear.name), t(report.account.code), t(report.account.name)];
    rows = [["سال مالی", "کد حساب", "نام حساب", "ردیف", "تاریخ سند", "شماره سند", "شرح سند", "شرح ردیف", "بدهکار (ریال)", "بستانکار (ریال)", "مانده بدهکار (ریال)", "مانده بستانکار (ریال)"].map(t),
      ...report.rows.map((line) => [...prefix, t("گردش"), t(persianDate(line.entry.date)), t(line.entry.number), t(line.entry.description), t(line.description), ...amounts(line)]),
      [...prefix, t("جمع"), t(""), t(""), t(""), t(""), ...amounts(report.totals)]];
  } else {
    const report = await response.json() as Profit;
    rows = [["سال مالی", "ردیف", "کد حساب", "نام حساب", "نوع حساب", "بدهکار (ریال)", "بستانکار (ریال)", "خالص (ریال)"].map(t),
      ...report.rows.map((a) => [t(report.fiscalYear.name), t("حساب"), t(a.code), t(a.name), t(accountTypes[a.type] ?? a.type), n(a.debit), n(a.credit), n(a.net)]),
      ...([["جمع درآمد", report.totals.revenue], ["جمع هزینه", report.totals.expenses], ["سود و زیان", report.totals.profit]] as const).map(([label, value]) => [t(report.fiscalYear.name), t(label), t(""), t(""), t(""), t(""), t(""), n(value)])];
  }
  return new Response(csv(rows), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${kind}.csv"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
