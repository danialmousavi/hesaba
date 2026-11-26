import { z } from "zod";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
});

export function parseDashboardFilters(params: URLSearchParams) {
  if ([...params.keys()].some((key) => !["fiscalYearId", "from", "to"].includes(key) || params.getAll(key).length !== 1)) return null;
  const parsed = z.object({ fiscalYearId: z.string().cuid(), from: date.optional(), to: date.optional() }).safeParse({ fiscalYearId: params.get("fiscalYearId"), from: params.get("from") ?? undefined, to: params.get("to") ?? undefined });
  if (!parsed.success || Boolean(parsed.data.from) !== Boolean(parsed.data.to) || (parsed.data.from && parsed.data.to && parsed.data.from > parsed.data.to)) return null;
  return parsed.data;
}

export function dashboardDateRange(filters: { from?: string; to?: string }, year: { startDate: Date; endDate: Date }) {
  const start = year.startDate.toISOString().slice(0, 10), end = year.endDate.toISOString().slice(0, 10);
  const from = filters.from ?? start, to = filters.to ?? end;
  if (from < start || to > end) return null;
  return { from, to, startDate: new Date(`${from}T00:00:00.000Z`), endDate: new Date(`${to}T00:00:00.000Z`) };
}
