'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT_DIR = path.join(__dirname, '..');
const SCRIPT_FILES = [
  path.join(ROOT_DIR, 'i18n.js'),
  path.join(ROOT_DIR, 'js', 'constants.js'),
  path.join(ROOT_DIR, 'js', 'utils.js'),
  path.join(ROOT_DIR, 'js', 'file-system.js'),
  path.join(ROOT_DIR, 'js', 'state.js'),
  path.join(ROOT_DIR, 'js', 'smart-advisor.js'),
  path.join(ROOT_DIR, 'js', 'backup-vault.js'),
  path.join(ROOT_DIR, 'js', 'views.js'),
  path.join(ROOT_DIR, 'js', 'modals.js'),
  path.join(ROOT_DIR, 'js', 'reports.js'),
  path.join(ROOT_DIR, 'js', 'main.js')
];

function createHarness(options = {}) {
  const storeMap = new Map();
  const storage = options.storage || {
    getItem(k) { return storeMap.has(k) ? storeMap.get(k) : null; },
    setItem(k, v) { storeMap.set(k, String(v)); },
    removeItem(k) { storeMap.delete(k); },
    clear() { storeMap.clear(); }
  };

  const makeElement = (tag = 'div', id = '') => {
    const attrs = new Map();
    const children = [];
    const el = {
      tagName: tag.toUpperCase(),
      id,
      style: {},
      parentNode: null,
      classList: {
        add() {},
        remove() {},
        toggle() {},
        contains: () => false
      },
      attributes: attrs,
      getAttribute: (k) => attrs.get(k) || null,
      setAttribute: (k, v) => attrs.set(k, String(v)),
      removeAttribute: (k) => attrs.delete(k),
      addEventListener() {},
      removeEventListener() {},
      appendChild(child) {
        child.parentNode = el;
        children.push(child);
        return child;
      },
      removeChild(child) {
        const idx = children.indexOf(child);
        if (idx >= 0) children.splice(idx, 1);
        child.parentNode = null;
        return child;
      },
      remove() {
        if (el.parentNode) {
          el.parentNode.removeChild(el);
        }
      },
      querySelectorAll: () => [],
      querySelector: () => null,
      innerHTML: '',
      textContent: '',
      value: '',
      hidden: false
    };
    return el;
  };

  const elementsById = new Map();

  const timers = new Set();
  const mockSetTimeout = (fn, ms) => {
    const id = setTimeout(fn, 0);
    timers.add(id);
    return id;
  };
  const mockClearTimeout = (id) => {
    timers.delete(id);
    clearTimeout(id);
  };

  const bodyEl = makeElement('body');

  const sandbox = {
    document: {
      documentElement: { lang: 'tr' },
      getElementById: (id) => {
        if (!elementsById.has(id)) {
          elementsById.set(id, makeElement('div', id));
        }
        return elementsById.get(id);
      },
      querySelector: (selector) => makeElement('div', selector),
      querySelectorAll: () => [],
      createElement: (tag) => makeElement(tag),
      addEventListener() {},
      removeEventListener() {},
      body: bodyEl
    },
    window: {
      location: { href: 'http://localhost/', search: '' },
      addEventListener() {},
      removeEventListener() {},
      setTimeout: mockSetTimeout,
      clearTimeout: mockClearTimeout,
      setInterval: () => 0,
      clearInterval: () => {},
      localStorage: storage,
      alert() {},
      confirm: () => true
    },
    localStorage: storage,
    setTimeout: mockSetTimeout,
    clearTimeout: mockClearTimeout,
    alert() {},
    confirm: () => true,
    console,
    Date,
    Math,
    JSON,
    Number,
    String,
    Boolean,
    Array,
    Object,
    RegExp,
    Intl,
    parseFloat,
    parseInt,
    isNaN,
    isFinite,
    fetch: async () => ({
      ok: true,
      json: async () => ({ rates: { TRY: 34.20, EUR: 0.92, GBP: 0.78 } })
    })
  };

  vm.createContext(sandbox);

  for (const file of SCRIPT_FILES) {
    const code = fs.readFileSync(file, 'utf8');
    vm.runInContext(code, sandbox);
  }

  const evalInContext = (expr) => vm.runInContext(expr, sandbox);

  return {
    sandbox,
    storage,
    evalInContext,
    I18N: evalInContext('I18N'),
    getCurrentLang: () => evalInContext('currentLang'),
    getCurrentCurrency: () => evalInContext('currentCurrency'),
    setLanguage: evalInContext('setLanguage'),
    t: evalInContext('t'),
    setCurrency: evalInContext('setCurrency'),
    formatMoney: evalInContext('formatMoney'),
    updatePageTranslations: evalInContext('updatePageTranslations'),
    PRESET_BANKS: evalInContext('PRESET_BANKS'),
    exchangeRates: evalInContext('exchangeRates'),
    convertToTry: evalInContext('convertToTry'),
    getState: () => evalInContext('state'),
    STORAGE_KEY: evalInContext('STORAGE_KEY'),
    saveToStorage: evalInContext('saveToStorage'),
    loadFromStorage: evalInContext('loadFromStorage'),
    loadDemoData: evalInContext('loadDemoData'),
    calculateCardDeferralDays: evalInContext('calculateCardDeferralDays'),
    checkAndAutoSettlePastDue: evalInContext('checkAndAutoSettlePastDue'),
    payCardFullDebt: evalInContext('payCardFullDebt'),
    activateNextCycleInstallment: evalInContext('activateNextCycleInstallment')
  };
}

module.exports = { createHarness };
