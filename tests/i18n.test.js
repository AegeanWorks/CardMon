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

test('setCurrency updates currentCurrency and persists to storage', () => {
  const h = createHarness();
  h.setCurrency('USD');
  assert.equal(h.getCurrentCurrency(), 'USD');
  assert.equal(h.storage.getItem('bank_app_currency'), 'USD');

  h.setCurrency('EUR');
  assert.equal(h.getCurrentCurrency(), 'EUR');
  assert.equal(h.storage.getItem('bank_app_currency'), 'EUR');
});

test('updatePageTranslations applies translations to data-i18n elements and placeholders', () => {
  const h = createHarness();
  const elText = {
    getAttribute: (k) => k === 'data-i18n' ? 'save' : null,
    textContent: ''
  };
  const elInput = {
    getAttribute: (k) => k === 'data-i18n-placeholder' ? 'cancel' : null,
    placeholder: ''
  };
  const elTitle = {
    getAttribute: (k) => k === 'data-i18n-title' ? 'editCard' : null,
    title: ''
  };

  h.sandbox.document.querySelectorAll = (selector) => {
    if (selector === '[data-i18n]') return [elText];
    if (selector === '[data-i18n-placeholder]') return [elInput];
    if (selector === '[data-i18n-title]') return [elTitle];
    return [];
  };

  h.setLanguage('tr');
  h.updatePageTranslations();
  assert.equal(elText.textContent, 'Kaydet');
  assert.equal(elInput.placeholder, 'İptal');
  assert.equal(elTitle.title, 'Kartı Düzenle');

  h.setLanguage('en');
  h.updatePageTranslations();
  assert.equal(elText.textContent, 'Save');
  assert.equal(elInput.placeholder, 'Cancel');
  assert.equal(elTitle.title, 'Edit Card');
});

