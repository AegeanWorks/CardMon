'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('./harness');

test('navigateToTab updates active class on navigation buttons and panes', () => {
  const h = createHarness();
  const navBtn1 = { getAttribute: (k) => k === 'data-tab' ? 'cards' : null, classList: new Set() };
  navBtn1.classList.add = (c) => navBtn1.classList.add ? Set.prototype.add.call(navBtn1.classList, c) : null;
  navBtn1.classList.remove = (c) => Set.prototype.delete.call(navBtn1.classList, c);
  navBtn1.classList.contains = (c) => Set.prototype.has.call(navBtn1.classList, c);

  const navBtn2 = { getAttribute: (k) => k === 'data-tab' ? 'timeline' : null, classList: new Set() };
  navBtn2.classList.add = (c) => Set.prototype.add.call(navBtn2.classList, c);
  navBtn2.classList.remove = (c) => Set.prototype.delete.call(navBtn2.classList, c);
  navBtn2.classList.contains = (c) => Set.prototype.has.call(navBtn2.classList, c);

  const paneCards = h.sandbox.document.getElementById('tabPane-cards');
  const paneTimeline = h.sandbox.document.getElementById('tabPane-timeline');

  h.sandbox.document.querySelectorAll = (sel) => {
    if (sel.includes('.tab-btn')) return [navBtn1, navBtn2];
    if (sel.includes('.tab-pane')) return [paneCards, paneTimeline];
    return [];
  };

  h.sandbox.window.scrollTo = () => {};

  h.navigateToTab('timeline');
  assert.strictEqual(h.getState().activeTab, 'timeline');
  assert.strictEqual(paneTimeline.classList.contains('active'), true);
  assert.strictEqual(paneCards.classList.contains('active'), false);
  assert.strictEqual(navBtn2.classList.contains('active'), true);
  assert.strictEqual(navBtn1.classList.contains('active'), false);
});

test('toggleMobileSidebar toggles mobile-open class on sidebar', () => {
  const h = createHarness();
  const sidebar = h.sandbox.document.getElementById('appSidebar');

  assert.strictEqual(sidebar.classList.contains('mobile-open'), false);
  h.toggleMobileSidebar();
  assert.strictEqual(sidebar.classList.contains('mobile-open'), true);
  h.toggleMobileSidebar();
  assert.strictEqual(sidebar.classList.contains('mobile-open'), false);
});

test('toggleCardPermission toggles card freeze and feature permissions', () => {
  const h = createHarness();
  h.loadDemoData(false);
  const card = h.getState().cards[0];

  // Freeze toggle
  assert.strictEqual(!!card.isFrozen, false);
  h.toggleCardPermission(card.id, 'isFrozen');
  assert.strictEqual(card.isFrozen, true);
  h.toggleCardPermission(card.id, 'isFrozen');
  assert.strictEqual(card.isFrozen, false);

  // Internet permission toggle
  const prevInternet = card.permissions.internet;
  h.toggleCardPermission(card.id, 'internet');
  assert.strictEqual(card.permissions.internet, !prevInternet);
});

test('setCardTypeFilter updates filter state and highlights active pill', () => {
  const h = createHarness();
  const pillAll = {
    getAttribute: (k) => k === 'data-filter' ? 'all' : null,
    classList: { toggle: (cls, state) => { pillAll._active = state; } },
    _active: false
  };
  const pillCommercial = {
    getAttribute: (k) => k === 'data-filter' ? 'typeCommercial' : null,
    classList: { toggle: (cls, state) => { pillCommercial._active = state; } },
    _active: false
  };

  h.sandbox.document.querySelectorAll = (sel) => {
    if (sel.includes('.quick-filter-pill')) return [pillAll, pillCommercial];
    return [];
  };

  h.setCardTypeFilter('typeCommercial');
  assert.strictEqual(h.getState().typeFilter, 'typeCommercial');
  assert.strictEqual(pillCommercial._active, true);
  assert.strictEqual(pillAll._active, false);
});

test('smart date assistant calculates cutoff days and offsets correctly', () => {
  const h = createHarness();
  const cutoffSelect = h.sandbox.document.getElementById('cardApproxCutoff');
  const cutoffInput = h.sandbox.document.getElementById('cardCutoffDay');
  const dueInput = h.sandbox.document.getElementById('cardDueDay');

  // handleCutoffWeekChange
  cutoffSelect.value = 'week2'; // ~day 10
  h.handleCutoffWeekChange();
  assert.strictEqual(Number(cutoffInput.value), 10);
  assert.strictEqual(Number(dueInput.value), 20);

  // handleCutoffDayInput
  cutoffInput.value = '25';
  h.handleCutoffDayInput();
  assert.strictEqual(cutoffSelect.value, 'week4');

  // applyDueOffset
  cutoffInput.value = '15';
  h.applyDueOffset(12);
  assert.strictEqual(Number(dueInput.value), 27);

  // updateCardDateLivePreview
  h.updateCardDateLivePreview();
  const previewBox = h.sandbox.document.getElementById('cardDateLivePreview');
  assert.match(previewBox.innerHTML, /Ekstre Kesimi/);
  assert.match(previewBox.innerHTML, /Son Ödeme/);
});

test('toggleParticipationRule and handleMinRatioSelectChange enforce 100 percent ratio', () => {
  const h = createHarness();
  const minRatioSelect = h.sandbox.document.getElementById('cardMinRatio');
  const notice = h.sandbox.document.getElementById('katilimBankNotice');
  const checkbox = h.sandbox.document.getElementById('cardIsParticipation');

  h.toggleParticipationRule(true);
  assert.strictEqual(minRatioSelect.value, '100');
  assert.strictEqual(notice.style.display, 'block');

  h.toggleParticipationRule(false);
  assert.strictEqual(minRatioSelect.value, '20');
  assert.strictEqual(notice.style.display, 'none');

  h.handleMinRatioSelectChange('100');
  assert.strictEqual(checkbox.checked, true);
  assert.strictEqual(notice.style.display, 'block');
});

test('openAddCardModal and openEditCardModal populate form fields and toggle overlay', () => {
  const h = createHarness();
  h.loadDemoData(false);
  const overlay = h.sandbox.document.getElementById('cardModalOverlay');
  const title = h.sandbox.document.getElementById('cardModalTitle');

  // Open Add
  h.openAddCardModal();
  assert.strictEqual(overlay.classList.contains('active'), true);
  assert.strictEqual(title.textContent, h.t('addCard'));
  assert.strictEqual(h.getState().editingCardId, null);

  // Close
  h.closeCardModal();
  assert.strictEqual(overlay.classList.contains('active'), false);

  // Open Edit
  const card = h.getState().cards[0];
  h.openEditCardModal(card.id);
  assert.strictEqual(overlay.classList.contains('active'), true);
  assert.strictEqual(h.getState().editingCardId, card.id);
  assert.strictEqual(h.sandbox.document.getElementById('cardNickname').value, card.nickname);
});

test('handleCardFormSubmit saves new and edited cards and confirmDeleteCard removes it', () => {
  const h = createHarness();
  h.loadDemoData(false);
  const bank = h.getState().banks[0];

  // Create new card
  h.sandbox.document.getElementById('cardBankSelect').value = bank.id;
  h.sandbox.document.getElementById('cardNickname').value = 'Test New Card';
  h.sandbox.document.getElementById('cardLast4').value = '9988';
  h.sandbox.document.getElementById('cardNetwork').value = 'Visa';
  h.sandbox.document.getElementById('cardType').value = 'typePersonal';
  h.sandbox.document.getElementById('cardLimitInput').value = '60000';
  h.sandbox.document.getElementById('cardUsedInput').value = '5000';

  h.getState().editingCardId = null;
  const countBefore = h.getState().cards.length;

  h.handleCardFormSubmit({ preventDefault: () => {} });
  assert.strictEqual(h.getState().cards.length, countBefore + 1);

  const created = h.getState().cards.find(c => c.nickname === 'Test New Card');
  assert.ok(created);
  assert.strictEqual(created.limit, 60000);
  assert.strictEqual(created.last4, '9988');

  // Edit existing card
  h.getState().editingCardId = created.id;
  h.sandbox.document.getElementById('cardNickname').value = 'Updated Card Name';
  h.handleCardFormSubmit({ preventDefault: () => {} });
  assert.strictEqual(h.getState().cards.find(c => c.id === created.id).nickname, 'Updated Card Name');

  // Delete card
  h.sandbox.confirm = () => true;
  h.confirmDeleteCard(created.id);
  assert.strictEqual(h.getState().cards.find(c => c.id === created.id), undefined);
});

test('quick transaction modal supports payment presets and installment preview', () => {
  const h = createHarness();
  h.loadDemoData(false);
  const card = h.getState().cards[0];
  const overlay = h.sandbox.document.getElementById('quickTxModalOverlay');

  // Open Quick Tx Modal
  h.openQuickTxModal(card.id, 'expense');
  assert.strictEqual(overlay.classList.contains('active'), true);
  assert.strictEqual(h.sandbox.document.getElementById('quickTxCardId').value, card.id);

  // Set preset amount
  h.setQuickTxAmount(1500, 'Market Alışverişi');
  assert.strictEqual(Number(h.sandbox.document.getElementById('quickTxAmountInput').value), 1500);
  assert.strictEqual(h.sandbox.document.getElementById('quickTxDescInput').value, 'Market Alışverişi');

  // Update installment preview
  h.sandbox.document.getElementById('quickTxAmountInput').value = '4500';
  h.sandbox.document.getElementById('quickTxInstallmentSelect').value = '3';
  h.updateQuickTxInstallmentPreview();
  const noticeEl = h.sandbox.document.getElementById('quickTxInstallmentNotice');
  assert.match(noticeEl.innerHTML, /Aylık Taksit Tutarı/);

  // Switch to payment mode
  h.sandbox.document.getElementById('txTypePayment').checked = true;
  h.sandbox.document.getElementById('txTypeExpense').checked = false;
  h.updateQuickTxFormMode();

  const submitBtn = h.sandbox.document.getElementById('quickTxSubmitBtn');
  assert.match(submitBtn.textContent, /Borç Ödemesini Kaydet/);

  // Close modal
  h.closeQuickTxModal();
  assert.strictEqual(overlay.classList.contains('active'), false);
});

test('handleQuickTxSubmit processes payments and expense installment plans', () => {
  const h = createHarness();
  h.loadDemoData(false);
  const card = h.getState().cards[0];
  const originalBalance = Number(card.usedBalance) || 20000;
  card.usedBalance = originalBalance;

  h.sandbox.document.getElementById('quickTxCardId').value = card.id;

  // 1. Add expense with 3 installments
  h.sandbox.document.getElementById('txTypeExpense').checked = true;
  h.sandbox.document.getElementById('txTypePayment').checked = false;
  h.sandbox.document.getElementById('quickTxAmountInput').value = '3000';
  h.sandbox.document.getElementById('quickTxDescInput').value = 'Elektronik';
  h.sandbox.document.getElementById('quickTxInstallmentSelect').value = '3';
  h.sandbox.document.getElementById('startCycleNext').checked = false;

  h.handleQuickTxSubmit({ preventDefault: () => {} });
  assert.strictEqual(card.usedBalance, originalBalance + 3000);
  const inst = (card.installments || []).find(i => i.desc === 'Elektronik');
  assert.ok(inst);
  assert.strictEqual(inst.installmentCount, 3);
  assert.strictEqual(inst.monthlyAmount, 1000);

  // 2. Process payment
  h.sandbox.document.getElementById('txTypeExpense').checked = false;
  h.sandbox.document.getElementById('txTypePayment').checked = true;
  h.sandbox.document.getElementById('quickTxAmountInput').value = '1000';
  h.sandbox.document.getElementById('quickTxDescInput').value = 'Taksit Ödemesi';

  h.handleQuickTxSubmit({ preventDefault: () => {} });
  assert.strictEqual(card.usedBalance, originalBalance + 2000);
});

test('installment actions: paySingleInstallment, payCardMonthlyInstallments, activateNextCycleInstallment, deleteInstallmentPlan', () => {
  const h = createHarness();
  h.loadDemoData(false);
  const card = h.getState().cards[0];
  card.usedBalance = 10000;
  card.installments = [
    { id: 'inst-active', desc: 'Telefon', totalAmount: 6000, installmentCount: 3, paidCount: 0, monthlyAmount: 2000, startCycle: 'current' },
    { id: 'inst-planned', desc: 'Tatil', totalAmount: 4000, installmentCount: 2, paidCount: 0, monthlyAmount: 2000, startCycle: 'next' }
  ];

  // paySingleInstallment
  h.paySingleInstallment(card.id, 'inst-active');
  assert.strictEqual(card.usedBalance, 8000);
  assert.strictEqual(card.installments.find(i => i.id === 'inst-active').paidCount, 1);

  // activateNextCycleInstallment
  h.activateNextCycleInstallment(card.id, 'inst-planned');
  assert.strictEqual(card.usedBalance, 10000); // 8000 + 2000
  assert.strictEqual(card.installments.find(i => i.id === 'inst-planned').startCycle, 'current');

  // payCardMonthlyInstallments
  h.payCardMonthlyInstallments(card.id);
  assert.ok(card.usedBalance < 10000);

  // deleteInstallmentPlan
  h.sandbox.confirm = () => true;
  const targetId = card.installments[0]?.id;
  if (targetId) {
    h.deleteInstallmentPlan(card.id, targetId);
    assert.strictEqual(card.installments.find(i => i.id === targetId), undefined);
  }
});

test('virtual cards lifecycle: open modal, submit, delete', () => {
  const h = createHarness();
  h.loadDemoData(false);
  const card = h.getState().cards[0];
  const overlay = h.sandbox.document.getElementById('virtualCardModalOverlay');

  // Open modal
  h.openAddVirtualCardModal(card.id);
  assert.strictEqual(overlay.classList.contains('active'), true);
  h.closeVirtualCardModal();
  assert.strictEqual(overlay.classList.contains('active'), false);
  h.openAddVirtualCardModal(card.id);

  // Add virtual card
  h.sandbox.document.getElementById('vcNicknameInput').value = 'Online Alışveriş Sanal';
  h.sandbox.document.getElementById('vcLast4Input').value = '1122';
  h.sandbox.document.getElementById('vcLimitInput').value = '5000';
  h.sandbox.document.getElementById('vcPermInternet').checked = true;

  h.handleVirtualCardFormSubmit({ preventDefault: () => {} });
  assert.strictEqual(overlay.classList.contains('active'), false);

  const vc = (card.virtualCards || []).find(v => v.nickname === 'Online Alışveriş Sanal');
  assert.ok(vc);
  assert.strictEqual(vc.limit, 5000);
  assert.strictEqual(vc.last4, '1122');

  // Delete virtual card
  h.sandbox.confirm = () => true;
  h.confirmDeleteVirtualCard(card.id, vc.id);
  assert.strictEqual((card.virtualCards || []).find(v => v.id === vc.id), undefined);
});

test('toggleSettingsDropdown and closeSettingsDropdown manage dropdown visibility', () => {
  const h = createHarness();
  const menu = h.sandbox.document.getElementById('settingsDropdownMenu');

  assert.strictEqual(menu.classList.contains('active'), false);
  h.toggleSettingsDropdown({ stopPropagation: () => {} });
  assert.strictEqual(menu.classList.contains('active'), true);
  h.closeSettingsDropdown();
  assert.strictEqual(menu.classList.contains('active'), false);
});
