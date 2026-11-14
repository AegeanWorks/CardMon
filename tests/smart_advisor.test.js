'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('./harness');

test('calculateCardDeferralDays computes correct deferral when today is past cutoff', () => {
  const harness = createHarness();
  const calcDeferral = harness.evalInContext('calculateCardDeferralDays');

  const card = {
    id: 'c-1',
    nickname: 'Test Card',
    dateMethod: 'exact',
    cutoffDay: 10,
    dueDay: 20,
    limit: 50000,
    usedBalance: 10000
  };

  // Fixed test date: Day 15 of a 30-day month (e.g. November 15, 2026)
  const fixedDate = new Date(2026, 10, 15);
  const result = calcDeferral(card, fixedDate);

  assert.strictEqual(result.today, 15);
  assert.strictEqual(result.cutoffDay, 10);
  assert.strictEqual(result.dueDay, 20);
  assert.strictEqual(result.isNextMonthCutoff, true);
  assert.ok(result.daysUntilPayment > 20, 'Past-cutoff spending must give high deferral');
  assert.strictEqual(result.availableLimit, 40000);
});

test('calculateCardDeferralDays computes deferral when today is before cutoff', () => {
  const harness = createHarness();
  const calcDeferral = harness.evalInContext('calculateCardDeferralDays');

  const card = {
    id: 'c-2',
    nickname: 'Test Card 2',
    dateMethod: 'exact',
    cutoffDay: 25,
    dueDay: 5,
    limit: 30000,
    usedBalance: 5000
  };

  // Fixed test date: Day 10 (before cutoff day 25)
  const fixedDate = new Date(2026, 10, 10);
  const result = calcDeferral(card, fixedDate);

  assert.strictEqual(result.isNextMonthCutoff, false);
  assert.strictEqual(result.availableLimit, 25000);
  assert.ok(result.daysUntilPayment > 0);
});

test('calculateCardDeferralDays falls back to approximate week days when dateMethod is approx', () => {
  const harness = createHarness();
  const calcDeferral = harness.evalInContext('calculateCardDeferralDays');

  const card = {
    id: 'c-approx',
    nickname: 'Approx Card',
    dateMethod: 'approx',
    approxCutoffWeek: 'week2', // ~day 12
    approxDueWeek: 'week4',    // ~day 26
    limit: 20000,
    usedBalance: 0
  };

  const fixedDate = new Date(2026, 10, 1);
  const result = calcDeferral(card, fixedDate);

  assert.ok(result.cutoffDay > 0);
  assert.ok(result.dueDay > 0);
  assert.strictEqual(result.availableLimit, 20000);
});
