'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('./harness');

test('createBackupSnapshot records snapshot with stats and state data into vault', () => {
  const harness = createHarness();
  const state = harness.evalInContext('state');
  const createSnapshot = harness.evalInContext('createBackupSnapshot');
  const getVault = harness.evalInContext('getBackupVault');

  state.banks = [{ id: 'b-1', name: 'Ziraat Bankası' }];
  state.cards = [{ id: 'c-1', bankId: 'b-1', nickname: 'Bankkart', limit: 20000, usedBalance: 4000 }];
  state.loans = [];
  state.cashSubscriptions = [];
  state.profile = { firstName: 'Ali' };

  const snap = createSnapshot('manual');

  assert.ok(snap.id.startsWith('snap-'));
  assert.strictEqual(snap.type, 'manual');
  assert.strictEqual(snap.stats.bankCount, 1);
  assert.strictEqual(snap.stats.cardCount, 1);
  assert.strictEqual(snap.stats.totalDebt, 4000);

  const vault = getVault();
  assert.strictEqual(vault.length, 1);
  assert.strictEqual(vault[0].id, snap.id);
});

test('saveBackupVault enforces maximum capacity limit of 15 snapshots', () => {
  const harness = createHarness();
  const saveVault = harness.evalInContext('saveBackupVault');
  const getVault = harness.evalInContext('getBackupVault');

  const dummyVault = [];
  for (let i = 0; i < 25; i++) {
    dummyVault.push({ id: `snap-${i}`, timestamp: Date.now() + i });
  }

  saveVault(dummyVault);

  const saved = getVault();
  assert.strictEqual(saved.length, 15);
  assert.strictEqual(saved[0].id, 'snap-0');
});

test('restoreBackupSnapshot restores full portfolio state from snapshot', () => {
  const harness = createHarness();
  const state = harness.evalInContext('state');
  const saveVault = harness.evalInContext('saveBackupVault');
  const restoreSnap = harness.evalInContext('restoreBackupSnapshot');
  harness.sandbox.confirm = () => true;

  const mockSnapshot = {
    id: 'snap-target',
    dateStr: '14 Kasım 2026',
    data: {
      banks: [{ id: 'b-restored', name: 'Akbank' }],
      cards: [{ id: 'c-restored', nickname: 'Axess', limit: 80000 }],
      loans: [{ id: 'l-restored', title: 'Konut', monthlyPayment: 8500 }],
      cashSubscriptions: [],
      profile: { firstName: 'Mehmet' }
    }
  };

  saveVault([mockSnapshot]);

  // Mutate current state
  state.banks = [];
  state.cards = [];
  state.profile = { firstName: 'Temporary' };

  restoreSnap('snap-target');

  assert.strictEqual(state.banks.length, 1);
  assert.strictEqual(state.banks[0].name, 'Akbank');
  assert.strictEqual(state.cards.length, 1);
  assert.strictEqual(state.cards[0].nickname, 'Axess');
  assert.strictEqual(state.profile.firstName, 'Mehmet');
});

test('deleteBackupSnapshot removes target snapshot from vault when confirmed', () => {
  const harness = createHarness();
  const saveVault = harness.evalInContext('saveBackupVault');
  const getVault = harness.evalInContext('getBackupVault');
  const deleteSnap = harness.evalInContext('deleteBackupSnapshot');
  harness.sandbox.confirm = () => true;

  saveVault([
    { id: 'snap-1', dateStr: 'D1' },
    { id: 'snap-2', dateStr: 'D2' }
  ]);

  deleteSnap('snap-1');

  const remaining = getVault();
  assert.strictEqual(remaining.length, 1);
  assert.strictEqual(remaining[0].id, 'snap-2');
});
