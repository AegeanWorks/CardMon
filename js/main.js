// ==========================================================================
// CARDMON - MAIN ENTRYPOINT & EVENT LISTENERS
// ==========================================================================

// --------------------------------------------------------------------------
// Modal & Action Handlers
// --------------------------------------------------------------------------
function initEventListeners() {
  // Navigation Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabTarget = btn.getAttribute('data-tab');
      if (tabTarget) navigateToTab(tabTarget);
    });
  });

  // Global Header Search input
  const searchInput = document.getElementById('cardSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchTerm = e.target.value;
      if (state.searchTerm.trim() && state.activeTab !== 'cards' && state.activeTab !== 'banks') {
        navigateToTab('cards');
      }
      renderCardsView();
      renderBanksView();
    });
  }

  // Language & Currency switches
  const langSelect = document.getElementById('langSelect');
  if (langSelect) {
    langSelect.addEventListener('change', (e) => {
      setLanguage(e.target.value);
      renderAll();
    });
  }

  const currSelect = document.getElementById('currencySelect');
  if (currSelect) {
    currSelect.addEventListener('change', (e) => {
      setCurrency(e.target.value);
      renderAll();
    });
  }

  // Preset Bank Select in Bank Modal
  const presetSelect = document.getElementById('presetBankSelect');
  if (presetSelect) {
    presetSelect.addEventListener('change', (e) => {
      const preset = PRESET_BANKS.find(p => p.key === e.target.value);
      if (preset && preset.key !== 'other') {
        document.getElementById('bankNameInput').value = preset.name;
        document.getElementById('bankColorInput').value = preset.color;
      }
    });
  }

  // Theme Swatches inside Card Modal
  document.querySelectorAll('.theme-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      document.querySelectorAll('.theme-swatch').forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      state.selectedTheme = swatch.getAttribute('data-theme');
    });
  });

  // Card Form Submit
  const cardForm = document.getElementById('cardForm');
  if (cardForm) {
    cardForm.addEventListener('submit', handleCardFormSubmit);
  }

  // Bank Form Submit
  const bankForm = document.getElementById('bankForm');
  if (bankForm) {
    bankForm.addEventListener('submit', handleBankFormSubmit);
  }

  // Profile & Settings Form Submit
  const profileForm = document.getElementById('profileForm');
  if (profileForm) {
    profileForm.addEventListener('submit', handleProfileFormSubmit);
  }

  // Quick Transaction Form Submit
  const quickTxForm = document.getElementById('quickTxForm');
  if (quickTxForm) {
    quickTxForm.addEventListener('submit', handleQuickTxSubmit);
  }

  // Virtual Card Form Submit
  const virtualCardForm = document.getElementById('virtualCardForm');
  if (virtualCardForm) {
    virtualCardForm.addEventListener('submit', handleVirtualCardFormSubmit);
  }

  // Subscription Form Submit
  const subscriptionForm = document.getElementById('subscriptionForm');
  if (subscriptionForm) {
    subscriptionForm.addEventListener('submit', handleSubscriptionFormSubmit);
  }

  // Loan Form Submit
  const loanForm = document.getElementById('loanForm');
  if (loanForm) {
    loanForm.addEventListener('submit', handleLoanFormSubmit);
  }

  // Real-time Profile Preview Listeners
  ['profileFirstName', 'profileLastName', 'profileTitle', 'profileAvatarColor'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', updateProfileModalLivePreview);
    }
  });

  // Quick Tx Amount listener for real-time installment preview
  const quickTxAmount = document.getElementById('quickTxAmountInput');
  if (quickTxAmount) {
    quickTxAmount.addEventListener('input', updateQuickTxInstallmentPreview);
  }

  // Import JSON File input
  const importFileInput = document.getElementById('importFileInput');
  if (importFileInput) {
    importFileInput.addEventListener('change', handleImportFile);
  }

  // Keyboard Shortcuts (Ctrl+S / Cmd+S for Native File Save)
  if (typeof setupFileSystemShortcuts === 'function') {
    setupFileSystemShortcuts();
  }
}



// --------------------------------------------------------------------------
// Initialization & Persistence
// --------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();

  // Setup UI listeners
  initEventListeners();
  
  // Set initial language & currency from storage
  if (typeof currentLang !== 'undefined') {
    const langSel = document.getElementById('langSelect');
    if (langSel) langSel.value = currentLang;
    document.documentElement.lang = currentLang;
  }
  if (typeof currentCurrency !== 'undefined') {
    const currSel = document.getElementById('currencySelect');
    if (currSel) currSel.value = currentCurrency;
  }

  updatePageTranslations();
  renderAll();

  // Otomatik Haftalık Yedek Kontrolü
  checkAndTriggerAutoWeeklyBackup();

  // Fetch live FX rates in background
  fetchExchangeRates();
});



// Explicit Window Global Bindings for HTML onclick triggers
window.navigateToTab = navigateToTab;
window.toggleMobileSidebar = toggleMobileSidebar;
window.toggleSettingsDropdown = toggleSettingsDropdown;
window.closeSettingsDropdown = closeSettingsDropdown;
window.openProfileModal = openProfileModal;
window.closeProfileModal = closeProfileModal;
window.openAddCardModal = openAddCardModal;
window.openEditCardModal = openEditCardModal;
window.closeCardModal = closeCardModal;
window.openAddBankModal = openAddBankModal;
window.openEditBankModal = openEditBankModal;
window.closeBankModal = closeBankModal;
window.openAddVirtualCardModal = openAddVirtualCardModal;
window.closeVirtualCardModal = closeVirtualCardModal;
window.openAddSubscriptionModal = openAddSubscriptionModal;
window.closeSubscriptionModal = closeSubscriptionModal;
window.openQuickTxModal = openQuickTxModal;
window.closeQuickTxModal = closeQuickTxModal;
window.setCardTypeFilter = setCardTypeFilter;
window.payCardFullDebt = payCardFullDebt;
window.payCardMonthlyInstallments = payCardMonthlyInstallments;
window.paySingleInstallment = paySingleInstallment;
window.deleteInstallmentPlan = deleteInstallmentPlan;
window.exportJsonBackup = exportJsonBackup;
window.triggerImportJson = triggerImportJson;
window.exportCsvReport = exportCsvReport;
window.exportPdfReport = exportPdfReport;
window.loadDemoData = loadDemoData;
window.confirmClearAllData = confirmClearAllData;
window.toggleCardPermission = toggleCardPermission;
window.toggleBankCardSection = toggleBankCardSection;

// Loan Modal & Actions
window.openAddLoanModal = openAddLoanModal;
window.openEditLoanModal = openEditLoanModal;
window.closeLoanModal = closeLoanModal;
window.paySingleLoanInstallment = paySingleLoanInstallment;
window.confirmDeleteLoan = confirmDeleteLoan;
window.autoCalculateMonthlyLoanPayment = autoCalculateMonthlyLoanPayment;

// Functions called via onclick in dynamically-generated HTML
window.confirmDeleteVirtualCard = confirmDeleteVirtualCard;
window.confirmDeleteSubscription = confirmDeleteSubscription;
window.openEditSubscriptionModal = openEditSubscriptionModal;
window.applyDueOffset = applyDueOffset;
window.handleCutoffWeekChange = handleCutoffWeekChange;
window.handleCutoffDayInput = handleCutoffDayInput;
window.handleMinRatioSelectChange = handleMinRatioSelectChange;
window.toggleParticipationRule = toggleParticipationRule;
window.updateQuickTxFormMode = updateQuickTxFormMode;
window.setQuickTxAmount = setQuickTxAmount;
window.activateNextCycleInstallment = activateNextCycleInstallment;
window.updateQuickTxInstallmentPreview = updateQuickTxInstallmentPreview;
window.applySubPreset = applySubPreset;
window.getAllSubscriptions = getAllSubscriptions;

// Smart Advisor & Backup Vault Exports
window.openSmartAdvisorModal = openSmartAdvisorModal;
window.closeSmartAdvisorModal = closeSmartAdvisorModal;
window.openBackupVaultModal = openBackupVaultModal;
window.closeBackupVaultModal = closeBackupVaultModal;
window.createManualBackupSnapshot = createManualBackupSnapshot;
window.restoreBackupSnapshot = restoreBackupSnapshot;
window.deleteBackupSnapshot = deleteBackupSnapshot;
window.renderTimelineView = renderTimelineView;

// Homeownership & Rent Simulator Exports
window.openRentSimulatorModal = openRentSimulatorModal;
window.closeRentSimulatorModal = closeRentSimulatorModal;
window.calculateRentSavingsSimulation = calculateRentSavingsSimulation;

// Native File System Persistence Exports
window.saveToActiveFile = typeof saveToActiveFile !== 'undefined' ? saveToActiveFile : undefined;
window.saveFileAs = typeof saveFileAs !== 'undefined' ? saveFileAs : undefined;
window.openPortfolioFile = typeof openPortfolioFile !== 'undefined' ? openPortfolioFile : undefined;

