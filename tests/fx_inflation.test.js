'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('./harness');

const h = createHarness();

test('totalPortfolioDebt includes card balances and remaining loan installments', () => {
  const debt = h.totalPortfolioDebt({
    cards: [{ usedBalance: 1000 }, { usedBalance: 250 }],
    loans: [{ totalInstallments: 10, paidInstallments: 4, monthlyPayment: 500 }]
  });
  assert.equal(debt, 4250);
});

test('inflationAdjusted discounts nominal debt and reports erosion', () => {
  const result = h.inflationAdjusted(1200, 10, 1);
  assert.ok(Math.abs(result.real - (1200 / 1.1)) < 0.001);
  assert.ok(Math.abs(result.erosion - 109.09) < 0.01);
  assert.ok(Math.abs(result.erosionPct - 9.09) < 0.01);
  assert.equal(result.months, 1);
});

test('monthlyAmount normalizes yearly subscriptions', () => {
  assert.equal(h.monthlyAmount({ amount: 1200, cycle: 'yearly' }), 100);
  assert.equal(h.monthlyAmount({ amount: 100, cycle: 'monthly' }), 100);
});

test('fxExposure groups by currency and converts to TRY', () => {
  const exposure = h.fxExposure([
    { amount: 100, cycle: 'monthly', currency: 'USD' },
    { amount: 200, cycle: 'monthly', currency: 'TRY' },
    { amount: 120, cycle: 'yearly', currency: 'EUR' }
  ], { USD: 40, EUR: 44 });
  assert.equal(exposure.entries.length, 3);
  const usd = exposure.entries.find((e) => e.currency === 'USD');
  assert.equal(usd.tryAmount, 4000);
  assert.equal(exposure.fxTry, 4440);
  assert.equal(exposure.totalTry, 4640);
  assert.ok(exposure.fxSharePct > 95);
});

test('fxScenario values the shocked total', () => {
  const scenario = h.fxScenario(10000, 10);
  assert.equal(scenario.shocked, 11000);
  assert.equal(scenario.delta, 1000);
});

test('fxAlerts warns when FX costs exceed 15% of income', () => {
  const exposure = { fxTry: 5000, fxSharePct: 80 };
  const alerts = h.fxAlerts(exposure, 20000);
  assert.equal(alerts.length, 2);
  assert.equal(JSON.stringify(alerts.map((a) => a.code)), JSON.stringify(['fxShare', 'fxIncome']));
  assert.equal(h.fxAlerts({ fxTry: 0, fxSharePct: 0 }, 20000).length, 0);
});

test('FX settings persist with safe defaults', () => {
  const defaults = { monthlyInflationPct: 3, months: 12, shockPct: 10, autoInflation: true, annualInflationPct: 0, inflationPeriod: '', inflationUpdatedAt: '' };
  assert.equal(JSON.stringify(h.loadFxSettings()), JSON.stringify(defaults));
  h.saveFxSettings({ monthlyInflationPct: 5, months: 6, shockPct: 20 });
  const updated = { ...defaults, monthlyInflationPct: 5, months: 6, shockPct: 20 };
  assert.equal(JSON.stringify(h.loadFxSettings()), JSON.stringify(updated));
});
