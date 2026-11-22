'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHarness } = require('./harness');

const ROOT = path.join(__dirname, '..');
const h = createHarness();

const feedPayload = {
  updatedAt: '2026-11-07',
  rows: [
    { seri: 'Aylık değişim (%)', donem: 'Eylül 2026', deger: 1.84 },
    { seri: 'Aylık değişim (%)', donem: 'Ekim 2026', deger: 2.58 },
    { seri: 'Yıllık değişim (%)', donem: 'Eylül 2026', deger: 29.73 },
    { seri: 'Yıllık değişim (%)', donem: 'Ekim 2026', deger: 29.77 }
  ]
};

test('Turkish month periods sort chronologically', () => {
  assert.ok(h.periodSortKey('Ekim 2026') > h.periodSortKey('Eylül 2026'));
  assert.ok(h.periodSortKey('Ocak 2026') > h.periodSortKey('Aralık 2025'));
});

test('feed parser extracts the latest monthly and annual TÜİK figures', () => {
  const parsed = h.parseInflationFeed(feedPayload);
  assert.equal(parsed.monthlyPct, 2.58);
  assert.equal(parsed.annualPct, 29.77);
  assert.equal(parsed.period, 'Ekim 2026');
  assert.equal(parsed.source, 'TÜİK');
});

test('feed parser rejects payloads without both series', () => {
  assert.throws(() => h.parseInflationFeed({ rows: [] }), /no monthly or annual/);
});

test('fetchInflationData reads a JSON response through injected fetch', async () => {
  const fetched = await h.fetchInflationData(async (url, options) => {
    assert.match(url, /enflasyon-yillara-gore\.json/);
    assert.equal(options.headers.Accept, 'application/json');
    return { ok: true, status: 200, json: async () => feedPayload };
  });
  assert.equal(fetched.monthlyPct, 2.58);
});

test('applied feed values replace the manual inflation assumption', () => {
  const settings = h.applyInflationData(h.parseInflationFeed(feedPayload));
  assert.equal(settings.monthlyInflationPct, 2.58);
  assert.equal(settings.annualInflationPct, 29.77);
  assert.equal(settings.inflationPeriod, 'Ekim 2026');
  const persisted = JSON.parse(JSON.stringify(h.loadFxSettings()));
  assert.equal(persisted.monthlyInflationPct, 2.58);
});

test('auto refresh respects the opt-out and the daily cache', () => {
  assert.equal(h.shouldRefreshInflation({ autoInflation: false }, new Date('2026-11-22T12:00:00Z')), false);
  assert.equal(h.shouldRefreshInflation({ autoInflation: true }, new Date('2026-11-22T12:00:00Z')), true);
  const recent = { autoInflation: true, inflationUpdatedAt: '2026-11-22T11:00:00Z' };
  assert.equal(h.shouldRefreshInflation(recent, new Date('2026-11-22T12:00:00Z')), false);
  const old = { autoInflation: true, inflationUpdatedAt: '2026-11-20T11:00:00Z' };
  assert.equal(h.shouldRefreshInflation(old, new Date('2026-11-22T12:00:00Z')), true);
});

test('autoRefreshInflation applies real data and reports failures safely', async () => {
  const ok = await h.autoRefreshInflation(true, async () => ({ ok: true, status: 200, json: async () => feedPayload }));
  assert.equal(ok.status, 'ok');
  assert.equal(ok.data.monthlyPct, 2.58);

  const fail = await h.autoRefreshInflation(true, async () => { throw new Error('offline'); });
  assert.equal(fail.status, 'error');
  assert.equal(h.inflationFeedError(), 'offline');
  assert.equal(h.loadFxSettings().monthlyInflationPct, 2.58);
});

test('app wiring includes the feed module, controls and translations', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.match(html, /src="js\/inflation-feed.js"/);
  const main = fs.readFileSync(path.join(ROOT, 'js', 'main.js'), 'utf8');
  assert.match(main, /autoRefreshInflation\(\)/);
  for (const key of ['autoInflation', 'refreshInflation', 'inflationFeedStatus', 'inflationUpdated']) {
    assert.ok(h.I18N.tr[key] && h.I18N.en[key], `missing key ${key}`);
  }
  const insights = fs.readFileSync(path.join(ROOT, 'js', 'money-insights.js'), 'utf8');
  assert.match(insights, /autoInflationCheck/);
  assert.match(insights, /refreshInflationNow/);
});
