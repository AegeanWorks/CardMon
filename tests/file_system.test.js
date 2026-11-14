'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('./harness');

test('serializePortfolio encodes state into v3 cardmon_portfolio envelope', () => {
  const harness = createHarness();
  const mockState = {
    banks: [{ id: 'b1', name: 'Garanti BBVA', color: '#008542' }],
    cards: [{ id: 'c1', bankId: 'b1', name: 'Miles&Smiles', limit: 100000, usedBalance: 25000 }],
    loans: [],
    cashSubscriptions: [],
    profile: { firstName: 'Yunus', lastName: 'Emre' }
  };

  const serialized = harness.evalInContext('serializePortfolio')(mockState);
  assert.ok(typeof serialized === 'string', 'Serialized output must be a string');

  const parsed = JSON.parse(serialized);
  assert.strictEqual(parsed.fileType, 'cardmon_portfolio');
  assert.strictEqual(parsed.version, '3.0');
  assert.strictEqual(parsed.app, 'CardMon');
  assert.ok(parsed.savedAt, 'Must include savedAt timestamp');
  assert.strictEqual(parsed.data.banks.length, 1);
  assert.strictEqual(parsed.data.banks[0].name, 'Garanti BBVA');
  assert.strictEqual(parsed.data.cards.length, 1);
  assert.strictEqual(parsed.data.cards[0].limit, 100000);
});

test('validatePortfolioData accepts valid v3.0 portfolio envelopes', () => {
  const harness = createHarness();
  const validate = harness.evalInContext('validatePortfolioData');

  const envelope = {
    fileType: 'cardmon_portfolio',
    version: '3.0',
    savedAt: '2026-11-14T20:00:00.000Z',
    data: {
      banks: [{ id: 'b1', name: 'Yapı Kredi' }],
      cards: [{ id: 'c1', name: 'World Card', limit: 50000 }],
      loans: [],
      cashSubscriptions: [],
      profile: { firstName: 'Test' }
    }
  };

  const res = validate(envelope);
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.version, '3.0');
  assert.strictEqual(res.data.banks.length, 1);
  assert.strictEqual(res.data.cards.length, 1);
});

test('validatePortfolioData accepts and upgrades legacy portfolio format', () => {
  const harness = createHarness();
  const validate = harness.evalInContext('validatePortfolioData');

  const legacy = {
    banks: [{ id: 'b1', name: 'İş Bankası' }],
    cards: [{ id: 'c1', name: 'Maximum', limit: 75000 }],
    loans: [{ id: 'l1', name: 'Konut', amount: 500000 }]
  };

  const res = validate(legacy);
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.data.banks[0].name, 'İş Bankası');
  assert.strictEqual(res.data.cards[0].limit, 75000);
  assert.strictEqual(res.data.loans.length, 1);
  assert.ok(Array.isArray(res.data.cashSubscriptions));
});

test('validatePortfolioData rejects null or corrupt payloads', () => {
  const harness = createHarness();
  const validate = harness.evalInContext('validatePortfolioData');

  assert.strictEqual(validate(null).valid, false);
  assert.strictEqual(validate(undefined).valid, false);
  assert.strictEqual(validate('string payload').valid, false);
  assert.strictEqual(validate({ random: 'data' }).valid, false);
  assert.strictEqual(validate({ fileType: 'cardmon_portfolio', data: { banks: 'not-array' } }).valid, false);
});

test('fileSystemState and dirty tracking marks file as dirty on state change', () => {
  const harness = createHarness();
  const fsState = harness.evalInContext('fileSystemState');
  const markDirty = harness.evalInContext('markFileSystemDirty');

  assert.strictEqual(fsState.isDirty, false);

  // If no active file, dirty flag is kept clean
  markDirty();
  assert.strictEqual(fsState.isDirty, false);

  // Set active file and mark dirty
  fsState.activeFileName = 'my_portfolio.cardmon';
  markDirty();
  assert.strictEqual(fsState.isDirty, true);
});

test('isFileSystemAccessSupported checks window method existence gracefully', () => {
  const harness = createHarness();
  const isSupported = harness.evalInContext('isFileSystemAccessSupported')();
  assert.strictEqual(typeof isSupported, 'boolean');
});

test('applyPortfolioData updates runtime state and calls saveToStorage', () => {
  const harness = createHarness();
  const applyData = harness.evalInContext('applyPortfolioData');
  const state = harness.evalInContext('state');

  const incoming = {
    banks: [{ id: 'b99', name: 'QNB Finansbank' }],
    cards: [{ id: 'c99', bankId: 'b99', name: 'CardFinans', limit: 120000 }],
    loans: [{ id: 'l99', name: 'İhtiyaç', totalAmount: 30000 }],
    cashSubscriptions: [],
    profile: { firstName: 'Ali', lastName: 'Veli' }
  };

  applyData(incoming);

  assert.strictEqual(state.banks.length, 1);
  assert.strictEqual(state.banks[0].name, 'QNB Finansbank');
  assert.strictEqual(state.cards.length, 1);
  assert.strictEqual(state.cards[0].limit, 120000);
  assert.strictEqual(state.loans.length, 1);
  assert.strictEqual(state.profile.firstName, 'Ali');
});
