import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

export async function testOrganizationBrowser({ chromePath, base, cookie, orgA, orgB, memberEmail }) {
  const root = await realpath(tmpdir()), profile = await mkdtemp(path.join(root, "hesaba-org-ui-"));
  const resolved = await realpath(profile);
  if (path.dirname(resolved).toLowerCase() !== root.toLowerCase() || !path.basename(resolved).startsWith("hesaba-org-ui-")) throw new Error("Unsafe browser profile path");
  const chrome = spawn(chromePath, ["--headless=new", "--disable-gpu", "--no-sandbox", "--disable-extensions", "--no-first-run", "--remote-debugging-port=0", `--user-data-dir=${resolved}`, "about:blank"], { windowsHide: true, stdio: "ignore" });
  const sockets = [];
  try {
    let port;
    for (let i = 0; i < 100 && !port; i++) { try { port = Number((await readFile(path.join(resolved, "DevToolsActivePort"), "utf8")).split("\n")[0]); } catch { /* starting */ } if (!port) await new Promise((resolve) => setTimeout(resolve, 100)); }
    assert.ok(port, "Chrome did not start");
    async function tab() {
      const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })).json();
      const socket = new WebSocket(target.webSocketDebuggerUrl); sockets.push(socket);
      await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
      let sequence = 0; const pending = new Map();
      socket.addEventListener("message", (event) => { const message = JSON.parse(event.data); if (!message.id || !pending.has(message.id)) return; const { resolve, reject } = pending.get(message.id); pending.delete(message.id); if (message.error) reject(new Error(message.error.message)); else resolve(message.result); });
      const call = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
      async function evaluate(expression) { const result = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.text); return result.result.value; }
      async function until(expression, message) { for (let i = 0; i < 120; i++) { if (await evaluate(expression)) return; await new Promise((resolve) => setTimeout(resolve, 100)); } throw new Error(message); }
      await call("Network.enable");
      for (const part of cookie.split("; ")) { const at = part.indexOf("="); if (at > 0) await call("Network.setCookie", { url: base, name: part.slice(0, at), value: part.slice(at + 1) }); }
      await call("Page.enable");
      return { call, evaluate, until };
    }
    const a = await tab(), b = await tab();
    for (const tab of [a, b]) {
      await tab.call("Page.navigate", { url: `${base}/dashboard/products` });
      await tab.until(`document.querySelector('[data-active-organization-id]')?.dataset.activeOrganizationId === ${JSON.stringify(orgA)} && !!Array.from(document.querySelectorAll('select')).find(x => Array.from(x.options).some(o => o.value === ${JSON.stringify(orgB)}))`, "Organization selector did not load");
    }
    await a.evaluate(`(() => { window.confirm = () => true; const select = Array.from(document.querySelectorAll('select')).find(x => Array.from(x.options).some(o => o.value === ${JSON.stringify(orgB)})); select.value = ${JSON.stringify(orgB)}; select.dispatchEvent(new Event('change', { bubbles:true })); })()`);
    await a.evaluate(`Array.from(document.querySelectorAll('button')).find(x => x.innerText === 'تغییر سازمان').click()`);
    await a.until(`document.querySelector('[data-active-organization-id]')?.dataset.activeOrganizationId === ${JSON.stringify(orgB)}`, "Organization switch did not reload the dashboard");
    await b.until(`!!document.querySelector('[role="alertdialog"]')`, "Other tab was not warned");
    await b.evaluate(`document.querySelector('[role="alertdialog"] button').click()`);
    await b.until(`document.querySelector('[data-active-organization-id]')?.dataset.activeOrganizationId === ${JSON.stringify(orgB)}`, "Other tab did not reload selected organization");
    await a.until(`!!Array.from(document.querySelectorAll('select')).find(x => Array.from(x.options).some(o => o.value === ${JSON.stringify(orgA)}))`, "Organization selector did not reload after switching");
    await a.evaluate(`(() => { window.confirm = () => true; const select = Array.from(document.querySelectorAll('select')).find(x => Array.from(x.options).some(o => o.value === ${JSON.stringify(orgA)})); select.value = ${JSON.stringify(orgA)}; select.dispatchEvent(new Event('change', { bubbles:true })); })()`);
    await a.evaluate(`Array.from(document.querySelectorAll('button')).find(x => x.innerText === 'تغییر سازمان').click()`);
    await a.until(`document.querySelector('[data-active-organization-id]')?.dataset.activeOrganizationId === ${JSON.stringify(orgA)}`, "Switch back did not complete");
    await a.call("Page.navigate", { url: `${base}/dashboard/products` });
    await a.until(`!!document.querySelector('input[name="code"]')`, "Product form not ready");
    await a.evaluate(`(() => { const original = window.fetch; window.fetch = (url, options) => { if (String(url) === '/api/products' && options?.method === 'POST') window.__expectedOrg = new Headers(options.headers).get('x-expected-organization-id'); return original(url, options); }; const form = document.querySelector('input[name="code"]').form; for (const [name,value] of [['name','Browser test'],['code','browser-test'],['unit','عدد'],['salePrice','10']]) { const input = form.querySelector('input[name="' + name + '"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,value); input.dispatchEvent(new Event('input',{bubbles:true})); } form.requestSubmit(); })()`);
    await a.until(`window.__expectedOrg === ${JSON.stringify(orgA)} && document.body.innerText.includes('با موفقیت ثبت شد')`, "Product write did not include expected organization");
    if (memberEmail) {
      await a.call("Page.navigate", { url: `${base}/dashboard/organization` });
      await a.until(`!!document.querySelector('input[name="email"]')`, "Member form did not load");
      await a.evaluate(`(() => { const form = document.querySelector('input[name="email"]').form; const email = form.querySelector('input[name="email"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(email, ${JSON.stringify(memberEmail)}); email.dispatchEvent(new Event('input', { bubbles: true })); form.requestSubmit(); })()`);
      await a.until(`document.body.innerText.includes('Future member') && document.body.innerText.includes('به سازمان اضافه شد')`, "Member was not added through the organization page");
    }
    await a.call("Page.navigate", { url: `${base}/dashboard/profile` });
    await a.until(`!!document.querySelector('input[name="name"]') && !!document.querySelector('input[name="currentPassword"]')`, "Profile and password forms did not load");
    console.log("Organization selector browser checks passed.");
  } finally {
    for (const socket of sockets) socket.close();
    if (chrome.exitCode === null) { chrome.kill(); await new Promise((resolve) => { chrome.once("exit", resolve); setTimeout(resolve, 3000); }); }
    await rm(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
  }
}
