'use strict';

// Failing-first regressions for live defects found by the genuine full re-read
// of the Reforge stage packets. Each test must fail against the current code.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHarness } = require('./harness');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

function fixedDate(harness, year, month, day) {
  // The sandbox resolves the global Date at call time, so this controls every
  // date-dependent code path without touching the real clock.
  harness.sandbox.Date = class extends Date {
    constructor(...args) {
      if (args.length === 0) super(year, month, day, 12, 0, 0);
      else super(...args);
    }
    static now() { return new Date(year, month, day, 12, 0, 0).getTime(); }
  };
}

function reportHtml(harness) {
  harness.evalInContext('exportPdfReport()');
  const el = harness.sandbox.document.getElementById('pdfReportContainer');
  return el ? el.innerHTML : '';
}

test('smart advisor clamps approximate cut-off day to a short month', () => {
  const harness = createHarness();
  fixedDate(harness, 2026, 1, 20); // 20 February 2026 — 28 days
  const calc = harness.evalInContext('calculateCardDeferralDays');
  const result = calc({
    dateMethod: 'approx',
    approxCutoffWeek: 'weekMonthEnd', // getApproxDay -> 29
    approxDueWeek: 'weekMonthEnd',
    limit: 10000,
    usedBalance: 1000
  });
  assert.ok(result.cutoffDay <= 28, `cutoffDay ${result.cutoffDay} exceeds February length`);
  assert.ok(result.dueDay <= 28, `dueDay ${result.dueDay} exceeds February length`);
});

test('backup vault reports save failure instead of claiming success', () => {
  const store = {
    getItem() { return null; },
    setItem() { throw new Error('quota exceeded'); },
    removeItem() {},
    clear() {}
  };
  const harness = createHarness({ storage: store });
  const save = harness.evalInContext('saveBackupVault');
  assert.strictEqual(save([{ id: 'snap-x' }]), false, 'saveBackupVault must report failure');
  harness.evalInContext('createManualBackupSnapshot()');
  const body = harness.sandbox.document.body.children;
  const last = body[body.length - 1];
  const toast = last && last.innerHTML ? last.innerHTML : '';
  assert.ok(!toast.includes('başarıyla kasaya eklendi'), 'failure must not toast success');
});

test('backup vault snapshots have unique ids within the same millisecond', () => {
  const harness = createHarness();
  fixedDate(harness, 2026, 10, 21);
  harness.evalInContext('Date.now = () => 1000');
  const create = harness.evalInContext('createBackupSnapshot');
  const a = create('manual');
  const b = create('manual');
  assert.notStrictEqual(a.id, b.id, 'same-millisecond snapshots must not collide');
});

test('clear all data also clears cash subscriptions and profile', () => {
  const harness = createHarness();
  const state = harness.getState();
  state.banks = [{ id: 'b1' }];
  state.cards = [{ id: 'c1' }];
  state.loans = [{ id: 'l1' }];
  state.cashSubscriptions = [{ id: 's1', name: 'Netflix' }];
  state.profile = { firstName: 'Test', lastName: 'User' };
  harness.evalInContext('confirmClearAllData()');
  assert.strictEqual(state.banks.length, 0);
  assert.strictEqual(state.cards.length, 0);
  assert.strictEqual(state.loans.length, 0);
  assert.strictEqual(state.cashSubscriptions.length, 0, 'cash subscriptions must be cleared');
  assert.notStrictEqual(state.profile.firstName, 'Test', 'profile must be reset');
});

test('PDF report uses the current month, not a hardcoded September label', () => {
  const harness = createHarness();
  fixedDate(harness, 2026, 10, 21); // 21 November 2026
  const state = harness.getState();
  state.cards = [];
  state.loans = [{ id: 'l1', title: 'Konut', startCycle: 'next', monthlyPayment: 1000, totalInstallments: 12, paidInstallments: 0 }];
  state.cashSubscriptions = [];
  const html = reportHtml(harness);
  assert.ok(!html.includes('Gelecek Ay (Eylül)'), 'next-cycle label must not hardcode September');
  assert.ok(!html.includes('>Eylül ('), 'first-payment month must not hardcode September');
  assert.ok(html.includes('Kasım'), 'report should use the live month name');
});

test('PDF report does not present a fabricated rent when no rent subscription exists', () => {
  const harness = createHarness();
  fixedDate(harness, 2026, 10, 21);
  const state = harness.getState();
  state.cards = [];
  state.loans = [];
  state.cashSubscriptions = [];
  const html = reportHtml(harness);
  assert.ok(!html.includes('Mevcut aylık'), 'no fabricated rent figure should be shown as the user rent');
});

test('PDF report fee summary agrees with the annual-fee table', () => {
  const harness = createHarness();
  fixedDate(harness, 2026, 10, 21);
  const state = harness.getState();
  state.banks = [{ id: 'b1', name: 'Test Bank' }];
  state.cards = [{ id: 'c1', bankId: 'b1', nickname: 'Fee Card', limit: 10000, annualFeeAmount: 500, annualFeeStatus: 'paid' }];
  state.loans = [];
  state.cashSubscriptions = [];
  const html = reportHtml(harness);
  assert.ok(!html.includes('₺0 (Muaf)'), 'fee KPI must not claim exemption when fees exist');
  assert.ok(!html.includes('Tüm kartlarınız aidatsız statüdedir'), 'fee caption must not claim all cards are fee-free');
});

test('PDF report toast uses the live report period', () => {
  const harness = createHarness();
  fixedDate(harness, 2026, 10, 21);
  stateReset(harness);
  harness.evalInContext('exportPdfReport()');
  const body = harness.sandbox.document.body.children;
  const toast = body.length ? (body[body.length - 1].innerHTML || '') : '';
  assert.ok(!toast.includes('Ağustos 2026'), 'toast must not hardcode August 2026');
});

function stateReset(harness) {
  const state = harness.getState();
  state.banks = [];
  state.cards = [];
  state.loans = [];
  state.cashSubscriptions = [];
}

test('README screenshot links point to distinct files', () => {
  const readme = read('README.md');
  const block = readme.split('<!-- aegean:screenshots:start -->')[1] || '';
  const srcs = [...block.matchAll(/<img src="([^"]+)"/g)].map(m => m[1]);
  assert.ok(srcs.length >= 2, 'expected before/after screenshot links');
  assert.strictEqual(new Set(srcs).size, srcs.length, 'screenshot links must be distinct');
});

test('project memory declares the canonical test command', () => {
  const project = JSON.parse(read('.aikit/project.json'));
  assert.strictEqual(project.test_command, 'npm test');
});

test('monospace design token is defined', () => {
  const css = ['css/base.css', 'css/components.css', 'css/views.css', 'styles.css']
    .filter(rel => fs.existsSync(path.join(ROOT, rel)))
    .map(read).join('\n');
  assert.match(css, /--font-family-mono\s*:/, 'used mono token must have a definition');
});
