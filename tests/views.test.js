'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('./harness');

test('renderUserProfileHeader populates user initials and full names across headers', () => {
  const h = createHarness();
  h.getState().profile = {
    firstName: 'Zeynep',
    lastName: 'Kaya',
    title: 'Portföy Yöneticisi',
    avatarColor: '#10b981'
  };

  h.renderUserProfileHeader();

  const avatar = h.sandbox.document.getElementById('headerUserAvatar');
  const name = h.sandbox.document.getElementById('headerUserName');
  const sideAvatar = h.sandbox.document.getElementById('sidebarUserAvatar');
  const sideName = h.sandbox.document.getElementById('sidebarUserName');

  assert.strictEqual(avatar.textContent, 'ZK');
  assert.strictEqual(avatar.style.background, '#10b981');
  assert.strictEqual(name.textContent, 'Zeynep Kaya');
  assert.strictEqual(sideAvatar.textContent, 'ZK');
  assert.strictEqual(sideName.textContent, 'Zeynep Kaya');
});

test('renderBankDropdowns populates filter and card modal dropdowns', () => {
  const h = createHarness();
  h.loadDemoData(false);

  h.renderBankDropdowns();

  const filterSelect = h.sandbox.document.getElementById('bankFilterSelect');
  const cardSelect = h.sandbox.document.getElementById('cardBankSelect');

  assert.ok(filterSelect.innerHTML.includes('all'));
  assert.ok(filterSelect.children.length > 0 || filterSelect.innerHTML.includes('Garanti BBVA'));
  assert.ok(cardSelect.children.length > 0 || cardSelect.innerHTML.includes('Garanti BBVA'));
});

test('getFilteredAndSortedCards filters by search, bank, type and sorts accordingly', () => {
  const h = createHarness();
  h.loadDemoData(false);

  // Search filter
  h.getState().searchTerm = 'Bonus';
  let filtered = h.getFilteredAndSortedCards();
  assert.ok(filtered.every(c => c.nickname.toLowerCase().includes('bonus')));

  // Clear search
  h.getState().searchTerm = '';

  // Bank filter
  const targetBank = h.getState().banks[0];
  h.getState().bankFilter = targetBank.id;
  filtered = h.getFilteredAndSortedCards();
  assert.ok(filtered.every(c => c.bankId === targetBank.id));
  h.getState().bankFilter = 'all';

  // Type filter
  h.getState().typeFilter = 'typeCommercial';
  filtered = h.getFilteredAndSortedCards();
  assert.ok(filtered.every(c => c.type === 'typeCommercial'));
  h.getState().typeFilter = 'all';

  // Sorting: limitDesc
  h.getState().sortBy = 'limitDesc';
  filtered = h.getFilteredAndSortedCards();
  for (let i = 0; i < filtered.length - 1; i++) {
    assert.ok(filtered[i].limit >= filtered[i + 1].limit);
  }

  // Sorting: limitAsc
  h.getState().sortBy = 'limitAsc';
  filtered = h.getFilteredAndSortedCards();
  for (let i = 0; i < filtered.length - 1; i++) {
    assert.ok(filtered[i].limit <= filtered[i + 1].limit);
  }

  // Sorting: debtDesc
  h.getState().sortBy = 'debtDesc';
  filtered = h.getFilteredAndSortedCards();
  for (let i = 0; i < filtered.length - 1; i++) {
    assert.ok(filtered[i].usedBalance >= filtered[i + 1].usedBalance);
  }
});

test('renderCardsView renders cards grid or empty placeholder', () => {
  const h = createHarness();
  const container = h.sandbox.document.getElementById('cardsContainer');

  // Empty cards
  h.getState().cards = [];
  h.renderCardsView();
  assert.match(container.innerHTML, /empty-state/);
  assert.match(container.innerHTML, /openAddCardModal/);

  // Populated cards
  h.loadDemoData(false);
  h.renderCardsView();
  assert.match(container.innerHTML, /Bonus Platinum/);
});

test('renderBankDebtBreakdown outputs bank debt meters', () => {
  const h = createHarness();
  const loans = [{ paidInstallments: 2, totalInstallments: 12, monthlyPayment: 2500, title: 'İhtiyaç Kredisi' }];
  const html = h.renderBankDebtBreakdown(15000, 25000, loans);

  assert.ok(typeof html === 'string');
  assert.match(html, /Kart Borcu/);
  assert.match(html, /Kredi Borcu/);
  assert.match(html, /İhtiyaç Kredisi/);
});

test('renderBanksView renders banks list and empty state', () => {
  const h = createHarness();
  const container = h.sandbox.document.getElementById('banksContainer');

  // Empty banks
  h.getState().banks = [];
  h.renderBanksView();
  assert.match(container.innerHTML, /empty-state/);

  // Populated banks
  h.loadDemoData(false);
  h.renderBanksView();
  assert.match(container.innerHTML, /bank-item-card/);
  assert.match(container.innerHTML, /Garanti BBVA/);
});

test('bank limit stat shows card debt only, not card plus loan debt', () => {
  const h = createHarness();
  const container = h.sandbox.document.getElementById('banksContainer');
  h.loadDemoData(false);
  h.renderBanksView();

  const state = h.getState();
  const garanti = state.banks.find(b => b.name === 'Garanti BBVA');
  const cardDebt = state.cards
    .filter(c => c.bankId === garanti.id)
    .reduce((sum, c) => sum + (Number(c.usedBalance) || 0), 0);
  assert.ok(cardDebt > 0, 'demo bank must have card debt');

  // The "used amount" stat next to "card limit" must match the card-only utilization basis.
  const usedStat = (container.innerHTML.split('bank-stat-value')[2] || '').split('</span>')[0];
  assert.ok(usedStat.includes(h.formatMoney(cardDebt)),
    'used amount stat must show card debt only, with loans in the separate breakdown');
});

test('renderEkHesapView renders overdraft credit lines and reserves', () => {
  const h = createHarness();
  const container = h.sandbox.document.getElementById('ekHesapContainer');

  h.loadDemoData(false);
  h.renderEkHesapView();
  assert.match(container.innerHTML, /ekhesap-hero-card/);
  assert.match(container.innerHTML, /Ek Hesap &amp; Kredili Mevduat|Ek Hesap & Kredili Mevduat/);
});

test('renderLoansView renders active loan cards or empty message', () => {
  const h = createHarness();
  const container = h.sandbox.document.getElementById('loansContainer');

  // Empty loans
  h.getState().loans = [];
  h.renderLoansView();
  assert.match(container.innerHTML, /Henüz Kayıtlı Kredi Bulunmuyor/);

  // Populated loans
  h.loadDemoData(false);
  h.renderLoansView();
  assert.match(container.innerHTML, /loans-hero-card/);
  assert.match(container.innerHTML, /İhtiyaç Kredisi/);
});

test('renderSubscriptionsView renders recurring subscriptions list and monthly total', () => {
  const h = createHarness();
  const container = h.sandbox.document.getElementById('subscriptionsContainer');

  h.loadDemoData(false);
  h.renderSubscriptionsView();
  assert.match(container.innerHTML, /subscriptions-hero-card/);
  assert.match(container.innerHTML, /Spotify Aile Planı/);
});

test('getSubIcon returns appropriate category and name icons', () => {
  const h = createHarness();
  assert.strictEqual(h.getSubIcon('Ev Kirası', 'Rent'), '🏠');
  assert.strictEqual(h.getSubIcon('Bina Aidatı', 'Maintenance'), '🏢');
  assert.strictEqual(h.getSubIcon('Netflix 4K', 'Streaming'), '🎬');
  assert.strictEqual(h.getSubIcon('Spotify Premium', 'Lifestyle'), '🎵');
  assert.strictEqual(h.getSubIcon('YouTube Premium', 'Streaming'), '▶️');
  assert.strictEqual(h.getSubIcon('ChatGPT Plus', 'Software'), '🤖');
  assert.strictEqual(h.getSubIcon('iCloud Storage', 'Cloud'), '☁️');
  assert.strictEqual(h.getSubIcon('Amazon Prime', 'Lifestyle'), '📦');
  assert.strictEqual(h.getSubIcon('Figma Professional', 'Software'), '🎨');
  assert.strictEqual(h.getSubIcon('Elektrik Faturası', 'Bills'), '⚡');
  assert.strictEqual(h.getSubIcon('MacFit Gym', 'Lifestyle'), '🏋️');
  assert.strictEqual(h.getSubIcon('Unknown Service', 'Education'), '🎓');
});

test('renderTimelineView outputs monthly statement cutoffs and payment due calendar', () => {
  const h = createHarness();
  h.loadDemoData(false);
  const container = h.sandbox.document.getElementById('timelineContainer');

  h.renderTimelineView();
  assert.ok(container.innerHTML.length > 0);
  assert.match(container.innerHTML, /timeline-event-card/);
});

test('renderDashboardView consolidates overview metrics and charts', () => {
  const h = createHarness();
  h.loadDemoData(false);

  h.renderDashboardView();

  const totalLimitEl = h.sandbox.document.getElementById('statTotalLimit');
  const totalDebtEl = h.sandbox.document.getElementById('statTotalUsed');
  const totalAvailEl = h.sandbox.document.getElementById('statTotalAvailable');
  const utilTextEl = h.sandbox.document.getElementById('statUtilizationRatio');

  assert.ok(totalLimitEl.textContent.length > 0);
  assert.ok(totalDebtEl.textContent.length > 0);
  assert.ok(totalAvailEl.textContent.length > 0);
  assert.match(utilTextEl.textContent, /%/);
});

test('renderAll executes full pipeline without error', () => {
  const h = createHarness();
  h.loadDemoData(false);

  assert.doesNotThrow(() => {
    h.renderAll();
  });
});
