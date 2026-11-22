'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const SCRIPT = fs.readFileSync(path.join(ROOT, 'js', 'apk-page.js'), 'utf8');

function ok(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

function createPageHarness(fetchImpl) {
  const elements = new Map();
  const timers = [];
  const makeElement = (id) => ({
    id,
    textContent: '',
    value: '',
    href: '',
    disabled: false,
    style: { display: 'none' }
  });
  const store = new Map();
  const sandbox = {
    console,
    // hygiene: allow private LAN origin used as a local APK page test fixture
    location: { origin: 'http://192.0.2.10:8765' },
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v))
    },
    document: {
      readyState: 'complete',
      getElementById: (id) => {
        if (!elements.has(id)) elements.set(id, makeElement(id));
        return elements.get(id);
      },
      createElement: (tag) => makeElement(tag),
      body: { appendChild() {}, removeChild() {} },
      addEventListener() {}
    },
    fetch: fetchImpl || (async () => ok({ state: 'idle' })),
    setTimeout: (fn) => { timers.push(fn); return timers.length; },
    clearTimeout: () => {},
    URL: { createObjectURL: () => 'blob:fake', revokeObjectURL() {} }
  };
  vm.createContext(sandbox);
  vm.runInContext(SCRIPT, sandbox);
  return {
    sandbox,
    elements,
    timers,
    el: (id) => sandbox.document.getElementById(id),
    run: (expr) => vm.runInContext(expr, sandbox)
  };
}

test('APK page HTML exposes build, status, result and download controls', () => {
  const html = fs.readFileSync(path.join(ROOT, 'apk.html'), 'utf8');
  assert.match(html, /<!DOCTYPE html>/);
  assert.match(html, /id="apkBuildBtn"/);
  assert.match(html, /id="apkStatus"/);
  assert.match(html, /id="apkResult"/);
  assert.match(html, /id="apkDownloadBtn"/);
  assert.match(html, /src="js\/apk-page.js"/);
  assert.match(html, /viewport/);
});

test('apkStatusMessage describes every build state', () => {
  const h = createPageHarness();
  assert.match(h.run("apkStatusMessage({ state: 'running' })"), /Building/);
  assert.match(h.run("apkStatusMessage({ state: 'succeeded', size: 123 })"), /123 bytes/);
  assert.match(h.run("apkStatusMessage({ state: 'failed' })"), /failed/);
  assert.match(h.run('apkStatusMessage(null)'), /Ready|Hazır/);
});

test('page reads its server origin and saved token on init', () => {
  const h = createPageHarness();
  // hygiene: allow private LAN origin used as a local APK page test fixture
  assert.equal(h.el('apkServer').textContent, 'http://192.0.2.10:8765');
  h.run("apkSaveToken('my-token')");
  h.sandbox.localStorage.setItem('cardmon_apk_token', 'my-token');
  assert.equal(h.run('apkHeaders()')['X-CardMon-Token'], 'my-token');
});

test('Build button posts to the server API and shows running state', async () => {
  const calls = [];
  const h = createPageHarness(async (url, options) => {
    calls.push({ url, options });
    if (options.method === 'POST') return ok({ accepted: true, job: { jobId: 4, state: 'running' } }, 202);
    return ok({ state: 'running', jobId: 4 });
  });
  await new Promise((resolve) => setImmediate(resolve));
  calls.length = 0;
  h.el('apkToken').value = 'phone-token';
  await h.run('apkStartBuild()');
  assert.equal(calls[0].url, '/api/build-apk');
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.headers['X-CardMon-Token'], 'phone-token');
  assert.equal(h.el('apkBuildBtn').disabled, true);
  assert.match(h.el('apkStatus').textContent, /Building/);
});

test('finished build shows download button and failed build shows Why/Fix', async () => {
  const h = createPageHarness(async () => ok({ state: 'succeeded', size: 13747, downloadName: 'cardmon-debug.apk' }));
  await new Promise((resolve) => setImmediate(resolve));
  await h.run('apkRefreshStatus()');
  assert.equal(h.el('apkResult').style.display, 'block');
  assert.equal(h.el('apkError').style.display, 'none');
  assert.match(h.el('apkStatus').textContent, /13747 bytes/);

  h.sandbox.fetch = async () => ok({ state: 'failed', log: 'Android SDK not found' });
  await h.run('apkRefreshStatus()');
  assert.equal(h.el('apkResult').style.display, 'none');
  assert.equal(h.el('apkError').style.display, 'block');
  assert.match(h.el('apkError').textContent, /Why: APK build failed\. Fix: Android SDK not found/);
});

test('download uses token headers so authenticated servers work from the phone', async () => {
  let seen;
  const h = createPageHarness(async () => ok({ state: 'idle' }));
  h.run("apkSaveToken('secret-9')");
  h.sandbox.fetch = async (url, options) => {
    seen = { url, headers: options.headers };
    return { ok: true, status: 200, blob: async () => ({}) };
  };
  await h.run('apkDownload()');
  assert.equal(seen.url, '/api/build-apk/download');
  assert.equal(seen.headers['X-CardMon-Token'], 'secret-9');
});
