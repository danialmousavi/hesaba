/** Pure, exact calculation for a proposed year-end closing. It does not write data. */
export type ClosingAccount = {
  id: string;
  code: string;
  name: string;
  type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
  debit: string;
  credit: string;
};
export type ClosingLine = { accountId: string; debit: string; credit: string };
export class ClosingCalculationError extends Error {}
const maximum = 10n ** 20n - 1n;
const parse = (value: string) => {
  if (!/^(0|[1-9]\d*)$/.test(value)) throw new ClosingCalculationError("مبلغ حساب معتبر نیست.");
  return BigInt(value);
};
const signedLine = (accountId: string, amount: bigint): ClosingLine => {
  if (amount === 0n || amount > maximum || amount < -maximum) throw new ClosingCalculationError("مانده یک ردیف خارج از محدوده مجاز است.");
  return { accountId, debit: amount > 0n ? amount.toString() : "0", credit: amount < 0n ? (-amount).toString() : "0" };
};
const checkLines = (lines: ClosingLine[]) => {
  if (lines.length === 0) return;
  if (lines.length < 2 || lines.length > 100) throw new ClosingCalculationError("تعداد ردیف‌های سند باید بین ۲ تا ۱۰۰ باشد.");
  const balance = lines.reduce((sum, line) => sum + BigInt(line.debit) - BigInt(line.credit), 0n);
  if (balance !== 0n) throw new ClosingCalculationError("سند حاصل متوازن نیست.");
};

export function calculateFiscalClose(accounts: ClosingAccount[], equityAccountId: string) {
  const ids = new Set<string>();
  for (const account of accounts) {
    if (ids.has(account.id)) throw new ClosingCalculationError("حساب تکراری است.");
    ids.add(account.id);
  }
  if (accounts.find((account) => account.id === equityAccountId)?.type !== "EQUITY") throw new ClosingCalculationError("حساب نتیجه دوره باید از نوع سرمایه باشد.");
  const balances = accounts.map((account) => ({ ...account, balance: parse(account.debit) - parse(account.credit) })).sort((a, b) => a.id.localeCompare(b.id, "en"));
  if (balances.reduce((sum, account) => sum + account.balance, 0n) !== 0n) throw new ClosingCalculationError("مانده‌های دفتر متوازن نیستند.");
  const temporary = balances.filter((account) => account.type === "REVENUE" || account.type === "EXPENSE");
  const permanent = balances.filter((account) => account.type !== "REVENUE" && account.type !== "EXPENSE");
  const temporaryTotal = temporary.reduce((sum, account) => sum + account.balance, 0n);
  const temporaryLines = temporary.filter((account) => account.balance !== 0n).map((account) => signedLine(account.id, -account.balance));
  if (temporaryTotal !== 0n) temporaryLines.push(signedLine(equityAccountId, temporaryTotal));
  const finalPermanent = permanent.map((account) => ({ ...account, balance: account.balance + (account.id === equityAccountId ? temporaryTotal : 0n) }));
  const closingLines = finalPermanent.filter((account) => account.balance !== 0n).map((account) => signedLine(account.id, -account.balance));
  const openingLines = finalPermanent.filter((account) => account.balance !== 0n).map((account) => signedLine(account.id, account.balance));
  for (const lines of [temporaryLines, closingLines, openingLines]) checkLines(lines);
  return {
    result: (-temporaryTotal).toString(),
    balances: balances.map(({ balance, ...account }) => ({ ...account, balance: balance.toString() })),
    temporaryLines, closingLines, openingLines,
  };
}
