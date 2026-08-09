#!/usr/bin/env node
/**
 * Automated Offline Check — Sunil Bhaiya CBSE Study Tracker
 * ---------------------------------------------------------
 * Simulates DevTools "Go Offline" and asserts the PWA app shell still loads
 * from the service worker cache.
 *
 * HOW IT WORKS (zero npm dependencies):
 *   1. Starts a tiny static HTTP server on the project root and logs every
 *      request it receives (used as an independent "was the network really
 *      offline?" oracle).
 *   2. Launches headless Chrome (or Edge) with a fresh profile.
 *   3. Loads the app, waits for the service worker to activate + control the
 *      page and for the precache to contain the app shell.
 *   4. Emulates an offline network via CDP `Network.emulateNetworkConditions`
 *      — applied to BOTH the page session and the service worker session
 *      (the SW fetches happen in the worker context, so the page session
 *      alone would NOT block them; this mirrors what DevTools does).
 *   5. Proves offline is really active: a fetch of an uncached URL must NOT
 *      reach the server (SW returns a 503 fallback), and the server log must
 *      stay empty during the offline phase.
 *   6. Reloads the page offline and asserts the app shell still renders.
 *   7. Navigates to a brand-new URL offline and asserts the SPA shell loads
 *      (exercises the sw.js offline-navigation fallback).
 *   8. Fails loudly if any uncaught exception / console error appears.
 *
 * RUN:
 *   node tests/offline-check.js
 *   node tests/offline-check.js --chrome "C:\path\to\chrome.exe"   (optional)
 *   node tests/offline-check.js --verbose                          (debug output)
 *
 * Requires Node 22+ (built-in WebSocket) and Chrome/Edge installed.
 */

"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawn, spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const DEBUG = process.argv.includes("--verbose");
const args = process.argv.slice(2);
function argValue(name) {
  const i = args.indexOf(name);
  return i !== -1 ? args[i + 1] : undefined;
}

const results = [];
function pass(msg) { results.push({ ok: true, msg }); console.log(`  [PASS] ${msg}`); }
function fail(msg) { results.push({ ok: false, msg }); console.log(`  [FAIL] ${msg}`); }

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, rej) => {
    timer = setTimeout(() => rej(new Error(`Timed out after ${ms}ms waiting for: ${label}`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------ *
 * 1. Tiny static file server (mirrors the SPA rewrites from vercel.json)
 *    Every request it receives is logged — a request during the offline
 *    phase proves the network was NOT actually offline.
 * ------------------------------------------------------------------ */
function createServer() {
  const MIME = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".pdf": "application/pdf",
    ".webmanifest": "application/manifest+json"
  };
  const requestLog = [];

  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
    requestLog.push(req.method + " " + urlPath);

    let filePath = path.join(ROOT, urlPath === "/" ? "index.html" : urlPath);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(ROOT, "index.html"); // SPA fallback (like /_redirects)
    }

    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404); res.end("Not found"); return; }
      const type = MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream";
      res.writeHead(200, { "Content-Type": type });
      res.end(data);
    });
  });

  return new Promise(resolve => {
    server.listen(0, "127.0.0.1", () => {
      resolve({ server, port: server.address().port, requestLog });
    });
  });
}

/* ------------------------------------------------------------------ *
 * 2. Headless Chrome launcher (parses the DevTools WebSocket URL)
 * ------------------------------------------------------------------ */
function findBrowser() {
  const explicit = argValue("--chrome") || process.env.CHROME_PATH;
  if (explicit && fs.existsSync(explicit)) return explicit;
  const pf = process.env.PROGRAMFILES || "C:/Program Files";
  const pfx86 = process.env["PROGRAMFILES(X86)"] || "C:/Program Files (x86)";
  const la = process.env.LOCALAPPDATA || "";
  const candidates = [
    path.join(pf, "Google/Chrome/Application/chrome.exe"),
    path.join(pfx86, "Google/Chrome/Application/chrome.exe"),
    path.join(la, "Google/Chrome/Application/chrome.exe"),
    path.join(pf, "Microsoft/Edge/Application/msedge.exe"),
    path.join(pfx86, "Microsoft/Edge/Application/msedge.exe"),
    path.join(la, "Microsoft/Edge/Application/msedge.exe"),
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
  ];
  for (const c of candidates) {
    if (c && fs.existsSync(c)) return c;
  }
  for (const name of ["chrome", "google-chrome", "chromium", "msedge"]) {
    const r = spawnSync(name, ["--version"], { encoding: "utf8", timeout: 5000 });
    if (r.status === 0) return name;
  }
  return null;
}

function launchBrowser(binary, userDataDir) {
  const child = spawn(binary, [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    "--disable-background-networking",
    "--disable-sync",
    "--remote-debugging-port=0",
    `--user-data-dir=${userDataDir}`,
    "about:blank"
  ], { stdio: ["ignore", "ignore", "pipe"] });

  return new Promise((resolve, reject) => {
    let stderrBuf = "";
    const timer = setTimeout(() => {
      try { child.kill("SIGKILL"); } catch (e) { /* noop */ }
      reject(new Error("Chrome did not expose a DevTools endpoint within 15s"));
    }, 15000);

    child.stderr.on("data", chunk => {
      stderrBuf += chunk.toString();
      const m = stderrBuf.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (m) {
        clearTimeout(timer);
        resolve({ child, wsUrl: m[1] });
      }
    });
    child.on("exit", code => {
      clearTimeout(timer);
      reject(new Error(`Chrome exited early with code ${code}`));
    });
  });
}

/* ------------------------------------------------------------------ *
 * 3. Minimal CDP client over Node's built-in WebSocket
 *    Supports flattened sessions: pass `sessionId` as the 3rd arg of send().
 * ------------------------------------------------------------------ */
class CDP {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    this.ws.addEventListener("message", ev => {
      const msg = JSON.parse(String(ev.data));
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result || {});
      } else if (msg.method) {
        const cbs = this.listeners.get(msg.method) || [];
        cbs.forEach(cb => cb(msg.params || {}, msg.sessionId));
      }
    });
  }
  async open() {
    if (this.ws.readyState === WebSocket.OPEN) return;
    await new Promise((resolve, reject) => {
      this.ws.addEventListener("open", resolve, { once: true });
      this.ws.addEventListener("error", () => reject(new Error("WebSocket connection failed")), { once: true });
    });
  }
  send(method, params = {}, sessionId) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      const msg = { id, method, params };
      if (sessionId) msg.sessionId = sessionId;
      this.ws.send(JSON.stringify(msg));
    });
  }
  on(method, cb) {
    if (!this.listeners.has(method)) this.listeners.set(method, []);
    this.listeners.get(method).push(cb);
  }
  off(method, cb) {
    const cbs = this.listeners.get(method);
    if (cbs) this.listeners.set(method, cbs.filter(c => c !== cb));
  }
  close() { try { this.ws.close(); } catch (e) { /* noop */ } }
}

const OFFLINE_COND = { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 };
const ONLINE_COND = { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 };

/* ------------------------------------------------------------------ *
 * 4. Test flow
 * ------------------------------------------------------------------ */
async function main() {
  if (typeof WebSocket === "undefined") {
    console.error("This check needs Node 22+ (built-in WebSocket). Current Node: " + process.version);
    process.exit(1);
  }

  console.log("\n=== CBSE Tracker — Automated Offline Check ===\n");

  const browserBinary = findBrowser();
  if (!browserBinary) {
    console.error("Could not find Chrome or Edge. Set CHROME_PATH or pass --chrome <path>.");
    process.exit(1);
  }
  console.log(`  Using browser: ${browserBinary}`);

  const { server, port, requestLog } = await createServer();
  const origin = `http://127.0.0.1:${port}`;
  console.log(`  Static server on ${origin}\n`);

  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "cbse-offline-check-"));
  let browser = null;
  let browserCdp = null;

  try {
    // --- launch headless Chrome + browser-level CDP session ---
    const launched = await launchBrowser(browserBinary, userDataDir);
    browser = launched.child;

    browserCdp = new CDP(launched.wsUrl);
    await browserCdp.open();

    let pageSessionId = null;
    let swSessionId = null;
    let offline = false;

    // Auto-attach to every target (page + service worker) with flattened sessions.
    browserCdp.on("Target.attachedToTarget", (params, eventSessionId) => {
      const sessionId = params.sessionId || eventSessionId;
      const type = params.targetInfo && params.targetInfo.type;

      if (type === "service_worker") {
        swSessionId = sessionId;
        if (DEBUG) console.log("  [debug] attached to service worker session");
        // The SW's fetches run in THIS context — it must be emulated too.
        browserCdp.send("Network.enable", {}, sessionId)
          .then(() => browserCdp.send("Network.emulateNetworkConditions", offline ? OFFLINE_COND : ONLINE_COND, sessionId))
          .catch(() => { /* worker may terminate before this lands; re-applied on next attach */ });
      } else if (type === "page") {
        pageSessionId = sessionId;
      }
    });

    await browserCdp.send("Target.setAutoAttach", { autoAttach: true, waitForDebuggerOnStart: false, flatten: true });
    await browserCdp.send("Target.createTarget", { url: "about:blank" });
    await withTimeout((async () => { while (!pageSessionId) await sleep(50); })(), 5000, "page session attach");

    const pageSend = (method, params) => browserCdp.send(method, params, pageSessionId);

    await pageSend("Page.enable");
    await pageSend("Runtime.enable");
    await pageSend("Network.enable");
    await pageSend("Log.enable");

    // Track uncaught exceptions + console errors for the page session
    const problems = [];
    browserCdp.on("Runtime.exceptionThrown", (p, sid) => {
      if (sid === pageSessionId) problems.push("uncaught exception: " + (p.exceptionDetails && p.exceptionDetails.text));
    });
    browserCdp.on("Runtime.consoleAPICalled", (p, sid) => {
      if (sid === pageSessionId && p.type === "error") {
        problems.push("console.error: " + (p.args || []).map(a => a.value || a.description || "").join(" "));
      }
    });
    browserCdp.on("Log.entryAdded", (p, sid) => {
      if (sid === pageSessionId && p.entry && p.entry.level === "error") problems.push("log error: " + p.entry.text);
    });

    // Resolves on the next page-session load event; unregisters itself (also on timeout).
    const waitForLoad = label => withTimeout(new Promise(resolve => {
      const handler = (params, sid) => {
        if (sid === pageSessionId) {
          browserCdp.off("Page.loadEventFired", handler);
          resolve();
        }
      };
      browserCdp.on("Page.loadEventFired", handler);
      // Cleanup in case withTimeout rejects first
      setTimeout(() => browserCdp.off("Page.loadEventFired", handler), 21000);
    }), 20000, label);

    async function evaluate(expression) {
      const res = await pageSend("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
      if (res.exceptionDetails) {
        throw new Error(`Evaluation failed: ${JSON.stringify(res.exceptionDetails.exception || res.exceptionDetails).slice(0, 400)}`);
      }
      return res.result.value;
    }

    // --- 1) load app online ---
    console.log("  [1/8] Loading app online...");
    const load1 = waitForLoad("first load");
    await pageSend("Page.navigate", { url: origin + "/index.html" });
    await load1;

    const onlineShell = await evaluate(`({
      title: document.title,
      hasApp: !!document.getElementById("app"),
      appChildren: (document.getElementById("app") || {}).childElementCount || 0
    })`);
    if (onlineShell.title && onlineShell.hasApp && onlineShell.appChildren > 0) {
      pass("App shell renders online (title + #app content)");
    } else {
      fail(`App shell did not render online: ${JSON.stringify(onlineShell)}`);
    }

    // --- 2) wait for SW activation, then reload once so it controls the page ---
    console.log("  [2/8] Waiting for service worker activation + control...");
    await withTimeout((async () => {
      for (let i = 0; i < 60; i++) {
        const state = await evaluate(
          `(async () => { const reg = await navigator.serviceWorker.getRegistration(); return reg && reg.active ? reg.active.state : null; })()`
        ).catch(() => null);
        if (state === "activated") break;
        await sleep(250);
      }
    })(), 20000, "SW activation");
    // Wait (deterministically) for the service worker session to auto-attach
    await withTimeout((async () => { while (!swSessionId) await sleep(100); })(), 10000, "service worker session attach");

    const load2 = waitForLoad("controlled reload");
    await pageSend("Page.reload");
    await load2;

    const swState = await evaluate(`({
      controller: !!navigator.serviceWorker.controller,
      controllerState: navigator.serviceWorker.controller ? navigator.serviceWorker.controller.state : null
    })`);
    if (swState.controller && swState.controllerState === "activated") {
      pass("Service worker registered, activated and controlling the page");
    } else {
      fail(`Service worker not controlling the page: ${JSON.stringify(swState)}`);
    }

    // --- 3) verify the precache contains the app shell ---
    console.log("  [3/8] Verifying precached app shell...");
    const precache = await evaluate(`(async () => {
      const keys = await caches.keys();
      const summary = { keys, hasIndex: false, hasAppJs: false, hasCss: false, urls: [] };
      for (const k of keys) {
        const c = await caches.open(k);
        for (const req of await c.keys()) summary.urls.push(req.url);
        if (await c.match("/index.html")) summary.hasIndex = true;
        if (await c.match("/js/app.js")) summary.hasAppJs = true;
        if (await c.match("/css/styles.css")) summary.hasCss = true;
      }
      return summary;
    })()`);
    if (precache.hasIndex && precache.hasAppJs && precache.hasCss) {
      pass(`App shell precached (cache "${(precache.keys || []).join(", ")}", ${(precache.urls || []).length} entries)`);
    } else {
      fail(`Precache missing app shell assets: ${JSON.stringify(precache)}`);
    }

    // --- 4) Go Offline (page + service worker sessions) ---
    console.log("  [4/8] Going offline (page + service worker)...");
    if (!swSessionId) {
      fail("No service worker session attached — cannot emulate offline for the SW context");
      return;
    }
    offline = true;
    await pageSend("Network.emulateNetworkConditions", OFFLINE_COND);
    await browserCdp.send("Network.emulateNetworkConditions", OFFLINE_COND, swSessionId);

    const offlineLogStart = requestLog.length;

    // Sanity: an uncached fetch must NOT reach the server. The SW's offline
    // fallback returns a 503; if instead we get a 200, the network is live
    // (or the page isn't SW-controlled) and the whole offline phase is void.
    const sanity = await evaluate(`fetch("/__offline_sanity_check__.js")
      .then(r => ({ ok: r.ok, status: r.status }))
      .catch(e => ({ networkError: String(e) }))`);
    if (sanity.status === 503 || sanity.networkError) {
      pass(`Offline emulation active (uncached fetch -> ${sanity.status === 503 ? "503 from SW fallback" : "network error"})`);
    } else {
      fail(`Offline emulation appears inactive (got ${JSON.stringify(sanity)})`);
    }

    // --- 5) reload offline -> app shell must come from the SW cache ---
    console.log("  [5/8] Reloading page while offline...");
    const problemsBefore = problems.length;
    const load3 = waitForLoad("offline reload");
    await pageSend("Page.reload");
    await load3;

    const offlineShell = await evaluate(`({
      title: document.title,
      appChildren: (document.getElementById("app") || {}).childElementCount || 0,
      bodyText: document.body && document.body.innerText ? document.body.innerText.slice(0, 120) : ""
    })`);
    const newProblems = problems.slice(problemsBefore);
    if (offlineShell.title && offlineShell.appChildren > 0 && newProblems.length === 0) {
      pass("App shell rendered from service worker cache while offline");
    } else {
      fail(`Offline reload did not render the app shell: ${JSON.stringify(offlineShell)} problems=${JSON.stringify(newProblems)}`);
    }

    // --- 6) navigate to a brand-new URL offline -> SW fallback must kick in ---
    console.log("  [6/8] Navigating to a new URL while offline (SW fallback)...");
    const load4 = waitForLoad("offline deep link");
    await pageSend("Page.navigate", { url: origin + "/offline-deep-link-test" });
    await load4;

    const deepLink = await evaluate(`({
      path: location.pathname,
      title: document.title,
      appChildren: (document.getElementById("app") || {}).childElementCount || 0
    })`);
    if (deepLink.title && deepLink.appChildren > 0) {
      pass(`Offline navigation to "${deepLink.path}" served the app shell from cache`);
    } else {
      fail(`Offline navigation failed: ${JSON.stringify(deepLink)}`);
    }

    // --- 7) independent offline proof: the server must have seen ZERO requests ---
    console.log("  [7/8] Verifying the network was truly offline (server log)...");
    const serverHits = requestLog.slice(offlineLogStart);
    if (serverHits.length === 0) {
      pass("Server received no requests during the offline phase (network was truly offline)");
    } else {
      fail(`Server WAS reached while offline: ${serverHits.join(", ")}`);
    }

    // --- 8) no uncaught exceptions / console errors across the offline phase ---
    console.log("  [8/8] Checking for uncaught errors...");
    const finalProblems = problems.slice(problemsBefore);
    if (finalProblems.length === 0) {
      pass("No uncaught exceptions or console errors during the offline phase");
    } else {
      fail("Errors detected during offline phase: " + finalProblems.join(" | "));
    }

    // restore online
    await pageSend("Network.emulateNetworkConditions", ONLINE_COND);
    if (swSessionId) await browserCdp.send("Network.emulateNetworkConditions", ONLINE_COND, swSessionId);
  } catch (err) {
    fail("Harness error: " + err.message);
    if (DEBUG) console.error(err);
  } finally {
    try { if (browserCdp) browserCdp.close(); } catch (e) { /* noop */ }
    try { if (browser) browser.kill("SIGKILL"); } catch (e) { /* noop */ }
    try { server.close(); } catch (e) { /* noop */ }
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch (e) { /* noop */ }
  }

  const passed = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;
  console.log(`\n================ RESULT: ${passed} passed, ${failed} failed ================\n`);
  if (failed > 0) {
    console.log("FAILED CHECKS:");
    results.filter(r => !r.ok).forEach(r => console.log(`  - ${r.msg}`));
  }
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error("Fatal harness error:", err);
  process.exit(1);
});
