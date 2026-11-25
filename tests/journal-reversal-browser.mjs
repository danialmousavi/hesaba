import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

export async function testJournalReversalBrowser({ chromePath, base, cookie, sourceId, invoiceId, paidInvoiceId }) {
  const root = await realpath(tmpdir());
  const profile = await mkdtemp(path.join(root, "hesaba-reversal-ui-"));
  const resolved = await realpath(profile);
  if (path.dirname(resolved).toLowerCase() !== root.toLowerCase() || !path.basename(resolved).startsWith("hesaba-reversal-ui-")) throw new Error("Unsafe browser profile path");
  const chrome = spawn(chromePath, ["--headless=new", "--disable-gpu", "--no-sandbox", "--disable-extensions", "--no-first-run", "--remote-debugging-port=0", `--user-data-dir=${resolved}`, "about:blank"], { windowsHide: true, stdio: "ignore" });
  let socket;
  try {
    let port;
    for (let i = 0; i < 100 && !port; i++) { try { port = Number((await readFile(path.join(resolved, "DevToolsActivePort"), "utf8")).split("\n")[0]); } catch { /* starting */ } if (!port) await new Promise((resolve) => setTimeout(resolve, 100)); }
    assert.ok(port, "Browser did not start");
    const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })).json();
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
    let sequence = 0;
    const pending = new Map();
    socket.addEventListener("message", (event) => { const data = JSON.parse(event.data); if (data.id && pending.has(data.id)) { const task = pending.get(data.id); pending.delete(data.id); if (data.error) task.reject(new Error(data.error.message)); else task.resolve(data.result); } });
    const call = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
    async function evaluate(expression) { const result = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.text); return result.result.value; }
    async function until(expression, message) { for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await new Promise((resolve) => setTimeout(resolve, 100)); } throw new Error(message); }
    await call("Network.enable");
    for (const part of cookie.split("; ")) { const at = part.indexOf("="); if (at > 0) await call("Network.setCookie", { url: base, name: part.slice(0, at), value: part.slice(at + 1) }); }
    await call("Page.enable");
    if (invoiceId) {
      await call("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
      await call("Page.navigate", { url: `${base}/dashboard/invoices` });
      await until(`!!document.querySelector('select')`, "Invoice list did not load");
      await evaluate(`(() => { const el = Array.from(document.querySelectorAll('select')).find(x => Array.from(x.options).some(o => o.value === 'issued')); el.value = 'issued'; el.dispatchEvent(new Event('change', { bubbles: true })); })()`);
      const invoiceSelector = `[data-invoice-id="${invoiceId}"]`;
      const paidSelector = `[data-invoice-id="${paidInvoiceId}"]`;
      await until(`!!document.querySelector(${JSON.stringify(invoiceSelector)}) && !!document.querySelector(${JSON.stringify(paidSelector)})`, "Issued invoices did not load");
      assert.ok(await evaluate(`document.querySelector(${JSON.stringify(paidSelector)}).innerText.includes('تخصیص دریافت دارد') && !document.querySelector(${JSON.stringify(paidSelector)}).innerText.includes('بررسی ابطال فاکتور')`));
      assert.ok(await evaluate(`document.documentElement.scrollWidth <= window.innerWidth + 1`), "Invoices should fit mobile width");
      await evaluate(`Array.from(document.querySelector(${JSON.stringify(invoiceSelector)}).querySelectorAll('button')).find(x => x.innerText.includes('بررسی ابطال فاکتور')).click()`);
      await until(`document.querySelector(${JSON.stringify(invoiceSelector)}).innerText.includes('بررسی و تأیید ابطال')`, "Cancellation form did not open");
      await evaluate(`Array.from(document.querySelector(${JSON.stringify(invoiceSelector)}).querySelectorAll('button')).find(x => x.innerText.includes('تأیید و ابطال فاکتور')).click()`);
      await until(`document.querySelector(${JSON.stringify(invoiceSelector)}).innerText.includes('تاریخ ابطال را انتخاب کنید')`, "Cancellation date validation did not appear");
      const position = await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(invoiceSelector)} + ' input[placeholder="انتخاب تاریخ شمسی"]'); el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
      await call("Input.dispatchMouseEvent", { type: "mousePressed", ...position, button: "left", clickCount: 1 });
      await call("Input.dispatchMouseEvent", { type: "mouseReleased", ...position, button: "left", clickCount: 1 });
      await until(`!!document.querySelector('.rmdp-day:not(.rmdp-disabled):not(.rmdp-deactive) span')`, "Cancellation calendar did not open");
      await evaluate(`document.querySelector('.rmdp-day:not(.rmdp-disabled):not(.rmdp-deactive) span').click()`);
      await evaluate(`Array.from(document.querySelector(${JSON.stringify(invoiceSelector)}).querySelectorAll('button')).find(x => x.innerText.includes('تأیید و ابطال فاکتور')).click()`);
      await until(`document.querySelector(${JSON.stringify(invoiceSelector)}).innerText.includes('دلیل ابطال را وارد کنید')`, "Cancellation reason validation did not appear");
      await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(invoiceSelector)} + ' textarea'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(el, 'اصلاح فاکتور'); el.dispatchEvent(new Event('input', { bubbles: true })); })()`);
      await evaluate(`Array.from(document.querySelector(${JSON.stringify(invoiceSelector)}).querySelectorAll('button')).find(x => x.innerText.includes('تأیید و ابطال فاکتور')).click()`);
      await until(`document.querySelector(${JSON.stringify(invoiceSelector)})?.innerText.includes('دلیل ابطال: اصلاح فاکتور')`, "Cancelled invoice was not displayed");
      assert.ok(await evaluate(`document.querySelector(${JSON.stringify(invoiceSelector)}).innerText.includes('مشاهده سند برگشتی')`));
      await call("Page.reload");
      await until(`!!document.querySelector('select')`, "Invoice page did not reload");
      await evaluate(`(() => { const el = Array.from(document.querySelectorAll('select')).find(x => Array.from(x.options).some(o => o.value === 'cancelled')); el.value = 'cancelled'; el.dispatchEvent(new Event('change', { bubbles: true })); })()`);
      await until(`document.querySelector(${JSON.stringify(invoiceSelector)})?.innerText.includes('دلیل ابطال: اصلاح فاکتور')`, "Cancellation did not persist after reload");
      console.log("Invoice cancellation browser checks passed.");
      return;
    }
    await call("Page.navigate", { url: `${base}/dashboard/journal` });
    const selector = `#journal-${sourceId}`;
    await until(`!!document.querySelector(${JSON.stringify(selector)} + ' summary')`, "Source journal did not load");
    await evaluate(`document.querySelector(${JSON.stringify(selector)} + ' summary').click()`);
    await evaluate(`Array.from(document.querySelector(${JSON.stringify(selector)}).querySelectorAll('button')).find(x => x.innerText.includes('پیش‌نمایش سند برگشتی')).click()`);
    await until(`document.querySelector(${JSON.stringify(selector)}).innerText.includes('پیش‌نمایش برگشت سند')`, "Reversal preview did not open");
    assert.ok(await evaluate(`document.querySelector(${JSON.stringify(selector)}).innerText.includes('بدهکار: ۱۰ · بستانکار: ۰') && document.querySelector(${JSON.stringify(selector)}).innerText.includes('بدهکار: ۰ · بستانکار: ۱۰')`));
    await evaluate(`Array.from(document.querySelector(${JSON.stringify(selector)}).querySelectorAll('button')).find(x => x.innerText.includes('ایجاد پیش‌نویس برگشتی')).click()`);
    await until(`document.querySelector(${JSON.stringify(selector)}).innerText.includes('تاریخ برگشت را انتخاب کنید')`, "Missing date validation did not appear");
    const position = await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)} + ' input[placeholder="انتخاب تاریخ شمسی"]'); el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
    await call("Input.dispatchMouseEvent", { type: "mousePressed", ...position, button: "left", clickCount: 1 });
    await call("Input.dispatchMouseEvent", { type: "mouseReleased", ...position, button: "left", clickCount: 1 });
    await until(`!!document.querySelector('.rmdp-day:not(.rmdp-disabled):not(.rmdp-deactive) span')`, "Reversal calendar did not open");
    await evaluate(`document.querySelector('.rmdp-day:not(.rmdp-disabled):not(.rmdp-deactive) span').click()`);
    await evaluate(`Array.from(document.querySelector(${JSON.stringify(selector)}).querySelectorAll('button')).find(x => x.innerText.includes('ایجاد پیش‌نویس برگشتی')).click()`);
    await until(`document.querySelector(${JSON.stringify(selector)})?.innerText.includes('سند برگشتی:')`, "Reversal was not created");
    const targetId = await evaluate(`document.querySelector(${JSON.stringify(selector)} + ' a[href^="#journal-"]').getAttribute('href').slice(9)`);
    assert.ok(targetId);
    assert.ok(await evaluate(`!document.querySelector('#journal-' + ${JSON.stringify(targetId)} + ' a[href$="/edit"]')`), "Reversal draft must not offer editing");
    console.log("Journal reversal browser checks passed.");
    return targetId;
  } finally {
    socket?.close();
    if (chrome.exitCode === null) { chrome.kill(); await new Promise((resolve) => { chrome.once("exit", resolve); setTimeout(resolve, 3000); }); }
    await rm(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
  }
}
