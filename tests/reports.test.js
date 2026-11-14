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
