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

test('checkAndTriggerAutoWeeklyBackup triggers backup when last auto backup is older than 7 days or missing', () => {
  const h = createHarness();
  h.loadDemoData(false);

  // Clear vault
  h.saveBackupVault([]);
  h.checkAndTriggerAutoWeeklyBackup();

  let vault = h.getBackupVault();
  assert.strictEqual(vault.length, 1);
  assert.strictEqual(vault[0].type, 'auto');

  // If called immediately again, should not create another
  h.checkAndTriggerAutoWeeklyBackup();
  vault = h.getBackupVault();
  assert.strictEqual(vault.length, 1);
});

test('createManualBackupSnapshot adds manual snapshot and renders list', () => {
  const h = createHarness();
  h.loadDemoData(false);
  h.saveBackupVault([]);

  h.createManualBackupSnapshot();
  const vault = h.getBackupVault();
  assert.strictEqual(vault.length, 1);
  assert.strictEqual(vault[0].type, 'manual');
});

test('openBackupVaultModal and closeBackupVaultModal toggle overlay active class', () => {
  const h = createHarness();
  const overlay = h.sandbox.document.getElementById('backupVaultModalOverlay');

  assert.strictEqual(overlay.classList.contains('active'), false);
  h.openBackupVaultModal();
  assert.strictEqual(overlay.classList.contains('active'), true);
  h.closeBackupVaultModal();
  assert.strictEqual(overlay.classList.contains('active'), false);
});

test('renderBackupVaultList renders empty notice or snapshot cards', () => {
  const h = createHarness();
  const listEl = h.sandbox.document.getElementById('backupVaultList');

  // Empty vault
  h.saveBackupVault([]);
  h.renderBackupVaultList();
  assert.match(listEl.innerHTML, /Henüz kayıtlı bir yedek noktası bulunmamaktadır/);

  // Populated vault
  h.saveBackupVault([{
    id: 'snap-100',
    type: 'auto',
    dateStr: '15 Kasım 2026',
    stats: { bankCount: 2, cardCount: 3, totalDebt: 15000 }
  }]);
  h.renderBackupVaultList();
  assert.match(listEl.innerHTML, /backup-vault-item/);
  assert.match(listEl.innerHTML, /Otomatik Haftalık Yedek/);
  assert.match(listEl.innerHTML, /15 Kasım 2026/);
});

test('downloadBackupSnapshotJson creates download link with snapshot payload', () => {
  const h = createHarness();
  let clicked = false;
  let downloadedHref = '';
  let downloadedFilename = '';

  const origCreate = h.sandbox.document.createElement;
  h.sandbox.document.createElement = (tag) => {
    const el = origCreate(tag);
    if (tag.toLowerCase() === 'a') {
      const origSetAttr = el.setAttribute;
      el.setAttribute = (k, v) => {
        if (origSetAttr) origSetAttr(k, v);
        if (k === 'href') downloadedHref = v;
        if (k === 'download') downloadedFilename = v;
      };
      el.click = () => { clicked = true; };
    }
    return el;
  };

  h.saveBackupVault([{
    id: 'snap-dl',
    dateStr: '15_Kasim_2026',
    data: { banks: [], cards: [] }
  }]);

  h.downloadBackupSnapshotJson('snap-dl');
  assert.strictEqual(clicked, true);
  assert.ok(downloadedHref.startsWith('data:text/json'));
  assert.match(downloadedFilename, /cardmon_backup/);
});

test('cBankName returns matching bank name or default fallback', () => {
  const h = createHarness();
  h.getState().banks = [{ id: 'b-garanti', name: 'Garanti BBVA' }];

  assert.strictEqual(h.cBankName('b-garanti'), 'Garanti BBVA');
  assert.strictEqual(h.cBankName('b-nonexistent'), 'Banka');
});

test('renderHealthScoreWidget renders correct status pill and progress for various utilization levels', () => {
  const h = createHarness();
  const pill = h.sandbox.document.getElementById('healthScorePill');
  const fill = h.sandbox.document.getElementById('healthScoreFill');
  const caption = h.sandbox.document.getElementById('healthScoreCaption');

  // Zero limit: honest empty state, no misleading "good" score
  h.renderHealthScoreWidget(0, 0, 0, 0);
  assert.match(pill.className, /health-empty/);
  assert.strictEqual(fill.style.width, '0%');

  // Zero utilization
  h.renderHealthScoreWidget(0, 0, 100000, 0);
  assert.match(pill.className, /health-excellent/);
  assert.strictEqual(fill.style.width, '100%');

  // Safe <= 30%
  h.renderHealthScoreWidget(25, 25000, 100000, 0);
  assert.match(pill.className, /health-excellent/);
  assert.strictEqual(fill.style.width, '90%');

  // Moderate <= 55%
  h.renderHealthScoreWidget(45, 45000, 100000, 0);
  assert.match(pill.className, /health-good/);
  assert.strictEqual(fill.style.width, '72%');

  // Warning <= 75%
  h.renderHealthScoreWidget(65, 65000, 100000, 0);
  assert.match(pill.className, /health-warning/);
  assert.strictEqual(fill.style.width, '48%');

  // Critical > 75%
  h.renderHealthScoreWidget(85, 85000, 100000, 0);
  assert.match(pill.className, /health-critical/);
  assert.strictEqual(fill.style.width, '25%');
});

test('renderBankAnalysisChart renders bank debt and limit bars or empty fallback', () => {
  const h = createHarness();
  const canvas = h.sandbox.document.getElementById('bankChartCanvas');

  // No banks
  h.getState().banks = [];
  h.renderBankAnalysisChart(0);
  assert.match(canvas.innerHTML, /p style/);

  // With demo data
  h.loadDemoData(false);
  const totalLimit = h.getState().cards.reduce((s, c) => s + c.limit, 0);
  h.renderBankAnalysisChart(totalLimit);
  assert.match(canvas.innerHTML, /meter-bar/);
  assert.match(canvas.innerHTML, /Garanti BBVA/);
});

test('renderEkHesapAnalysisChart renders emergency reserves or empty prompt', () => {
  const h = createHarness();
  const canvas = h.sandbox.document.getElementById('ekHesapChartCanvas');

  // No ek hesap
  h.getState().banks = [{ id: 'b1', name: 'B1', ekHesapLimit: 0 }];
  h.renderEkHesapAnalysisChart(0);
  assert.match(canvas.innerHTML, /Henüz tanımlı bir Ek Hesap/);

  // With ek hesap
  h.getState().banks = [{ id: 'b1', name: 'Garanti', ekHesapLimit: 25000, color: '#008836' }];
  h.renderEkHesapAnalysisChart(25000);
  assert.match(canvas.innerHTML, /Acil Durum Rezervi/);
  assert.match(canvas.innerHTML, /25/);
});

test('renderNetworkAndTypeChart renders network share and card type pills', () => {
  const h = createHarness();
  const canvas = h.sandbox.document.getElementById('networkChartCanvas');

  // No cards
  h.getState().cards = [];
  h.renderNetworkAndTypeChart(0);
  assert.match(canvas.innerHTML, /p style/);

  // With cards
  h.loadDemoData(false);
  const totalLimit = h.getState().cards.reduce((s, c) => s + c.limit, 0);
  h.renderNetworkAndTypeChart(totalLimit);
  assert.match(canvas.innerHTML, /Kart Şebekesi/);
  assert.match(canvas.innerHTML, /Mastercard/);
  assert.match(canvas.innerHTML, /Kart Türleri Dağılımı/);
});

test('renderPaymentFlowChart distributes debts across monthly weekly cashflow buckets', () => {
  const h = createHarness();
  const canvas = h.sandbox.document.getElementById('paymentFlowCanvas');

  // Empty state
  h.getState().cards = [];
  h.getState().loans = [];
  h.getState().cashSubscriptions = [];
  h.renderPaymentFlowChart();
  assert.match(canvas.innerHTML, /p style/);

  // With demo data
  h.loadDemoData(false);
  h.renderPaymentFlowChart();
  assert.match(canvas.innerHTML, /1\. Hafta/);
  assert.match(canvas.innerHTML, /2\. Hafta/);
  assert.match(canvas.innerHTML, /3\. Hafta/);
  assert.match(canvas.innerHTML, /4\. Hafta/);
  assert.match(canvas.innerHTML, /Ay Sonu/);
});

test('renderSmartInsights renders risk alerts, safety buffers and recurring charges', () => {
  const h = createHarness();
  const container = h.sandbox.document.getElementById('smartInsightsContainer');

  // Empty cards
  h.getState().cards = [];
  h.renderSmartInsights(0, 0, 0, 0, 0);
  assert.strictEqual(container.innerHTML, '');

  // With demo data
  h.loadDemoData(false);
  h.renderSmartInsights(35, 45000, 150000, 30000, 12000);
  assert.match(container.innerHTML, /insight-card/);
  assert.match(container.innerHTML, /Acil Durum Likidite Güvencesi/);
});

test('renderExecutiveTable renders consolidated card portfolio summary and footer totals', () => {
  const h = createHarness();
  const container = h.sandbox.document.getElementById('executiveTableContainer');

  // Empty cards
  h.getState().cards = [];
  h.renderExecutiveTable();
  assert.match(container.innerHTML, /p style/);

  // With demo data
  h.loadDemoData(false);
  h.renderExecutiveTable();
  assert.match(container.innerHTML, /executive-table/);
  assert.match(container.innerHTML, /Toplam Portföy/);
  assert.match(container.innerHTML, /Konsolide Toplam/);
});
