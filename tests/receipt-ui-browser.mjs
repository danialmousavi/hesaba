import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

// Optional interactive check: a fresh temporary Chrome profile and the isolated test database only.
export async function testReceiptBrowser({ chromePath, base, cookie, ownerId, organizationId, customerId, supplierId, cashId, revenueId, fiscalYearId, printInvoiceId }) {
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
    await call("Page.navigate", { url: `${base}/dashboard/reports/sales` });
    await until(`!!document.body && document.body.innerText.includes('نتیجه گزارش') && document.body.innerText.includes('فاکتور شماره')`, "Sales report did not load");
    assert.ok(await evaluate(`document.body.innerText.includes('جمع فروش') && document.body.innerText.includes('مانده دریافتنی') && document.body.innerText.includes('تاریخ حسابداری')`));
    assert.ok(await evaluate(`document.documentElement.scrollWidth <= window.innerWidth + 1`), "Sales report should fit mobile width");
    await evaluate(`(() => { const select = Array.from(document.querySelectorAll('select')).find(x => Array.from(x.options).some(o => o.value === 'partial')); select.value = 'partial'; select.dispatchEvent(new Event('change', { bubbles: true })); document.querySelector('form button').click(); })()`);
    await until(`document.body.innerText.includes('دریافت جزئی') && document.body.innerText.includes('فاکتور شماره')`, "Partial sales filter did not apply");
    assert.ok(await evaluate(`document.querySelectorAll('input').length >= 3`), "Persian date filters should be present");
    for (const kind of ["trial-balance", "general-ledger", "profit-loss"]) {
      await call("Page.navigate", { url: `${base}/dashboard/reports/${kind}` });
      await until(`!!document.querySelector('form select')`, `${kind} filters did not load`);
      assert.equal(await evaluate(`Array.from(document.querySelectorAll('button')).some(x => x.innerText === 'دانلود CSV')`), false);
      if (kind === "general-ledger") await evaluate(`(() => { const select = document.querySelectorAll('form select')[1]; select.value = ${JSON.stringify(cashId)}; select.dispatchEvent(new Event('change', { bubbles: true })); })()`);
      await evaluate(`document.querySelector('form button').click()`);
      await until(`Array.from(document.querySelectorAll('button')).some(x => x.innerText === 'دانلود CSV')`, `${kind} report did not load`);
      await evaluate(`(() => { const original = URL.createObjectURL; URL.createObjectURL = (blob) => { window.__reportCsv = { type: blob.type, size: blob.size }; return original(blob); }; const originalFetch = window.fetch; window.fetch = (url, options) => { if (String(url).includes('/csv?')) window.__reportUrl = String(url); return originalFetch(url, options); }; document.addEventListener('click', e => { if (e.target instanceof HTMLAnchorElement && e.target.hasAttribute('download')) { window.__reportFilename = e.target.download; e.preventDefault(); } }, true); })()`);
      await evaluate(`Array.from(document.querySelectorAll('button')).find(x => x.innerText === 'دانلود CSV').click()`);
      await until(`window.__reportCsv?.type.startsWith('text/csv') && window.__reportCsv.size > 3`, `${kind} CSV did not download`);
      assert.equal(await evaluate(`window.__reportFilename`), `${kind}.csv`);
      const downloadedUrl = new URL(await evaluate(`window.__reportUrl`), base);
      assert.equal(downloadedUrl.searchParams.get("fiscalYearId"), fiscalYearId);
      if (kind === "general-ledger") assert.equal(downloadedUrl.searchParams.get("accountId"), cashId);
      if (kind === "trial-balance") assert.equal(downloadedUrl.searchParams.get("beforeClosing"), "false");
      await evaluate(`(() => { window.fetch = async (url, options) => String(url).includes('/csv?') ? new Response(JSON.stringify({ error: 'خطای آزمایشی دریافت' }), { status: 500, headers: { 'Content-Type': 'application/json' } }) : window.__originalFetch(url, options); })()` .replace("window.fetch =", "window.__originalFetch = window.fetch; window.fetch ="));
      await evaluate(`Array.from(document.querySelectorAll('button')).find(x => x.innerText === 'دانلود CSV').click()`);
      await until(`document.querySelector('[role="alert"]')?.innerText.includes('خطای آزمایشی دریافت')`, `${kind} CSV error was not displayed`);
    }
    await call("Page.navigate", { url: `${base}/dashboard/transactions` });
    await until(`!!document.body && document.body.innerText.includes('پیش‌نویس‌ها') && !document.body.innerText.includes('در حال دریافت پیش‌نویس‌ها')`, "Financial drafts did not load");
    const browserDraftId = await evaluate(`(async () => { const response = await fetch('/api/transactions', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ fiscalYearId:${JSON.stringify(fiscalYearId)}, type:'INCOME', date:'2026-05-10', amount:'15', description:'ویرایش مرورگر', paymentMethod:'CASH', categoryAccountId:${JSON.stringify(revenueId)}, settlementAccountId:${JSON.stringify(cashId)} }) }); const data = await response.json(); if (!response.ok) throw Error(data.error); return data.transaction.id; })()`);
    await call("Page.reload");
    await until(`Array.from(document.querySelectorAll('li')).some(x => x.innerText.includes('ویرایش مرورگر'))`, "Financial draft not visible");
    await evaluate(`Array.from(document.querySelectorAll('li')).find(x => x.innerText.includes('ویرایش مرورگر')).querySelector('button').click()`);
    await until(`!!document.querySelector('section[aria-label="ویرایش پیش‌نویس ویرایش مرورگر"]')`, "Financial edit form did not open");
    assert.ok(await evaluate(`document.querySelector('section[aria-label="ویرایش پیش‌نویس ویرایش مرورگر"] input[placeholder="انتخاب تاریخ شمسی"]').value.length > 0`));
    await evaluate(`(() => { const section = document.querySelector('section[aria-label="ویرایش پیش‌نویس ویرایش مرورگر"]'); for (const [name,value] of [['amount','35'],['description','ویرایش شده مرورگر']]) { const input = section.querySelector('input[name="' + name + '"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,value); input.dispatchEvent(new Event('input',{bubbles:true})); } section.querySelector('button[type="submit"],button:not([type])').click(); })()`);
    await until(`Array.from(document.querySelectorAll('li')).some(x => x.innerText.includes('ویرایش شده مرورگر') && x.innerText.includes('۳۵ ریال'))`, "Financial draft edit did not save");
    await evaluate(`Array.from(document.querySelectorAll('li')).find(x => x.innerText.includes('ویرایش شده مرورگر')).querySelector('button').click()`);
    await until(`!!document.querySelector('section[aria-label="ویرایش پیش‌نویس ویرایش شده مرورگر"]')`, "Financial edit did not reopen");
    await evaluate(`(() => { const original = window.fetch; window.fetch = (url, options) => options?.method === 'PATCH' && String(url).includes('/api/transactions/') ? Promise.resolve(new Response(JSON.stringify({ error:'رویداد ثبت‌شده قابل ویرایش نیست.' }), { status:409, headers:{ 'content-type':'application/json' } })) : original(url, options); })()`);
    await evaluate(`document.querySelector('section[aria-label="ویرایش پیش‌نویس ویرایش شده مرورگر"] button[type="submit"],section[aria-label="ویرایش پیش‌نویس ویرایش شده مرورگر"] button:not([type])').click()`);
    await until(`document.querySelector('section[aria-label="ویرایش پیش‌نویس ویرایش شده مرورگر"] [role="alert"]')?.innerText.includes('قابل ویرایش نیست')`, "Finalized financial draft edit error did not appear");
    assert.equal(await evaluate(`(async () => (await fetch('/api/transactions/' + ${JSON.stringify(browserDraftId)}, { method:'DELETE' })).status)()`), 200);
    await call("Page.navigate", { url: `${base}/dashboard/journal` });
    await until(`!!document.querySelector('form[aria-label="جست‌وجو و فیلتر اسناد"]') && !!document.querySelector('details[id^="journal-"]')`, "Journal filters did not load");
    await evaluate(`(() => { const select = Array.from(document.querySelectorAll('form[aria-label="جست‌وجو و فیلتر اسناد"] select')).find(x => Array.from(x.options).some(o => o.value === 'POSTED')); select.value = 'POSTED'; select.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    const filterPosition = await evaluate(`(() => { const el = document.querySelector('#journal-filter-from'); el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
    await call("Input.dispatchMouseEvent", { type: "mousePressed", ...filterPosition, button: "left", clickCount: 1 });
    await call("Input.dispatchMouseEvent", { type: "mouseReleased", ...filterPosition, button: "left", clickCount: 1 });
    await until(`!!document.querySelector('.rmdp-day:not(.rmdp-disabled):not(.rmdp-deactive):not(.rmdp-day-hidden)[aria-label^="Choose"] span')`, "Journal filter calendar did not open");
    await evaluate(`document.querySelector('.rmdp-day:not(.rmdp-disabled):not(.rmdp-deactive):not(.rmdp-day-hidden)[aria-label^="Choose"] span').click()`);
    await until(`!!document.querySelector('#journal-filter-from').value`, "Journal filter date was not selected");
    await evaluate(`document.querySelector('form[aria-label="جست‌وجو و فیلتر اسناد"] button[type="submit"], form[aria-label="جست‌وجو و فیلتر اسناد"] button:not([type])').click()`);
    await until(`new URL(location.href).searchParams.get('status') === 'POSTED' && !!new URL(location.href).searchParams.get('from')`, "Journal date and status filters did not apply");
    await evaluate(`Array.from(document.querySelectorAll('button')).find(x => x.innerText === 'پاک کردن فیلترها').click()`);
    await until(`!location.search && !!document.querySelector('details[id^="journal-"]')`, "Journal filters did not reset after date selection");
    const firstJournal = await evaluate(`document.querySelector('details[id^="journal-"]').id`);
    await evaluate(`(() => { const form = document.querySelector('form[aria-label="جست‌وجو و فیلتر اسناد"]'); const input = form.querySelector('input[placeholder="جست‌وجو در اسناد"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'nonexistentjournalvalue'); input.dispatchEvent(new Event('input', { bubbles: true })); form.querySelector('button[type="submit"], button:not([type])').click(); })()`);
    await until(`document.body.innerText.includes('سندی با این شرایط پیدا نشد')`, "Journal empty search did not apply");
    assert.ok(await evaluate(`!!document.querySelector('#journal-filter-from') && !!document.querySelector('#journal-filter-to')`));
    await evaluate(`window.location.hash = ${JSON.stringify(`#${firstJournal}`)}`);
    await until(`document.getElementById(${JSON.stringify(firstJournal)})?.open`, "Journal deep link did not open a filtered-out entry");
    assert.ok(await evaluate(`document.body.innerText.includes('سند انتخاب‌شده از پیوند')`));
    await evaluate(`Array.from(document.querySelectorAll('button')).find(x => x.innerText === 'پاک کردن فیلترها').click()`);
    await until(`!location.search && !!document.querySelector('details[id^="journal-"]')`, "Journal filters did not reset");
    await call("Page.navigate", { url: `${base}/dashboard` });
    await until(`!!document.querySelector('#sales-overview-title') && document.querySelector('#sales-overview-title').closest('section').innerText.includes('۱٬۴۲۰')`, "Dashboard sales did not load");
    assert.ok(await evaluate(`(() => { const section = document.querySelector('#sales-overview-title').closest('section'); return section.innerText.includes('تعداد فاکتورها') && section.innerText.includes('۲') && section.innerText.includes('فروش ماهانه') && !!section.querySelector('a[href="/dashboard/reports/sales"]'); })()`));
    assert.ok(await evaluate(`document.documentElement.scrollWidth <= window.innerWidth + 1`), "Dashboard should fit mobile width");
    await until(`!!document.querySelector('#balance-overview-title') && document.querySelector('#balance-overview-title').closest('section').innerText.includes('حسابی انتخاب نشده')`, "Dashboard balances did not load");
    assert.ok(await evaluate(`(() => { const el = document.querySelector('#balance-overview-title').closest('section'); return el.innerText.includes('مطالبات حساب‌های اشخاص') && el.innerText.includes('بدهی حساب‌های اشخاص') && el.innerText.includes('افتتاحیه'); })()`));
    await evaluate(`document.querySelector('#balance-overview-title').closest('section').querySelector('summary').click()`);
    await evaluate(`(() => { const section = document.querySelector('#balance-overview-title').closest('section'); section.querySelector('input[value="' + ${JSON.stringify(cashId)} + '"]').click(); Array.from(section.querySelectorAll('button')).find(x => x.innerText.includes('اعمال حساب‌های انتخاب‌شده')).click(); })()`);
    await until(`(() => { const el = document.querySelector('#balance-overview-title').closest('section'); return el.innerText.includes('۱٬۳۲۰ ریال بدهکار') && !!el.querySelector('ul[aria-label="مانده حساب‌های نقدی انتخاب‌شده"]'); })()`, "Cash balance selection did not apply");
    await until(`!!document.querySelector('#dashboard-from') && !!document.querySelector('#monthly-chart-title')`, "Dashboard date filter did not load");
    assert.ok(await evaluate(`document.body.innerText.includes('فروش و مانده‌ها همچنان بر اساس کل سال مالی هستند')`));
    await evaluate(`(() => { window.__dashboardRequests = []; const original = window.fetch; window.fetch = (url, options) => { if (String(url).includes('/api/dashboard/summary?') || String(url).includes('/api/dashboard/monthly?')) window.__dashboardRequests.push(String(url)); return original(url, options); }; })()`);
    const initialStart = await evaluate(`document.querySelector('#dashboard-from').value`);
    const datePosition = await evaluate(`(() => { const el = document.querySelector('#dashboard-from'); el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
    await call("Input.dispatchMouseEvent", { type: "mousePressed", x: datePosition.x, y: datePosition.y, button: "left", clickCount: 1 });
    await call("Input.dispatchMouseEvent", { type: "mouseReleased", x: datePosition.x, y: datePosition.y, button: "left", clickCount: 1 });
    await until(`!!document.querySelector('.rmdp-day:not(.rmdp-disabled):not(.rmdp-deactive) span')`, "Dashboard calendar did not open");
    await evaluate(`Array.from(document.querySelectorAll('.rmdp-day:not(.rmdp-disabled):not(.rmdp-deactive):not(.rmdp-day-hidden)[aria-label^="Choose"] span')).at(-1).click()`);
    await until(`document.querySelector('#dashboard-from').value !== ${JSON.stringify(initialStart)}`, "Dashboard start date did not change");
    await evaluate(`Array.from(document.querySelectorAll('button')).find(x => x.innerText === 'اعمال بازه').click()`);
    await until(`window.__dashboardRequests.some(x => x.includes('/summary?') && x.includes('&from=')) && window.__dashboardRequests.some(x => x.includes('/monthly?') && x.includes('&from='))`, "Dashboard range was not applied to both requests");
    const rangeRequests = await evaluate(`window.__dashboardRequests.filter(x => x.includes('&from='))`);
    const rangeParams = rangeRequests.map((url) => new URL(url, base).searchParams);
    assert.ok(rangeParams.every((params) => params.get("fiscalYearId") === fiscalYearId && params.get("from") && params.get("to")));
    assert.equal(rangeParams[0].get("from"), rangeParams[1].get("from"));
    assert.equal(rangeParams[0].get("to"), rangeParams[1].get("to"));
    assert.ok(await evaluate(`document.body.innerText.includes('بازه اعمال‌شده برای عملکرد و اسناد: از')`));
    await evaluate(`Array.from(document.querySelectorAll('button')).find(x => x.innerText === 'کل سال مالی').click()`);
    await until(`document.body.innerText.includes('بازه اعمال‌شده برای عملکرد و اسناد: کل سال مالی') && document.querySelector('#dashboard-from').value === ${JSON.stringify(initialStart)}`, "Dashboard range did not reset");
    await call("Page.navigate", { url: `${base}/dashboard/invoices/${printInvoiceId}/print` });
    await until(`!!document.body && document.body.innerText.includes('فاکتور فروش') && document.body.innerText.includes('۱٬۳۲۰')`, "Printable invoice did not load");
    await call("Emulation.setEmulatedMedia", { media: "print" });
    assert.ok(await evaluate(`getComputedStyle(document.querySelector('aside')).display === 'none' && Array.from(document.querySelectorAll('button')).filter(x => x.innerText === 'چاپ فاکتور').every(x => x.getClientRects().length === 0)`), "Print should hide application navigation and controls");
    assert.ok(await evaluate(`document.querySelector('thead') && getComputedStyle(document.querySelector('thead')).display === 'table-header-group'`));
    await evaluate(`document.fonts.ready`);
    const pdf = await call("Page.printToPDF", { printBackground: true, preferCSSPageSize: true });
    assert.ok(pdf.data.startsWith("JVBERi"), "Browser print should produce a PDF document");
    await call("Emulation.setEmulatedMedia", { media: "screen" });
    await evaluate(`(() => { const original = URL.createObjectURL; URL.createObjectURL = (blob) => { window.__invoicePdf = { type: blob.type, size: blob.size }; return original(blob); }; document.addEventListener('click', e => { if (e.target instanceof HTMLAnchorElement && e.target.hasAttribute('download')) e.preventDefault(); }, true); })()`);
    await evaluate(`Array.from(document.querySelectorAll('button')).find(x => x.innerText === 'دانلود PDF').click()`);
    await until(`window.__invoicePdf?.type === 'application/pdf' && window.__invoicePdf.size > 1000`, "Invoice PDF download did not complete");
    console.log("Receipt, supplier payment and party report browser checks passed.");
  } finally {
    socket?.close();
    if (chrome.exitCode === null) { chrome.kill(); await new Promise((resolve) => { chrome.once("exit", resolve); setTimeout(resolve, 3000); }); }
    await rm(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
  }
}
