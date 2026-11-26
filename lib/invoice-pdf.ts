import "server-only";
import { spawn } from "node:child_process";
import { access, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { serializeInvoice } from "@/lib/invoice-api";
import { renderInvoicePdfHtml } from "@/lib/invoice-pdf-document";

let active = 0;
export class PdfUnavailableError extends Error {}

async function browserPath() {
  const candidates = [process.env.HESABA_PDF_BROWSER, process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, "Google/Chrome/Application/chrome.exe"), process.env["PROGRAMFILES(X86)"] && path.join(process.env["PROGRAMFILES(X86)"], "Microsoft/Edge/Application/msedge.exe"), process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, "Microsoft/Edge/Application/msedge.exe"), "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"].filter((value): value is string => !!value);
  for (const candidate of candidates) { if (!path.isAbsolute(candidate)) continue; try { await access(candidate); return candidate; } catch { /* try next */ } }
  throw new PdfUnavailableError("مرورگر لازم برای ساخت PDF پیدا نشد. مسیر Chrome یا Edge را در HESABA_PDF_BROWSER تنظیم کنید.");
}

export async function createInvoicePdf(invoice: ReturnType<typeof serializeInvoice>, organizationName: string) {
  if (active >= 2) throw new PdfUnavailableError("ساخت PDF مشغول است؛ کمی بعد دوباره تلاش کنید.");
  active++;
  let directory: string | undefined;
  try {
    const browser = await browserPath();
    const [regular, bold, root] = await Promise.all([readFile(path.join(process.cwd(), "public/fonts/IRANYekanXFaNum-Regular.ttf")), readFile(path.join(process.cwd(), "public/fonts/IRANYekanXFaNum-Bold.ttf")), realpath(tmpdir())]);
    const created = await mkdtemp(path.join(root, "hesaba-invoice-pdf-"));
    const resolved = await realpath(created);
    if (path.dirname(resolved).toLowerCase() !== root.toLowerCase() || !path.basename(resolved).startsWith("hesaba-invoice-pdf-")) throw new Error("Unsafe PDF temporary directory");
    directory = resolved;
    const htmlPath = path.join(directory, "invoice.html"), pdfPath = path.join(directory, "invoice.pdf");
    await writeFile(htmlPath, renderInvoicePdfHtml(invoice, organizationName, regular.toString("base64"), bold.toString("base64")), { encoding: "utf8", flag: "wx" });
    await new Promise<void>((resolve, reject) => {
      const child = spawn(/*turbopackIgnore: true*/ browser, ["--headless=new", "--disable-gpu", "--disable-extensions", "--disable-background-networking", "--disable-sync", "--no-first-run", "--no-default-browser-check", "--no-pdf-header-footer", "--print-to-pdf-no-header", "--virtual-time-budget=5000", ...(process.env.HESABA_PDF_TEST_NO_SANDBOX === "1" ? ["--no-sandbox"] : []), `--user-data-dir=${path.join(directory!, "profile")}`, `--print-to-pdf=${pdfPath}`, pathToFileURL(htmlPath).href], { windowsHide: true, stdio: "ignore" });
      let settled = false, timedOut = false;
      const timer = setTimeout(() => { if (!settled) { timedOut = true; child.kill(); } }, 30000);
      child.once("error", () => { if (!settled) { settled = true; clearTimeout(timer); reject(new PdfUnavailableError("مرورگر ساخت PDF اجرا نشد.")); } });
      child.once("exit", (code) => { if (!settled) { settled = true; clearTimeout(timer); if (timedOut) reject(new PdfUnavailableError("ساخت PDF بیش از زمان مجاز طول کشید.")); else if (code === 0) resolve(); else reject(new PdfUnavailableError("ساخت PDF توسط مرورگر انجام نشد.")); } });
    });
    const pdf = await readFile(pdfPath);
    if (pdf.length < 100 || pdf.length > 20 * 1024 * 1024 || pdf.subarray(0, 5).toString("ascii") !== "%PDF-") throw new PdfUnavailableError("فایل PDF معتبر ساخته نشد.");
    return pdf;
  } finally {
    try { if (directory) await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); }
    finally { active--; }
  }
}
