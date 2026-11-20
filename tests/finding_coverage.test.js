'use strict';

// Closes the remaining findings from the full reforge re-read: accessibility
// text on permission pills and the test-coverage gaps the readers reported.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHarness } = require('./harness');

const ROOT = path.join(__dirname, '..');

test('contactless and cash-advance pills state Açık/Bloke in text', () => {
  const harness = createHarness();
  const state = harness.getState();
  state.banks = [{ id: 'b1', name: 'Bank' }];
  state.cards = [{
    id: 'c1', bankId: 'b1', nickname: 'Card', limit: 1000, usedBalance: 100,
    permissions: { internet: true, abroad: true, contactless: true, cashAdvance: false },
    dateMethod: 'exact', cutoffDay: 20, dueDay: 25
  }];
  harness.evalInContext('renderCardsView()');
  const html = harness.sandbox.document.getElementById('cardsContainer').innerHTML;
  assert.ok(html.includes('Temassız: Açık'), 'contactless state must be text, not colour alone');
  assert.ok(html.includes('Avans: Bloke'), 'cash-advance state must be text, not colour alone');
});

test('exportPdfReport actually calls window.print', async () => {
  const harness = createHarness();
  harness.loadDemoData(false);
  let printCalled = false;
  harness.sandbox.window.print = () => { printCalled = true; };
  harness.evalInContext('exportPdfReport()');
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.strictEqual(printCalled, true, 'the report must trigger the print dialog');
});

test('weekly auto backup triggers when the last auto snapshot is older than 7 days', () => {
  const harness = createHarness();
  const state = harness.getState();
  state.cards = [{ id: 'c1', limit: 1000, usedBalance: 100 }];
  state.banks = [];
  harness.evalInContext('saveBackupVault')([{
    id: 'snap-old', type: 'auto', timestamp: Date.now() - 8 * 24 * 60 * 60 * 1000,
    data: { banks: [], cards: [], loans: [], cashSubscriptions: [], profile: {} }
  }]);
  harness.evalInContext('checkAndTriggerAutoWeeklyBackup()');
  const vault = harness.evalInContext('getBackupVault')();
  assert.strictEqual(vault.length, 2, 'a new auto snapshot must be added');
  assert.strictEqual(vault[0].type, 'auto');
});

test('welcome empty-state actions toggle with total limit', () => {
  const harness = createHarness();
  const actions = harness.sandbox.document.getElementById('welcomeEmptyActions');
  harness.evalInContext('renderHealthScoreWidget(0, 0, 0, 0)');
  assert.strictEqual(actions.hidden, false, 'welcome actions visible when there is no portfolio');
  harness.evalInContext('renderHealthScoreWidget(20, 2000, 10000, 0)');
  assert.strictEqual(actions.hidden, true, 'welcome actions hidden once the portfolio exists');
});

test('paying a loan installment writes the updated portfolio to storage', () => {
  const writes = [];
  const storage = {
    getItem() { return null; },
    setItem(k, v) { writes.push({ key: k, value: String(v) }); },
    removeItem() {}, clear() {}
  };
  const harness = createHarness({ storage });
  const state = harness.getState();
  state.loans = [{ id: 'l1', title: 'Loan', totalInstallments: 5, paidInstallments: 1, monthlyPayment: 100 }];
  harness.evalInContext('paySingleLoanInstallment("l1")');
  assert.ok(writes.length > 0, 'storage must be written after a payment');
  const saved = JSON.parse(writes[writes.length - 1].value);
  const loans = saved.loans || (saved.data && saved.data.loans) || [];
  assert.strictEqual(loans[0].paidInstallments, 2, 'the persisted loan progress must advance');
});

test('restoring a snapshot restores loans as part of full portfolio state', () => {
  const harness = createHarness();
  harness.sandbox.confirm = () => true;
  const state = harness.getState();
  harness.evalInContext('saveBackupVault')([{
    id: 'snap-loans', dateStr: 'today',
    data: {
      banks: [], cards: [],
      loans: [{ id: 'l-restored', title: 'Restored loan', totalInstallments: 6, paidInstallments: 2 }],
      cashSubscriptions: [], profile: { firstName: 'Restored' }
    }
  }]);
  state.loans = [];
  harness.evalInContext('restoreBackupSnapshot("snap-loans")');
  assert.strictEqual(state.loans.length, 1, 'loans must be restored');
  assert.strictEqual(state.loans[0].title, 'Restored loan');
});

test('saveToActiveFile writes through an existing native handle', async () => {
  const harness = createHarness();
  let written = '';
  const handle = {
    name: 'portfolio.cardmon',
    queryPermission: async () => 'granted',
    createWritable: async () => ({
      write: async (text) => { written = text; },
      close: async () => {}
    })
  };
  harness.evalInContext('fileSystemState').activeHandle = handle;
  const result = await harness.evalInContext('saveToActiveFile()');
  assert.strictEqual(result, true);
  assert.ok(written.includes('cardmon_portfolio'), 'the active handle must receive the payload');
  assert.strictEqual(harness.evalInContext('fileSystemState').isDirty, false);
});

test('index.html loads constants.js before main.js', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const constPos = html.indexOf('src="js/constants.js"');
  const mainPos = html.indexOf('src="js/main.js"');
  assert.ok(constPos >= 0 && mainPos >= 0, 'both script tags must exist');
  assert.ok(constPos < mainPos, 'constants.js must load before main.js');
});

test('timeline renders the pay-installments action for an unpaid card with a plan', () => {
  const harness = createHarness();
  const state = harness.getState();
  state.banks = [{ id: 'b1', name: 'Bank' }];
  state.cards = [{
    id: 'c1', bankId: 'b1', nickname: 'Card', limit: 5000, usedBalance: 1000,
    isPaidThisMonth: false, dateMethod: 'exact', cutoffDay: 20, dueDay: 25,
    installments: [{ id: 'i1', desc: 'Plan', monthlyAmount: 100, paidCount: 0, installmentCount: 3 }]
  }];
  state.loans = [];
  state.cashSubscriptions = [];
  harness.evalInContext('renderTimelineView()');
  const html = harness.sandbox.document.getElementById('timelineContainer').innerHTML;
  assert.ok(html.includes('payCardMonthlyInstallments'), 'the new branch must render its pay action');
});
