'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHarness } = require('./harness');

const ROOT = path.join(__dirname, '..');

function jsonResponse(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

test('sync client is loaded and resolves the configured base URL', () => {
  const h = createHarness();
  assert.equal(typeof h.syncConfig, 'object');
  // hygiene: allow private LAN address used as a local sync test fixture
  h.evalInContext("syncConfig.baseUrl = 'http://192.0.2.10:8765/'");
  // hygiene: allow private LAN address used as a local sync test fixture
  assert.equal(h.evalInContext('resolveSyncBaseUrl()'), 'http://192.0.2.10:8765');
});

test('sync headers carry the access token when configured', () => {
  const h = createHarness();
  h.evalInContext("syncConfig.token = 'secret-1'");
  const headers = h.evalInContext('syncHeaders()');
  assert.equal(headers['X-CardMon-Token'], 'secret-1');
  assert.equal(headers['Content-Type'], 'application/json');
});

test('currentPortfolioData returns the inner data without envelope metadata', () => {
  const h = createHarness();
  h.evalInContext('state.banks = [{ id: "b1" }]; state.cards = [{ id: "c1" }]; state.loans = []; state.cashSubscriptions = [];');
  const data = h.evalInContext('currentPortfolioData()');
  assert.deepEqual(data.banks, [{ id: 'b1' }]);
  assert.deepEqual(data.cards, [{ id: 'c1' }]);
  assert.equal(data.fileType, undefined);
  assert.equal(data.savedAt, undefined);
});

test('pullFromServer applies validated remote data and stores the revision', async () => {
  const h = createHarness();
  const portfolio = { banks: [{ id: 'remote-bank', name: 'Remote Bank', color: '#123456' }], cards: [] };
  h.sandbox.fetch = async (url) => {
    assert.match(url, /\/api\/portfolio$/);
    return jsonResponse({ revision: 7, updatedAt: 'now', portfolio });
  };
  const result = await h.pullFromServer();
  assert.equal(result.ok, true);
  assert.equal(result.revision, 7);
  assert.equal(h.evalInContext('syncConfig.lastSyncedRevision'), 7);
  assert.deepEqual(h.getState().banks, portfolio.banks);
});

test('pushToServer sends baseRevision and records the returned revision', async () => {
  const h = createHarness();
  h.evalInContext('syncConfig.lastSyncedRevision = 3; state.banks = []; state.cards = [];');
  let sentBody;
  h.sandbox.fetch = async (url, options) => {
    assert.equal(options.method, 'PUT');
    sentBody = JSON.parse(options.body);
    return jsonResponse({ ok: true, revision: 4 });
  };
  const result = await h.pushToServer();
  assert.equal(result.revision, 4);
  assert.equal(sentBody.baseRevision, 3);
  assert.ok(sentBody.portfolio);
  assert.equal(sentBody.portfolio.fileType, undefined);
  assert.equal(h.evalInContext('syncConfig.localDirty'), false);
});

test('force push omits baseRevision so it can overwrite a conflict', async () => {
  const h = createHarness();
  h.evalInContext('syncConfig.lastSyncedRevision = 3; state.banks = []; state.cards = [];');
  let sentBody;
  h.sandbox.fetch = async (url, options) => {
    sentBody = JSON.parse(options.body);
    return jsonResponse({ ok: true, revision: 9 });
  };
  await h.pushToServer(true);
  assert.equal(sentBody.baseRevision, undefined);
  assert.equal(h.evalInContext('syncConfig.lastSyncedRevision'), 9);
});

test('smartSync reports a conflict when remote is newer and local is dirty', async () => {
  const h = createHarness();
  h.evalInContext('syncConfig.lastSyncedRevision = 1; syncConfig.localDirty = true;');
  h.sandbox.fetch = async (url) => {
    if (url.endsWith('/api/health')) return jsonResponse({ ok: true, hasData: true, revision: 5 });
    if (url.endsWith('/api/portfolio')) return jsonResponse({ revision: 5, portfolio: { banks: [], cards: [] } });
    throw new Error(`Unexpected URL ${url}`);
  };
  const result = await h.smartSync();
  assert.equal(result.ok, false);
  assert.equal(result.action, 'conflict');
  assert.equal(result.remoteRevision, 5);
});

test('smartSync pulls remote data when local has no unsaved changes', async () => {
  const h = createHarness();
  h.evalInContext('syncConfig.lastSyncedRevision = 1; syncConfig.localDirty = false;');
  h.sandbox.fetch = async (url) => {
    if (url.endsWith('/api/health')) return jsonResponse({ ok: true, hasData: true, revision: 6 });
    if (url.endsWith('/api/portfolio')) return jsonResponse({ revision: 6, portfolio: { banks: [{ id: 'new', name: 'New Bank', color: '#654321' }], cards: [] } });
    throw new Error(`Unexpected URL ${url}`);
  };
  const result = await h.smartSync();
  assert.equal(result.action, 'pulled');
  assert.equal(result.revision, 6);
  assert.deepEqual(h.getState().banks, [{ id: 'new', name: 'New Bank', color: '#654321' }]);
});

test('local data changes mark dirty without pushing when auto-sync is off', () => {
  const h = createHarness();
  h.evalInContext('syncConfig.localDirty = false; syncConfig.autoSync = false;');
  let called = false;
  h.sandbox.fetch = async () => { called = true; return jsonResponse({ ok: true }); };
  h.onLocalDataChanged();
  assert.equal(h.evalInContext('syncConfig.localDirty'), true);
  assert.equal(called, false);
});

test('settings persist to localStorage and reload into a fresh harness', () => {
  const h = createHarness();
  // hygiene: allow fake local host used to verify settings persistence
  h.evalInContext("syncConfig.baseUrl='http://host:9999'; syncConfig.token='tok'; syncConfig.autoSync=true; saveSyncSettings();");
  const saved = h.storage.getItem('cardmon_sync_settings_v1');
  assert.match(saved, /host:9999/);

  const second = createHarness({ storage: {
    getItem(k) { return k === 'cardmon_sync_settings_v1' ? saved : null; },
    setItem() {}, removeItem() {}, clear() {}
  } });
  // hygiene: allow fake local host used to verify settings persistence
  assert.equal(second.evalInContext('resolveSyncBaseUrl()'), 'http://host:9999');
  assert.equal(second.evalInContext('syncConfig.autoSync'), true);
});

test('index.html exposes the sync modal, navigation entry and script', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.match(html, /id="syncModalOverlay"/);
  assert.match(html, /onclick="openSyncModal\(\)"/);
  assert.match(html, /src="js\/sync-client.js"/);
  assert.match(html, /id="topbarApkBtn"/);
  assert.match(html, /id="syncServerUrl"/);
});

test('i18n dictionaries define sync and APK keys in both locales', () => {
  const h = createHarness();
  for (const key of ['syncNav', 'syncTitle', 'syncPull', 'syncPush', 'buildApk', 'buildApkDownload']) {
    assert.ok(h.I18N.tr[key], `missing Turkish key ${key}`);
    assert.ok(h.I18N.en[key], `missing English key ${key}`);
  }
});
