import { reportCsv } from "@/lib/report-csv";
export function GET(request: Request) { return reportCsv(request, "profit-loss"); }
