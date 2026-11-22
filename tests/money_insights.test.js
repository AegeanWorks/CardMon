'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHarness } = require('./harness');

const ROOT = path.join(__dirname, '..');

test('money insights tab is wired into navigation, markup and styles', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.match(html, /data-tab="insights" onclick="navigateToTab\('insights'\)"/);
  assert.match(html, /id="tabPane-insights"/);
  assert.match(html, /id="moneyInsightsContainer"/);
  assert.match(html, /src="js\/money-timing.js"/);
  assert.match(html, /src="js\/fx-inflation.js"/);
  assert.match(html, /src="js\/money-insights.js"/);
  const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
  assert.match(css, /css\/insights\.css/);
});

test('both dictionaries define money insight labels in English and Turkish', () => {
  const h = createHarness();
  for (const key of ['moneyInsights', 'timingTitle', 'extraDays', 'fxTitle', 'inflationRate', 'fxExposure', 'applySettings']) {
    assert.ok(h.I18N.tr[key], `missing Turkish key ${key}`);
    assert.ok(h.I18N.en[key], `missing English key ${key}`);
  }
  assert.equal(h.t('fxShareInfo', { value: 42 }), 'FX-linked costs make up 42% of recurring monthly spend.');
});

test('renderMoneyInsights shows timing rows and FX figures', () => {
  const h = createHarness();
  h.evalInContext(`
    state.cards = [{ id: 'c1', nickname: 'Timing Card', bankId: 'b1', dateMethod: 'exact', cutoffDay: 15, dueDay: 25, limit: 100000, usedBalance: 1000 }];
    state.banks = [{ id: 'b1', name: 'Test Bank' }];
    state.cashSubscriptions = [{ id: 's1', name: 'FX Sub', amount: 100, cycle: 'monthly', currency: 'USD', isCash: true, billingDay: 1 }];
    state.profile.monthlyIncome = 50000;
  `);
  h.renderMoneyInsights();
  const html = h.sandbox.document.getElementById('moneyInsightsContainer').innerHTML;
  assert.match(html, /Timing Card/);
  assert.match(html, /Test Bank/);
  assert.match(html, /Extra free days|Ekstra faizsiz gün/);
  assert.match(html, /inflationRateInput/);
  assert.match(html, /fxShockInput/);
  assert.match(html, /USD/);
});

// hygiene: allow synthetic fixture URLs, no network request is made
test('insights tab renders discount amounts, bonuses and official links', () => {
  const h = createHarness();
  h.evalInContext(`
    state.cards = [{ id: 'c1', nickname: 'Bonus', bankId: 'b1', dateMethod: 'exact', cutoffDay: 15, dueDay: 25, limit: 100000, usedBalance: 1000 }];
    state.banks = [{ id: 'b1', name: 'Garanti BBVA', presetKey: 'garanti' }];
    campaignCache = {
      offers: [{ id: 'o1', bankId: 'garanti-bbva', bankName: 'Garanti BBVA', appName: 'Bonus', category: 'digital', rate: 50, limit: 100, benefitLabel: '800 TL', note: 'Cashback', status: 'active_on_snapshot', endDate: '2026-12-31', sourceUrl: 'https://example.com/offer' }], // hygiene: allow synthetic fixture URL
      deals: [{ id: 'd1', category: 'digital', title: 'Streaming %50', price: '%50', store: 'Garanti', expires: '31 Aralık 2026', sourceUrl: 'https://example.com/deal' }], // hygiene: allow synthetic fixture URL
      snapshotDate: '2026-11-19',
      error: ''
    };
  `);
  h.renderMoneyInsights();
  const html = h.sandbox.document.getElementById('campaignResult').innerHTML;
  assert.match(html, /800 TL/);
  assert.match(html, /Cashback/);
  assert.match(html, /Streaming %50/);
  assert.match(html, /viewOffer|Resmi kampanyayı gör|official/i);
  assert.match(html, /https:\/\/example\.com\/offer/);
});

test('saveFxSettingsFromUi persists the entered assumptions', () => {
  const h = createHarness();
  h.sandbox.document.getElementById('inflationRateInput').value = '7.5';
  h.sandbox.document.getElementById('inflationMonthsInput').value = '24';
  h.sandbox.document.getElementById('fxShockInput').value = '15';
  h.saveFxSettingsFromUi();
  const settings = JSON.parse(JSON.stringify(h.loadFxSettings()));
  assert.equal(settings.monthlyInflationPct, 7.5);
  assert.equal(settings.months, 24);
  assert.equal(settings.shockPct, 15);
});

test('renderAll includes the money insights renderer', () => {
  const source = fs.readFileSync(path.join(ROOT, 'js', 'views.js'), 'utf8');
  assert.match(source, /renderMoneyInsights\(\)/);
});
