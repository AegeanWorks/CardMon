'use strict';

// Failing-first regressions for the third batch of still-live findings.

const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('./harness');

test('full card payment keeps next-cycle installment plans', () => {
  const harness = createHarness();
  harness.sandbox.confirm = () => true;
  const state = harness.getState();
  state.cards = [{
    id: 'c1', nickname: 'Card', usedBalance: 1000,
    installments: [
      { id: 'i1', desc: 'Active plan', startCycle: 'current', monthlyAmount: 100, paidCount: 0, installmentCount: 3 },
      { id: 'i2', desc: 'Next plan', startCycle: 'next', monthlyAmount: 200, paidCount: 0, installmentCount: 3 }
    ]
  }];
  harness.evalInContext('payCardFullDebt("c1")');
  const plans = state.cards[0].installments.map(i => i.desc);
  assert.ok(plans.includes('Next plan'), 'next-cycle plan must survive a full payment');
  assert.ok(!plans.includes('Active plan'), 'active plan must be cleared');
});

test('monthly installment payment skips not-yet-active next-cycle plans', () => {
  const harness = createHarness();
  const state = harness.getState();
  state.cards = [{
    id: 'c1', nickname: 'Card', usedBalance: 1000,
    installments: [
      { id: 'i1', desc: 'Active', startCycle: 'current', monthlyAmount: 100, paidCount: 0, installmentCount: 3 },
      { id: 'i2', desc: 'Next', startCycle: 'next', monthlyAmount: 200, paidCount: 0, installmentCount: 3 }
    ]
  }];
  harness.evalInContext('payCardMonthlyInstallments("c1")');
  const card = state.cards[0];
  const active = card.installments.find(i => i.desc === 'Active');
  const next = card.installments.find(i => i.desc === 'Next');
  assert.strictEqual(active.paidCount, 1, 'active plan should advance');
  assert.strictEqual(next.paidCount, 0, 'next-cycle plan must not be paid early');
  assert.strictEqual(card.usedBalance, 900, 'only the active plan amount should be deducted');
});

test('single loan installment cannot exceed the total installment count', () => {
  const harness = createHarness();
  const state = harness.getState();
  state.loans = [{ id: 'l1', title: 'Loan', totalInstallments: 2, paidInstallments: 2, monthlyPayment: 500 }];
  harness.evalInContext('paySingleLoanInstallment("l1")');
  assert.strictEqual(state.loans[0].paidInstallments, 2, 'paid count must be capped at total');
});

test('payment-flow chart does not treat an already-paid amount as future outflow', () => {
  const harness = createHarness();
  const state = harness.getState();
  state.cards = [{ id: 'c1', nickname: 'Paid card', usedBalance: 0, paidThisMonthAmount: 5000, dateMethod: 'exact', dueDay: 15 }];
  state.loans = [];
  state.cashSubscriptions = [];
  harness.evalInContext('renderPaymentFlowChart()');
  const html = harness.sandbox.document.getElementById('paymentFlowCanvas').innerHTML;
  assert.ok(!html.includes('5.000'), 'paid amount must not appear as a future outflow');
});

test('smart insights include cash subscriptions, not only card subscriptions', () => {
  const harness = createHarness();
  const state = harness.getState();
  state.cards = [{ id: 'c1', nickname: 'Card', limit: 10000, usedBalance: 1000, subscriptions: [] }];
  state.cashSubscriptions = [{ id: 's1', name: 'Cash sub', amount: 777, cycle: 'monthly' }];
  harness.evalInContext('renderSmartInsights(10, 1000, 10000, 0, 100)');
  const html = harness.sandbox.document.getElementById('smartInsightsContainer').innerHTML;
  assert.ok(html.includes('777'), 'cash subscriptions must appear in the recurring-charges insight');
});

test('opening another file asks before discarding unsaved changes', async () => {
  const harness = createHarness();
  harness.sandbox.confirm = () => false;
  const state = harness.getState();
  state.banks = [{ id: 'keep', name: 'Keep Bank' }];
  const fsState = harness.evalInContext('fileSystemState');
  fsState.isDirty = true;
  const content = JSON.stringify({
    fileType: 'cardmon_portfolio', version: '3.0',
    data: { banks: [{ id: 'new', name: 'New Bank' }], cards: [], loans: [], cashSubscriptions: [], profile: {} }
  });
  harness.sandbox.window.showSaveFilePicker = async () => {};
  harness.sandbox.window.showOpenFilePicker = async () => [{
    name: 'loaded.cardmon',
    getFile: async () => ({ text: async () => content })
  }];
  const result = await harness.evalInContext('openPortfolioFile()');
  assert.strictEqual(result, false, 'open must be cancelled when discard is refused');
  assert.strictEqual(state.banks[0].name, 'Keep Bank', 'existing state must be preserved');
});
