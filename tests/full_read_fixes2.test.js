'use strict';

// Failing-first regressions for the second batch of live defects surfaced by
// the full reforge re-read. These must fail against the current code.

const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('./harness');

const XSS = '<img src=x onerror=alert(1)>';

function fixedDate(harness, year, month, day) {
  harness.sandbox.Date = class extends Date {
    constructor(...args) {
      if (args.length === 0) super(year, month, day, 12, 0, 0);
      else super(...args);
    }
    static now() { return new Date(year, month, day, 12, 0, 0).getTime(); }
  };
}

function lastBodyChild(harness) {
  const children = harness.sandbox.document.body.children;
  return children.length ? children[children.length - 1] : null;
}

test('CSV export doubles embedded quotes in bank and card names', () => {
  const harness = createHarness();
  const state = harness.getState();
  state.banks = [{ id: 'b1', name: 'Bank "A", Ltd' }];
  state.cards = [{ id: 'c1', bankId: 'b1', nickname: 'Card "X"', network: 'Visa', limit: 1000, usedBalance: 100 }];
  const created = [];
  const origCreate = harness.sandbox.document.createElement;
  harness.sandbox.document.createElement = (tag) => {
    const el = origCreate(tag);
    if (String(tag).toLowerCase() === 'a') created.push(el);
    return el;
  };
  harness.evalInContext('exportCsvReport()');
  const link = created[0];
  assert.ok(link, 'CSV download link must be created');
  const csv = decodeURIComponent(link.getAttribute('href') || '');
  assert.ok(csv.includes('"Bank ""A"", Ltd"'), 'bank name must RFC-escape embedded quotes');
  assert.ok(csv.includes('"Card ""X"""'), 'card nickname must RFC-escape embedded quotes');
});

test('PDF recommendation and #1 row name the same card', () => {
  const harness = createHarness();
  fixedDate(harness, 2026, 9, 15);
  const state = harness.getState();
  state.banks = [{ id: 'b1', name: 'Bank A' }, { id: 'b2', name: 'Bank B' }];
  state.cards = [
    { id: 'c1', bankId: 'b1', nickname: 'TopRankNoLimit', dateMethod: 'exact', cutoffDay: 20, dueDay: 25, limit: 1000, usedBalance: 1000 },
    { id: 'c2', bankId: 'b2', nickname: 'UsableCard', dateMethod: 'exact', cutoffDay: 16, dueDay: 17, limit: 5000, usedBalance: 0 }
  ];
  state.loans = [];
  state.cashSubscriptions = [];
  harness.evalInContext('exportPdfReport()');
  const html = harness.sandbox.document.getElementById('pdfReportContainer').innerHTML;
  const rows = html.split('<tr').filter(r => r.includes('(En Avantajlı)'));
  assert.strictEqual(rows.length, 1, 'exactly one top row');
  assert.ok(rows[0].includes('UsableCard'), '#1 row must match the recommended card with available limit');
  assert.ok(!rows[0].includes('TopRankNoLimit'), '#1 row must not be the zero-limit top-ranked card');
});

test('network names are HTML-escaped in vault charts and executive table', () => {
  const harness = createHarness();
  const state = harness.getState();
  state.cards = [{ id: 'c1', nickname: 'Safe Card', network: XSS, limit: 1000, usedBalance: 100 }];
  state.banks = [];
  harness.evalInContext('renderNetworkAndTypeChart(1000)');
  const chart = harness.sandbox.document.getElementById('networkTypeChartContainer');
  assert.ok(chart && !chart.innerHTML.includes(XSS), 'network chart must escape raw network names');

  harness.evalInContext('renderExecutiveTable()');
  const table = harness.sandbox.document.getElementById('executiveTableContainer');
  assert.ok(table && !table.innerHTML.includes(XSS), 'executive table must escape raw network names');
});

test('PDF report escapes raw network names', () => {
  const harness = createHarness();
  fixedDate(harness, 2026, 9, 15);
  const state = harness.getState();
  state.banks = [{ id: 'b1', name: 'Bank A' }];
  state.cards = [{ id: 'c1', bankId: 'b1', nickname: 'Safe', network: XSS, limit: 1000, usedBalance: 100 }];
  state.loans = [];
  state.cashSubscriptions = [];
  harness.evalInContext('exportPdfReport()');
  const html = harness.sandbox.document.getElementById('pdfReportContainer').innerHTML;
  assert.ok(!html.includes(XSS), 'PDF report must escape raw network names');
});

test('v3 envelope validation rejects malformed loans, subscriptions and profile', () => {
  const harness = createHarness();
  const validate = harness.evalInContext('validatePortfolioData');
  const make = (data) => ({ fileType: 'cardmon_portfolio', version: '3.0', data });

  assert.strictEqual(validate(make({ banks: [], cards: [], loans: 'bad', cashSubscriptions: [], profile: {} })).valid, false);
  assert.strictEqual(validate(make({ banks: [], cards: [], loans: [], cashSubscriptions: 'bad', profile: {} })).valid, false);
  assert.strictEqual(validate(make({ banks: [], cards: [], loans: [], cashSubscriptions: [], profile: [] })).valid, false);
  assert.strictEqual(validate(make({ banks: [], cards: [], loans: [], cashSubscriptions: [], profile: {} })).valid, true);
});

test('download fallback clears a stale native file handle', async () => {
  const harness = createHarness();
  harness.sandbox.Blob = class {};
  harness.sandbox.URL = { createObjectURL: () => 'blob:test', revokeObjectURL() {} };
  const fsState = harness.evalInContext('fileSystemState');
  fsState.activeHandle = { name: 'old.cardmon' };
  fsState.activeFileName = 'old.cardmon';
  await harness.evalInContext('saveFileAs()');
  assert.strictEqual(fsState.activeHandle, null, 'fallback download must not keep a stale native handle');
});
