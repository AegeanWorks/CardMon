'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('./harness');

test('autoCalculateMonthlyLoanPayment divides total amount by months', () => {
  const harness = createHarness();
  const document = harness.sandbox.document;

  const totalInput = document.getElementById('loanTotalAmountInput');
  const monthsInput = document.getElementById('loanTotalMonthsInput');
  const monthlyInput = document.getElementById('loanMonthlyPaymentInput');

  totalInput.value = '120000';
  monthsInput.value = '12';

  harness.evalInContext('autoCalculateMonthlyLoanPayment')();

  assert.strictEqual(monthlyInput.value, 10000);
});

test('paySingleLoanInstallment increments paidInstallments count and persists', () => {
  const harness = createHarness();
  const state = harness.evalInContext('state');
  const payLoan = harness.evalInContext('paySingleLoanInstallment');

  state.loans = [
    {
      id: 'l-test',
      title: 'İhtiyaç Kredisi',
      totalAmount: 50000,
      totalInstallments: 12,
      paidInstallments: 3,
      monthlyPayment: 5200
    }
  ];

  payLoan('l-test');

  assert.strictEqual(state.loans[0].paidInstallments, 4);
});

test('paySingleLoanInstallment completes loan when all installments are paid', () => {
  const harness = createHarness();
  const state = harness.evalInContext('state');
  const payLoan = harness.evalInContext('paySingleLoanInstallment');

  state.loans = [
    {
      id: 'l-test-2',
      title: 'Eşya Finansmanı',
      totalAmount: 10000,
      totalInstallments: 5,
      paidInstallments: 4,
      monthlyPayment: 2000
    }
  ];

  payLoan('l-test-2');

  assert.strictEqual(state.loans[0].paidInstallments, 5);
  assert.ok(state.loans[0].paidInstallments >= state.loans[0].totalInstallments);
});

test('confirmDeleteLoan removes loan from state when confirmed', () => {
  const harness = createHarness();
  const state = harness.evalInContext('state');
  harness.sandbox.confirm = () => true;

  state.loans = [
    { id: 'l-1', title: 'Loan 1' },
    { id: 'l-2', title: 'Loan 2' }
  ];

  harness.evalInContext('confirmDeleteLoan')('l-1');

  assert.strictEqual(state.loans.length, 1);
  assert.strictEqual(state.loans[0].id, 'l-2');
});
