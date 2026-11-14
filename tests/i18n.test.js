'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('./harness');

test('I18N dictionary has valid Turkish and English keys', () => {
  const h = createHarness();
  assert.ok(h.I18N, 'I18N object should exist');
  assert.ok(h.I18N.tr, 'I18N.tr should exist');
  assert.ok(h.I18N.en, 'I18N.en should exist');
  
  assert.equal(typeof h.I18N.tr.appTitle, 'string');
  assert.equal(typeof h.I18N.en.appTitle, 'string');
  assert.equal(h.I18N.tr.appTitle, 'CardMon');
  assert.equal(h.I18N.en.appTitle, 'CardMon');
});

test('t() returns translation with key fallback', () => {
  const h = createHarness();
  h.setLanguage('tr');
  assert.equal(h.t('save'), 'Kaydet');
  assert.equal(h.t('cancel'), 'İptal');
  
  h.setLanguage('en');
  assert.equal(h.t('save'), 'Save');
  assert.equal(h.t('cancel'), 'Cancel');

  // Fallback for non-existent key
  assert.equal(h.t('non_existent_key_xyz_123'), 'non_existent_key_xyz_123');
});

test('formatMoney formats amounts with currency symbol according to language', () => {
  const h = createHarness();
  h.setLanguage('tr');
  const tryTr = h.formatMoney(1250.75, 'TRY');
  assert.ok(tryTr.includes('₺'), 'Turkish format should include ₺');
  assert.ok(tryTr.includes('1.250,75'), 'Turkish number format uses comma decimal');

  h.setLanguage('en');
  const tryEn = h.formatMoney(1250.75, 'TRY');
  assert.ok(tryEn.includes('₺'), 'English format should include ₺');
  assert.ok(tryEn.includes('1,250.75'), 'English number format uses dot decimal');

  const usdEn = h.formatMoney(500, 'USD');
  assert.ok(usdEn.includes('$'), 'USD should have $');
});

test('setLanguage updates documentElement and localStorage', () => {
  const h = createHarness();
  h.setLanguage('en');
  assert.equal(h.storage.getItem('bank_app_lang'), 'en');
  assert.equal(h.sandbox.document.documentElement.lang, 'en');

  h.setLanguage('tr');
  assert.equal(h.storage.getItem('bank_app_lang'), 'tr');
  assert.equal(h.sandbox.document.documentElement.lang, 'tr');
});
