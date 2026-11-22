'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('./harness');

const h = createHarness();
const card = (overrides = {}) => ({
  id: 'c1', nickname: 'Test Card', dateMethod: 'exact', cutoffDay: 15, dueDay: 25,
  limit: 100000, usedBalance: 20000, ...overrides
});

function iso(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

test('cardCycleDays clamps cut-off and due days to the month length', () => {
  const cycle = h.cardCycleDays(card({ cutoffDay: 31, dueDay: 30 }), new Date(2026, 1, 10));
  assert.equal(cycle.daysInMonth, 28);
  assert.equal(cycle.cutoff, 28);
  assert.equal(cycle.due, 28);
});

test('purchase before cut-off is due in the current cycle', () => {
  const due = h.purchaseDueDate(card(), new Date(2026, 10, 5));
  assert.equal(iso(due), '2026-11-25');
  assert.equal(h.interestFreeOption(card(), new Date(2026, 10, 5)).freeDays, 20);
});

test('purchase after cut-off rolls to the next cycle', () => {
  const due = h.purchaseDueDate(card(), new Date(2026, 10, 20));
  assert.equal(iso(due), '2026-12-25');
  assert.equal(h.interestFreeOption(card(), new Date(2026, 10, 20)).freeDays, 35);
});

test('due day before cut-off lands in the following month', () => {
  const c = card({ cutoffDay: 25, dueDay: 5 });
  assert.equal(iso(h.purchaseDueDate(c, new Date(2026, 10, 10))), '2026-12-05');
  assert.equal(iso(h.purchaseDueDate(c, new Date(2026, 10, 26))), '2027-01-05');
});

test('interest-free plan recommends waiting when the extra window is meaningful', () => {
  const plan = h.interestFreePlan(card(), new Date(2026, 10, 5));
  assert.equal(iso(plan.waitDate), '2026-11-16');
  assert.equal(plan.current.freeDays, 20);
  assert.equal(plan.delayed.freeDays, 39);
  assert.equal(plan.extraDays, 19);
  assert.equal(plan.recommendWait, true);
});

test('interest-free plan does not recommend waiting when already past cut-off', () => {
  const plan = h.interestFreePlan(card(), new Date(2026, 10, 20));
  assert.equal(plan.extraDays, 5);
  assert.equal(plan.recommendWait, false);
});

test('approximate-date cards use the week mapping', () => {
  const c = card({ dateMethod: 'approx', approxCutoffWeek: 'week2', approxDueWeek: 'week4' });
  const plan = h.interestFreePlan(c, new Date(2026, 10, 5));
  assert.equal(plan.current.cutoff || h.cardCycleDays(c, new Date(2026, 10, 5)).cutoff, 11);
  assert.ok(plan.bestFreeDays > 0);
});

test('timingPlans sorts by extra days descending', () => {
  const low = card({ id: 'low', nickname: 'Low', cutoffDay: 28, dueDay: 30 });
  const high = card({ id: 'high', nickname: 'High', cutoffDay: 5, dueDay: 15 });
  const plans = h.timingPlans([low, high], new Date(2026, 10, 4));
  assert.ok(plans[0].extraDays >= plans[1].extraDays);
  assert.equal(plans.length, 2);
});
