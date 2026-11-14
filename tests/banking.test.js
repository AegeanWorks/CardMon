'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('./harness');

test('PRESET_BANKS contains all standard Turkish retail banks with valid keys', () => {
  const h = createHarness();
  assert.ok(Array.isArray(h.PRESET_BANKS), 'PRESET_BANKS should be an array');
  assert.ok(h.PRESET_BANKS.length >= 20, 'Should have at least 20 preset banks');

  const keys = new Set();
  for (const bank of h.PRESET_BANKS) {
    assert.ok(bank.key, 'Bank must have a key');
    assert.ok(bank.name, 'Bank must have a name');
    assert.ok(bank.color, 'Bank must have a brand color');
    assert.ok(bank.badge, 'Bank must have a badge abbreviation');
    assert.ok(!keys.has(bank.key), `Duplicate bank key: ${bank.key}`);
    keys.add(bank.key);
  }

  assert.ok(keys.has('garanti'), 'Garanti should exist');
  assert.ok(keys.has('isbank'), 'Isbank should exist');
  assert.ok(keys.has('yapikredi'), 'Yapikredi should exist');
  assert.ok(keys.has('akbank'), 'Akbank should exist');
  assert.ok(keys.has('qnb'), 'QNB should exist');
  assert.ok(keys.has('ziraat'), 'Ziraat should exist');
});

test('convertToTry converts foreign currencies based on exchange rates', () => {
  const h = createHarness();
  assert.equal(h.convertToTry(100, 'TRY'), 100);
  assert.equal(h.convertToTry(0, 'TRY'), 0);

  // Default USD rate = 34.20
  const usdRate = h.exchangeRates.USD || 34.20;
  assert.equal(h.convertToTry(10, 'USD'), 10 * usdRate);

  // Unknown currency falls back to rate 1
  assert.equal(h.convertToTry(50, 'UNKNOWN_CURR'), 50);
});
