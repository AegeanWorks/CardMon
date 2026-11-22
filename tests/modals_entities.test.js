'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('./harness');

test('profile modal lifecycle: open, live preview, submit, close', () => {
  const h = createHarness();
  h.loadDemoData(false);
  const overlay = h.sandbox.document.getElementById('profileModalOverlay');

  // Open profile modal
  h.openProfileModal();
  assert.strictEqual(overlay.classList.contains('active'), true);
  assert.strictEqual(h.sandbox.document.getElementById('profileFirstName').value, 'CardMon');

  // Live preview update
  h.sandbox.document.getElementById('profileFirstName').value = 'Kaan';
  h.sandbox.document.getElementById('profileLastName').value = 'Yılmaz';
  h.sandbox.document.getElementById('profileTitle').value = 'Baş Mühendis';
  h.updateProfileModalLivePreview();

  assert.strictEqual(h.sandbox.document.getElementById('modalAvatarPreview').textContent, 'KY');
  assert.strictEqual(h.sandbox.document.getElementById('modalUserNamePreview').textContent, 'Kaan Yılmaz');

  // Submit profile form
  h.sandbox.document.getElementById('profileIncome').value = '85000';
  h.sandbox.document.getElementById('profileSalaryDay').value = '5';
  h.sandbox.document.getElementById('profileCurrencySelect').value = 'TRY';
  h.sandbox.document.getElementById('profileLangSelect').value = 'tr';

  h.handleProfileFormSubmit({ preventDefault: () => {} });
  assert.strictEqual(overlay.classList.contains('active'), false);
  assert.strictEqual(h.getState().profile.firstName, 'Kaan');
  assert.strictEqual(h.getState().profile.lastName, 'Yılmaz');
  assert.strictEqual(h.getState().profile.monthlyIncome, 85000);
  assert.strictEqual(h.getState().profile.salaryDay, 5);

  // Close profile modal
  h.openProfileModal();
  h.closeProfileModal();
  assert.strictEqual(overlay.classList.contains('active'), false);
});

test('bank modal lifecycle: open add, open edit, toggle card section, submit, delete', () => {
  const h = createHarness();
  h.loadDemoData(false);
  const overlay = h.sandbox.document.getElementById('bankModalOverlay');

  // Open add bank modal
  h.openAddBankModal();
  assert.strictEqual(overlay.classList.contains('active'), true);
  assert.strictEqual(h.getState().editingBankId, null);

  // Toggle card section
  const cardSection = h.sandbox.document.getElementById('bankCardSection');
  h.sandbox.document.getElementById('bankHasCardSelect').value = 'no';
  h.toggleBankCardSection();
  assert.strictEqual(cardSection.style.display, 'none');

  h.sandbox.document.getElementById('bankHasCardSelect').value = 'yes';
  h.toggleBankCardSection();
  assert.strictEqual(cardSection.style.display, 'block');

  // Submit new bank with inline card
  h.sandbox.document.getElementById('presetBankSelect').value = 'garanti';
  h.sandbox.document.getElementById('bankNameInput').value = 'Yeni Test Bankası';
  h.sandbox.document.getElementById('bankColorInput').value = '#123456';
  h.sandbox.document.getElementById('bankSharedLimitInput').value = '100000';
  h.sandbox.document.getElementById('bankEkHesapLimitInput').value = '20000';
  h.sandbox.document.getElementById('bankCardNickname').value = 'Yeni Test Kart';
  h.sandbox.document.getElementById('bankCardLimit').value = '50000';

  const countBefore = h.getState().banks.length;
  h.handleBankFormSubmit({ preventDefault: () => {} });
  assert.strictEqual(h.getState().banks.length, countBefore + 1);

  const createdBank = h.getState().banks.find(b => b.name === 'Yeni Test Bankası');
  assert.ok(createdBank);
  assert.strictEqual(createdBank.sharedLimit, 100000);
  assert.strictEqual(createdBank.ekHesapLimit, 20000);

  // Open edit bank modal
  h.openEditBankModal(createdBank.id);
  assert.strictEqual(h.getState().editingBankId, createdBank.id);
  assert.strictEqual(h.sandbox.document.getElementById('bankNameInput').value, 'Yeni Test Bankası');

  h.sandbox.document.getElementById('bankNameInput').value = 'Düzenlenmiş Banka';
  h.handleBankFormSubmit({ preventDefault: () => {} });
  assert.strictEqual(h.getState().banks.find(b => b.id === createdBank.id).name, 'Düzenlenmiş Banka');

  // Close bank modal
  h.openAddBankModal();
  h.closeBankModal();
  assert.strictEqual(overlay.classList.contains('active'), false);

  // Delete bank
  h.sandbox.confirm = () => true;
  h.confirmDeleteBank(createdBank.id);
  assert.strictEqual(h.getState().banks.find(b => b.id === createdBank.id), undefined);
});

test('loan modal lifecycle: populate select, calculate monthly payment, submit, edit, close', () => {
  const h = createHarness();
  h.loadDemoData(false);
  const overlay = h.sandbox.document.getElementById('loanModalOverlay');
  const bank = h.getState().banks[0];

  // Populate loan bank select
  h.populateLoanBankSelect();
  const select = h.sandbox.document.getElementById('loanBankSelect');
  assert.ok(select.children.some(c => c.textContent === bank.name));

  // Open add loan modal
  h.openAddLoanModal();
  assert.strictEqual(overlay.classList.contains('active'), true);
  assert.strictEqual(h.getState().editingLoanId, null);

  // Auto calculate monthly loan payment
  h.sandbox.document.getElementById('loanTotalAmountInput').value = '120000';
  h.sandbox.document.getElementById('loanTotalMonthsInput').value = '12';
  h.autoCalculateMonthlyLoanPayment();
  assert.strictEqual(Number(h.sandbox.document.getElementById('loanMonthlyPaymentInput').value), 10000);

  // Submit loan form
  h.sandbox.document.getElementById('loanBankSelect').value = bank.id;
  h.sandbox.document.getElementById('loanTitleInput').value = 'Taşıt Kredisi';
  h.sandbox.document.getElementById('loanTypeSelect').value = 'vehicle';
  h.sandbox.document.getElementById('loanPaidMonthsInput').value = '2';
  h.sandbox.document.getElementById('loanPaymentDayInput').value = '15';

  const countBefore = (h.getState().loans || []).length;
  h.handleLoanFormSubmit({ preventDefault: () => {} });
  assert.strictEqual(h.getState().loans.length, countBefore + 1);

  const createdLoan = h.getState().loans.find(l => l.title === 'Taşıt Kredisi');
  assert.ok(createdLoan);
  assert.strictEqual(createdLoan.totalAmount, 120000);
  assert.strictEqual(createdLoan.monthlyPayment, 10000);

  // Open edit loan modal
  h.openEditLoanModal(createdLoan.id);
  assert.strictEqual(h.getState().editingLoanId, createdLoan.id);
  assert.strictEqual(h.sandbox.document.getElementById('loanTitleInput').value, 'Taşıt Kredisi');

  h.sandbox.document.getElementById('loanTitleInput').value = 'Güncellenmiş Taşıt Kredisi';
  h.handleLoanFormSubmit({ preventDefault: () => {} });
  assert.strictEqual(h.getState().loans.find(l => l.id === createdLoan.id).title, 'Güncellenmiş Taşıt Kredisi');

  // Close loan modal
  h.openAddLoanModal();
  h.closeLoanModal();
  assert.strictEqual(overlay.classList.contains('active'), false);
});

test('subscriptions modal lifecycle: presets, populate, add card sub, add cash sub, edit, close', () => {
  const h = createHarness();
  h.loadDemoData(false);
  const card = h.getState().cards[0];
  const overlay = h.sandbox.document.getElementById('subscriptionModalOverlay');

  // Populate sub card select
  h.populateSubCardSelect();
  const select = h.sandbox.document.getElementById('subCardSelect');
  assert.ok(select.innerHTML.includes('Nakit'));
  assert.ok(select.innerHTML.includes(card.nickname));

  // Apply preset
  h.applySubPreset('Netflix 4K', 299, 'Entertainment', 'monthly', 'TRY', 'card', false);
  assert.strictEqual(h.sandbox.document.getElementById('subNameInput').value, 'Netflix 4K');
  assert.strictEqual(Number(h.sandbox.document.getElementById('subAmountInput').value), 299);
  assert.strictEqual(h.sandbox.document.getElementById('subCategorySelect').value, 'Entertainment');

  // Open add subscription modal
  h.openAddSubscriptionModal();
  assert.strictEqual(overlay.classList.contains('active'), true);

  // Submit card-tied subscription
  h.sandbox.document.getElementById('subCardSelect').value = card.id;
  h.sandbox.document.getElementById('subParentCardId').value = card.id;
  h.sandbox.document.getElementById('subEditingId').value = '';
  h.sandbox.document.getElementById('subNameInput').value = 'Spotify Aile';
  h.sandbox.document.getElementById('subAmountInput').value = '99';
  h.sandbox.document.getElementById('subCategorySelect').value = 'Entertainment';

  h.handleSubscriptionFormSubmit({ preventDefault: () => {} });
  const addedSub = (card.subscriptions || []).find(s => s.name === 'Spotify Aile');
  assert.ok(addedSub);
  assert.strictEqual(addedSub.amount, 99);

  // Submit cash subscription (Kira)
  h.openAddSubscriptionModal();
  h.sandbox.document.getElementById('subCardSelect').value = 'cash';
  h.sandbox.document.getElementById('subParentCardId').value = 'cash';
  h.sandbox.document.getElementById('subEditingId').value = '';
  h.sandbox.document.getElementById('subNameInput').value = 'Ev Kirası';
  h.sandbox.document.getElementById('subAmountInput').value = '25000';
  h.sandbox.document.getElementById('subCategorySelect').value = 'Rent';

  h.handleSubscriptionFormSubmit({ preventDefault: () => {} });
  const addedCash = (h.getState().cashSubscriptions || []).find(s => s.name === 'Ev Kirası');
  assert.ok(addedCash);
  assert.strictEqual(addedCash.amount, 25000);

  // Open edit subscription modal
  h.openEditSubscriptionModal('cash', addedCash.id);
  assert.strictEqual(h.sandbox.document.getElementById('subNameInput').value, 'Ev Kirası');

  // Close subscription modal
  h.closeSubscriptionModal();
  assert.strictEqual(overlay.classList.contains('active'), false);
});

test('rent simulator modal lifecycle: open, calculate projection, close', () => {
  const h = createHarness();
  h.loadDemoData(false);
  const overlay = h.sandbox.document.getElementById('rentSimulatorModalOverlay');
  const results = h.sandbox.document.getElementById('simRentResultsContainer');

  // Open rent simulator
  h.openRentSimulatorModal();
  assert.strictEqual(overlay.classList.contains('active'), true);

  // Calculate simulation
  h.sandbox.document.getElementById('simRentMonthlyInput').value = '30000';
  h.sandbox.document.getElementById('simRentInflationInput').value = '40';
  h.sandbox.document.getElementById('simRentReturnInput').value = '45';

  h.calculateRentSavingsSimulation();
  assert.match(results.innerHTML, /1 Yıllık Tasarruf/);
  assert.match(results.innerHTML, /5 Yılda Ödenen Kira/);
  assert.match(results.innerHTML, /5 Yıllık Yatırım Değeri/);
  assert.match(results.innerHTML, /Projeksiyon Tablosu/);

  // Close rent simulator
  h.closeRentSimulatorModal();
  assert.strictEqual(overlay.classList.contains('active'), false);
});
