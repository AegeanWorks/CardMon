function navigateToTab(tabTarget) {
  if (!tabTarget) return;

  // Update sidebar active buttons
  document.querySelectorAll('.tab-btn, .sidebar-nav-btn').forEach(b => {
    if (b.getAttribute('data-tab') === tabTarget) {
      b.classList.add('active');
    } else {
      b.classList.remove('active');
    }
  });

  // Update all tab panes
  document.querySelectorAll('.tab-pane').forEach(p => {
    p.classList.remove('active');
  });
  
  const targetPane = document.getElementById(`tabPane-${tabTarget}`);
  if (targetPane) {
    targetPane.classList.add('active');
  }
  
  state.activeTab = tabTarget;
  if (tabTarget === 'timeline') {
    renderTimelineView();
  }
  const sidebar = document.getElementById('appSidebar');
  if (sidebar) sidebar.classList.remove('mobile-open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function toggleMobileSidebar() {
  const sidebar = document.getElementById('appSidebar');
  if (sidebar) sidebar.classList.toggle('mobile-open');
}

function toggleCardPermission(cardId, permKey) {
  const card = state.cards.find(c => c.id === cardId);
  if (!card) return;

  if (!card.permissions) {
    card.permissions = { internet: true, abroad: false, contactless: true, cashAdvance: true };
  }

  if (permKey === 'isFrozen') {
    card.isFrozen = !card.isFrozen;
    showToast(`${card.nickname}: ${card.isFrozen ? 'Kart geçici olarak donduruldu (bloke).' : 'Kart kilidi kaldırıldı (aktif).'}`);
  } else {
    card.permissions[permKey] = !card.permissions[permKey];
    const stateStr = card.permissions[permKey] ? 'açıldı (aktif).' : 'bloke edildi (kapalı).';
    let permName = 'İzin';
    if (permKey === 'internet') permName = 'İnternet / E-Ticaret';
    else if (permKey === 'abroad') permName = 'Yurtdışı Alışveriş';
    else if (permKey === 'contactless') permName = 'Temassız Ödeme';
    else if (permKey === 'cashAdvance') permName = 'Nakit Avans';

    showToast(`${card.nickname}: ${permName} ${stateStr}`);
  }

  saveToStorage();
  renderAll();
}

// Card Quick Type Filter Pills
function setCardTypeFilter(type) {
  state.typeFilter = type;
  document.querySelectorAll('.quick-filter-pill').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-filter') === type);
  });
  renderCardsView();
}



// --------------------------------------------------------------------------
// User Profile & Settings Modal
// --------------------------------------------------------------------------
function openProfileModal() {
  const p = state.profile || { firstName: 'Yunus', lastName: 'Emre', title: 'Finansal Yönetici', avatarColor: '#3b82f6', monthlyIncome: 75000, salaryDay: 1 };
  
  document.getElementById('profileFirstName').value = p.firstName || '';
  document.getElementById('profileLastName').value = p.lastName || '';
  document.getElementById('profileTitle').value = p.title || '';
  document.getElementById('profileAvatarColor').value = p.avatarColor || '#3b82f6';
  document.getElementById('profileIncome').value = p.monthlyIncome || '';
  document.getElementById('profileSalaryDay').value = p.salaryDay || 1;

  if (document.getElementById('profileCurrencySelect')) {
    document.getElementById('profileCurrencySelect').value = currentCurrency;
  }
  if (document.getElementById('profileLangSelect')) {
    document.getElementById('profileLangSelect').value = currentLang;
  }

  updateProfileModalLivePreview();
  document.getElementById('profileModalOverlay').classList.add('active');
}

function closeProfileModal() {
  document.getElementById('profileModalOverlay').classList.remove('active');
}

function updateProfileModalLivePreview() {
  const first = (document.getElementById('profileFirstName')?.value || '').trim();
  const last = (document.getElementById('profileLastName')?.value || '').trim();
  const title = (document.getElementById('profileTitle')?.value || '').trim();
  const color = document.getElementById('profileAvatarColor')?.value || '#3b82f6';

  const fullName = `${first} ${last}`.trim() || 'Yunus Emre';
  const initials = (((first[0] || 'Y') + (last[0] || (first[1] || 'E')))).toUpperCase();

  const previewAvatar = document.getElementById('modalAvatarPreview');
  if (previewAvatar) {
    previewAvatar.textContent = initials;
    previewAvatar.style.background = color;
  }
  const previewName = document.getElementById('modalUserNamePreview');
  if (previewName) previewName.textContent = fullName;
  const previewTitle = document.getElementById('modalUserTitlePreview');
  if (previewTitle) previewTitle.textContent = title || t('userProfile');
}

function handleProfileFormSubmit(e) {
  e.preventDefault();
  const firstName = document.getElementById('profileFirstName').value.trim();
  const lastName = document.getElementById('profileLastName').value.trim();
  const title = document.getElementById('profileTitle').value.trim();
  const avatarColor = document.getElementById('profileAvatarColor').value;
  const monthlyIncome = parseFloat(document.getElementById('profileIncome').value) || 0;
  const salaryDay = parseInt(document.getElementById('profileSalaryDay').value, 10) || 1;

  const selectedCurr = document.getElementById('profileCurrencySelect').value;
  const selectedLang = document.getElementById('profileLangSelect').value;

  state.profile = {
    firstName: firstName || 'Yunus',
    lastName: lastName || 'Emre',
    title: title || 'Finansal Yönetici',
    avatarColor: avatarColor || '#3b82f6',
    monthlyIncome,
    salaryDay
  };

  if (selectedCurr && selectedCurr !== currentCurrency) {
    setCurrency(selectedCurr);
  }
  if (selectedLang && selectedLang !== currentLang) {
    setLanguage(selectedLang);
  }

  saveToStorage();
  closeProfileModal();
  renderAll();
  showToast(t('profileSaved'));
}

// --------------------------------------------------------------------------
// Settings & Backup Dropdown
// --------------------------------------------------------------------------
function toggleSettingsDropdown(event) {
  if (event && event.stopPropagation) {
    event.stopPropagation();
  }
  const menu = document.getElementById('settingsDropdownMenu');
  if (menu) {
    menu.classList.toggle('active');
  }
}

function closeSettingsDropdown() {
  const menu = document.getElementById('settingsDropdownMenu');
  if (menu) {
    menu.classList.remove('active');
  }
}

document.addEventListener('click', (e) => {
  const wrapper = document.getElementById('settingsDropdownWrapper');
  if (wrapper && !wrapper.contains(e.target)) {
    closeSettingsDropdown();
  }
});

// --------------------------------------------------------------------------
// Smart Hybrid Date Assistant Handlers
// --------------------------------------------------------------------------
function handleCutoffWeekChange() {
  const week = document.getElementById('cardApproxCutoff')?.value || 'week3';
  let suggestedCutoff = 15;
  if (week === 'week1') suggestedCutoff = 5;
  else if (week === 'week2') suggestedCutoff = 10;
  else if (week === 'week3') suggestedCutoff = 15;
  else if (week === 'week4') suggestedCutoff = 22;
  else if (week === 'weekMonthEnd') suggestedCutoff = 28;

  const cutoffInput = document.getElementById('cardCutoffDay');
  if (cutoffInput) cutoffInput.value = suggestedCutoff;

  // Auto set Due day +10 days
  const dueInput = document.getElementById('cardDueDay');
  if (dueInput) {
    dueInput.value = ((suggestedCutoff + 10 - 1) % getDaysInCurrentMonth()) + 1;
  }

  updateCardDateLivePreview();
}

function handleCutoffDayInput() {
  const cutoffVal = parseInt(document.getElementById('cardCutoffDay')?.value, 10) || 15;
  
  // Auto-sync week selector based on typed day
  const weekSelect = document.getElementById('cardApproxCutoff');
  if (weekSelect) {
    if (cutoffVal <= 7) weekSelect.value = 'week1';
    else if (cutoffVal <= 14) weekSelect.value = 'week2';
    else if (cutoffVal <= 21) weekSelect.value = 'week3';
    else if (cutoffVal <= 28) weekSelect.value = 'week4';
    else weekSelect.value = 'weekMonthEnd';
  }

  // Auto set Due day +10 days
  const dueInput = document.getElementById('cardDueDay');
  if (dueInput) {
    dueInput.value = ((cutoffVal + 10 - 1) % getDaysInCurrentMonth()) + 1;
  }

  updateCardDateLivePreview();
}

function applyDueOffset(offsetDays) {
  const cutoffVal = parseInt(document.getElementById('cardCutoffDay')?.value, 10) || 15;
  const dueInput = document.getElementById('cardDueDay');
  if (dueInput) {
    dueInput.value = ((cutoffVal + offsetDays - 1) % getDaysInCurrentMonth()) + 1;
  }
  updateCardDateLivePreview();
}

function updateCardDateLivePreview() {
  const cutoffDay = parseInt(document.getElementById('cardCutoffDay')?.value, 10) || 15;
  const dueDay = parseInt(document.getElementById('cardDueDay')?.value, 10) || 25;
  const weekSelect = document.getElementById('cardApproxCutoff');
  const weekText = weekSelect ? weekSelect.options[weekSelect.selectedIndex]?.text : '3. Hafta';

  const previewBox = document.getElementById('cardDateLivePreview');
  if (!previewBox) return;

  const today = new Date().getDate();
  const daysToCutoff = cutoffDay >= today ? cutoffDay - today : cutoffDay + getDaysInCurrentMonth() - today;
  const daysToDue = dueDay >= today ? dueDay - today : dueDay + getDaysInCurrentMonth() - today;

  previewBox.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:0.3rem;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span>📅 <strong>Ekstre Kesimi:</strong> Her ayın ${cutoffDay}'i</span>
        <span style="color:#38bdf8; font-weight:700;">${daysToCutoff === 0 ? 'Bugün kesiliyor!' : `${daysToCutoff} gün sonra`}</span>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span>⏳ <strong>Son Ödeme:</strong> Her ayın ${dueDay}'i</span>
        <span style="color:#fbbf24; font-weight:700;">${daysToDue === 0 ? 'Bugün son gün!' : `${daysToDue} gün sonra`}</span>
      </div>
      <div style="font-size:0.72rem; color:var(--text-muted); border-top:1px dashed rgba(255,255,255,0.1); padding-top:0.3rem; margin-top:0.2rem;">
        Dönem: <strong>${weekText}</strong> • Kesimden sonra ödeme için <strong>${((dueDay - cutoffDay + getDaysInCurrentMonth()) % getDaysInCurrentMonth())} gün</strong> süre.
      </div>
    </div>
  `;
}

// --------------------------------------------------------------------------
// Card Add/Edit Logic & Katılım Bankası Rule Handlers
// --------------------------------------------------------------------------
function toggleParticipationRule(isKatilim) {
  const minRatioSelect = document.getElementById('cardMinRatio');
  const notice = document.getElementById('katilimBankNotice');
  if (isKatilim) {
    if (minRatioSelect) minRatioSelect.value = '100';
    if (notice) notice.style.display = 'block';
  } else {
    if (minRatioSelect && minRatioSelect.value === '100') minRatioSelect.value = '20';
    if (notice) notice.style.display = 'none';
  }
}

function handleMinRatioSelectChange(val) {
  const katilimCheckbox = document.getElementById('cardIsParticipation');
  const notice = document.getElementById('katilimBankNotice');
  if (val === '100') {
    if (katilimCheckbox) katilimCheckbox.checked = true;
    if (notice) notice.style.display = 'block';
  } else {
    if (katilimCheckbox) katilimCheckbox.checked = false;
    if (notice) notice.style.display = 'none';
  }
}

function openAddCardModal() {
  state.editingCardId = null;
  document.getElementById('cardModalTitle').textContent = t('addCard');
  document.getElementById('cardForm').reset();
  
  // Reset Katılım Bankası switch & min ratio
  const katilimCheck = document.getElementById('cardIsParticipation');
  if (katilimCheck) katilimCheck.checked = false;
  const katilimNotice = document.getElementById('katilimBankNotice');
  if (katilimNotice) katilimNotice.style.display = 'none';
  document.getElementById('cardMinRatio').value = '20';

  // Reset permissions defaults
  document.getElementById('cardPermInternet').checked = true;
  document.getElementById('cardPermAbroad').checked = false;
  document.getElementById('cardPermContactless').checked = true;
  document.getElementById('cardPermCashAdvance').checked = true;
  document.getElementById('cardPermFrozen').checked = false;

  // Reset annual fee defaults
  document.getElementById('cardAnnualFeeInput').value = '';
  document.getElementById('cardAnnualFeeMonthSelect').value = 'none';
  document.getElementById('cardAnnualFeeStatusSelect').value = 'none';

  // Dates defaults
  document.getElementById('cardApproxCutoff').value = 'week3';
  document.getElementById('cardCutoffDay').value = 15;
  document.getElementById('cardDueDay').value = 25;
  updateCardDateLivePreview();

  state.selectedTheme = 'theme-midnight';
  document.querySelectorAll('.theme-swatch').forEach(s => {
    s.classList.toggle('active', s.getAttribute('data-theme') === 'theme-midnight');
  });

  document.getElementById('cardModalOverlay').classList.add('active');
}

function openEditCardModal(cardId) {
  const card = state.cards.find(c => c.id === cardId);
  if (!card) return;

  state.editingCardId = cardId;
  document.getElementById('cardModalTitle').textContent = t('editCard');
  
  document.getElementById('cardBankSelect').value = card.bankId || '';
  document.getElementById('cardNickname').value = card.nickname || '';
  document.getElementById('cardLast4').value = card.last4 || '';
  document.getElementById('cardNetwork').value = card.network || 'Mastercard';
  document.getElementById('cardType').value = card.type || 'typePersonal';
  document.getElementById('cardLimitInput').value = card.limit || '';
  document.getElementById('cardUsedInput').value = card.usedBalance || '0';

  const isKatilim = card.isParticipationBank || Number(card.minPaymentRatio) === 100;
  document.getElementById('cardMinRatio').value = isKatilim ? '100' : (card.minPaymentRatio || '20');
  const katilimCheck = document.getElementById('cardIsParticipation');
  if (katilimCheck) katilimCheck.checked = isKatilim;
  const katilimNotice = document.getElementById('katilimBankNotice');
  if (katilimNotice) katilimNotice.style.display = isKatilim ? 'block' : 'none';

  const perms = card.permissions || { internet: true, abroad: false, contactless: true, cashAdvance: true };
  document.getElementById('cardPermInternet').checked = perms.internet !== false;
  document.getElementById('cardPermAbroad').checked = !!perms.abroad;
  document.getElementById('cardPermContactless').checked = perms.contactless !== false;
  document.getElementById('cardPermCashAdvance').checked = perms.cashAdvance !== false;
  document.getElementById('cardPermFrozen').checked = !!card.isFrozen;

  document.getElementById('cardAnnualFeeInput').value = card.annualFeeAmount || '';
  document.getElementById('cardAnnualFeeMonthSelect').value = card.annualFeeMonth || 'none';
  document.getElementById('cardAnnualFeeStatusSelect').value = card.annualFeeStatus || 'none';

  document.getElementById('cardCutoffDay').value = card.cutoffDay || '15';
  document.getElementById('cardDueDay').value = card.dueDay || '25';
  document.getElementById('cardApproxCutoff').value = card.approxCutoffWeek || 'week3';
  updateCardDateLivePreview();

  state.selectedTheme = card.theme || 'theme-midnight';
  document.querySelectorAll('.theme-swatch').forEach(s => {
    s.classList.toggle('active', s.getAttribute('data-theme') === state.selectedTheme);
  });

  document.getElementById('cardModalOverlay').classList.add('active');
}

function closeCardModal() {
  document.getElementById('cardModalOverlay').classList.remove('active');
}

function handleCardFormSubmit(e) {
  e.preventDefault();

  const bankId = document.getElementById('cardBankSelect').value;
  const nickname = document.getElementById('cardNickname').value.trim();
  const last4 = document.getElementById('cardLast4').value.trim();
  const network = document.getElementById('cardNetwork').value;
  const type = document.getElementById('cardType').value;
  const limit = parseFloat(document.getElementById('cardLimitInput').value) || 0;
  const usedBalance = parseFloat(document.getElementById('cardUsedInput').value) || 0;
  
  const minRatioVal = parseFloat(document.getElementById('cardMinRatio').value) || 20;
  const isParticipationBank = document.getElementById('cardIsParticipation')?.checked || minRatioVal === 100;
  const minPaymentRatio = isParticipationBank ? 100 : minRatioVal;
  
  const cutoffDay = parseInt(document.getElementById('cardCutoffDay').value, 10) || 15;
  const dueDay = parseInt(document.getElementById('cardDueDay').value, 10) || 25;
  const approxCutoffWeek = document.getElementById('cardApproxCutoff').value || 'week3';
  const approxDueWeek = dueDay <= 7 ? 'week1' : (dueDay <= 14 ? 'week2' : (dueDay <= 21 ? 'week3' : (dueDay <= 28 ? 'week4' : 'weekMonthEnd')));
  const dateMethod = 'exact';

  const permissions = {
    internet: document.getElementById('cardPermInternet').checked,
    abroad: document.getElementById('cardPermAbroad').checked,
    contactless: document.getElementById('cardPermContactless').checked,
    cashAdvance: document.getElementById('cardPermCashAdvance').checked
  };
  const isFrozen = document.getElementById('cardPermFrozen').checked;

  const annualFeeAmount = parseFloat(document.getElementById('cardAnnualFeeInput').value) || 0;
  const annualFeeMonth = document.getElementById('cardAnnualFeeMonthSelect').value;
  const annualFeeStatus = document.getElementById('cardAnnualFeeStatusSelect').value;

  if (!bankId || !nickname) {
    alert('Lütfen banka ve kart adını giriniz. / Please provide bank and card name.');
    return;
  }

  // Auto-mark bank as having credit cards
  const targetBank = state.banks.find(b => b.id === bankId);
  if (targetBank) targetBank.hasCreditCard = true;

  if (state.editingCardId) {
    const idx = state.cards.findIndex(c => c.id === state.editingCardId);
    if (idx !== -1) {
      state.cards[idx] = {
        ...state.cards[idx],
        bankId,
        nickname,
        last4,
        network,
        type,
        limit,
        usedBalance,
        minPaymentRatio,
        isParticipationBank,
        dateMethod,
        cutoffDay,
        dueDay,
        approxCutoffWeek,
        approxDueWeek,
        permissions,
        isFrozen,
        annualFeeAmount,
        annualFeeMonth,
        annualFeeStatus,
        theme: state.selectedTheme
      };
    }
  } else {
    const newCard = {
      id: 'c-' + Date.now(),
      bankId,
      nickname,
      last4,
      network,
      type,
      limit,
      usedBalance,
      minPaymentRatio,
      isParticipationBank,
      dateMethod,
      cutoffDay,
      dueDay,
      approxCutoffWeek,
      approxDueWeek,
      permissions,
      isFrozen,
      annualFeeAmount,
      annualFeeMonth,
      annualFeeStatus,
      virtualCards: [],
      subscriptions: [],
      installments: [],
      theme: state.selectedTheme
    };
    state.cards.push(newCard);
  }

  saveToStorage();
  closeCardModal();
  renderAll();
  showToast(t('cardSaved'));
}

function confirmDeleteCard(cardId) {
  if (confirm(t('confirmDeleteCard'))) {
    state.cards = state.cards.filter(c => c.id !== cardId);
    saveToStorage();
    renderAll();
    showToast(t('cardDeleted'));
  }
}

// --------------------------------------------------------------------------
// Quick Transaction & Installment Modal Logic
// --------------------------------------------------------------------------
function openQuickTxModal(cardId, initialType = 'expense') {
  const card = state.cards.find(c => c.id === cardId);
  if (!card) return;

  document.getElementById('quickTxCardId').value = cardId;
  document.getElementById('quickTxAmountInput').value = '';
  document.getElementById('quickTxDescInput').value = '';
  document.getElementById('quickTxInstallmentSelect').value = '1';

  const bank = state.banks.find(b => b.id === card.bankId);
  const previewEl = document.getElementById('quickTxCardPreview');
  if (previewEl) {
    previewEl.innerHTML = `
      <div style="background:rgba(0,0,0,0.25); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:0.75rem 1rem; margin-bottom:1rem; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <strong style="color:var(--text-primary); font-size:0.95rem;">${escapeHtml(card.nickname)}</strong>
          <div style="font-size:0.75rem; color:var(--text-muted);">${bank ? bank.name : ''} (•${card.last4 || '••••'})</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:0.72rem; color:var(--text-muted);">Güncel Borç / Limit</div>
          <strong style="color:#fb7185;">${formatMoney(card.usedBalance || 0)}</strong> / <span style="color:var(--text-secondary); font-size:0.8rem;">${formatMoney(card.limit || 0)}</span>
        </div>
      </div>
    `;
  }

  if (initialType === 'payment') {
    document.getElementById('txTypePayment').checked = true;
  } else {
    document.getElementById('txTypeExpense').checked = true;
  }

  updateQuickTxFormMode();
  updateQuickTxInstallmentPreview();
  document.getElementById('quickTxModalOverlay').classList.add('active');
}

function closeQuickTxModal() {
  document.getElementById('quickTxModalOverlay').classList.remove('active');
}

function updateQuickTxFormMode() {
  const isPayment = document.getElementById('txTypePayment').checked;
  const expenseLabel = document.getElementById('txTypeExpenseLabel');
  const paymentLabel = document.getElementById('txTypePaymentLabel');
  const installmentGroup = document.getElementById('quickTxInstallmentGroup');
  const presetsGroup = document.getElementById('quickTxPaymentPresetsGroup');
  const presetsList = document.getElementById('quickTxPaymentPresetsList');
  const submitBtn = document.getElementById('quickTxSubmitBtn');

  const cardId = document.getElementById('quickTxCardId')?.value;
  const card = state.cards.find(c => c.id === cardId);

  if (isPayment) {
    if (expenseLabel) expenseLabel.classList.remove('active');
    if (paymentLabel) paymentLabel.classList.add('active');
    if (installmentGroup) installmentGroup.style.display = 'none';
    if (presetsGroup) presetsGroup.style.display = 'block';

    // Reset cycle to current when switching to payment mode
    const cycleCurrent = document.getElementById('startCycleCurrent');
    if (cycleCurrent) cycleCurrent.checked = true;
    const warningEl = document.getElementById('startCycleNextWarning');
    if (warningEl) warningEl.style.display = 'none';

    if (card && presetsList) {
      const debt = Number(card.usedBalance) || 0;
      const isKatilim = card.isParticipationBank || Number(card.minPaymentRatio) === 100;
      const minRatio = isKatilim ? 100 : (Number(card.minPaymentRatio) || 20);
      const minDue = isKatilim ? debt : Math.round((debt * minRatio) / 100);
      const insts = card.installments || [];
      const monthlyInstSum = insts.reduce((sum, inst) => sum + (Number(inst.monthlyAmount) || (inst.totalAmount / (inst.installmentCount || 1))), 0);

      presetsList.innerHTML = `
        ${debt > 0 ? `
          <button type="button" class="btn-preset-pill" style="border-color:rgba(16,185,129,0.4); color:#34d399;" onclick="setQuickTxAmount(${debt}, 'Tüm Dönem Borcu Kapatma')">
            🟢 Tüm Borcu Kapat (${formatMoney(debt)})
          </button>
        ` : ''}
        ${monthlyInstSum > 0 ? `
          <button type="button" class="btn-preset-pill" style="border-color:rgba(56,189,248,0.4); color:#38bdf8;" onclick="setQuickTxAmount(${monthlyInstSum}, 'Bu Ayki Taksit Ödemesi')">
            💳 Bu Ayki Taksiti Düş (${formatMoney(monthlyInstSum)})
          </button>
        ` : ''}
        ${(minDue > 0 && minDue !== debt) ? `
          <button type="button" class="btn-preset-pill" style="border-color:rgba(251,191,36,0.4); color:#fbbf24;" onclick="setQuickTxAmount(${minDue}, 'Asgari Tutar Ödemesi')">
            🟡 Asgari Tutar (${formatMoney(minDue)})
          </button>
        ` : ''}
      `;
    }

    if (submitBtn) {
      submitBtn.textContent = 'Borç Ödemesini Kaydet (₺ Düşür)';
      submitBtn.className = 'btn btn-emerald';
    }
  } else {
    if (expenseLabel) expenseLabel.classList.add('active');
    if (paymentLabel) paymentLabel.classList.remove('active');
    if (installmentGroup) installmentGroup.style.display = 'block';
    if (presetsGroup) presetsGroup.style.display = 'none';

    if (submitBtn) {
      submitBtn.textContent = 'Harcamayı Ekle (₺ Borca Ekle)';
      submitBtn.className = 'btn btn-primary';
    }
  }
}

function setQuickTxAmount(amount, desc = '') {
  const amtInput = document.getElementById('quickTxAmountInput');
  const descInput = document.getElementById('quickTxDescInput');
  if (amtInput) amtInput.value = amount;
  if (descInput && desc) descInput.value = desc;
}

function updateQuickTxInstallmentPreview() {
  const cardId = document.getElementById('quickTxCardId').value;
  const card = state.cards.find(c => c.id === cardId);
  const amount = parseFloat(document.getElementById('quickTxAmountInput').value) || 0;
  const installments = parseInt(document.getElementById('quickTxInstallmentSelect').value, 10) || 1;
  const isNextCycle = document.getElementById('startCycleNext')?.checked;
  const noticeEl = document.getElementById('quickTxInstallmentNotice');
  const warningEl = document.getElementById('startCycleNextWarning');

  // Show/hide next-cycle warning banner
  if (warningEl) warningEl.style.display = isNextCycle ? 'block' : 'none';

  if (!noticeEl) return;

  if (!card) {
    noticeEl.innerHTML = '';
    return;
  }

  const today = new Date().getDate();
  let cutoffDay = card.dateMethod === 'exact' ? Number(card.cutoffDay) : getApproxDay(card.approxCutoffWeek);
  if (!cutoffDay || isNaN(cutoffDay)) cutoffDay = 15;

  const monthlyInstallment = installments > 0 ? parseFloat((amount / installments).toFixed(2)) : 0;
  const isCutoffPassed = today > cutoffDay;

  if (isNextCycle) {
    noticeEl.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:0.35rem;">
        <div style="display:flex; justify-content:space-between; font-weight:700; color:var(--text-primary);">
          <span>Aylık Taksit Tutarı:</span>
          <span style="color:#22d3ee;">${amount > 0 ? formatMoney(monthlyInstallment) : formatMoney(0)} × ${installments} Ay</span>
        </div>
        <div style="font-size:0.78rem; color:#fbbf24;">
          ⏳ <strong>Başlangıç:</strong> Sonraki ekstre keşiminden itibaren — bu ayki borç bakiyeniz <strong>değişmez</strong>.
        </div>
        <div style="font-size:0.78rem; color:var(--text-secondary);">
          📋 Kart üzerindeki <strong>Planlanan Taksitler</strong> bölümünde görünecek, ekstre keşiminde aktife alınabilir.
        </div>
      </div>
    `;
  } else {
    noticeEl.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:0.35rem;">
        <div style="display:flex; justify-content:space-between; font-weight:700; color:var(--text-primary);">
          <span>Aylık Taksit Tutarı:</span>
          <span style="color:#22d3ee;">${amount > 0 ? formatMoney(monthlyInstallment) : formatMoney(0)} × ${installments} Ay</span>
        </div>
        <div style="font-size:0.78rem; color:${isCutoffPassed ? '#f59e0b' : '#34d399'};">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><rect x="3" y="5" width="18" height="16" rx="2"></rect><line x1="16" y1="3" x2="16" y2="7"></line><line x1="8" y1="3" x2="8" y2="7"></line><line x1="3" y1="11" x2="21" y2="11"></line></svg> <strong>Ekstre Kesim Günü:</strong> Ayın ${cutoffDay}${turkishDaySuffix(cutoffDay)} (Bugün: ${today}. gün)
        </div>
        <div style="font-size:0.78rem; color:var(--text-secondary);">
          ${isCutoffPassed ? `
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12" y2="17"></line></svg> <strong>1. Taksit Başlangıcı:</strong> Bu ayki ekstre kesildiği için ilk taksit <strong>bir sonraki ekstre döneminde</strong> ödenecektir.
          ` : `
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><polyline points="20 6 9 17 4 12"></polyline></svg> <strong>1. Taksit Başlangıcı:</strong> Ekstre kesim gününe henüz gelinmediği için ilk taksit <strong>bu ayki ekstreye</strong> yansıyacaktır.
          `}
        </div>
      </div>
    `;
  }
}

function handleQuickTxSubmit(e) {
  e.preventDefault();
  const cardId = document.getElementById('quickTxCardId').value;
  const card = state.cards.find(c => c.id === cardId);
  if (!card) return;

  const isPayment = document.getElementById('txTypePayment').checked;
  const amount = parseFloat(document.getElementById('quickTxAmountInput').value) || 0;
  const desc = document.getElementById('quickTxDescInput').value.trim() || (isPayment ? 'Borç Ödeme' : 'Harcama');
  const installments = parseInt(document.getElementById('quickTxInstallmentSelect').value, 10) || 1;
  const isNextCycle = document.getElementById('startCycleNext')?.checked === true;

  if (amount <= 0) {
    alert('Lütfen geçerli bir tutar giriniz.');
    return;
  }

  const currentUsed = Number(card.usedBalance) || 0;

  if (isPayment) {
    card.usedBalance = Math.max(0, currentUsed - amount);
    // If full balance or more is paid, finish all installment plans
    if (card.usedBalance === 0 && card.installments && card.installments.length > 0) {
      card.installments = card.installments.filter(i => i.startCycle === 'next'); // keep planned ones
      showToast(`${card.nickname}: Tüm borç ödendi ve aktif taksit planları kapatıldı.`);
    } else {
      showToast(`${card.nickname}: ${formatMoney(amount)} tutarında borç ödemesi yapıldı.`);
    }
  } else {
    if (!card.installments) card.installments = [];

    if (isNextCycle) {
      // Next-cycle: record the plan but do NOT touch usedBalance yet
      card.installments.push({
        id: 'inst-' + Date.now(),
        desc,
        totalAmount: amount,
        installmentCount: installments,
        paidCount: 0,
        monthlyAmount: amount / installments,
        startCycle: 'next',
        date: new Date().toISOString()
      });
      showToast(`⏳ ${card.nickname}: ${formatMoney(amount)} (${installments} taksit) sonraki ekstreye planlandı — borç bakiyeniz değişmedi.`);
    } else {
      card.usedBalance = currentUsed + amount;
      if (installments > 1) {
        card.installments.push({
          id: 'inst-' + Date.now(),
          desc,
          totalAmount: amount,
          installmentCount: installments,
          paidCount: 0,
          monthlyAmount: amount / installments,
          startCycle: 'current',
          date: new Date().toISOString()
        });
        showToast(`${card.nickname}: ${formatMoney(amount)} (${installments} taksit) harcama eklendi.`);
      } else {
        showToast(`${card.nickname}: ${formatMoney(amount)} tek çekim harcama eklendi.`);
      }
    }
  }

  saveToStorage();
  closeQuickTxModal();
  renderAll();
}

function payCardFullDebt(cardId) {
  const card = state.cards.find(c => c.id === cardId);
  if (!card) return;

  if (card.isPaidThisMonth) {
    const restoreDebt = Number(card.paidThisMonthAmount) || 0;
    if (confirm(`"${card.nickname}" kartının bu ayki ödenmiş durumunu geri almak ve ${formatMoney(restoreDebt)} tutarındaki dönem borcunu tekrar aktif etmek istiyor musunuz?`)) {
      card.usedBalance = restoreDebt;
      card.isPaidThisMonth = false;
      card.paidThisMonthAmount = 0;
      saveToStorage();
      renderAll();
      showToast(`↩️ "${card.nickname}" kartı ödenmemiş durumuna geri alındı.`);
    }
    return;
  }

  const currentDebt = Number(card.usedBalance) || 0;
  if (currentDebt <= 0) {
    showToast(`${card.nickname} kartında ödenecek borç bulunmuyor.`);
    return;
  }

  if (confirm(`"${card.nickname}" kartının güncel ${formatMoney(currentDebt)} tutarındaki dönem borcunu ödendi olarak kapatmak istiyor musunuz?\n\n(Bu ayki takvim toplam nakit çıkışınız silinmez, korunan tutar ile "✓ Ödendi" olarak işaretlenir).`)) {
    card.paidThisMonthAmount = currentDebt;
    card.isPaidThisMonth = true;
    card.usedBalance = 0;
    card.installments = [];
    saveToStorage();
    renderAll();
    showToast(`✅ "${card.nickname}" kartının ${formatMoney(currentDebt)} tutarındaki dönem borcu ödendi olarak kapatıldı.`);
  }
}

function payCardMonthlyInstallments(cardId) {
  const card = state.cards.find(c => c.id === cardId);
  if (!card) return;

  if (!card.installments) card.installments = [];
  const insts = card.installments;
  if (insts.length === 0) {
    showToast(`${card.nickname} kartında aktif taksitli harcama bulunmuyor.`);
    return;
  }

  let totalMonthlyPaid = 0;
  const completedPlans = [];

  insts.forEach(inst => {
    const monthlyAmt = Number(inst.monthlyAmount) || (inst.totalAmount / (inst.installmentCount || 1));
    totalMonthlyPaid += monthlyAmt;
    inst.paidCount = (inst.paidCount || 0) + 1;
    if (inst.paidCount >= inst.installmentCount) {
      completedPlans.push(inst.desc);
    }
  });

  // Deduct from usedBalance
  card.usedBalance = Math.max(0, (Number(card.usedBalance) || 0) - totalMonthlyPaid);

  // Remove fully completed installments
  card.installments = insts.filter(inst => (inst.paidCount || 0) < inst.installmentCount);

  saveToStorage();
  renderAll();

  if (completedPlans.length > 0) {
    showToast(`🎉 ${card.nickname}: ${formatMoney(totalMonthlyPaid)} taksit ödendi. Biten taksitler silindi: ${completedPlans.join(', ')}`);
  } else {
    showToast(`✅ ${card.nickname}: ${formatMoney(totalMonthlyPaid)} tutarında bu ayki taksitler borçtan düşüldü.`);
  }
}

function paySingleInstallment(cardId, instId) {
  const card = state.cards.find(c => c.id === cardId);
  if (!card || !card.installments) return;

  const inst = card.installments.find(i => i.id === instId);
  if (!inst) return;

  const monthlyAmt = Number(inst.monthlyAmount) || (inst.totalAmount / (inst.installmentCount || 1));
  // Capture values before any mutation so they remain valid after the filter
  const instDesc = inst.desc;
  const instTotal = inst.installmentCount;
  inst.paidCount = (inst.paidCount || 0) + 1;
  const instPaid = inst.paidCount;

  card.usedBalance = Math.max(0, (Number(card.usedBalance) || 0) - monthlyAmt);

  const isCompleted = instPaid >= instTotal;
  if (isCompleted) {
    card.installments = card.installments.filter(i => i.id !== instId);
  }

  saveToStorage();
  renderAll();

  if (isCompleted) {
    showToast(`🎉 "${instDesc}" taksiti tamamen bitti (${instTotal}/${instTotal}) ve borçtan silindi!`);
  } else {
    showToast(`✅ "${instDesc}": ${instPaid}/${instTotal}. taksit ödendi (${formatMoney(monthlyAmt)} borçtan düşüldü).`);
  }
}

function activateNextCycleInstallment(cardId, instId) {
  const card = state.cards.find(c => c.id === cardId);
  if (!card || !card.installments) return;
  const inst = card.installments.find(i => i.id === instId);
  if (!inst) return;
  inst.startCycle = 'current';
  const totalInst = Number(inst.installmentCount) || 1;
  const monthlyAmt = Number(inst.monthlyAmount) || (Number(inst.totalAmount) / totalInst);
  card.usedBalance = (Number(card.usedBalance) || 0) + monthlyAmt;
  saveToStorage();
  renderAll();
  showToast(`✅ "${inst.desc || 'Taksit'}" aktif döneme alındı ve ${formatMoney(monthlyAmt)} borca eklendi.`);
}

function deleteInstallmentPlan(cardId, instId) {
  const card = state.cards.find(c => c.id === cardId);
  if (!card || !card.installments) return;

  const inst = card.installments.find(i => i.id === instId);
  if (!inst) return;

  const totalInst = Number(inst.installmentCount) || 1;
  const paidInst = Number(inst.paidCount) || 0;
  const monthlyAmt = Number(inst.monthlyAmount) || (inst.totalAmount / totalInst);
  const remainingInst = Math.max(0, totalInst - paidInst);
  const remainingTotal = remainingInst * monthlyAmt;

  const isPlanned = inst.startCycle === 'next';
  const label = isPlanned ? 'planlanan taksit' : 'taksit planı';
  const confirmMsg = isPlanned
    ? `"${inst.desc}" planlanan taksiti iptal etmek istiyor musunuz?`
    : `"${inst.desc}" taksit planını kaldırmak istiyor musunuz?\n\nKalan ${formatMoney(remainingTotal)} borç bakiyenizden de düşülecektir.`;

  if (confirm(confirmMsg)) {
    if (isPlanned) {
      card.installments = card.installments.filter(i => i.id !== instId);
      saveToStorage();
      renderAll();
      showToast(`"${inst.desc}" planlanan taksit iptal edildi.`);
    } else {
      const beforeBalance = Number(card.usedBalance) || 0;
      card.usedBalance = Math.max(0, beforeBalance - remainingTotal);
      const actualDeduction = beforeBalance - card.usedBalance;
      card.installments = card.installments.filter(i => i.id !== instId);
      saveToStorage();
      renderAll();
      showToast(`"${inst.desc}" taksit planı silindi ve ${formatMoney(actualDeduction)} kalan borçtan düşüldü.`);
    }
  }
}

// --------------------------------------------------------------------------
// Virtual Card (Sanal Kart) Modal & Actions
// --------------------------------------------------------------------------
function openAddVirtualCardModal(parentCardId, editingId = null) {
  const card = state.cards.find(c => c.id === parentCardId);
  if (!card) return;

  document.getElementById('vcParentCardId').value = parentCardId;
  document.getElementById('vcEditingId').value = editingId || '';
  document.getElementById('vcParentCardName').value = `${card.nickname} (${card.network})`;
  
  if (editingId) {
    const vc = (card.virtualCards || []).find(v => v.id === editingId);
    if (vc) {
      document.getElementById('virtualCardModalTitle').textContent = 'Sanal Kartı Düzenle';
      document.getElementById('vcNicknameInput').value = vc.nickname || '';
      document.getElementById('vcLast4Input').value = vc.last4 || '';
      document.getElementById('vcLimitInput').value = vc.limit || '';
      document.getElementById('vcPermInternet').checked = vc.isInternetActive !== false;
    }
  } else {
    document.getElementById('virtualCardModalTitle').textContent = 'Sanal Kart Ekle';
    document.getElementById('vcNicknameInput').value = '';
    document.getElementById('vcLast4Input').value = '';
    document.getElementById('vcLimitInput').value = '';
    document.getElementById('vcPermInternet').checked = true;
  }

  document.getElementById('virtualCardModalOverlay').classList.add('active');
}

function closeVirtualCardModal() {
  document.getElementById('virtualCardModalOverlay').classList.remove('active');
}

function handleVirtualCardFormSubmit(e) {
  e.preventDefault();
  const parentCardId = document.getElementById('vcParentCardId').value;
  const editingId = document.getElementById('vcEditingId').value;
  const card = state.cards.find(c => c.id === parentCardId);
  if (!card) return;

  const nickname = document.getElementById('vcNicknameInput').value.trim();
  const last4 = document.getElementById('vcLast4Input').value.trim();
  const limit = parseFloat(document.getElementById('vcLimitInput').value) || 0;
  const isInternetActive = document.getElementById('vcPermInternet').checked;

  if (!card.virtualCards) card.virtualCards = [];

  if (editingId) {
    const idx = card.virtualCards.findIndex(v => v.id === editingId);
    if (idx !== -1) {
      card.virtualCards[idx] = { ...card.virtualCards[idx], nickname, last4, limit, isInternetActive };
    }
  } else {
    card.virtualCards.push({
      id: 'vc-' + Date.now(),
      nickname,
      last4,
      limit,
      isInternetActive
    });
  }

  saveToStorage();
  closeVirtualCardModal();
  renderAll();
  showToast('Sanal kart başarıyla kaydedildi.');
}

function confirmDeleteVirtualCard(parentCardId, vcId) {
  const card = state.cards.find(c => c.id === parentCardId);
  if (!card || !card.virtualCards) return;

  if (confirm('Bu sanal kartı silmek istediğinize emin misiniz?')) {
    card.virtualCards = card.virtualCards.filter(v => v.id !== vcId);
    saveToStorage();
    renderAll();
    showToast('Sanal kart silindi.');
  }
}

// --------------------------------------------------------------------------
// Unified Subscriptions & Recurring Outflows Engine (Cards + Cash + Rent)
// --------------------------------------------------------------------------
function getAllSubscriptions() {
  const list = [];
  // Card-tied subscriptions
  (state.cards || []).forEach(card => {
    const bank = (state.banks || []).find(b => b.id === card.bankId) || { name: 'Banka', color: '#3b82f6' };
    (card.subscriptions || []).forEach(sub => {
      list.push({
        ...sub,
        paymentType: 'card',
        cardId: card.id,
        cardNickname: card.nickname,
        cardLast4: card.last4,
        cardColor: bank.color || '#3b82f6',
        bankName: bank.name,
        isFrozen: !!card.isFrozen
      });
    });
  });

  // Cash / Bank Transfer subscriptions (Kira, Bina Aidatı, Faturalar)
  (state.cashSubscriptions || []).forEach(sub => {
    const isBank = sub.paymentType === 'bank_transfer';
    list.push({
      ...sub,
      paymentType: sub.paymentType || 'cash',
      cardId: sub.paymentType || 'cash',
      cardNickname: isBank ? 'Banka Havalesi / Otomatik Ödeme' : 'Nakit / Elden Ödeme',
      cardLast4: '',
      cardColor: isBank ? '#0284c7' : '#10b981',
      bankName: isBank ? 'Banka Hesabı' : 'Nakit Cüzdan',
      isFrozen: false
    });
  });

  return list;
}

function populateSubCardSelect(selectedSource = null) {
  const select = document.getElementById('subCardSelect');
  if (!select) return;

  let html = `
    <optgroup label="💵 / 🏦 Nakit & Banka Ödemeleri">
      <option value="cash" ${selectedSource === 'cash' ? 'selected' : ''}>💵 Nakit / Elden Ödeme (Kira, Aidat vb.)</option>
      <option value="bank_transfer" ${selectedSource === 'bank_transfer' ? 'selected' : ''}>🏦 Banka Havalesi / Otomatik Ödeme (EFT vb.)</option>
    </optgroup>
  `;

  if (state.cards && state.cards.length > 0) {
    html += `<optgroup label="💳 Kayıtlı Kredi Kartları">`;
    state.cards.forEach(c => {
      const bank = state.banks.find(b => b.id === c.bankId)?.name || 'Banka';
      const isSel = selectedSource === c.id;
      html += `<option value="${c.id}" ${isSel ? 'selected' : ''}>💳 ${escapeHtml(bank)} - ${escapeHtml(c.nickname)} (${c.last4 ? `•${c.last4}` : c.network})</option>`;
    });
    html += `</optgroup>`;
  }

  select.innerHTML = html;
}

function applySubPreset(name, amount, category, cycle, currency = 'TRY', paymentSource = 'card', isEstimated = false) {
  const nameInput = document.getElementById('subNameInput');
  const amountInput = document.getElementById('subAmountInput');
  const catSelect = document.getElementById('subCategorySelect');
  const cycleSelect = document.getElementById('subCycleSelect');
  const currSelect = document.getElementById('subCurrencySelect');
  const estCheck = document.getElementById('subIsEstimated');
  const cardSelect = document.getElementById('subCardSelect');

  if (nameInput) nameInput.value = name;
  if (amountInput) amountInput.value = amount;
  if (catSelect) catSelect.value = category;
  if (cycleSelect) cycleSelect.value = cycle;
  if (currSelect) currSelect.value = currency;
  if (estCheck) estCheck.checked = !!isEstimated;

  if (cardSelect) {
    if (paymentSource === 'cash' || paymentSource === 'bank_transfer') {
      cardSelect.value = paymentSource;
    } else if (state.cards && state.cards.length > 0) {
      cardSelect.value = state.cards[0].id;
    }
  }
}

function openAddSubscriptionModal(presetSourceId = null) {
  document.getElementById('subParentCardId').value = presetSourceId || '';
  document.getElementById('subEditingId').value = '';
  document.getElementById('subscriptionModalTitle').textContent = 'Yeni Düzenli Gider / Abonelik Ekle';

  populateSubCardSelect(presetSourceId || (state.cards.length > 0 ? state.cards[0].id : 'cash'));

  document.getElementById('subNameInput').value = '';
  document.getElementById('subAmountInput').value = '';
  document.getElementById('subCategorySelect').value = 'Rent';
  document.getElementById('subCycleSelect').value = 'monthly';
  document.getElementById('subBillingDayInput').value = '15';
  if (document.getElementById('subCurrencySelect')) {
    document.getElementById('subCurrencySelect').value = 'TRY';
  }
  if (document.getElementById('subIsEstimated')) {
    document.getElementById('subIsEstimated').checked = false;
  }

  document.getElementById('subscriptionModalOverlay').classList.add('active');
}

function openEditSubscriptionModal(sourceId, subId) {
  let sub = null;
  const isCashSource = sourceId === 'cash' || sourceId === 'bank_transfer';

  if (isCashSource) {
    sub = (state.cashSubscriptions || []).find(s => s.id === subId);
  } else {
    const card = state.cards.find(c => c.id === sourceId);
    if (card) {
      sub = (card.subscriptions || []).find(s => s.id === subId);
    }
  }

  if (!sub) return;

  document.getElementById('subParentCardId').value = sourceId;
  document.getElementById('subEditingId').value = subId;
  document.getElementById('subscriptionModalTitle').textContent = 'Düzenli Gideri / Aboneliği Düzenle';

  populateSubCardSelect(sourceId);

  document.getElementById('subNameInput').value = sub.name || '';
  document.getElementById('subAmountInput').value = sub.amount || '';
  document.getElementById('subCategorySelect').value = sub.category || 'Rent';
  document.getElementById('subCycleSelect').value = sub.cycle || 'monthly';
  document.getElementById('subBillingDayInput').value = sub.billingDay || 1;
  if (document.getElementById('subCurrencySelect')) {
    document.getElementById('subCurrencySelect').value = sub.currency || 'TRY';
  }
  if (document.getElementById('subIsEstimated')) {
    document.getElementById('subIsEstimated').checked = !!sub.isEstimated;
  }

  document.getElementById('subscriptionModalOverlay').classList.add('active');
}

function closeSubscriptionModal() {
  document.getElementById('subscriptionModalOverlay').classList.remove('active');
}

function handleSubscriptionFormSubmit(e) {
  e.preventDefault();
  const targetSourceId = document.getElementById('subCardSelect').value;
  const originalSourceId = document.getElementById('subParentCardId').value;
  const editingId = document.getElementById('subEditingId').value;

  const name = document.getElementById('subNameInput').value.trim();
  const amount = parseFloat(document.getElementById('subAmountInput').value) || 0;
  const currency = document.getElementById('subCurrencySelect')?.value || 'TRY';
  const category = document.getElementById('subCategorySelect').value || 'Rent';
  const cycle = document.getElementById('subCycleSelect').value || 'monthly';
  const billingDay = parseInt(document.getElementById('subBillingDayInput').value, 10) || 1;
  const isEstimated = document.getElementById('subIsEstimated')?.checked || false;

  if (!name || amount <= 0) {
    alert('Lütfen geçerli bir isim ve tutar giriniz.');
    return;
  }

  const isTargetCash = targetSourceId === 'cash' || targetSourceId === 'bank_transfer';
  const isOriginalCash = originalSourceId === 'cash' || originalSourceId === 'bank_transfer';

  if (!state.cashSubscriptions) state.cashSubscriptions = [];

  // Remove from previous location if editing across types
  if (editingId) {
    if (isOriginalCash) {
      state.cashSubscriptions = state.cashSubscriptions.filter(s => s.id !== editingId);
    } else {
      const origCard = state.cards.find(c => c.id === originalSourceId);
      if (origCard && origCard.subscriptions) {
        origCard.subscriptions = origCard.subscriptions.filter(s => s.id !== editingId);
      }
    }
  }

  const subObj = {
    id: editingId || ('sub-' + Date.now()),
    name,
    amount,
    currency,
    category,
    cycle,
    billingDay,
    isEstimated,
    paymentType: isTargetCash ? targetSourceId : 'card'
  };

  if (isTargetCash) {
    state.cashSubscriptions.push(subObj);
  } else {
    const targetCard = state.cards.find(c => c.id === targetSourceId);
    if (targetCard) {
      if (!targetCard.subscriptions) targetCard.subscriptions = [];
      targetCard.subscriptions.push(subObj);
    }
  }

  saveToStorage();
  closeSubscriptionModal();
  renderAll();
  showToast(`${name} (${isEstimated ? 'Tahmini ' : ''}${formatMoney(amount)}) kaydedildi.`);
}

function confirmDeleteSubscription(parentSourceId, subId) {
  const isCashSource = parentSourceId === 'cash' || parentSourceId === 'bank_transfer';
  let subName = 'Abonelik / Gider';

  if (isCashSource) {
    const sub = (state.cashSubscriptions || []).find(s => s.id === subId);
    if (sub) subName = sub.name;
    if (confirm(`"${subName}" kaydını listeden kaldırmak istediğinize emin misiniz?`)) {
      state.cashSubscriptions = (state.cashSubscriptions || []).filter(s => s.id !== subId);
      saveToStorage();
      renderAll();
      showToast(`${subName} kaldırıldı.`);
    }
  } else {
    const card = state.cards.find(c => c.id === parentSourceId);
    if (!card || !card.subscriptions) return;
    const sub = card.subscriptions.find(s => s.id === subId);
    if (sub) subName = sub.name;
    if (confirm(`"${subName}" aboneliğini listeden kaldırmak istediğinize emin misiniz?`)) {
      card.subscriptions = card.subscriptions.filter(s => s.id !== subId);
      saveToStorage();
      renderAll();
      showToast(`${subName} aboneliği kaldırıldı.`);
    }
  }
}

// --------------------------------------------------------------------------
// 🏠 Homeownership vs Rent Savings Simulator Engine (Kira Kâr Simülatörü)
// --------------------------------------------------------------------------
function openRentSimulatorModal() {
  const allSubs = getAllSubscriptions();
  const rentSub = allSubs.find(s => s.category === 'Rent' || s.name.toLowerCase().includes('kira'));
  const monthlyRent = rentSub ? convertToTry(rentSub.amount, rentSub.currency) : 25000;

  const rentInput = document.getElementById('simRentMonthlyInput');
  if (rentInput) rentInput.value = Math.round(monthlyRent);

  calculateRentSavingsSimulation();
  document.getElementById('rentSimulatorModalOverlay').classList.add('active');
}

function closeRentSimulatorModal() {
  document.getElementById('rentSimulatorModalOverlay').classList.remove('active');
}

function calculateRentSavingsSimulation() {
  const monthlyRent = Number(document.getElementById('simRentMonthlyInput')?.value) || 25000;
  const annualInflation = Number(document.getElementById('simRentInflationInput')?.value) || 35;
  const investmentReturn = Number(document.getElementById('simRentReturnInput')?.value) || 40;

  const container = document.getElementById('simRentResultsContainer');
  if (!container) return;

  let yearlyBreakdown = [];
  let cumulativeRent = 0;
  let cumulativeInvestment = 0;
  const monthlyReturnRate = Math.pow(1 + investmentReturn / 100, 1 / 12) - 1;

  let currentMonthly = monthlyRent;

  for (let year = 1; year <= 10; year++) {
    const yearTotal = currentMonthly * 12;
    cumulativeRent += yearTotal;

    for (let m = 0; m < 12; m++) {
      cumulativeInvestment = (cumulativeInvestment + currentMonthly) * (1 + monthlyReturnRate);
    }

    yearlyBreakdown.push({
      year,
      monthlyRent: Math.round(currentMonthly),
      yearTotal: Math.round(yearTotal),
      cumulativeRent: Math.round(cumulativeRent),
      cumulativeInvestment: Math.round(cumulativeInvestment)
    });

    currentMonthly = currentMonthly * (1 + annualInflation / 100);
  }

  const y1 = yearlyBreakdown[0];
  const y3 = yearlyBreakdown[2];
  const y5 = yearlyBreakdown[4];
  const y10 = yearlyBreakdown[9];

  container.innerHTML = `
    <!-- Top Highlights Grid -->
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:0.65rem; margin-bottom:1rem;">
      <div style="background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.3); border-radius:var(--radius-md); padding:0.75rem 0.85rem;">
        <div style="font-size:0.7rem; color:#34d399; font-weight:700; text-transform:uppercase;">1 Yıllık Tasarruf</div>
        <div style="font-size:1.15rem; font-weight:800; color:#fff; margin-top:0.15rem;">${formatMoney(y1.yearTotal)}</div>
        <div style="font-size:0.65rem; color:var(--text-muted); margin-top:0.1rem;">Aylık ${formatMoney(monthlyRent)}</div>
      </div>

      <div style="background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.3); border-radius:var(--radius-md); padding:0.75rem 0.85rem;">
        <div style="font-size:0.7rem; color:#fbbf24; font-weight:700; text-transform:uppercase;">5 Yılda Ödenen Kira</div>
        <div style="font-size:1.15rem; font-weight:800; color:#fbbf24; margin-top:0.15rem;">${formatMoney(y5.cumulativeRent)}</div>
        <div style="font-size:0.65rem; color:var(--text-muted); margin-top:0.1rem;">%${annualInflation} yıllık artışla</div>
      </div>

      <div style="background:rgba(56,189,248,0.1); border:1px solid rgba(56,189,248,0.3); border-radius:var(--radius-md); padding:0.75rem 0.85rem;">
        <div style="font-size:0.7rem; color:#38bdf8; font-weight:700; text-transform:uppercase;">5 Yıllık Yatırım Değeri</div>
        <div style="font-size:1.15rem; font-weight:800; color:#38bdf8; margin-top:0.15rem;">${formatMoney(y5.cumulativeInvestment)}</div>
        <div style="font-size:0.65rem; color:var(--text-muted); margin-top:0.1rem;">%${investmentReturn} bileşik getiriyle</div>
      </div>

      <div style="background:rgba(168,85,247,0.1); border:1px solid rgba(168,85,247,0.3); border-radius:var(--radius-md); padding:0.75rem 0.85rem;">
        <div style="font-size:0.7rem; color:#c084fc; font-weight:700; text-transform:uppercase;">10 Yılda Ödenen Kira</div>
        <div style="font-size:1.15rem; font-weight:800; color:#c084fc; margin-top:0.15rem;">${formatMoney(y10.cumulativeRent)}</div>
        <div style="font-size:0.65rem; color:var(--text-muted); margin-top:0.1rem;">10 yıllık kümülatif yük</div>
      </div>
    </div>

    <!-- Strategic Comparison Box -->
    <div style="background:rgba(15,23,42,0.7); border:1px solid rgba(255,255,255,0.08); border-radius:var(--radius-md); padding:0.85rem 1rem; margin-bottom:1rem;">
      <h4 style="font-size:0.88rem; font-weight:700; color:#fff; margin-bottom:0.4rem;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><path d="M9 18h6"></path><path d="M10 22h4"></path><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"></path></svg> Finansal Karşılaştırma: Ev Sahibi Olmak vs Kirada Kalmak</h4>
      <div style="font-size:0.8rem; line-height:1.45; color:var(--text-secondary); display:flex; flex-direction:column; gap:0.35rem;">
        <div><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg> <strong>1. Kendi Evinizin Olması Durumunda:</strong> 5 yılda toplam <strong>${formatMoney(y5.cumulativeRent)}</strong> tutarındaki kira giderinden tamamen muaf kalırsınız. Bu tutar cebinizde birikim olarak kalır.</div>
        <div><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg> <strong>2. Gayrimenkul Değer Artışı:</strong> Ev fiyatları enflasyona karşı değer kazanırken, kira ödemek yerine ev sahibi olduğunuzda çift yönlü servet artışı sağlarsınız.</div>
        <div><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><line x1="3" y1="21" x2="21" y2="21"></line><line x1="3" y1="10" x2="21" y2="10"></line><path d="M5 10l7-7 7 7"></path><line x1="5" y1="21" x2="5" y2="10"></line><line x1="19" y1="21" x2="19" y2="10"></line><line x1="9" y1="21" x2="9" y2="14"></line><line x1="15" y1="21" x2="15" y2="14"></line></svg> <strong>3. Kredi Alternatifi:</strong> Aylık ${formatMoney(monthlyRent)} kira ödemesi, 120 ay vadeli bir konut kredisi taksitine dönüştürüldüğünde kira öder gibi kendi mülkünüzün sahibi olursunuz.</div>
      </div>
    </div>

    <!-- Yearly Breakdown Table -->
    <h4 style="font-size:0.82rem; font-weight:700; color:var(--text-secondary); margin-bottom:0.35rem;">Yıllara Göre Projeksiyon Tablosu</h4>
    <div class="table-responsive" style="max-height:200px; overflow-y:auto;">
      <table class="data-table" style="font-size:0.75rem;">
        <thead>
          <tr>
            <th>Yıl</th>
            <th>Tahmini Aylık Kira</th>
            <th>Yıllık Kira Gideri</th>
            <th>Kümülatif Kira (Cepten Çıkan)</th>
            <th>Bileşik Yatırım Değeri</th>
          </tr>
        </thead>
        <tbody>
          ${yearlyBreakdown.map(b => `
            <tr>
              <td><strong>${b.year}. Yıl</strong></td>
              <td>${formatMoney(b.monthlyRent)}</td>
              <td>${formatMoney(b.yearTotal)}</td>
              <td style="color:#fbbf24; font-weight:700;">${formatMoney(b.cumulativeRent)}</td>
              <td style="color:#34d399; font-weight:700;">${formatMoney(b.cumulativeInvestment)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// --------------------------------------------------------------------------
// Bank Add/Edit Logic
// --------------------------------------------------------------------------
function openAddBankModal() {
  state.editingBankId = null;
  document.getElementById('bankModalTitle').textContent = t('addBank');
  document.getElementById('bankForm').reset();
  
  // Populate Preset Bank options
  const presetSelect = document.getElementById('presetBankSelect');
  if (presetSelect) {
    presetSelect.innerHTML = PRESET_BANKS.map(p => `
      <option value="${p.key}">${p.name}</option>
    `).join('');
    presetSelect.value = 'garanti';
    document.getElementById('bankNameInput').value = PRESET_BANKS[0].name;
    document.getElementById('bankColorInput').value = PRESET_BANKS[0].color;
  }

  document.getElementById('bankHasCardSelect').value = 'yes';

  // Reset inline card fields
  document.getElementById('bankCardNickname').value = '';
  document.getElementById('bankCardLimit').value = '';
  document.getElementById('bankCardUsed').value = '0';
  document.getElementById('bankCardLast4').value = '';
  document.getElementById('bankCardNetwork').value = 'Mastercard';
  document.getElementById('bankCardType').value = 'typePersonal';

  // Show card section (default is "yes")
  const cardSection = document.getElementById('bankCardSection');
  if (cardSection) cardSection.style.display = 'block';

  document.getElementById('bankModalOverlay').classList.add('active');
}

function openEditBankModal(bankId) {
  const bank = state.banks.find(b => b.id === bankId);
  if (!bank) return;

  state.editingBankId = bankId;
  document.getElementById('bankModalTitle').textContent = t('editBank');
  
  const presetSelect = document.getElementById('presetBankSelect');
  if (presetSelect) {
    presetSelect.innerHTML = PRESET_BANKS.map(p => `
      <option value="${p.key}">${p.name}</option>
    `).join('');
    presetSelect.value = bank.presetKey || 'other';
  }

  document.getElementById('bankNameInput').value = bank.name || '';
  document.getElementById('bankColorInput').value = bank.color || '#3b82f6';
  document.getElementById('bankHasCardSelect').value = bank.hasCreditCard ? 'yes' : 'no';
  document.getElementById('bankSharedLimitInput').value = bank.sharedLimit || '';
  document.getElementById('bankEkHesapLimitInput').value = bank.ekHesapLimit || '';
  document.getElementById('bankNotesInput').value = bank.notes || '';

  // Hide card section when editing — cards are managed separately
  const cardSection = document.getElementById('bankCardSection');
  if (cardSection) cardSection.style.display = 'none';

  document.getElementById('bankModalOverlay').classList.add('active');
}

function toggleBankCardSection() {
  const hasCard = document.getElementById('bankHasCardSelect').value === 'yes';
  const cardSection = document.getElementById('bankCardSection');
  if (cardSection) cardSection.style.display = hasCard ? 'block' : 'none';
}

function closeBankModal() {
  document.getElementById('bankModalOverlay').classList.remove('active');
}

function handleBankFormSubmit(e) {
  e.preventDefault();

  const presetKey = document.getElementById('presetBankSelect').value;
  const name = document.getElementById('bankNameInput').value.trim();
  const color = document.getElementById('bankColorInput').value;
  const hasCreditCard = document.getElementById('bankHasCardSelect').value === 'yes';
  const sharedLimit = parseFloat(document.getElementById('bankSharedLimitInput').value) || 0;
  const ekHesapLimit = parseFloat(document.getElementById('bankEkHesapLimitInput').value) || 0;
  const notes = document.getElementById('bankNotesInput').value.trim();

  if (!name) {
    alert('Lütfen banka adını giriniz.');
    return;
  }

  if (state.editingBankId) {
    const idx = state.banks.findIndex(b => b.id === state.editingBankId);
    if (idx !== -1) {
      state.banks[idx] = {
        ...state.banks[idx],
        presetKey,
        name,
        color,
        hasCreditCard,
        sharedLimit,
        ekHesapLimit,
        notes
      };
    }
  } else {
    const newBankId = 'b-' + Date.now();
    const newBank = {
      id: newBankId,
      presetKey,
      name,
      color,
      hasCreditCard,
      sharedLimit,
      ekHesapLimit,
      notes
    };
    state.banks.push(newBank);

    // If user filled in the inline card section, create a card too
    if (hasCreditCard) {
      const cardNickname = document.getElementById('bankCardNickname').value.trim();
      const cardLimit = parseFloat(document.getElementById('bankCardLimit').value) || 0;
      if (cardNickname && cardLimit > 0) {
        const cardUsed = parseFloat(document.getElementById('bankCardUsed').value) || 0;
        const cardLast4 = document.getElementById('bankCardLast4').value.trim();
        const cardNetwork = document.getElementById('bankCardNetwork').value;
        const cardType = document.getElementById('bankCardType').value;
        const newCard = {
          id: 'c-' + (Date.now() + 1),
          bankId: newBankId,
          nickname: cardNickname,
          limit: cardLimit,
          usedBalance: cardUsed,
          last4: cardLast4,
          network: cardNetwork,
          type: cardType,
          dateMethod: 'exact',
          cutoffDay: 15,
          dueDay: 25,
          minPaymentRatio: 20,
          theme: 'midnight',
          permissions: { internet: true, abroad: false, contactless: true, cashAdvance: true, frozen: false },
          annualFee: 0,
          annualFeeMonth: 1,
          annualFeeStatus: 'feeExempt',
          subscriptions: [],
          virtualCards: [],
          installments: []
        };
        state.cards.push(newCard);
      }
    }
  }

  saveToStorage();
  closeBankModal();
  renderAll();
  showToast(t('bankSaved'));
}

function confirmDeleteBank(bankId) {
  if (confirm(t('confirmDeleteBank'))) {
    state.banks = state.banks.filter(b => b.id !== bankId);
    state.cards = state.cards.filter(c => c.bankId !== bankId);
    saveToStorage();
    renderAll();
    showToast(t('bankDeleted'));
  }
}

// --------------------------------------------------------------------------
// Loan (Kredi) Modal & Management Logic
// --------------------------------------------------------------------------
function populateLoanBankSelect(selectedId = null) {
  const bankSelect = document.getElementById('loanBankSelect');
  if (!bankSelect) return;

  bankSelect.innerHTML = `<option value="">-- ${t('selectBank')} --</option>`;
  state.banks.forEach(b => {
    const opt = document.createElement('option');
    opt.value = b.id;
    opt.textContent = b.name;
    if (selectedId && b.id === selectedId) opt.selected = true;
    bankSelect.appendChild(opt);
  });
}

function autoCalculateMonthlyLoanPayment() {
  const totalAmt = parseFloat(document.getElementById('loanTotalAmountInput')?.value) || 0;
  const totalMonths = parseInt(document.getElementById('loanTotalMonthsInput')?.value, 10) || 0;
  const monthlyInput = document.getElementById('loanMonthlyPaymentInput');

  if (totalAmt > 0 && totalMonths > 0 && monthlyInput) {
    monthlyInput.value = parseFloat((totalAmt / totalMonths).toFixed(2));
  }
}

function openAddLoanModal() {
  state.editingLoanId = null;
  document.getElementById('loanModalTitle').textContent = t('addLoan');
  document.getElementById('loanForm').reset();
  document.getElementById('loanEditingId').value = '';
  document.getElementById('loanPaidMonthsInput').value = '0';
  document.getElementById('loanPaymentDayInput').value = '15';
  const startSel = document.getElementById('loanStartCycleSelect');
  if (startSel) startSel.value = 'next';

  populateLoanBankSelect();
  document.getElementById('loanModalOverlay').classList.add('active');
}

function openEditLoanModal(loanId) {
  const loan = (state.loans || []).find(l => l.id === loanId);
  if (!loan) return;

  state.editingLoanId = loanId;
  document.getElementById('loanModalTitle').textContent = t('editLoan');
  document.getElementById('loanEditingId').value = loan.id;

  populateLoanBankSelect(loan.bankId);

  document.getElementById('loanTitleInput').value = loan.title || '';
  document.getElementById('loanTypeSelect').value = loan.type || 'personal';
  document.getElementById('loanTotalAmountInput').value = loan.totalAmount || '';
  document.getElementById('loanTotalMonthsInput').value = loan.totalInstallments || '';
  document.getElementById('loanMonthlyPaymentInput').value = loan.monthlyPayment || '';
  document.getElementById('loanPaidMonthsInput').value = loan.paidInstallments || 0;
  document.getElementById('loanPaymentDayInput').value = loan.paymentDay || 15;
  document.getElementById('loanInterestRateInput').value = loan.interestRate || '';
  const startSel = document.getElementById('loanStartCycleSelect');
  if (startSel) startSel.value = loan.startCycle || 'next';
  document.getElementById('loanNotesInput').value = loan.notes || '';

  document.getElementById('loanModalOverlay').classList.add('active');
}

function closeLoanModal() {
  document.getElementById('loanModalOverlay').classList.remove('active');
}

function handleLoanFormSubmit(e) {
  e.preventDefault();

  const editingId = document.getElementById('loanEditingId').value;
  const bankId = document.getElementById('loanBankSelect').value;
  const title = document.getElementById('loanTitleInput').value.trim();
  const type = document.getElementById('loanTypeSelect').value;
  const totalAmount = parseFloat(document.getElementById('loanTotalAmountInput').value) || 0;
  const totalInstallments = parseInt(document.getElementById('loanTotalMonthsInput').value, 10) || 1;
  const monthlyPayment = parseFloat(document.getElementById('loanMonthlyPaymentInput').value) || (totalAmount / totalInstallments);
  const paidInstallments = parseInt(document.getElementById('loanPaidMonthsInput').value, 10) || 0;
  const paymentDay = Math.min(31, Math.max(1, parseInt(document.getElementById('loanPaymentDayInput').value, 10) || 15));
  const interestRate = parseFloat(document.getElementById('loanInterestRateInput').value) || 0;
  const startCycle = document.getElementById('loanStartCycleSelect')?.value || 'next';
  const notes = document.getElementById('loanNotesInput').value.trim();

  if (!bankId) {
    alert('Lütfen bir banka seçiniz.');
    return;
  }
  if (!title) {
    alert('Lütfen kredi adını giriniz.');
    return;
  }
  if (totalAmount <= 0) {
    alert('Lütfen geçerli bir kredi tutarı giriniz.');
    return;
  }

  if (!state.loans) state.loans = [];

  if (editingId) {
    const idx = state.loans.findIndex(l => l.id === editingId);
    if (idx !== -1) {
      state.loans[idx] = {
        ...state.loans[idx],
        bankId,
        title,
        type,
        totalAmount,
        totalInstallments,
        monthlyPayment,
        paidInstallments,
        paymentDay,
        interestRate,
        startCycle,
        notes
      };
    }
  } else {
    state.loans.push({
      id: 'loan-' + Date.now(),
      bankId,
      title,
      type,
      totalAmount,
      totalInstallments,
      monthlyPayment,
      paidInstallments,
      paymentDay,
      interestRate,
      startCycle,
      notes,
      createdAt: new Date().toISOString()
    });
  }

  saveToStorage();
  closeLoanModal();
  renderAll();
  showToast(t('loanSaved'));
}

function paySingleLoanInstallment(loanId) {
  if (!state.loans) return;
  const loan = state.loans.find(l => l.id === loanId);
  if (!loan) return;

  const totalInst = Number(loan.totalInstallments) || 1;
  loan.paidInstallments = (Number(loan.paidInstallments) || 0) + 1;
  const paidInst = loan.paidInstallments;

  saveToStorage();
  renderAll();

  if (paidInst >= totalInst) {
    showToast(`🎉 Tebrikler! "${loan.title}" kredisinin tüm taksitleri bitti ve borç tamamen kapandı!`);
  } else {
    showToast(`✅ "${loan.title}": ${paidInst}/${totalInst}. taksit ödendi (${formatMoney(loan.monthlyPayment)}).`);
  }
}

function confirmDeleteLoan(loanId) {
  if (confirm(t('confirmDeleteLoan'))) {
    state.loans = (state.loans || []).filter(l => l.id !== loanId);
    saveToStorage();
    renderAll();
    showToast(t('loanDeleted'));
  }
}

// --------------------------------------------------------------------------
// Keyboard Shortcuts Modal Logic
// --------------------------------------------------------------------------
function openShortcutsModal() {
  document.getElementById('shortcutsModalOverlay')?.classList.add('active');
}

function closeShortcutsModal() {
  document.getElementById('shortcutsModalOverlay')?.classList.remove('active');
}

function toggleShortcutsModal() {
  const overlay = document.getElementById('shortcutsModalOverlay');
  if (overlay) {
    overlay.classList.toggle('active');
  }
}



