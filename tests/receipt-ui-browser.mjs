import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

// Optional interactive check: a fresh temporary Chrome profile and the isolated test database only.
export async function testReceiptBrowser({ chromePath, base, cookie, ownerId, organizationId, customerId, supplierId, cashId, fiscalYearId }) {
  const root = await realpath(tmpdir());
  const profile = await mkdtemp(path.join(root, "hesaba-receipt-ui-"));
  const resolved = await realpath(profile);
  if (path.dirname(resolved).toLowerCase() !== root.toLowerCase() || !path.basename(resolved).startsWith("hesaba-receipt-ui-")) throw new Error("Unsafe browser profile path");
  const chrome = spawn(chromePath, ["--headless=new", "--disable-gpu", "--no-sandbox", "--disable-extensions", "--no-first-run", "--remote-debugging-port=0", `--user-data-dir=${resolved}`, "about:blank"], { windowsHide: true, stdio: ["ignore", "ignore", "ignore"] });
  let socket;
  try {
    let port;
    for (let i = 0; i < 100 && !port; i++) {
      if (chrome.exitCode !== null) throw new Error("Chrome exited before startup");
      try { port = Number((await readFile(path.join(resolved, "DevToolsActivePort"), "utf8")).split("\n")[0]); } catch { /* starting */ }
      if (!port) await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.ok(port, "Chrome DevTools did not start");
    const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })).json();
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
    let sequence = 0;
    const pending = new Map();
    socket.addEventListener("message", (event) => {
      const data = JSON.parse(event.data);
      if (!data.id || !pending.has(data.id)) return;
      const { resolve, reject } = pending.get(data.id); pending.delete(data.id);
      if (data.error) reject(new Error(data.error.message)); else resolve(data.result);
    });
    function call(method, params = {}) { return new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); }); }
    async function evaluate(expression) {
      const result = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
      return result.result.value;
    }
    async function until(expression, message) {
      for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await new Promise((resolve) => setTimeout(resolve, 100)); }
      throw new Error(message);
    }
    await call("Network.enable");
    for (const part of cookie.split("; ")) { const at = part.indexOf("="); if (at > 0) await call("Network.setCookie", { url: base, name: part.slice(0, at), value: part.slice(at + 1) }); }
    await call("Page.enable");
    await call("Page.navigate", { url: `${base}/dashboard/receipts` });
    await until(`document.querySelectorAll('select').length >= 3 && !document.body.innerText.includes('در حال آماده‌سازی فرم')`, "Receipt form did not load");
    await evaluate(`(() => { const el = document.querySelectorAll('select')[0]; el.value = ${JSON.stringify(customerId)}; el.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    await until(`Array.from(document.querySelectorAll('li')).some(x => x.innerText.includes('فاکتور شماره ۲'))`, "Customer invoices did not load");
    await evaluate(`(() => { const el = document.querySelectorAll('select')[1]; el.value = ${JSON.stringify(cashId)}; el.dispatchEvent(new Event('change', { bubbles: true })); const row = Array.from(document.querySelectorAll('li')).find(x => x.innerText.includes('فاکتور شماره ۲')); const input = row.querySelector('input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '40'); input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    const position = await evaluate(`(() => { const el = document.querySelector('input[placeholder="انتخاب تاریخ شمسی"]'); el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
    await call("Input.dispatchMouseEvent", { type: "mousePressed", x: position.x, y: position.y, button: "left", clickCount: 1 });
    await call("Input.dispatchMouseEvent", { type: "mouseReleased", x: position.x, y: position.y, button: "left", clickCount: 1 });
    try { await until(`!!document.querySelector('.rmdp-day:not(.rmdp-disabled):not(.rmdp-deactive) span')`, "Calendar did not open"); }
    catch (error) { console.error("Calendar state:", await evaluate(`document.querySelector('.rmdp-calendar')?.outerHTML.slice(0, 5000) ?? document.querySelector('input[placeholder="انتخاب تاریخ شمسی"]')?.outerHTML`)); throw error; }
    await evaluate(`document.querySelector('.rmdp-day:not(.rmdp-disabled):not(.rmdp-deactive) span').click()`);
    await evaluate(`Array.from(document.querySelectorAll('button')).find(x => x.innerText.includes('پیش‌نمایش دریافت')).click()`);
    await until(`document.body.innerText.includes('پیش‌نمایش سند دریافت')`, "Receipt preview did not appear");
    assert.ok(await evaluate(`document.body.innerText.includes('۴۰')`));
    await evaluate(`Array.from(document.querySelectorAll('button')).find(x => x.innerText.includes('تأیید و ثبت دریافت')).click()`);
    await until(`document.body.innerText.includes('دریافت ثبت شد')`, "Receipt was not submitted from the form");
    assert.ok(await evaluate(`document.body.innerText.includes('سند شماره')`));
    const storageKey = `hesaba-receipt:${ownerId}:${organizationId}`;
    const payload = { requestKey: "11111111-1111-4111-8111-111111111111", amount: "40", allocations: [] };
    await evaluate(`sessionStorage.setItem(${JSON.stringify(storageKey)}, ${JSON.stringify(JSON.stringify(payload))})`);
    await call("Page.reload");
    await until(`!!document.body && document.body.innerText.includes('درخواست با نتیجه نامشخص')`, "Recovery state did not survive reload");
    assert.ok(await evaluate(`document.body.innerText.includes('بررسی دوباره همین درخواست')`));
    await call("Page.navigate", { url: `${base}/dashboard/supplier-payments` });
    await until(`!!document.body && document.querySelectorAll('select').length >= 3 && !document.body.innerText.includes('در حال آماده‌سازی فرم')`, "Supplier payment form did not load");
    await evaluate(`(() => { const supplier = document.querySelectorAll('select')[0]; supplier.value = ${JSON.stringify(supplierId)}; supplier.dispatchEvent(new Event('change', { bubbles: true })); const account = document.querySelectorAll('select')[1]; account.value = ${JSON.stringify(cashId)}; account.dispatchEvent(new Event('change', { bubbles: true })); const amount = document.querySelector('input[inputmode="numeric"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(amount, '40'); amount.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    const paymentPosition = await evaluate(`(() => { const el = document.querySelector('input[placeholder="انتخاب تاریخ شمسی"]'); el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
    await call("Input.dispatchMouseEvent", { type: "mousePressed", x: paymentPosition.x, y: paymentPosition.y, button: "left", clickCount: 1 });
    await call("Input.dispatchMouseEvent", { type: "mouseReleased", x: paymentPosition.x, y: paymentPosition.y, button: "left", clickCount: 1 });
    await until(`!!document.querySelector('.rmdp-day:not(.rmdp-disabled):not(.rmdp-deactive) span')`, "Payment calendar did not open");
    await evaluate(`document.querySelector('.rmdp-day:not(.rmdp-disabled):not(.rmdp-deactive) span').click()`);
    await evaluate(`Array.from(document.querySelectorAll('button')).find(x => x.innerText.includes('پیش‌نمایش پرداخت')).click()`);
    await until(`document.body.innerText.includes('پیش‌نمایش سند پرداخت')`, "Payment preview did not appear");
    assert.ok(await evaluate(`document.body.innerText.includes('بدهکار · پرداختنی') && document.body.innerText.includes('بستانکار · حساب تسویه')`));
    await evaluate(`Array.from(document.querySelectorAll('button')).find(x => x.innerText.includes('تأیید و ثبت پرداخت')).click()`);
    await until(`document.body.innerText.includes('پرداخت ثبت شد')`, "Payment was not submitted from the form");
    const paymentStorageKey = `hesaba-supplier-payment:${ownerId}:${organizationId}`;
    const paymentPayload = { requestKey: "22222222-2222-4222-8222-222222222222", fiscalYearId, partyId: supplierId, date: "2026-05-15", amount: "40", method: "CASH", settlementAccountId: cashId, description: null };
    await evaluate(`sessionStorage.setItem(${JSON.stringify(paymentStorageKey)}, ${JSON.stringify(JSON.stringify(paymentPayload))})`);
    await call("Page.reload");
    await until(`!!document.body && document.body.innerText.includes('درخواست با نتیجه نامشخص')`, "Payment recovery state did not survive reload");
    assert.ok(await evaluate(`document.body.innerText.includes('بررسی دوباره همین درخواست')`));
    await call("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await call("Page.navigate", { url: `${base}/dashboard/reports/party-balances` });
    await until(`!!document.body && Array.from(document.querySelectorAll('h3')).some(x => x.innerText === 'Customer')`, "Party balances did not load");
    assert.ok(await evaluate(`document.body.innerText.includes('بدون سند افتتاحیه') && document.body.innerText.includes('حساب دریافتنی')`));
    assert.ok(await evaluate(`document.documentElement.scrollWidth <= window.innerWidth + 1`), "Report should fit mobile width");
    await evaluate(`(() => { const row = Array.from(document.querySelectorAll('li')).find(x => x.querySelector('h3')?.innerText === 'Customer' && Array.from(x.querySelectorAll('span')).some(s => s.innerText === 'فعال')); row.querySelector('button').click(); })()`);
    await until(`document.body.innerText.includes('فاکتور شماره ۱') && document.body.innerText.includes('مانده تا پایان سال')`, "Party invoice balances did not load");
    await evaluate(`(() => { const input = document.querySelector('input[placeholder="جست‌وجوی نام"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'Customer'); input.dispatchEvent(new Event('input', { bubbles: true })); document.querySelector('form button[type="submit"], form button:not([type])').click(); })()`);
    await until(`!!document.body && document.body.innerText.includes('۲ شخص')`, "Party filter did not apply");
    assert.ok(await evaluate(`Array.from(document.querySelectorAll('h3')).some(x => x.innerText === 'Customer')`));
    console.log("Receipt, supplier payment and party report browser checks passed.");
  } finally {
    socket?.close();
    if (chrome.exitCode === null) { chrome.kill(); await new Promise((resolve) => { chrome.once("exit", resolve); setTimeout(resolve, 3000); }); }
    await rm(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
  }
}
