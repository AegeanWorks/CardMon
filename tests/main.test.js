'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('./harness');

test('initEventListeners wires up tab navigation, search input, switches and forms', () => {
  const h = createHarness();
  const listenersMap = new Map();

  const registerMock = (el, eventName, handler) => {
    const key = `${el.id || el.className || 'elem'}:${eventName}`;
    listenersMap.set(key, handler);
  };

  // Mock tab button
  const tabBtn = {
    getAttribute: (k) => k === 'data-tab' ? 'loans' : null,
    addEventListener: (evt, fn) => registerMock({ id: 'btnTabLoans' }, evt, fn)
  };

  // Mock theme swatch
  const swatch = {
    getAttribute: (k) => k === 'data-theme' ? 'theme-emerald' : null,
    classList: { add: () => {}, remove: () => {} },
    addEventListener: (evt, fn) => registerMock({ id: 'swatchEmerald' }, evt, fn)
  };

  h.sandbox.document.querySelectorAll = (sel) => {
    if (sel === '.tab-btn') return [tabBtn];
    if (sel === '.theme-swatch') return [swatch];
    return [];
  };

  // Mock elements with event listeners
  const searchInput = h.sandbox.document.getElementById('cardSearchInput');
  const langSelect = h.sandbox.document.getElementById('langSelect');
  const currSelect = h.sandbox.document.getElementById('currencySelect');
  const presetSelect = h.sandbox.document.getElementById('presetBankSelect');
  const cardForm = h.sandbox.document.getElementById('cardForm');
  const bankForm = h.sandbox.document.getElementById('bankForm');
  const profileForm = h.sandbox.document.getElementById('profileForm');
  const quickTxForm = h.sandbox.document.getElementById('quickTxForm');
  const virtualCardForm = h.sandbox.document.getElementById('virtualCardForm');
  const subscriptionForm = h.sandbox.document.getElementById('subscriptionForm');
  const loanForm = h.sandbox.document.getElementById('loanForm');

  [searchInput, langSelect, currSelect, presetSelect, cardForm, bankForm, profileForm, quickTxForm, virtualCardForm, subscriptionForm, loanForm].forEach(el => {
    el.addEventListener = (evt, fn) => registerMock(el, evt, fn);
  });

  // Call initEventListeners
  assert.doesNotThrow(() => {
    h.initEventListeners();
  });

  // 1. Tab button click
  const tabHandler = listenersMap.get('btnTabLoans:click');
  assert.ok(typeof tabHandler === 'function');
  tabHandler();
  assert.strictEqual(h.getState().activeTab, 'loans');

  // 2. Search input event
  const searchHandler = listenersMap.get('cardSearchInput:input');
  assert.ok(typeof searchHandler === 'function');
  searchHandler({ target: { value: 'Garanti' } });
  assert.strictEqual(h.getState().searchTerm, 'Garanti');

  // 3. Language switch change event
  const langHandler = listenersMap.get('langSelect:change');
  assert.ok(typeof langHandler === 'function');
  langHandler({ target: { value: 'en' } });
  assert.strictEqual(h.getCurrentLang(), 'en');

  // 4. Currency switch change event
  const currHandler = listenersMap.get('currencySelect:change');
  assert.ok(typeof currHandler === 'function');
  currHandler({ target: { value: 'USD' } });
  assert.strictEqual(h.getCurrentCurrency(), 'USD');

  // 5. Preset bank selection change
  const presetHandler = listenersMap.get('presetBankSelect:change');
  assert.ok(typeof presetHandler === 'function');
  presetHandler({ target: { value: 'isbank' } });
  assert.strictEqual(h.sandbox.document.getElementById('bankNameInput').value, 'Türkiye İş Bankası');

  // 6. Theme swatch click
  const swatchHandler = listenersMap.get('swatchEmerald:click');
  assert.ok(typeof swatchHandler === 'function');
  swatchHandler();
  assert.strictEqual(h.getState().selectedTheme, 'theme-emerald');

  // 7. Verify all forms registered submit handler
  assert.ok(typeof listenersMap.get('cardForm:submit') === 'function');
  assert.ok(typeof listenersMap.get('bankForm:submit') === 'function');
  assert.ok(typeof listenersMap.get('profileForm:submit') === 'function');
  assert.ok(typeof listenersMap.get('quickTxForm:submit') === 'function');
  assert.ok(typeof listenersMap.get('virtualCardForm:submit') === 'function');
  assert.ok(typeof listenersMap.get('subscriptionForm:submit') === 'function');
  assert.ok(typeof listenersMap.get('loanForm:submit') === 'function');
});

test('keyboard shortcuts modal lifecycle: open, toggle, close', () => {
  const h = createHarness();
  const overlay = h.sandbox.document.getElementById('shortcutsModalOverlay');

  assert.strictEqual(overlay.classList.contains('active'), false);
  h.sandbox.window.openShortcutsModal();
  assert.strictEqual(overlay.classList.contains('active'), true);

  h.sandbox.window.toggleShortcutsModal();
  assert.strictEqual(overlay.classList.contains('active'), false);

  h.sandbox.window.toggleShortcutsModal();
  assert.strictEqual(overlay.classList.contains('active'), true);

  h.sandbox.window.closeShortcutsModal();
  assert.strictEqual(overlay.classList.contains('active'), false);
});

test('global keyboard shortcuts: escape closes modal, numbers switch tabs, question mark toggles shortcuts', () => {
  const h = createHarness();
  let keydownHandler = null;
  h.sandbox.window.addEventListener = (evt, fn) => {
    if (evt === 'keydown') keydownHandler = fn;
  };

  const overlay1 = h.sandbox.document.getElementById('cardModalOverlay');
  overlay1.classList.add('modal-overlay');
  const overlay2 = h.sandbox.document.getElementById('shortcutsModalOverlay');
  overlay2.classList.add('modal-overlay');

  h.initEventListeners();
  assert.ok(typeof keydownHandler === 'function', 'window keydown handler must be bound');

  // Test 1: Escape closes active overlays
  h.sandbox.document.querySelectorAll = (sel) => {
    if (sel === '.modal-overlay.active') return [overlay1, overlay2];
    return [];
  };
  overlay1.classList.add('active');
  overlay2.classList.add('active');
  keydownHandler({ key: 'Escape' });
  assert.strictEqual(overlay1.classList.contains('active'), false);
  assert.strictEqual(overlay2.classList.contains('active'), false);

  // Test 2: Number keys 1-6 switch active tabs
  keydownHandler({ key: '3', preventDefault: () => {} });
  assert.strictEqual(h.getState().activeTab, 'banks');

  keydownHandler({ key: '5', preventDefault: () => {} });
  assert.strictEqual(h.getState().activeTab, 'subscriptions');

  // Test 3: '?' toggles shortcuts modal
  assert.strictEqual(overlay2.classList.contains('active'), false);
  keydownHandler({ key: '?', preventDefault: () => {} });
  assert.strictEqual(overlay2.classList.contains('active'), true);
  keydownHandler({ key: '?', preventDefault: () => {} });
  assert.strictEqual(overlay2.classList.contains('active'), false);

  // Test 4: Modal overlay backdrop click closes overlay
  let overlayClickHandler = null;
  const testOverlay = {
    classList: {
      _classes: new Set(['active']),
      remove(c) { this._classes.delete(c); },
      contains(c) { return this._classes.has(c); }
    },
    addEventListener: (evt, fn) => {
      if (evt === 'click') overlayClickHandler = fn;
    }
  };
  h.sandbox.document.querySelectorAll = (sel) => {
    if (sel === '.modal-overlay') return [testOverlay];
    return [];
  };
  h.initEventListeners();
  assert.ok(typeof overlayClickHandler === 'function');
  overlayClickHandler({ target: testOverlay });
  assert.strictEqual(testOverlay.classList.contains('active'), false);
});

