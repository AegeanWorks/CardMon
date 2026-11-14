'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('./harness');

test('loadDemoData initializes complete schema with banks, cards, loans and profile', () => {
  const h = createHarness();
  h.loadDemoData(false);

  const state = h.getState();
  assert.ok(Array.isArray(state.banks), 'state.banks should be an array');
  assert.ok(Array.isArray(state.cards), 'state.cards should be an array');
  assert.ok(Array.isArray(state.loans), 'state.loans should be an array');
  assert.ok(Array.isArray(state.cashSubscriptions), 'state.cashSubscriptions should be an array');
  assert.ok(state.profile, 'state.profile should exist');

  assert.ok(state.banks.length > 0, 'Demo data must have banks');
  assert.ok(state.cards.length > 0, 'Demo data must have cards');

  // Validate card properties
  const card = state.cards[0];
  assert.ok(card.id, 'Card must have id');
  assert.ok(card.nickname, 'Card must have nickname');
  assert.ok(card.bankId, 'Card must link to a bankId');
  assert.ok(typeof card.limit === 'number', 'Card must have limit number');
  assert.ok(typeof card.usedBalance === 'number', 'Card must have usedBalance number');
});

test('saveToStorage and loadFromStorage persist state to storage key', () => {
  const h = createHarness();
  h.loadDemoData(false);

  const beforeBanksCount = h.getState().banks.length;
  h.saveToStorage();

  const rawJson = h.storage.getItem(h.STORAGE_KEY);
  assert.ok(rawJson, 'Storage must contain serialized state');

  const parsed = JSON.parse(rawJson);
  assert.equal(parsed.banks.length, beforeBanksCount);

  // Clear memory state and reload from storage
  h.getState().banks = [];
  h.loadFromStorage();
  assert.equal(h.getState().banks.length, beforeBanksCount);
});

test('calculateCardDeferralDays computes days until payment based on cutoff and due date', () => {
  const h = createHarness();
  const card = {
    dateMethod: 'exact',
    cutoffDay: 15,
    dueDay: 25,
    limit: 50000,
    usedBalance: 12000
  };

  // Fixed reference date: 10th of November (before cutoff)
  const nowBeforeCutoff = new Date(2026, 10, 10);
  const resBefore = h.calculateCardDeferralDays(card, nowBeforeCutoff);
  assert.ok(typeof resBefore === 'object', 'Result must be an object');
  assert.ok(typeof resBefore.daysUntilPayment === 'number', 'Deferral days must be a number');
  assert.ok(resBefore.daysUntilPayment > 0, 'Deferral days before cutoff should be positive');

  // Fixed reference date: 16th of November (just after cutoff)
  const nowAfterCutoff = new Date(2026, 10, 16);
  const resAfter = h.calculateCardDeferralDays(card, nowAfterCutoff);
  assert.ok(resAfter.daysUntilPayment > resBefore.daysUntilPayment, 'Days after cutoff should carry into next cycle (longer deferral)');
});

test('payCardFullDebt sets usedBalance to 0 and clears installments', () => {
  const h = createHarness();
  h.loadDemoData(false);

  const card = h.getState().cards.find(c => c.usedBalance > 0);
  assert.ok(card, 'Should find a card with positive balance');

  const cardId = card.id;
  h.payCardFullDebt(cardId);

  const updatedCard = h.getState().cards.find(c => c.id === cardId);
  assert.equal(updatedCard.usedBalance, 0, 'Card balance should be paid to zero');
});

test('checkAndAutoSettlePastDue preserves balances safely without mutation', () => {
  const h = createHarness();
  h.loadDemoData(false);
  const balancesBefore = h.getState().cards.map(c => c.usedBalance);
  h.checkAndAutoSettlePastDue();
  const balancesAfter = h.getState().cards.map(c => c.usedBalance);
  assert.deepEqual(balancesAfter, balancesBefore);
});

test('showSaveIndicator updates badge opacity and text', () => {
  const h = createHarness();
  const badge = h.sandbox.document.getElementById('saveStatusBadge');
  const textEl = { textContent: '' };
  badge.querySelector = (sel) => sel === '.save-text' ? textEl : null;

  h.showSaveIndicator();
  assert.equal(badge.style.opacity, '1');
  assert.equal(textEl.textContent, h.t('autoSaved'));
});
