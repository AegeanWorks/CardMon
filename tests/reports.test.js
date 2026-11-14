'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('./harness');

test('exportCsvReport generates valid CSV content with headers and card rows', () => {
  const harness = createHarness();
  const state = harness.evalInContext('state');

  state.banks = [{ id: 'b-1', name: 'Garanti BBVA' }];
  state.cards = [
    {
      id: 'c-1',
      bankId: 'b-1',
      nickname: 'Bonus Gold',
      last4: '5566',
      type: 'typePersonal',
      network: 'Mastercard',
      limit: 100000,
      usedBalance: 25000,
      dateMethod: 'exact',
      cutoffDay: 15,
      dueDay: 25
    }
  ];

  let downloadedUri = '';
  let downloadedFilename = '';
  const origCreateElement = harness.sandbox.document.createElement;
  harness.sandbox.document.createElement = (tag) => {
    const el = origCreateElement(tag);
    if (tag === 'a') {
      const origSetAttr = el.setAttribute;
      el.setAttribute = (k, v) => {
        if (k === 'href') downloadedUri = v;
        if (k === 'download') downloadedFilename = v;
        origSetAttr(k, v);
      };
      el.click = () => {};
    }
    return el;
  };

  harness.evalInContext('exportCsvReport')();

  assert.ok(downloadedUri.startsWith('data:text/csv;charset=utf-8,'));
  assert.ok(downloadedFilename.endsWith('.csv'));

  const decodedCsv = decodeURI(downloadedUri.replace('data:text/csv;charset=utf-8,', ''));
  assert.ok(decodedCsv.includes('Banka,Kart Adi,Son 4 Hane'));
  assert.ok(decodedCsv.includes('"Garanti BBVA"'));
  assert.ok(decodedCsv.includes('"Bonus Gold"'));
  assert.ok(decodedCsv.includes('100000,25000,75000'));
});

test('exportJsonBackup generates valid JSON export structure', () => {
  const harness = createHarness();
  const state = harness.evalInContext('state');

  state.banks = [{ id: 'b-10', name: 'İş Bankası' }];
  state.cards = [{ id: 'c-10', bankId: 'b-10', nickname: 'Maximum', limit: 50000 }];
  state.loans = [];
  state.cashSubscriptions = [];
  state.profile = { firstName: 'Yunus' };

  let downloadedUri = '';
  const origCreateElement = harness.sandbox.document.createElement;
  harness.sandbox.document.createElement = (tag) => {
    const el = origCreateElement(tag);
    if (tag === 'a') {
      const origSetAttr = el.setAttribute;
      el.setAttribute = (k, v) => {
        if (k === 'href') downloadedUri = v;
        origSetAttr(k, v);
      };
      el.click = () => {};
    }
    return el;
  };

  harness.evalInContext('exportJsonBackup')();

  assert.ok(downloadedUri.startsWith('data:text/json;charset=utf-8,'));
  const jsonText = decodeURIComponent(downloadedUri.replace('data:text/json;charset=utf-8,', ''));
  const parsed = JSON.parse(jsonText);

  assert.strictEqual(parsed.version, '2.0');
  assert.strictEqual(parsed.banks.length, 1);
  assert.strictEqual(parsed.banks[0].name, 'İş Bankası');
  assert.strictEqual(parsed.profile.firstName, 'Yunus');
});

test('triggerImportJson clicks importFileInput element', () => {
  const h = createHarness();
  let clicked = false;
  const inputEl = h.sandbox.document.getElementById('importFileInput');
  inputEl.click = () => { clicked = true; };

  h.triggerImportJson();
  assert.strictEqual(clicked, true);
});

test('handleImportFile parses valid json file and updates state', () => {
  const h = createHarness();
  h.sandbox.FileReader = class {
    readAsText(file) {
      this.onload({
        target: {
          result: JSON.stringify({
            banks: [{ id: 'b-imp', name: 'Import Bank' }],
            cards: [{ id: 'c-imp', nickname: 'Import Card', limit: 40000 }],
            loans: [],
            cashSubscriptions: [],
            profile: { firstName: 'Can' }
          })
        }
      });
    }
  };

  const fakeEvt = {
    target: {
      files: [{ name: 'portfolio.json' }],
      value: 'portfolio.json'
    }
  };

  h.handleImportFile(fakeEvt);
  assert.strictEqual(h.getState().banks[0].name, 'Import Bank');
  assert.strictEqual(h.getState().cards[0].nickname, 'Import Card');
  assert.strictEqual(h.getState().profile.firstName, 'Can');
  assert.strictEqual(fakeEvt.target.value, '');
});

test('exportPdfReport populates pdfReportContainer and calls window.print', () => {
  const h = createHarness();
  h.loadDemoData(false);

  let printCalled = false;
  h.sandbox.window.print = () => { printCalled = true; };

  h.exportPdfReport();

  const container = h.sandbox.document.getElementById('pdfReportContainer');
  assert.ok(container.innerHTML.length > 0);
  assert.match(container.innerHTML, /CardMon Finansal Analiz &amp; Denetim Raporu|CardMon Finansal Analiz & Denetim Raporu/);
});

test('confirmClearAllData clears banks, cards, loans when confirmed', () => {
  const h = createHarness();
  h.loadDemoData(false);
  assert.ok(h.getState().banks.length > 0);

  // When not confirmed
  h.sandbox.confirm = () => false;
  h.confirmClearAllData();
  assert.ok(h.getState().banks.length > 0);

  // When confirmed
  h.sandbox.confirm = () => true;
  h.confirmClearAllData();
  assert.strictEqual(h.getState().banks.length, 0);
  assert.strictEqual(h.getState().cards.length, 0);
  assert.strictEqual(h.getState().loans.length, 0);
});
