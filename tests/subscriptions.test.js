'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('./harness');

test('getAllSubscriptions aggregates card subscriptions and cash subscriptions', () => {
  const harness = createHarness();
  const state = harness.evalInContext('state');
  const getAllSubs = harness.evalInContext('getAllSubscriptions');

  state.banks = [
    { id: 'b-1', name: 'Garanti', color: '#008542' }
  ];

  state.cards = [
    {
      id: 'c-1',
      bankId: 'b-1',
      nickname: 'Bonus',
      last4: '1234',
      isFrozen: false,
      subscriptions: [
        { id: 'sub-c1', name: 'Spotify', amount: 99, cycle: 'monthly' },
        { id: 'sub-c2', name: 'Netflix', amount: 229, cycle: 'monthly' }
      ]
    }
  ];

  state.cashSubscriptions = [
    { id: 'sub-cash1', name: 'Ev Kirası', amount: 25000, paymentType: 'bank_transfer', cycle: 'monthly' },
    { id: 'sub-cash2', name: 'Bina Aidatı', amount: 1200, paymentType: 'cash', cycle: 'monthly' }
  ];

  const allSubs = getAllSubs();

  assert.strictEqual(allSubs.length, 4);

  const cardSubs = allSubs.filter(s => s.paymentType === 'card');
  assert.strictEqual(cardSubs.length, 2);
  assert.strictEqual(cardSubs[0].cardNickname, 'Bonus');
  assert.strictEqual(cardSubs[0].cardLast4, '1234');

  const cashSubs = allSubs.filter(s => s.paymentType === 'cash' || s.paymentType === 'bank_transfer');
  assert.strictEqual(cashSubs.length, 2);
  assert.strictEqual(cashSubs[0].name, 'Ev Kirası');
});

test('confirmDeleteSubscription removes card-tied subscription when confirmed', () => {
  const harness = createHarness();
  const state = harness.evalInContext('state');
  harness.sandbox.confirm = () => true;

  state.cards = [
    {
      id: 'c-1',
      subscriptions: [
        { id: 'sub-del', name: 'Adobe CC' },
        { id: 'sub-keep', name: 'GitHub Copilot' }
      ]
    }
  ];

  harness.evalInContext('confirmDeleteSubscription')('c-1', 'sub-del');

  assert.strictEqual(state.cards[0].subscriptions.length, 1);
  assert.strictEqual(state.cards[0].subscriptions[0].id, 'sub-keep');
});

test('confirmDeleteSubscription removes cash subscription when confirmed', () => {
  const harness = createHarness();
  const state = harness.evalInContext('state');
  harness.sandbox.confirm = () => true;

  state.cashSubscriptions = [
    { id: 'sub-cash-del', name: 'Otopark Ücreti' },
    { id: 'sub-cash-keep', name: 'Kira' }
  ];

  harness.evalInContext('confirmDeleteSubscription')('cash', 'sub-cash-del');

  assert.strictEqual(state.cashSubscriptions.length, 1);
  assert.strictEqual(state.cashSubscriptions[0].id, 'sub-cash-keep');
});
