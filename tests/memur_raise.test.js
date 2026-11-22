'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHarness } = require('./harness');

const ROOT = path.join(__dirname, '..');
const h = createHarness();

function rows(values) {
  return Object.keys(values).map((period) => ({
    seri: 'Aylık değişim (%)',
    donem: period,
    deger: values[period]
  }));
}

const partial2026 = rows({
  'Temmuz 2026': 1.78,
  'Ağustos 2026': 1.84,
  'Eylül 2026': 1.84,
  'Ekim 2026': 2.58
});

const full2026h1 = rows({
  'Ocak 2026': 4.84, 'Şubat 2026': 2.96, 'Mart 2026': 1.94,
  'Nisan 2026': 4.18, 'Mayıs 2026': 1.71, 'Haziran 2026': 0.99
});

test('period keys use Turkish month names and years', () => {
  assert.equal(h.periodKey('Ekim 2026'), 202610);
  assert.equal(h.periodKey('Ocak 2027'), 202701);
});

test('cumulativeInflation compounds monthly changes', () => {
  const payload = { rows: partial2026 };
  const result = h.cumulativeInflation(payload, 202607, 202612);
  assert.equal(result.monthsAvailable, 4);
  assert.ok(Math.abs(result.pct - 8.28) < 0.02);
});

test('contract rates match the 8th collective agreement', () => {
  assert.equal(h.contractRate(202601), 11);
  assert.equal(h.contractRate(202607), 7);
  assert.equal(h.contractRate(202701), 5);
  assert.equal(h.contractRate(202707), 4);
});

test('January 2027 estimate matches the official provisional calculation', () => {
  const info = h.nextRaiseInfo({ rows: partial2026 });
  assert.equal(info.monthName, 'Ocak');
  assert.equal(info.raiseYear, 2027);
  assert.equal(info.contractPct, 5);
  assert.equal(info.previousContractPct, 7);
  assert.equal(info.provisional, true);
  assert.equal(info.monthsAvailable, 4);
  assert.ok(Math.abs(info.inflationPct - 8.28) < 0.02);
  assert.ok(Math.abs(info.totalPct - 6.26) < 0.05);
});

test('July 2026 raise uses January contract as the inflation-difference base', () => {
  const info = h.nextRaiseInfo({ rows: full2026h1 });
  assert.equal(info.monthName, 'Temmuz');
  assert.equal(info.raiseYear, 2026);
  assert.equal(info.contractPct, 7);
  assert.equal(info.previousContractPct, 11);
  assert.ok(Math.abs(info.totalPct - 13.51) < 0.1);
});

test('salaryImpact reports increase and new salary', () => {
  const impact = h.salaryImpact(6.26, 50000);
  assert.equal(impact.increase, 3130);
  assert.equal(impact.newSalary, 53130);
});

test('missing data returns no raise info', () => {
  assert.equal(h.nextRaiseInfo({ rows: [] }), null);
});

test('memur calculator is wired into the insights tab and dictionaries', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.match(html, /src="js\/memur-raise.js"/);
  for (const key of ['memurTitle', 'nextRaise', 'inflationDifference', 'totalRaise', 'currentSalary']) {
    assert.ok(h.I18N.tr[key] && h.I18N.en[key], `missing key ${key}`);
  }
  const insights = fs.readFileSync(path.join(ROOT, 'js', 'money-insights.js'), 'utf8');
  assert.match(insights, /renderMemurSection/);
  assert.match(insights, /memurSalaryInput/);
});

test('memur section renders with cached feed data', () => {
  const originalFetch = h.sandbox.fetch;
  h.sandbox.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      rows: [
        { seri: 'Aylık değişim (%)', donem: 'Ekim 2026', deger: 2.58 },
        { seri: 'Yıllık değişim (%)', donem: 'Ekim 2026', deger: 29.77 }
      ]
    })
  });
  return h.autoRefreshInflation(true).then(() => {
    h.sandbox.fetch = originalFetch;
    h.renderMoneyInsights();
    const html = h.sandbox.document.getElementById('moneyInsightsContainer').innerHTML;
    assert.match(html, /Memur Zammı Hesaplayıcı|Civil-servant raise calculator/);
    assert.match(html, /memurSalaryInput/);
    assert.match(html, /Ocak|January/);
  });
});
