// ==========================================================================
// BANK & CREDIT CARD MANAGER - CORE APPLICATION LOGIC
// ==========================================================================

const PRESET_BANKS = [
  { key: 'garanti', name: 'Garanti BBVA', color: '#008836', badge: 'GARANTİ' },
  { key: 'isbank', name: 'Türkiye İş Bankası', color: '#003b7a', badge: 'İŞ BANK' },
  { key: 'yapikredi', name: 'Yapı Kredi', color: '#003764', badge: 'YAPI KREDİ' },
  { key: 'akbank', name: 'Akbank', color: '#e4002b', badge: 'AKBANK' },
  { key: 'qnb', name: 'QNB', color: '#7a003c', badge: 'QNB' },
  { key: 'ziraat', name: 'Ziraat Bankası', color: '#bf1d2d', badge: 'ZİRAAT' },
  { key: 'vakifbank', name: 'VakıfBank', color: '#b48100', badge: 'VAKIFBANK' },
  { key: 'halkbank', name: 'Halkbank', color: '#005ba3', badge: 'HALKBANK' },
  { key: 'enpara', name: 'Enpara.com', color: '#80267d', badge: 'ENPARA' },
  { key: 'denizbank', name: 'DenizBank', color: '#003e7e', badge: 'DENİZBANK' },
  { key: 'teb', name: 'TEB (Türk Ekonomi Bankası)', color: '#008643', badge: 'TEB' },
  { key: 'albaraka', name: 'Albaraka Türk', color: '#c4161c', badge: 'ALBARAKA' },
  { key: 'fibabanka', name: 'Fibabanka', color: '#005ea6', badge: 'FİBABANKA' },
  { key: 'nkolay', name: 'N Kolay (Aktif Bank)', color: '#ff6600', badge: 'N KOLAY' },
  { key: 'kuveytturk', name: 'Kuveyt Türk', color: '#138b55', badge: 'KUVEYT TÜRK' },
  { key: 'turkiyefinans', name: 'Türkiye Finans', color: '#ff9800', badge: 'TR FİNANS' },
  { key: 'vakifkatilim', name: 'Vakıf Katılım', color: '#00695c', badge: 'VAKIF KATILIM' },
  { key: 'ziraatkatilim', name: 'Ziraat Katılım', color: '#a31515', badge: 'ZİRAAT KATILIM' },
  { key: 'ing', name: 'ING Türkiye', color: '#ff6200', badge: 'ING' },
  { key: 'odeabank', name: 'Odeabank', color: '#ff5500', badge: 'ODEABANK' },
  { key: 'sekerbank', name: 'Şekerbank', color: '#006838', badge: 'ŞEKERBANK' },
  { key: 'hsbc', name: 'HSBC Türkiye', color: '#db0011', badge: 'HSBC' },
  { key: 'papara', name: 'Papara', color: '#7c3aed', badge: 'PAPARA' },
  { key: 'other', name: 'Diğer / Other Bank', color: '#475569', badge: 'BANK' }
];

// Global Real-time Currency Exchange Rates (Default fallback + Auto-fetched live rates)
let exchangeRates = { TRY: 1, USD: 34.20, EUR: 37.40, GBP: 43.80 };

function convertToTry(amount, currency = 'TRY') {
  const num = Number(amount) || 0;
  const rate = exchangeRates[currency] || 1;
  return num * rate;
}

async function fetchExchangeRates() {
  try {
    // hygiene: allow public currency exchange rates API with fallback
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    if (res.ok) {
      const data = await res.json();
      if (data && data.rates && data.rates.TRY) {
        const usdTry = data.rates.TRY;
        exchangeRates.USD = parseFloat(usdTry.toFixed(2));
        if (data.rates.EUR) exchangeRates.EUR = parseFloat((usdTry / data.rates.EUR).toFixed(2));
        if (data.rates.GBP) exchangeRates.GBP = parseFloat((usdTry / data.rates.GBP).toFixed(2));
        renderAll();
      }
    }
  } catch (e) {
    // Graceful silent fallback to standard rates
  }
}

// App State
let state = {
  banks: [],
  cards: [],
  loans: [],
  cashSubscriptions: [],
  profile: {
    firstName: 'Yunus',
    lastName: 'Emre',
    title: 'Finansal Yönetici',
    avatarColor: '#3b82f6',
    monthlyIncome: 75000,
    salaryDay: 1,
    autoSettlePastDue: false
  },
  activeTab: 'dashboard',
  searchTerm: '',
  bankFilter: 'all',
  typeFilter: 'all',
  sortBy: 'limitDesc',
  editingCardId: null,
  editingBankId: null,
  selectedTheme: 'theme-midnight'
};

const STORAGE_KEY = 'bank_card_manager_state_v3';

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

// Güvenli borç kontrolü - Otomatik sıfırlama yapmaz
function checkAndAutoSettlePastDue() {
  // Gerçek kullanıcı verilerini korumak amacıyla borçlar otomatik sıfırlanmaz.
  return;
}

function saveToStorage() {
  try {
    const serialized = JSON.stringify({
      banks: state.banks,
      cards: state.cards,
      loans: state.loans,
      cashSubscriptions: state.cashSubscriptions || [],
      profile: state.profile
    });
    localStorage.setItem(STORAGE_KEY, serialized);
    showSaveIndicator();
  } catch (e) {
    console.error('Storage save error:', e);
  }
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state.banks = parsed.banks || [];
      state.cards = parsed.cards || [];
      state.loans = (parsed.loans || []).map(l => ({
        ...l,
        startCycle: l.startCycle || 'next'
      }));
      state.cashSubscriptions = parsed.cashSubscriptions || [];
      if (parsed.profile) {
        state.profile = { ...state.profile, ...parsed.profile };
      }
    }
  } catch (e) {
    console.error('Storage load error:', e);
    state.banks = [];
    state.cards = [];
    state.loans = [];
    state.cashSubscriptions = [];
  }
}

function showSaveIndicator() {
  const badge = document.getElementById('saveStatusBadge');
  if (!badge) return;
  
  const textEl = badge.querySelector('.save-text');
  if (textEl) textEl.textContent = t('autoSaved');
  badge.style.opacity = '1';
  
  clearTimeout(badge._fadeTimeout);
  badge._fadeTimeout = setTimeout(() => {
    badge.style.opacity = '0.75';
  }, 2500);
}

// --------------------------------------------------------------------------
// Demo Data Loader
// --------------------------------------------------------------------------
function loadDemoData(notify = true) {
  state.banks = [
    { id: 'b-garanti', presetKey: 'garanti', name: 'Garanti BBVA', color: '#008836', hasCreditCard: true, sharedLimit: 150000, ekHesapLimit: 30000, notes: 'Maaş Hesabı & Ana Kart' },
    { id: 'b-kuveytturk', presetKey: 'kuveytturk', name: 'Kuveyt Türk', color: '#138b55', hasCreditCard: true, sharedLimit: 75000, ekHesapLimit: 0, notes: 'Katılım Bankacılığı (Faizsiz)' },
    { id: 'b-isbank', presetKey: 'isbank', name: 'Türkiye İş Bankası', color: '#003b7a', hasCreditCard: true, sharedLimit: 100000, ekHesapLimit: 25000, notes: 'Otomatik Ödeme Talimatları' },
    { id: 'b-yapikredi', presetKey: 'yapikredi', name: 'Yapı Kredi', color: '#003764', hasCreditCard: true, sharedLimit: 120000, ekHesapLimit: 20000, notes: 'World Puan Avantajları' },
    { id: 'b-akbank', presetKey: 'akbank', name: 'Akbank', color: '#e4002b', hasCreditCard: true, sharedLimit: 80000, ekHesapLimit: 15000, notes: 'Chip-para Kampanyaları' },
    { id: 'b-enpara', presetKey: 'enpara', name: 'Enpara.com', color: '#80267d', hasCreditCard: true, sharedLimit: 50000, ekHesapLimit: 10000, notes: 'Masrafsız Bankacılık' },
    { id: 'b-ziraat', presetKey: 'ziraat', name: 'Ziraat Bankası', color: '#bf1d2d', hasCreditCard: false, sharedLimit: 0, ekHesapLimit: 50000, notes: 'Sadece Vadesiz & Yatırım Hesabı' }
  ];

  state.cards = [
    {
      id: 'c-1',
      bankId: 'b-garanti',
      nickname: 'Bonus Platinum',
      last4: '4829',
      network: 'Mastercard',
      type: 'typePersonal',
      limit: 120000,
      usedBalance: 28450,
      dateMethod: 'exact',
      cutoffDay: 15,
      approxCutoffWeek: 'week3',
      dueDay: 25,
      approxDueWeek: 'week4',
      theme: 'theme-midnight',
      minPaymentRatio: 20,
      permissions: { internet: true, abroad: false, contactless: true, cashAdvance: true },
      isFrozen: false,
      annualFeeAmount: 750,
      annualFeeMonth: 4,
      annualFeeStatus: 'refundRequested',
      virtualCards: [
        { id: 'vc-1', nickname: 'Netflix & Streaming', limit: 3000, last4: '7721', isInternetActive: true },
        { id: 'vc-2', nickname: 'Amazon & E-Ticaret', limit: 10000, last4: '9840', isInternetActive: true }
      ],
      subscriptions: [
        { id: 'sub-1', name: 'Netflix Premium (4K)', amount: 229, category: 'Streaming', cycle: 'monthly', billingDay: 14 },
        { id: 'sub-2', name: 'Spotify Aile Planı', amount: 99, category: 'Streaming', cycle: 'monthly', billingDay: 18 },
        { id: 'sub-chatgpt', name: 'ChatGPT Plus & AI Tools', amount: 800, category: 'Software', cycle: 'monthly', billingDay: 5 }
      ],
      installments: [
        { id: 'inst-1', desc: 'MacBook Pro M3 (Gürgençler)', totalAmount: 18000, installmentCount: 6, paidCount: 2, monthlyAmount: 3000 }
      ]
    },
    {
      id: 'c-2',
      bankId: 'b-isbank',
      nickname: 'Maximum Genç / Platinum',
      last4: '9102',
      network: 'Visa',
      type: 'typePersonal',
      limit: 65000,
      usedBalance: 12800,
      dateMethod: 'approx',
      cutoffDay: 5,
      approxCutoffWeek: 'week1',
      dueDay: 15,
      approxDueWeek: 'week2',
      theme: 'theme-emerald',
      minPaymentRatio: 20,
      permissions: { internet: true, abroad: true, contactless: true, cashAdvance: false },
      isFrozen: false,
      annualFeeAmount: 450,
      annualFeeMonth: 10,
      annualFeeStatus: 'paid',
      virtualCards: [
        { id: 'vc-3', nickname: 'Yurtdışı SaaS & Hosting', limit: 7500, last4: '4190', isInternetActive: true }
      ],
      subscriptions: [
        { id: 'sub-3', name: 'iCloud 2TB Depolama', amount: 129, category: 'Cloud', cycle: 'monthly', billingDay: 20 }
      ],
      installments: []
    },
    {
      id: 'c-3',
      bankId: 'b-yapikredi',
      nickname: 'World Card Gold',
      last4: '3318',
      network: 'Mastercard',
      type: 'typeCashback',
      limit: 90000,
      usedBalance: 46200,
      dateMethod: 'exact',
      cutoffDay: 22,
      approxCutoffWeek: 'week4',
      dueDay: 2,
      approxDueWeek: 'week1',
      theme: 'theme-ruby',
      minPaymentRatio: 40,
      permissions: { internet: true, abroad: false, contactless: true, cashAdvance: true },
      isFrozen: false,
      annualFeeAmount: 600,
      annualFeeMonth: 3,
      annualFeeStatus: 'refunded',
      virtualCards: [],
      subscriptions: [
        { id: 'sub-4', name: 'YouTube Premium Aile', amount: 115, category: 'Streaming', cycle: 'monthly', billingDay: 25 }
      ],
      installments: [
        { id: 'inst-2', desc: 'Dyson V15 Süpürge', totalAmount: 24000, installmentCount: 4, paidCount: 1, monthlyAmount: 6000 }
      ]
    },
    {
      id: 'c-4',
      bankId: 'b-akbank',
      nickname: 'Axess Platinum',
      last4: '7721',
      network: 'Troy',
      type: 'typeMiles',
      limit: 80000,
      usedBalance: 19500,
      dateMethod: 'exact',
      cutoffDay: 8,
      approxCutoffWeek: 'week2',
      dueDay: 18,
      approxDueWeek: 'week3',
      theme: 'theme-sunset',
      minPaymentRatio: 20,
      permissions: { internet: false, abroad: false, contactless: true, cashAdvance: true },
      isFrozen: false,
      annualFeeAmount: 500,
      annualFeeMonth: 9,
      annualFeeStatus: 'none',
      virtualCards: [],
      subscriptions: [],
      installments: []
    },
    {
      id: 'c-5',
      bankId: 'b-enpara',
      nickname: 'Enpara Kredi Kartı',
      last4: '5564',
      network: 'Visa',
      type: 'typePersonal',
      limit: 45000,
      usedBalance: 4200,
      dateMethod: 'approx',
      cutoffDay: 28,
      approxCutoffWeek: 'weekMonthEnd',
      dueDay: 8,
      approxDueWeek: 'week1',
      theme: 'theme-amethyst',
      minPaymentRatio: 20,
      permissions: { internet: true, abroad: true, contactless: true, cashAdvance: true },
      isFrozen: false,
      annualFeeAmount: 0,
      annualFeeMonth: 'none',
      annualFeeStatus: 'exempt',
      virtualCards: [
        { id: 'vc-4', nickname: 'Geçici Alışveriş Kartı', limit: 2000, last4: '8831', isInternetActive: true }
      ],
      subscriptions: [],
      installments: []
    },
    {
      id: 'c-6',
      bankId: 'b-kuveytturk',
      nickname: 'Sağlam Kart Platinum',
      last4: '8820',
      network: 'Troy',
      type: 'typePersonal',
      limit: 75000,
      usedBalance: 16400,
      dateMethod: 'exact',
      cutoffDay: 10,
      approxCutoffWeek: 'week2',
      dueDay: 20,
      approxDueWeek: 'week3',
      theme: 'theme-ocean',
      minPaymentRatio: 100,
      isParticipationBank: true,
      permissions: { internet: true, abroad: true, contactless: true, cashAdvance: true },
      isFrozen: false,
      annualFeeAmount: 0,
      annualFeeMonth: 'none',
      annualFeeStatus: 'exempt',
      virtualCards: [],
      subscriptions: [
        { id: 'sub-5', name: 'Turkcell Platinum Fatura', amount: 340, category: 'Bills', cycle: 'monthly', billingDay: 12 }
      ],
      installments: []
    }
  ];

  state.loans = [
    {
      id: 'loan-1',
      bankId: 'b-garanti',
      title: 'İhtiyaç Kredisi (Ev Tadilatı)',
      type: 'personal',
      totalAmount: 120000,
      monthlyPayment: 5000,
      totalInstallments: 24,
      paidInstallments: 8,
      paymentDay: 15,
      interestRate: 3.89,
      notes: 'Maaş hesabından otomatik çekiliyor'
    },
    {
      id: 'loan-2',
      bankId: 'b-yapikredi',
      title: 'Taşıt Kredisi (Araç Alımı)',
      type: 'vehicle',
      totalAmount: 360000,
      monthlyPayment: 10000,
      totalInstallments: 36,
      paidInstallments: 12,
      paymentDay: 5,
      interestRate: 3.45,
      notes: 'Kasko & Sigorta dahil'
    }
  ];

  saveToStorage();
  renderAll();
  if (notify) showToast(t('demoLoaded'));
}

// --------------------------------------------------------------------------
// UI Rendering Engine
// --------------------------------------------------------------------------
function renderAll() {
  updatePageTranslations();
  renderUserProfileHeader();
  renderDashboardView();
  renderBankDropdowns();
  renderBanksView();
  renderEkHesapView();
  renderCardsView();
  renderLoansView();
  renderSubscriptionsView();
  renderTimelineView();
}

function renderUserProfileHeader() {
  const p = state.profile || { firstName: 'Yunus', lastName: 'Emre', title: 'Finansal Yönetici', avatarColor: '#3b82f6' };
  const first = (p.firstName || '').trim();
  const last = (p.lastName || '').trim();
  const fullName = `${first} ${last}`.trim() || 'Yunus Emre';
  const initials = (((first[0] || 'Y') + (last[0] || (first[1] || 'E')))).toUpperCase();

  const avatarEl = document.getElementById('headerUserAvatar');
  if (avatarEl) {
    avatarEl.textContent = initials;
    if (p.avatarColor) avatarEl.style.background = p.avatarColor;
  }

  const sideAvatarEl = document.getElementById('sidebarUserAvatar');
  if (sideAvatarEl) {
    sideAvatarEl.textContent = initials;
    if (p.avatarColor) sideAvatarEl.style.background = p.avatarColor;
  }

  const nameEl = document.getElementById('headerUserName');
  if (nameEl) nameEl.textContent = fullName;

  const sideNameEl = document.getElementById('sidebarUserName');
  if (sideNameEl) sideNameEl.textContent = fullName;

  const dropNameEl = document.getElementById('dropdownUserName');
  if (dropNameEl) dropNameEl.textContent = fullName;

  const dropTitleEl = document.getElementById('dropdownUserTitle');
  if (dropTitleEl) dropTitleEl.textContent = p.title || t('userProfile');

  const welcomeNameEl = document.getElementById('welcomeUserName');
  if (welcomeNameEl) welcomeNameEl.textContent = fullName;

  const previewAvatar = document.getElementById('modalAvatarPreview');
  if (previewAvatar) {
    previewAvatar.textContent = initials;
    if (p.avatarColor) previewAvatar.style.background = p.avatarColor;
  }
  const previewName = document.getElementById('modalUserNamePreview');
  if (previewName) previewName.textContent = fullName;
  const previewTitle = document.getElementById('modalUserTitlePreview');
  if (previewTitle) previewTitle.textContent = p.title || t('userProfile');
}

// 2. Populate Bank Select Dropdowns (In Modals & Filters)
function renderBankDropdowns() {
  const bankFilterSelect = document.getElementById('bankFilterSelect');
  const cardBankSelect = document.getElementById('cardBankSelect');
  
  const currentFilter = state.bankFilter;
  
  if (bankFilterSelect) {
    bankFilterSelect.innerHTML = `<option value="all">${t('allBanks')}</option>`;
    state.banks.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.id;
      opt.textContent = b.name;
      bankFilterSelect.appendChild(opt);
    });
    bankFilterSelect.value = currentFilter;
  }

  if (cardBankSelect) {
    cardBankSelect.innerHTML = `<option value="">-- ${t('selectBank')} --</option>`;
    state.banks.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.id;
      opt.textContent = b.name;
      cardBankSelect.appendChild(opt);
    });
  }
}

// 3. Filtered & Sorted Cards Grid
function getFilteredAndSortedCards() {
  let list = [...state.cards];

  // Search filter
  if (state.searchTerm.trim() !== '') {
    const q = state.searchTerm.toLowerCase().trim();
    list = list.filter(c => {
      const bank = state.banks.find(b => b.id === c.bankId);
      const bankName = bank ? bank.name.toLowerCase() : '';
      return c.nickname.toLowerCase().includes(q) || 
             bankName.includes(q) ||
             (c.last4 && c.last4.includes(q));
    });
  }

  // Bank filter
  if (state.bankFilter !== 'all') {
    list = list.filter(c => c.bankId === state.bankFilter);
  }

  // Type filter
  if (state.typeFilter !== 'all') {
    list = list.filter(c => c.type === state.typeFilter);
  }

  // Sorter
  const now = new Date();
  const currentDay = now.getDate();

  list.sort((a, b) => {
    switch (state.sortBy) {
      case 'limitDesc':
        return Number(b.limit) - Number(a.limit);
      case 'limitAsc':
        return Number(a.limit) - Number(b.limit);
      case 'debtDesc':
        return Number(b.usedBalance) - Number(a.usedBalance);
      case 'cutoff': {
        const dim = getDaysInCurrentMonth();
        const dayA = Number(a.cutoffDay) || 15;
        const dayB = Number(b.cutoffDay) || 15;
        const diffA = (dayA >= currentDay ? dayA - currentDay : dayA + dim - currentDay);
        const diffB = (dayB >= currentDay ? dayB - currentDay : dayB + dim - currentDay);
        return diffA - diffB;
      }
      case 'dueDate': {
        const dim = getDaysInCurrentMonth();
        const dayA = Number(a.dueDay) || 25;
        const dayB = Number(b.dueDay) || 25;
        const diffA = (dayA >= currentDay ? dayA - currentDay : dayA + dim - currentDay);
        const diffB = (dayB >= currentDay ? dayB - currentDay : dayB + dim - currentDay);
        return diffA - diffB;
      }
      case 'bankName': {
        const bankA = (state.banks.find(x => x.id === a.bankId)?.name || '').toLowerCase();
        const bankB = (state.banks.find(x => x.id === b.bankId)?.name || '').toLowerCase();
        return bankA.localeCompare(bankB);
      }
      default:
        return 0;
    }
  });

  return list;
}

function renderCardsView() {
  const container = document.getElementById('cardsContainer');
  if (!container) return;

  const cards = getFilteredAndSortedCards();

  if (cards.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
        </div>
        <h3>${state.cards.length === 0 ? t('noCardsYet') : t('noResultsFound')}</h3>
        <p>${state.cards.length === 0 ? t('noCardsSub') : ''}</p>
        ${state.cards.length === 0 ? `<button class="btn btn-primary" onclick="openAddCardModal()"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> ${t('addCard')}</button>` : ''}
      </div>
    `;
    return;
  }

  const totalCardsLimit = state.cards.reduce((s, c) => s + (Number(c.limit) || 0), 0);
  const totalCardsDebt = state.cards.reduce((s, c) => s + (Number(c.usedBalance) || 0), 0);
  const totalCardsAvail = Math.max(0, totalCardsLimit - totalCardsDebt);
  const totalCardsMinDue = state.cards.reduce((s, c) => {
    const lim = Number(c.limit) || 0;
    const debt = Number(c.usedBalance) || 0;
    const isKat = c.isParticipationBank || Number(c.minPaymentRatio) === 100;
    const r = isKat ? 100 : (Number(c.minPaymentRatio) || (lim >= 25000 ? 40 : 20));
    return s + (isKat ? debt : Math.round(debt * (r / 100)));
  }, 0);

  const cardsHtml = cards.map(c => {
    const bank = state.banks.find(b => b.id === c.bankId) || { name: 'Bank', color: '#3b82f6', badge: 'BANK' };
    const limit = Number(c.limit) || 0;
    const used = Number(c.usedBalance) || 0;
    const available = Math.max(0, limit - used);
    const utilization = limit > 0 ? (used / limit) * 100 : 0;
    const themeClass = c.theme || 'theme-midnight';
    
    // Min Payment & Katılım Bankası Rule
    const isKatilim = c.isParticipationBank || Number(c.minPaymentRatio) === 100;
    const minRatio = isKatilim ? 100 : (Number(c.minPaymentRatio) || 20);
    const minAmount = isKatilim ? used : ((used * minRatio) / 100);

    // Date texts
    let cutoffText = '';
    if (c.dateMethod === 'exact') {
      cutoffText = currentLang === 'tr'
        ? `${t('cutoffDay')}: ${c.cutoffDay}. gün`
        : `${t('cutoffDay')}: Day ${c.cutoffDay}`;
    } else {
      cutoffText = t(c.approxCutoffWeek || 'week1');
    }

    let dueText = '';
    if (c.dateMethod === 'exact') {
      dueText = currentLang === 'tr'
        ? `${t('dueDay')}: ${c.dueDay}. gün`
        : `${t('dueDay')}: Day ${c.dueDay}`;
    } else {
      dueText = t(c.approxDueWeek || 'week2');
    }

    const networkLogo = getNetworkLogoSvg(c.network);

    // Permissions (Default to active if not defined)
    const perms = c.permissions || { internet: true, abroad: false, contactless: true, cashAdvance: true };
    const isHighUtil = utilization >= 80;
    const isFrozen = !!c.isFrozen;
    const virtualCards = c.virtualCards || [];
    const subscriptions = c.subscriptions || [];
    const installments = c.installments || [];

    // Calculate total monthly subscriptions for this card in TRY
    const cardSubsTotalTry = subscriptions.reduce((sum, s) => {
      const tryAmt = convertToTry(s.amount, s.currency || 'TRY');
      return sum + (s.cycle === 'yearly' ? tryAmt / 12 : tryAmt);
    }, 0);

    // Annual fee label
    let feeStatusLabel = '';
    if (c.annualFeeStatus === 'refundRequested') feeStatusLabel = '⏳ İade İstendi';
    else if (c.annualFeeStatus === 'refunded') feeStatusLabel = '✅ İade Alındı';
    else if (c.annualFeeStatus === 'paid') feeStatusLabel = '💸 Ödendi';
    else if (c.annualFeeStatus === 'exempt') feeStatusLabel = '🛡️ Aidatsız';

    return `
      <div class="card-item-wrapper" id="card-${c.id}" style="${isFrozen ? 'opacity: 0.85;' : ''}">
        ${isHighUtil ? `<div class="high-util-badge">⚠️ %${utilization.toFixed(0)} Yüksek Doluluk</div>` : ''}

        <!-- Realistic 3D Credit Card Surface -->
        <div class="credit-card-face ${themeClass} ${isHighUtil ? 'high-util-warning' : ''}">
          <div class="card-top-row">
            <div class="bank-badge-group">
              <span class="bank-logo-badge" style="border-left: 3px solid ${bank.color};">${bank.name}</span>
              ${isKatilim ? `<span class="tag-katilim" title="Katılım Bankası: Asgari ödeme borcun %100'üdür">🕌 Katılım</span>` : ''}
            </div>
            <div style="display:flex; align-items:center; gap:0.4rem;">
              ${isFrozen ? `<span style="background:#f43f5e; color:#fff; font-size:0.65rem; font-weight:800; padding:0.15rem 0.45rem; border-radius:4px;">KİLİTLİ</span>` : ''}
              <span class="card-tier-text">${t(c.type || 'typePersonal')}</span>
            </div>
          </div>

          <div class="card-chip-container">
            <div class="emv-chip"></div>
            <div class="contactless-wave" style="color: ${perms.contactless ? '#ffffff' : 'rgba(255,255,255,0.2)'};">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8.5 16.5a5 5 0 0 1 0-9"></path><path d="M12 19a8.5 8.5 0 0 0 0-14"></path><path d="M15.5 21.5a12 12 0 0 0 0-19"></path></svg>
            </div>
          </div>

          <div class="card-middle-row">
            <div class="card-digits">•••• •••• •••• ${c.last4 || '••••'}</div>
          </div>

          <div class="card-bottom-row">
            <div class="card-holder-info">
              <div class="card-nickname-text">${escapeHtml(c.nickname)}</div>
            </div>
            <div class="card-network-logo">
              ${networkLogo}
            </div>
          </div>
        </div>

        <!-- Breakdown & Limit Details -->
        <div class="card-breakdown">
          <!-- Quick Transaction Actions Bar (Pay Debt / Add Expense) -->
          <div class="card-quick-tx-bar">
            <button class="btn-quick-tx btn-pay-debt" onclick="openQuickTxModal('${c.id}', 'payment')" title="Kart Borcu Öde">
              💳 ₺ Borç Öde
            </button>
            <button class="btn-quick-tx btn-add-expense" onclick="openQuickTxModal('${c.id}', 'expense')" title="Harcama / Taksit Ekle">
              🛍️ ₺ Harcama / Taksit
            </button>
          </div>

          <!-- Permissions & Purchase Security Controls -->
          <div class="card-permissions-bar">
            ${isFrozen ? `
              <div class="perm-pill frozen-badge" onclick="toggleCardPermission('${c.id}', 'isFrozen')" title="Kilidi Kaldırmak İçin Tıklayın">
                ❄️ Kart Kilitli / Donduruldu (Tıkla ve Aç)
              </div>
            ` : `
              <div class="perm-pill ${perms.internet ? 'active' : 'blocked'}" onclick="toggleCardPermission('${c.id}', 'internet')" title="İnternet Alışverişini Aç/Kapat">
                🌐 İnternet: ${perms.internet ? '✅ Açık' : '❌ Bloke'}
              </div>
              <div class="perm-pill ${perms.abroad ? 'active' : 'blocked'}" onclick="toggleCardPermission('${c.id}', 'abroad')" title="Yurtdışı Alışverişini Aç/Kapat">
                🌍 Yurtdışı: ${perms.abroad ? '✅ Açık' : '❌ Bloke'}
              </div>
              <div class="perm-pill ${perms.contactless ? 'active' : 'blocked'}" onclick="toggleCardPermission('${c.id}', 'contactless')" title="Temassız Ödemeyi Aç/Kapat">
                📡 Temassız: ${perms.contactless ? '✅' : '❌'}
              </div>
              <div class="perm-pill ${perms.cashAdvance ? 'active' : 'blocked'}" onclick="toggleCardPermission('${c.id}', 'cashAdvance')" title="Nakit Avansı Aç/Kapat">
                🏧 Avans: ${perms.cashAdvance ? '✅' : '❌'}
              </div>
              <div class="perm-pill active" onclick="toggleCardPermission('${c.id}', 'isFrozen')" title="Kartı Geçici Dondur" style="color:#94a3b8; background:rgba(255,255,255,0.05); border-color:rgba(255,255,255,0.1);">
                🔒 Dondur
              </div>
            `}
          </div>

          <div class="limit-stats-row">
            <div class="limit-stat-item">
              <span class="limit-stat-title">${t('cardLimit')}</span>
              <span class="limit-stat-val">${formatMoney(limit)}</span>
            </div>
            <div class="limit-stat-item">
              <span class="limit-stat-title">${t('availableAmount')}</span>
              <span class="limit-stat-val available">${formatMoney(available)}</span>
            </div>
          </div>

          <!-- Utilization Gauge -->
          <div class="utilization-meter">
            <div class="meter-bar">
              <div class="meter-fill" style="width: ${Math.min(100, utilization)}%; background-color: ${getUtilizationColor(utilization)};"></div>
            </div>
            <div class="meter-labels">
              <span>${t('usedAmount')}: <strong style="color: #fb7185;">${formatMoney(used)}</strong></span>
              <span><strong style="color: ${getUtilizationColor(utilization)};">${utilization.toFixed(1)}%</strong></span>
            </div>
          </div>

          <!-- Statement & Due Dates Box -->
          <div class="card-dates-box">
            <div class="date-col">
              <span class="date-label">${t('cutoffUpcoming')}</span>
              <span class="date-value">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                ${cutoffText}
              </span>
            </div>
            <div class="date-col" style="text-align: right;">
              <span class="date-label">${t('paymentDueDate')}</span>
              <span class="date-value" style="justify-content: flex-end;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                ${dueText}
              </span>
            </div>
          </div>

          <!-- Min Payment Estimation & Total Debt -->
          ${used > 0 ? `
          <div style="font-size: 0.76rem; color: var(--text-secondary); display: flex; justify-content: space-between; align-items:center; background: ${isKatilim ? 'rgba(16,185,129,0.1)' : 'rgba(0,0,0,0.15)'}; padding: 0.45rem 0.65rem; border-radius: 6px; border: 1px solid ${isKatilim ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.06)'}; gap:0.5rem; flex-wrap:wrap;">
            <span>${isKatilim ? '🕌 Katılım Asgari (Tüm Borç):' : `💳 Güncel Borç: <strong style="color:#fb7185;">${formatMoney(used)}</strong> • ${t('minPaymentDue')} (%${minRatio}):`}</span>
            <strong style="color: ${isKatilim ? '#34d399' : 'var(--accent-amber)'};">${formatMoney(minAmount)}</strong>
          </div>
          ` : ''}

          <!-- Annual Fee Alert Banner -->
          ${(Number(c.annualFeeAmount) > 0 || c.annualFeeStatus === 'exempt') ? `
          <div class="fee-badge-alert">
            <span>🏷️ Aidat: <strong>${c.annualFeeStatus === 'exempt' ? 'Muaf (Aidatsız)' : formatMoney(Number(c.annualFeeAmount))}</strong> ${c.annualFeeMonth && c.annualFeeMonth !== 'none' ? `(${c.annualFeeMonth}. Ay)` : ''}</span>
            <span style="font-weight:700;">${feeStatusLabel}</span>
          </div>
          ` : ''}

          <!-- Active Installments (Aktif Taksitler) Sub-Section -->
          ${(() => {
            const activeInsts = installments.filter(i => i.startCycle !== 'next');
            const plannedInsts = installments.filter(i => i.startCycle === 'next');
            let html = '';

            if (activeInsts.length > 0) {
              html += `
              <div class="installments-section">
                <div class="virtual-cards-header">
                  <span>🛍️ Aktif Taksitler (${activeInsts.length})</span>
                  <button class="btn btn-secondary btn-sm" style="padding: 0.15rem 0.5rem; font-size: 0.7rem;" onclick="openQuickTxModal('${c.id}', 'expense')">
                    + Taksit Ekle
                  </button>
                </div>
                <div class="installments-list">
                  ${activeInsts.map(inst => {
                    const totalInst = Number(inst.installmentCount) || 1;
                    const paidInst = Number(inst.paidCount) || 0;
                    const monthlyAmt = Number(inst.monthlyAmount) || (inst.totalAmount / totalInst);
                    const remainingInst = Math.max(0, totalInst - paidInst);
                    const remainingTotal = remainingInst * monthlyAmt;
                    return `
                      <div class="installment-item-row">
                        <div class="installment-info-col">
                          <span class="installment-title">${escapeHtml(inst.desc || 'Taksitli Harcama')}</span>
                          <div class="installment-meta">
                            <strong style="color:#38bdf8;">${formatMoney(monthlyAmt)}/ay</strong>
                            <span>• ${paidInst}/${totalInst} ödendi (Kalan: ${remainingInst} ay - ${formatMoney(remainingTotal)})</span>
                          </div>
                        </div>
                        <div class="installment-actions-col">
                          <button class="btn-pay-installment-mini" onclick="paySingleInstallment('${c.id}', '${inst.id}')" title="Bu Ayki Taksiti Öde ve Borçtan Düş">
                            ✓ Taksit Düş
                          </button>
                          <button style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:0.8rem;" onclick="deleteInstallmentPlan('${c.id}', '${inst.id}')" title="Taksit Planını Sil / Kapat">×</button>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>`;
            }

            if (plannedInsts.length > 0) {
              html += `
              <div class="installments-section" style="border:1px solid rgba(245,158,11,0.25); border-radius:var(--radius-md); padding:0.65rem 0.75rem; background:rgba(245,158,11,0.05); margin-top:0.5rem;">
                <div class="virtual-cards-header" style="margin-bottom:0.5rem;">
                  <span style="color:#fbbf24;">⏳ Planlanan Taksitler (${plannedInsts.length})</span>
                  <button class="btn btn-secondary btn-sm" style="padding: 0.15rem 0.5rem; font-size: 0.7rem;" onclick="openQuickTxModal('${c.id}', 'expense')">
                    + Ekle
                  </button>
                </div>
                <div class="installments-list">
                  ${plannedInsts.map(inst => {
                    const totalInst = Number(inst.installmentCount) || 1;
                    const monthlyAmt = Number(inst.monthlyAmount) || (inst.totalAmount / totalInst);
                    return `
                      <div class="installment-item-row">
                        <div class="installment-info-col">
                          <span class="installment-title">${escapeHtml(inst.desc || 'Planlanan Harcama')}</span>
                          <div class="installment-meta">
                            <strong style="color:#fbbf24;">${formatMoney(monthlyAmt)}/ay</strong>
                            <span>• ${totalInst} taksit • Toplam: ${formatMoney(Number(inst.totalAmount))}</span>
                            <span style="background:rgba(245,158,11,0.2); color:#fbbf24; font-size:0.68rem; padding:0.1rem 0.35rem; border-radius:4px; font-weight:700;">Sonraki Ekstre</span>
                          </div>
                        </div>
                        <div class="installment-actions-col" style="gap:0.25rem;">
                          <button class="btn-pay-installment-mini" style="background:rgba(245,158,11,0.15); border-color:rgba(245,158,11,0.4); color:#fbbf24;" onclick="activateNextCycleInstallment('${c.id}', '${inst.id}')" title="Aktif Hale Getir — Bu Ayki Borca Ekle">
                            ✅ Aktive Al
                          </button>
                          <button style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:0.8rem;" onclick="deleteInstallmentPlan('${c.id}', '${inst.id}')" title="Planı İptal Et">×</button>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>`;
            }

            if (activeInsts.length === 0 && plannedInsts.length === 0) return '';
            return html;
          })()}

          <!-- Sanal Kartlar (Virtual Cards) Sub-Section -->
          <div class="virtual-cards-section">
            <div class="virtual-cards-header">
              <span>💳 ${t('virtualCards')} (${virtualCards.length})</span>
              <button class="btn btn-secondary btn-sm" style="padding: 0.15rem 0.5rem; font-size: 0.7rem;" onclick="openAddVirtualCardModal('${c.id}')">
                + Sanal Kart
              </button>
            </div>
            ${virtualCards.length > 0 ? `
              <div class="virtual-cards-list">
                ${virtualCards.map(vc => `
                  <div class="virtual-card-chip">
                    <span class="vc-name">
                      ${vc.isInternetActive ? '🌐' : '🔒'}
                      <strong>${escapeHtml(vc.nickname)}</strong>
                      ${vc.last4 ? `<span style="color:var(--text-muted); font-size:0.72rem;">(•${vc.last4})</span>` : ''}
                    </span>
                    <div style="display:flex; align-items:center; gap:0.4rem;">
                      <span class="vc-limit">${formatMoney(vc.limit)}</span>
                      <button style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:0.8rem;" onclick="confirmDeleteVirtualCard('${c.id}', '${vc.id}')" title="Sanal Kartı Sil">×</button>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : `
              <div style="font-size:0.74rem; color:var(--text-muted); font-style:italic;">
                ${t('noVirtualCards')}
              </div>
            `}
          </div>

          <!-- Subscriptions (Bağlı Abonelikler) Sub-Section -->
          <div class="subscriptions-section">
            <div class="virtual-cards-header">
              <span style="display:flex; align-items:center; gap:0.3rem;">
                <span>🔁 ${t('subscriptions')} (${subscriptions.length})</span>
                ${cardSubsTotalTry > 0 ? `<span class="sub-total-badge">₺${formatMoney(cardSubsTotalTry)}/ay</span>` : ''}
              </span>
              <button class="btn btn-secondary btn-sm" style="padding: 0.15rem 0.5rem; font-size: 0.7rem;" onclick="openAddSubscriptionModal('${c.id}')">
                + Abonelik
              </button>
            </div>
            ${subscriptions.length > 0 ? `
              <div class="subscriptions-list">
                ${subscriptions.map(sub => {
                  const subCurr = sub.currency || 'TRY';
                  const isForeign = subCurr !== 'TRY';
                  const subSymbol = subCurr === 'USD' ? '$' : subCurr === 'EUR' ? '€' : subCurr === 'GBP' ? '£' : '₺';
                  const displayAmount = isForeign 
                    ? `${subSymbol}${sub.amount} (≈${formatMoney(convertToTry(sub.amount, subCurr))})` 
                    : formatMoney(sub.amount);

                  return `
                    <span class="subscription-chip">
                      <span>${escapeHtml(sub.name)}</span>
                      <strong>${displayAmount}</strong>
                      <button style="background:none; border:none; color:#c4b5fd; cursor:pointer; font-size:0.8rem; margin-left:2px;" onclick="confirmDeleteSubscription('${c.id}', '${sub.id}')" title="Aboneliği Kaldır">×</button>
                    </span>
                  `;
                }).join('')}
              </div>
            ` : `
              <div style="font-size:0.74rem; color:var(--text-muted); font-style:italic;">
                ${t('noSubscriptions')}
              </div>
            `}
          </div>

          <!-- Action Buttons -->
          <div class="card-actions-bar">
            <button class="btn btn-secondary btn-sm" onclick="openEditCardModal('${c.id}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              ${t('editCard')}
            </button>
            <button class="btn btn-danger-outline btn-sm" onclick="confirmDeleteCard('${c.id}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              ${t('deleteCard')}
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <!-- Top Overall Cards Total Summary Banner -->
    <div style="grid-column: 1 / -1; background: linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(16,185,129,0.08) 100%); border: 1px solid rgba(59,130,246,0.25); border-radius: var(--radius-md); padding: 0.85rem 1.1rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.75rem; margin-bottom:0.25rem;">
      <div style="display:flex; align-items:center; gap:0.5rem;">
        <span style="font-size:1.1rem;">💳</span>
        <span style="font-size:0.85rem; font-weight:800; color:#fff;">Kredi Kartları Portföy Toplamı (${state.cards.length} Kart)</span>
      </div>
      <div style="display:flex; align-items:center; gap:1rem; flex-wrap:wrap; font-size:0.82rem;">
        <span>Toplam Limit: <strong style="color:#38bdf8;">₺${formatMoney(totalCardsLimit)}</strong></span>
        <span>Toplam Borç: <strong style="color:#fb7185;">₺${formatMoney(totalCardsDebt)}</strong></span>
        <span>Kullanılabilir: <strong style="color:#34d399;">₺${formatMoney(totalCardsAvail)}</strong></span>
        <span>Asgari Yükü: <strong style="color:#fbbf24;">₺${formatMoney(totalCardsMinDue)}</strong></span>
      </div>
    </div>
    ${cardsHtml}
  `;
}

// 4. Statement & Due Dates Timeline View
function renderTimelineView() {
  const container = document.getElementById('timelineContainer');
  if (!container) return;

  const now = new Date();
  const currentDay = now.getDate();
  const currentMonth = now.toLocaleString(currentLang === 'tr' ? 'tr-TR' : 'en-US', { month: 'short' });

  // Generate timeline events for all cards (both Cutoff and Payment Due)
  const events = [];

  state.cards.forEach(c => {
    const bank = state.banks.find(b => b.id === c.bankId) || { name: 'Bank', color: '#3b82f6' };
    const used = Number(c.usedBalance) || 0;
    const isKatilim = c.isParticipationBank || Number(c.minPaymentRatio) === 100;
    const minRatio = isKatilim ? 100 : (Number(c.minPaymentRatio) || 20);
    const minAmount = isKatilim ? used : ((used * minRatio) / 100);
    const insts = c.installments || [];
    const monthlyInstSum = insts.reduce((sum, inst) => sum + (Number(inst.monthlyAmount) || (inst.totalAmount / (inst.installmentCount || 1))), 0);

    // Cutoff Event
    let cutoffDayNum = 15;
    let isApproxCutoff = c.dateMethod === 'approx';
    if (c.dateMethod === 'exact') {
      cutoffDayNum = Number(c.cutoffDay) || 15;
    } else {
      cutoffDayNum = getApproxDay(c.approxCutoffWeek);
    }
    
    const daysInMonth = getDaysInCurrentMonth();
    let daysUntilCutoff = cutoffDayNum >= currentDay ? cutoffDayNum - currentDay : cutoffDayNum + daysInMonth - currentDay;
    events.push({
      cardId: c.id,
      cardName: c.nickname,
      bankName: bank.name,
      bankColor: bank.color,
      type: 'cutoff',
      day: cutoffDayNum,
      isApprox: isApproxCutoff,
      approxKey: c.approxCutoffWeek,
      daysLeft: daysUntilCutoff,
      amount: used,
      amountLabel: t('usedAmount'),
      installmentsCount: insts.length,
      monthlyInstSum
    });

    // Due Date Event (Only if debt > 0 or has card)
    let dueDayNum = 25;
    let isApproxDue = c.dateMethod === 'approx';
    if (c.dateMethod === 'exact') {
      dueDayNum = Number(c.dueDay) || 25;
    } else {
      dueDayNum = getApproxDay(c.approxDueWeek);
    }

    let daysUntilDue = dueDayNum >= currentDay ? dueDayNum - currentDay : dueDayNum + daysInMonth - currentDay;
    events.push({
      cardId: c.id,
      cardName: c.nickname,
      bankName: bank.name,
      bankColor: bank.color,
      type: 'due',
      day: dueDayNum,
      isApprox: isApproxDue,
      approxKey: c.approxDueWeek,
      daysLeft: daysUntilDue,
      amount: minAmount,
      totalDebt: used,
      amountLabel: isKatilim ? '🕌 Asgari (%100 Katılım)' : t('minPaymentDue'),
      installmentsCount: insts.length,
      monthlyInstSum
    });
  });

  // Loans Payment Due Events
  (state.loans || []).forEach(loan => {
    const totalInst = Number(loan.totalInstallments) || 1;
    const paidInst = Number(loan.paidInstallments) || 0;
    if (paidInst >= totalInst) return; // loan completed

    const bank = state.banks.find(b => b.id === loan.bankId) || { name: 'Banka', color: '#10b981' };
    const payDay = Math.min(31, Math.max(1, Number(loan.paymentDay) || 15));
    const monthlyAmt = Number(loan.monthlyPayment) || 0;
    const remainingInst = totalInst - paidInst;
    const remainingTotal = remainingInst * monthlyAmt;
    const daysInMonth = getDaysInCurrentMonth();
    const daysLeft = payDay >= currentDay ? payDay - currentDay : payDay + daysInMonth - currentDay;

    events.push({
      loanId: loan.id,
      cardName: loan.title,
      bankName: bank.name,
      bankColor: bank.color,
      type: 'loan',
      day: payDay,
      isApprox: false,
      approxKey: '',
      daysLeft: daysLeft,
      amount: monthlyAmt,
      totalDebt: remainingTotal,
      amountLabel: 'Aylık Taksit',
      installmentsCount: remainingInst,
      paidCount: paidInst,
      totalCount: totalInst,
      monthlyInstSum: monthlyAmt
    });
  });

  // Sort timeline events by days remaining
  events.sort((a, b) => a.daysLeft - b.daysLeft);

  if (events.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>${t('noCardsYet')}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = events.map(ev => {
    let urgencyClass = 'safe';
    let pillClass = 'pill-safe';
    if (ev.daysLeft <= 3) {
      urgencyClass = 'urgent';
      pillClass = 'pill-urgent';
    } else if (ev.daysLeft <= 7) {
      urgencyClass = 'soon';
      pillClass = 'pill-soon';
    }

    let countdownText = '';
    if (ev.daysLeft === 0) countdownText = t('today');
    else if (ev.daysLeft === 1) countdownText = t('tomorrow');
    else countdownText = `${ev.daysLeft} ${t('daysLeft')}`;

    const isCutoff = ev.type === 'cutoff';
    const isLoan = ev.type === 'loan';
    const title = isLoan ? `🏦 Kredi Taksiti (${ev.paidCount + 1}/${ev.totalCount}. Ay)` : (isCutoff ? t('cutoffUpcoming') : t('paymentUpcoming'));
    const badgeColor = isLoan ? 'var(--accent-emerald)' : (isCutoff ? 'var(--accent-cyan)' : 'var(--accent-amber)');

    const eventDate = new Date(now.getFullYear(), now.getMonth(), currentDay + ev.daysLeft);
    const evMonth = eventDate.toLocaleString(currentLang === 'tr' ? 'tr-TR' : 'en-US', { month: 'short' });

    return `
      <div class="timeline-card ${urgencyClass}">
        <div class="timeline-left">
          <div class="timeline-date-badge">
            <span class="timeline-day">${ev.day}</span>
            <span class="timeline-month">${evMonth}</span>
          </div>
          <div class="timeline-info">
            <h3>
              <span style="display:inline-block; width: 10px; height: 10px; border-radius: 50%; background:${badgeColor};"></span>
              ${title}: ${escapeHtml(ev.cardName)}
            </h3>
            <p style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
              <span style="color:${ev.bankColor}; font-weight:700;">${escapeHtml(ev.bankName)}</span>
              ${ev.isApprox ? `• <span style="color:var(--text-muted);">(${t(ev.approxKey)})</span>` : ''}
              ${(!isLoan && ev.installmentsCount > 0) ? `• <span style="color:#38bdf8; font-size:0.75rem;">🛍️ ${ev.installmentsCount} Taksitli Harcama (${formatMoney(ev.monthlyInstSum)}/ay)</span>` : ''}
              ${isLoan ? `• <span style="color:#34d399; font-size:0.75rem;">🏦 Kalan Vade: ${ev.installmentsCount} Ay</span>` : ''}
            </p>
          </div>
        </div>

        <div class="timeline-right" style="display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap;">
          <div>
            ${isCutoff ? `
              <div class="timeline-amount-label">${t('usedAmount')}</div>
              <div class="timeline-amount" style="color:#fb7185;">${formatMoney(ev.amount)}</div>
            ` : isLoan ? `
              <div style="text-align:right;">
                <div style="font-size:0.72rem; color:var(--text-muted);">Kalan Kredi Borcu: <strong style="color:#34d399; font-size:1.05rem;">${formatMoney(ev.totalDebt)}</strong></div>
                <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:2px;">Aylık Taksit: <strong style="color:#38bdf8;">${formatMoney(ev.amount)}</strong></div>
              </div>
            ` : `
              <div style="text-align:right;">
                <div style="font-size:0.72rem; color:var(--text-muted);">${t('totalUsedBalance') || 'Toplam Borç'}: <strong style="color:#fb7185; font-size:1.05rem;">${formatMoney(ev.totalDebt)}</strong></div>
                <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:2px;">${ev.amountLabel}: <strong style="color:#fbbf24;">${formatMoney(ev.amount)}</strong></div>
              </div>
            `}
          </div>
          <span class="days-countdown-pill ${pillClass}">
            ${countdownText}
          </span>

          <!-- Quick Pay Actions on Due Date / Loan Timeline Item -->
          ${isLoan ? `
            <div style="display:flex; gap:0.35rem; align-items:center;">
              <button class="btn-timeline-pay btn-pay-inst" onclick="paySingleLoanInstallment('${ev.loanId}')" title="Bu Ayki Kredi Taksitini Öde">
                ✓ Taksit Öde
              </button>
            </div>
          ` : (!isCutoff && ev.totalDebt > 0) ? `
            <div style="display:flex; gap:0.35rem; align-items:center;">
              <button class="btn-timeline-pay btn-pay-full" onclick="payCardFullDebt('${ev.cardId}')" title="Dönem Borcunu Tamamen Kapat & Sıfırla">
                ✅ Borcu Kapat
              </button>
              ${ev.installmentsCount > 0 ? `
                <button class="btn-timeline-pay btn-pay-inst" onclick="payCardMonthlyInstallments('${ev.cardId}')" title="Bu Ayki Taksitleri Öde ve Borçtan Düş">
                  💳 Taksiti Düş
                </button>
              ` : ''}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  // Check for upcoming urgent payments (today or tomorrow) and toggle badge dot
  const hasUrgentEvent = events.some(ev => ev.daysLeft <= 1 && ev.totalDebt > 0);
  const urgentDot = document.getElementById('timelineUrgentDot');
  if (urgentDot) {
    urgentDot.style.display = hasUrgentEvent ? 'inline-block' : 'none';
  }
}

// Yardımcı: Banka borç kırılımı HTML'i (iç içe template literal sorunundan kaçınmak için)
function renderBankDebtBreakdown(cardDebt, loanDebt, loans) {
  let html = '<div style="font-size:0.78rem; display:flex; flex-direction:column; gap:0.2rem; background:rgba(251,113,133,0.06); border:1px solid rgba(251,113,133,0.12); border-radius:6px; padding:0.45rem 0.65rem;">';
  if (cardDebt > 0) {
    html += '<div style="display:flex; justify-content:space-between; color:var(--text-secondary);">'
          + '<span>💳 Kart Borcu:</span>'
          + '<strong style="color:#fb7185;">' + formatMoney(cardDebt) + '</strong>'
          + '</div>';
  }
  if (loanDebt > 0) {
    html += '<div style="display:flex; justify-content:space-between; color:var(--text-secondary);">'
          + '<span>🏦 Kredi Borcu (Kalan):</span>'
          + '<strong style="color:#f97316;">' + formatMoney(loanDebt) + '</strong>'
          + '</div>';
    const activeLoans = loans.filter(l => (Number(l.paidInstallments)||0) < (Number(l.totalInstallments)||1));
    activeLoans.forEach(l => {
      const rem = Math.max(0, (Number(l.totalInstallments)||1) - (Number(l.paidInstallments)||0));
      const remDebt = rem * (Number(l.monthlyPayment)||0);
      html += '<div style="display:flex; justify-content:space-between; font-size:0.72rem; color:var(--text-muted); padding-left:0.5rem;">'
            + '<span>↳ ' + escapeHtml(l.title || 'Kredi') + ' (' + rem + ' ay kaldı)</span>'
            + '<span style="color:#38bdf8;">' + formatMoney(Number(l.monthlyPayment)||0) + '/ay · ' + formatMoney(remDebt) + '</span>'
            + '</div>';
    });
  }
  html += '</div>';
  return html;
}


// 5. Banks Management & Breakdown View
function renderBanksView() {
  const container = document.getElementById('banksContainer');
  if (!container) return;

  if (state.banks.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <h3>${t('noBanksYet')}</h3>
        <button class="btn btn-primary" onclick="openAddBankModal()">${t('addBank')}</button>
      </div>
    `;
    return;
  }

  const totalBanksSharedLimit = state.banks.reduce((s, b) => s + (Number(b.sharedLimit) || 0), 0);
  const totalBanksEkHesap = state.banks.reduce((s, b) => s + (Number(b.ekHesapLimit) || 0), 0);
  const totalBanksCardsCount = state.cards.length;

  const banksHtml = state.banks.map(bank => {
    const bankCards = state.cards.filter(c => c.bankId === bank.id);
    const bankLoans = (state.loans || []).filter(l => l.bankId === bank.id);
    
    const totalBankLimit = bankCards.reduce((s, c) => s + (Number(c.limit) || 0), 0);
    const totalBankDebt = bankCards.reduce((s, c) => s + (Number(c.usedBalance) || 0), 0);
    const totalBankLoanDebt = bankLoans.reduce((sum, l) => {
        const totalInst = Number(l.totalInstallments) || 1;
        const paidInst = Number(l.paidInstallments) || 0;
        const monthlyAmt = Number(l.monthlyPayment) || 0;
        return sum + (Math.max(0, totalInst - paidInst) * monthlyAmt);
    }, 0);
    
    const bankSharedLimit = Number(bank.sharedLimit) || 0;

    return `
      <div class="bank-item-card" id="bank-${bank.id}">
        <div class="bank-header-row">
          <div class="bank-name-badge">
            <div class="bank-icon-square" style="background: ${bank.color};">
              ${bank.name.substring(0, 2).toUpperCase()}
            </div>
            <div class="bank-title-text">
              <h3>${escapeHtml(bank.name)}</h3>
              <span class="has-card-pill ${bank.hasCreditCard ? 'yes' : 'no'}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                ${bank.hasCreditCard ? t('bankHasCardYes') : t('bankHasCardNo')}
              </span>
            </div>
          </div>

          <div style="display:flex; gap:0.4rem;">
            <button class="btn btn-secondary btn-sm btn-icon-only" onclick="openEditBankModal('${bank.id}')" title="${t('editBank')}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
            <button class="btn btn-danger-outline btn-sm btn-icon-only" onclick="confirmDeleteBank('${bank.id}')" title="${t('deleteBank')}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>

        ${bank.notes ? `
        <div style="font-size:0.8rem; color:var(--text-muted); background:rgba(0,0,0,0.15); padding:0.4rem 0.6rem; border-radius:6px;">
          📝 ${escapeHtml(bank.notes)}
        </div>
        ` : ''}

        <!-- Bank Total Limits & Debts -->
        <div class="bank-stats-grid">
          <div class="bank-stat-item">
            <span class="bank-stat-label">${t('cardLimit')}</span>
            <span class="bank-stat-value" style="color:var(--text-primary);">${formatMoney(totalBankLimit)}</span>
          </div>
          <div class="bank-stat-item">
            <span class="bank-stat-label">${t('usedAmount')}</span>
            <span class="bank-stat-value" style="color:${(totalBankDebt + totalBankLoanDebt) > 0 ? '#fb7185' : 'var(--text-secondary)'};">
              ${formatMoney(totalBankDebt + totalBankLoanDebt)}
            </span>
          </div>
        </div>

        ${totalBankLimit > 0 ? `
          <div style="margin-top:-0.3rem;">
            <div style="display:flex; justify-content:space-between; font-size:0.72rem; color:var(--text-muted); margin-bottom:0.25rem;">
              <span>Doluluk: <strong style="color:${getUtilizationColor((totalBankDebt / totalBankLimit) * 100)};">%${((totalBankDebt / totalBankLimit) * 100).toFixed(1)}</strong></span>
              <span>Kullanılabilir: <strong style="color:#34d399;">₺${formatMoney(Math.max(0, totalBankLimit - totalBankDebt))}</strong></span>
            </div>
            <div class="meter-bar" style="height:6px;">
              <div class="meter-fill" style="width:${Math.min(100, (totalBankDebt / totalBankLimit) * 100)}%; background-color:${getUtilizationColor((totalBankDebt / totalBankLimit) * 100)};"></div>
            </div>
          </div>
        ` : ''}

        <!-- Borç kırılımı: kart + kredi ayrı göster -->
        ${(totalBankDebt > 0 || totalBankLoanDebt > 0) ? renderBankDebtBreakdown(totalBankDebt, totalBankLoanDebt, bankLoans) : ''}

        ${bankSharedLimit > 0 ? `
        <div style="font-size: 0.78rem; color: var(--text-secondary); display:flex; justify-content:space-between;">
          <span>${t('bankSharedLimit')}:</span>
          <strong>${formatMoney(bankSharedLimit)}</strong>
        </div>
        ` : ''}

        ${Number(bank.ekHesapLimit) > 0 ? `
        <div style="font-size: 0.78rem; color: var(--text-secondary); display:flex; justify-content:space-between;">
          <span>${t('bankEkHesapLimit')}:</span>
          <strong>${formatMoney(Number(bank.ekHesapLimit))}</strong>
        </div>
        ` : ''}

        <!-- Associated Cards Sub-list -->
        <div class="bank-cards-list">
          <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">
            ${t('activeCardsCount')} (${bankCards.length})
          </span>
          ${bankCards.length > 0 ? bankCards.map(c => `
            <div class="mini-card-chip">
              <span>💳 <strong>${escapeHtml(c.nickname)}</strong> (${c.network})</span>
              <span style="color: var(--accent-emerald); font-weight:700;">${formatMoney(c.limit)}</span>
            </div>
          `).join('') : `
            <div style="font-size: 0.78rem; color: var(--text-muted); font-style: italic;">
              ${t('noCardsYet')}
            </div>
          `}
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <!-- Top Overall Banks Total Summary Banner -->
    <div style="grid-column: 1 / -1; background: linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(59,130,246,0.08) 100%); border: 1px solid rgba(16,185,129,0.25); border-radius: var(--radius-md); padding: 0.85rem 1.1rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.75rem; margin-bottom:0.25rem;">
      <div style="display:flex; align-items:center; gap:0.5rem;">
        <span style="font-size:1.1rem;">🏦</span>
        <span style="font-size:0.85rem; font-weight:800; color:#fff;">Banka Portföyü Toplamı (${state.banks.length} Banka)</span>
      </div>
      <div style="display:flex; align-items:center; gap:1rem; flex-wrap:wrap; font-size:0.82rem;">
        <span>Tanımlı Kart: <strong>${totalBanksCardsCount} Adet</strong></span>
        ${totalBanksSharedLimit > 0 ? `<span>Ortak Limit: <strong style="color:#38bdf8;">₺${formatMoney(totalBanksSharedLimit)}</strong></span>` : ''}
        <span>Toplam Ek Hesap (KMH): <strong style="color:#22d3ee;">₺${formatMoney(totalBanksEkHesap)}</strong></span>
      </div>
    </div>
    ${banksHtml}
  `;

  const bankBadge = document.getElementById('banksTabBadge');
  if (bankBadge) bankBadge.textContent = state.banks.length;
}

// 5.1. Dedicated Ek Hesaplar (KMH / Overdrafts) View
function renderEkHesapView() {
  const container = document.getElementById('ekHesapContainer');
  if (!container) return;

  const totalEkHesap = state.banks.reduce((sum, b) => sum + (Number(b.ekHesapLimit) || 0), 0);
  const banksWithEkHesap = state.banks.filter(b => Number(b.ekHesapLimit) > 0);

  const ekBadge = document.getElementById('ekHesapTabBadge');
  if (ekBadge) ekBadge.textContent = banksWithEkHesap.length;

  container.innerHTML = `
    <!-- Ek Hesap Hero Summary Banner -->
    <div class="ekhesap-hero-card">
      <div>
        <div class="ekhesap-hero-title">
          <span>🛡️</span>
          <span>Ek Hesap & Kredili Mevduat (KMH) Havuzu</span>
        </div>
        <p class="ekhesap-hero-desc">
          Vadesiz mevduat hesaplarınıza bağlı hazır nakit avans limitleriniz. Fatura, kira ve acil nakit ihtiyaçlarında kart limitlerinden bağımsız likidite güvencesi sağlar.
        </p>
      </div>

      <div class="ekhesap-hero-stat">
        <div class="ekhesap-hero-stat-label">Toplam KMH Rezervi</div>
        <div class="ekhesap-hero-stat-val">${formatMoney(totalEkHesap)}</div>
        <div style="font-size:0.75rem; color:#22d3ee; margin-top:0.25rem;">${banksWithEkHesap.length} bankada aktif limit</div>
      </div>
    </div>

    <!-- Bank Ek Hesap Cards Grid -->
    <div class="ekhesap-grid">
      ${state.banks.length === 0 ? `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <h3>${t('noBanksYet')}</h3>
          <p>Banka hesaplarınızı ekleyerek ek hesap limitlerinizi tanımlayabilirsiniz.</p>
          <button class="btn btn-primary" onclick="openAddBankModal()">${t('addBank')}</button>
        </div>
      ` : state.banks.map(bank => {
        const limit = Number(bank.ekHesapLimit) || 0;
        const hasLimit = limit > 0;
        const share = totalEkHesap > 0 && hasLimit ? ((limit / totalEkHesap) * 100).toFixed(1) : 0;

        return `
          <div class="ekhesap-card" style="border-top: 3px solid ${bank.color};">
            <div class="ekhesap-card-header">
              <div class="ekhesap-bank-brand">
                <div class="ekhesap-bank-logo-badge" style="background: ${bank.color};">
                  ${escapeHtml(bank.name.substring(0, 2).toUpperCase())}
                </div>
                <div>
                  <h4 class="ekhesap-bank-name">${escapeHtml(bank.name)}</h4>
                  <span style="font-size:0.75rem; color:${hasLimit ? 'var(--accent-emerald)' : 'var(--text-muted)'}; font-weight:600;">
                    ${hasLimit ? '● Aktif KMH Hesabı' : '○ KMH Tanımlı Değil'}
                  </span>
                </div>
              </div>

              <button class="btn btn-secondary btn-sm" onclick="openEditBankModal('${bank.id}')" title="Limiti Düzenle">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                <span>Düzenle</span>
              </button>
            </div>

            <div class="ekhesap-limit-box">
              <div class="ekhesap-limit-header">
                <span>Tanımlı Ek Hesap Limiti</span>
                ${hasLimit ? `<span>Pay: %${share}</span>` : ''}
              </div>
              <div class="ekhesap-limit-val" style="color: ${hasLimit ? '#22d3ee' : 'var(--text-muted)'};">
                ${formatMoney(limit)}
              </div>
              ${hasLimit ? `
                <div class="meter-bar" style="margin-top: 0.5rem; height: 5px;">
                  <div class="meter-fill" style="width: ${share}%; background-color: ${bank.color};"></div>
                </div>
              ` : ''}
            </div>

            ${bank.notes ? `
              <div style="font-size:0.8rem; color:var(--text-muted); background:rgba(0,0,0,0.15); padding:0.4rem 0.6rem; border-radius:6px;">
                📝 ${escapeHtml(bank.notes)}
              </div>
            ` : ''}

            <div class="ekhesap-info-notice">
              ${hasLimit ? `
                💡 Bu limit, vadesiz hesabınızda bakiye kalmadığında otomatik devreye girer. Yalnızca kullanılan gün kadar faiz işler.
              ` : `
                ℹ️ Bu bankada ek hesap limitiniz yoksa düzenle butonundan tanımlayabilirsiniz.
              `}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// 5.2. Loans & Installment Credits View
function renderLoansView() {
  const container = document.getElementById('loansContainer');
  if (!container) return;

  const loans = state.loans || [];
  const activeLoans = loans.filter(l => (Number(l.paidInstallments) || 0) < (Number(l.totalInstallments) || 1));
  const totalLoanDebt = loans.reduce((sum, l) => {
    const totalInst = Number(l.totalInstallments) || 1;
    const paidInst = Number(l.paidInstallments) || 0;
    const monthlyAmt = Number(l.monthlyPayment) || 0;
    return sum + (Math.max(0, totalInst - paidInst) * monthlyAmt);
  }, 0);

  const totalMonthlyLoanPayment = activeLoans.reduce((sum, l) => sum + (Number(l.monthlyPayment) || 0), 0);

  const loansBadge = document.getElementById('loansTabBadge');
  if (loansBadge) loansBadge.textContent = activeLoans.length;

  const today = new Date().getDate();

  container.innerHTML = `
    <!-- Loans Hero Summary Banner -->
    <div class="loans-hero-card">
      <div>
        <div class="loans-hero-title">
          <span>🏦</span>
          <span>Krediler & Taksitli Finansmanlar</span>
        </div>
        <p class="loans-hero-desc">
          Tüm bankalardaki ihtiyaç, konut, taşıt ve ticari kredilerinizi tek ekranda yönetin. Kalan toplam borç, aylık taksit tutarları ve ödeme günlerini anlık takip edin.
        </p>
      </div>

      <div class="loans-hero-stats-group">
        <div class="loans-hero-stat">
          <div class="loans-hero-stat-label">Kalan Toplam Kredi Borcu</div>
          <div class="loans-hero-stat-val" style="color: #34d399;">${formatMoney(totalLoanDebt)}</div>
          <div style="font-size:0.72rem; color:var(--text-muted); margin-top:0.2rem;">${activeLoans.length} aktif kredi</div>
        </div>
        <div class="loans-hero-stat">
          <div class="loans-hero-stat-label">Aylık Toplam Kredi Taksiti</div>
          <div class="loans-hero-stat-val" style="color: #38bdf8;">${formatMoney(totalMonthlyLoanPayment)}</div>
          <div style="font-size:0.72rem; color:var(--text-muted); margin-top:0.2rem;">Bu ay ödenecek taksit</div>
        </div>
      </div>
    </div>

    <!-- Section Header with Action Button -->
    <div class="tab-section-header" style="margin-top: 0.5rem;">
      <div>
        <h3 class="tab-section-title">Kredi Planlarım & Ödeme Durumu</h3>
        <p class="tab-section-subtitle">Vade bitişine kalan süre ve geri ödeme ilerleme durumu</p>
      </div>
      <button class="btn btn-emerald" onclick="openAddLoanModal()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        <span>+ Yeni Kredi Ekle</span>
      </button>
    </div>

    <!-- Loans Grid -->
    <div class="loans-grid">
      ${loans.length === 0 ? `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <h3>Henüz Kayıtlı Kredi Bulunmuyor</h3>
          <p>İhtiyaç, konut, taşıt veya ticari kredilerinizi ekleyerek aylık nakit akışınızı ve toplam borcunuzu eksiksiz takip edin.</p>
          <button class="btn btn-emerald" onclick="openAddLoanModal()">+ İlk Krediyi Ekle</button>
        </div>
      ` : loans.map(loan => {
        const bank = state.banks.find(b => b.id === loan.bankId) || { name: 'Banka', color: '#10b981' };
        const totalInst = Number(loan.totalInstallments) || 1;
        const paidInst = Number(loan.paidInstallments) || 0;
        const monthlyAmt = Number(loan.monthlyPayment) || 0;
        const remainingInst = Math.max(0, totalInst - paidInst);
        const remainingDebt = remainingInst * monthlyAmt;
        const totalRepay = Number(loan.totalAmount) || (totalInst * monthlyAmt);
        const progressPct = Math.min(100, Math.round((paidInst / totalInst) * 100));
        const isCompleted = paidInst >= totalInst;
        const payDay = Math.min(31, Math.max(1, Number(loan.paymentDay) || 15));
        const daysInMonth = getDaysInCurrentMonth();
        const daysLeft = payDay >= today ? payDay - today : payDay + daysInMonth - today;

        const typeLabels = {
          personal: 'İhtiyaç Kredisi',
          housing: 'Konut Kredisi',
          vehicle: 'Taşıt Kredisi',
          commercial: 'Ticari / KOBİ',
          other: 'Diğer Kredi'
        };
        const typeLabel = typeLabels[loan.type] || 'Kredi';

        return `
          <div class="loan-item-card" style="border-top: 3px solid ${bank.color || '#10b981'};">
            <div class="loan-card-top">
              <div class="loan-brand-info">
                <div class="loan-bank-badge" style="background: ${bank.color || '#10b981'};">
                  ${escapeHtml(bank.name)}
                </div>
                <div>
                  <h4 class="loan-title">${escapeHtml(loan.title || 'Banka Kredisi')}</h4>
                  <div style="display:flex; align-items:center; gap:0.35rem; flex-wrap:wrap; margin-top:2px;">
                    <span class="loan-type-tag">${typeLabel}</span>
                    ${loan.startCycle === 'next' ? '<span class="loan-type-tag" style="background:rgba(56,189,248,0.15); color:#38bdf8; border:1px solid rgba(56,189,248,0.3);">✨ İlk Taksit: Gelecek Ay (Eylül)</span>' : ''}
                  </div>
                </div>
              </div>
              <div style="display:flex; align-items:center; gap:0.35rem;">
                <button class="btn btn-secondary btn-sm btn-icon-only" onclick="openEditLoanModal('${loan.id}')" title="Krediyi Düzenle">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                <button class="btn btn-secondary btn-sm btn-icon-only" style="color:var(--accent-rose);" onclick="confirmDeleteLoan('${loan.id}')" title="Krediyi Sil">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              </div>
            </div>

            <!-- Numbers Grid -->
            <div class="loan-numbers-grid">
              <div class="loan-num-item">
                <span class="loan-num-label">Aylık Taksit</span>
                <span class="loan-num-val" style="color: #38bdf8;">${formatMoney(monthlyAmt)}</span>
              </div>
              <div class="loan-num-item">
                <span class="loan-num-label">Kalan Borç</span>
                <span class="loan-num-val" style="color: ${isCompleted ? '#34d399' : '#fb7185'};">${formatMoney(remainingDebt)}</span>
              </div>
              <div class="loan-num-item">
                <span class="loan-num-label">Toplam Tutar</span>
                <span class="loan-num-val" style="color: var(--text-primary);">${formatMoney(totalRepay)}</span>
              </div>
            </div>

            <!-- Progress Meter -->
            <div class="loan-progress-box">
              <div class="loan-progress-header">
                <span>
                  <strong>${paidInst}/${totalInst} Ay</strong> ${isCompleted ? '🎉 (Tamamlandı)' : `(Kalan: ${remainingInst} Ay)`}
                </span>
                <strong style="color: ${isCompleted ? '#34d399' : '#38bdf8'};">%${progressPct} Ödendi</strong>
              </div>
              <div class="loan-progress-bar">
                <div class="loan-progress-fill" style="width: ${progressPct}%; background: ${isCompleted ? '#10b981' : 'linear-gradient(90deg, #10b981 0%, #38bdf8 100%)'};"></div>
              </div>
            </div>

            <!-- Bottom Row: Payment Day & Quick Pay -->
            <div class="loan-card-bottom">
              <div class="loan-due-pill">
                📅 Her ayın <strong>${payDay}. günü</strong>
                ${loan.startCycle === 'next' ? '<span style="color:#38bdf8; font-size:0.72rem;">(İlk Taksit: Gelecek Ay)</span>' : (!isCompleted ? `<span style="color: ${daysLeft <= 3 ? '#fb7185' : '#94a3b8'}; font-size: 0.72rem;">(${daysLeft === 0 ? 'Bugün!' : `${daysLeft} gün kaldı`})</span>` : '')}
              </div>

              <div class="loan-action-btns">
                ${!isCompleted ? `
                  <button class="btn btn-emerald btn-sm" onclick="paySingleLoanInstallment('${loan.id}')" title="Bu Ayki Taksiti Öde">
                    ✓ Taksit Öde
                  </button>
                ` : `
                  <span style="font-size:0.75rem; color:#34d399; font-weight:700; background:rgba(16,185,129,0.15); padding:0.25rem 0.6rem; border-radius:6px;">
                    ✅ Borç Kapandı
                  </span>
                `}
              </div>
            </div>
            ${loan.notes ? `<div style="font-size:0.72rem; color:var(--text-muted); border-top:1px dashed rgba(255,255,255,0.06); padding-top:0.35rem;">📝 ${escapeHtml(loan.notes)}</div>` : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// 5.3. Dedicated Subscriptions & Recurring Payments View
function renderSubscriptionsView() {
  const container = document.getElementById('subscriptionsContainer');
  if (!container) return;

  // Flatten all subscriptions across cards and cash
  const allSubs = getAllSubscriptions();

  // Calculate stats in TRY
  const totalMonthly = allSubs.reduce((sum, s) => {
    const amtTry = convertToTry(s.amount, s.currency || 'TRY');
    return sum + (s.cycle === 'yearly' ? (amtTry / 12) : amtTry);
  }, 0);

  const totalYearly = totalMonthly * 12;

  // Update Badge
  const subBadge = document.getElementById('subscriptionsTabBadge');
  if (subBadge) subBadge.textContent = allSubs.length;

  const today = new Date().getDate();

  const categoryNameMap = {
    Rent: '🏠 Kira & Konut Gideri',
    Maintenance: '🏢 Bina / Site Aidatı',
    Bills: '⚡ Faturalar',
    Streaming: '🎬 Streaming & Eğlence',
    Software: '🤖 Yazılım & Yapay Zeka',
    Cloud: '☁️ Bulut & Hosting',
    Lifestyle: '🏋️ Spor & Yaşam',
    Education: '🎓 Eğitim & Kurslar',
    Other: '📦 Diğer Düzenli Giderler'
  };

  container.innerHTML = `
    <!-- Subscriptions Hero Summary Banner -->
    <div class="subscriptions-hero-card">
      <div>
        <div class="subscriptions-hero-title">
          <span>🔄</span>
          <span>Abonelikler, Faturalar & Düzenli Giderler</span>
        </div>
        <p class="subscriptions-hero-desc">
          Kredi kartlarına bağlı dijital servisler ile nakit/havale ile ödenen ev kirası, bina aidatı ve faturalar tek ekranda.
        </p>
      </div>

      <div class="subscriptions-hero-stats-group">
        <div class="subscriptions-hero-stat">
          <div class="subscriptions-hero-stat-label">Aylık Toplam Gider (TRY)</div>
          <div class="subscriptions-hero-stat-val" style="color: #c084fc;">${formatMoney(totalMonthly)}</div>
          <div style="font-size:0.72rem; color:var(--text-muted); margin-top:0.2rem;">${allSubs.length} aktif kayıt</div>
        </div>
        <div class="subscriptions-hero-stat">
          <div class="subscriptions-hero-stat-label">Yıllık Projeksiyon (TRY)</div>
          <div class="subscriptions-hero-stat-val" style="color: #60a5fa;">${formatMoney(totalYearly)}</div>
          <div style="font-size:0.72rem; color:var(--text-muted); margin-top:0.2rem;">Yıllık toplam maliyet</div>
        </div>
      </div>
    </div>

    <!-- 🏠 Ev Sahibi Olma & Kira Tasarrufu Analiz Kartı -->
    ${(() => {
      const rentSub = allSubs.find(s => s.category === 'Rent' || s.name.toLowerCase().includes('kira'));
      const detectedMonthlyRent = rentSub ? convertToTry(rentSub.amount, rentSub.currency) : 25000;
      
      let fiveYearRentTotal = 0;
      let fiveYearInvestmentTotal = 0;
      let tempMonthly = detectedMonthlyRent;
      const mRate = Math.pow(1 + 0.40, 1 / 12) - 1;
      for (let y = 1; y <= 5; y++) {
        fiveYearRentTotal += tempMonthly * 12;
        for (let m = 0; m < 12; m++) {
          fiveYearInvestmentTotal = (fiveYearInvestmentTotal + tempMonthly) * (1 + mRate);
        }
        tempMonthly *= 1.35;
      }

      return `
        <div class="rent-simulator-card">
          <div class="rent-sim-header">
            <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
              <span class="rent-sim-pill">🏠 Konut & Kira Kâr Analizi</span>
              <strong style="font-size:0.95rem; color:#fff;">Evin Olsaydı Kiradan Ne Kadar Kâr Edecektin?</strong>
            </div>
            <button type="button" class="btn btn-emerald btn-sm" onclick="openRentSimulatorModal()">
              📊 Detaylı Simülatör & Hesaplama
            </button>
          </div>

          <p style="font-size:0.8rem; color:var(--text-muted); margin:0 0 0.5rem 0;">
            ${rentSub ? `Kayıtlı <strong>₺${formatMoney(detectedMonthlyRent)}/ay</strong> kiranız baz alınarak hesaplanmıştır.` : `Aylık tahmini <strong>₺${formatMoney(detectedMonthlyRent)}/ay</strong> kira baz alınmıştır.`}
            Kira ödemek yerine ev sahibi olunduğunda cebinizde kalacak net tutarlar:
          </p>

          <div class="rent-sim-grid">
            <div class="rent-sim-stat">
              <span class="rent-sim-stat-label">1 Yılda Cebinde Kalacak</span>
              <span class="rent-sim-stat-val" style="color:#34d399;">₺${formatMoney(detectedMonthlyRent * 12)}</span>
              <span style="font-size:0.7rem; color:var(--text-muted);">Yıllık net kira tasarrufu</span>
            </div>
            <div class="rent-sim-stat">
              <span class="rent-sim-stat-label">5 Yılda Kümülatif Tasarruf</span>
              <span class="rent-sim-stat-val" style="color:#fbbf24;">₺${formatMoney(fiveYearRentTotal)}</span>
              <span style="font-size:0.7rem; color:var(--text-muted);">%35 yıllık kira artışı dahil</span>
            </div>
            <div class="rent-sim-stat">
              <span class="rent-sim-stat-label">5 Yıllık Yatırım Değeri</span>
              <span class="rent-sim-stat-val" style="color:#38bdf8;">₺${formatMoney(fiveYearInvestmentTotal)}</span>
              <span style="font-size:0.7rem; color:var(--text-muted);">Tasarruf fon/altında değerlendirilirse</span>
            </div>
          </div>
        </div>
      `;
    })()}

    <!-- Section Header with Action Button -->
    <div class="tab-section-header" style="margin-top: 0.5rem;">
      <div>
        <h3 class="tab-section-title">Kayıtlı Servisler, Kira & Giderler</h3>
        <p class="tab-section-subtitle">Hangi kanaldan ne kadar ödendiğini ve ödeme günlerini takip edin</p>
      </div>
      <button class="btn btn-primary" onclick="openAddSubscriptionModal()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        <span>+ Yeni Gider / Abonelik Ekle</span>
      </button>
    </div>

    <!-- Subscriptions Cards Grid -->
    <div class="subscriptions-grid">
      ${allSubs.length === 0 ? `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <h3>Henüz Kayıtlı Abonelik / Gider Yok</h3>
          <p>Kira, bina aidatı, faturalar ve dijital aboneliklerinizi ekleyerek nakit çıkışınızı kontrol altına alın.</p>
          <button class="btn btn-primary" onclick="openAddSubscriptionModal()">+ İlk Gideri Ekle</button>
        </div>
      ` : allSubs.map(sub => {
        const billingDay = Number(sub.billingDay) || 1;
        const daysLeft = billingDay >= today ? billingDay - today : billingDay + getDaysInCurrentMonth() - today;
        const icon = getSubIcon(sub.name, sub.category);
        const isYearly = sub.cycle === 'yearly';
        const subCurr = sub.currency || 'TRY';
        const isForeign = subCurr !== 'TRY';
        const subSymbol = subCurr === 'USD' ? '$' : subCurr === 'EUR' ? '€' : subCurr === 'GBP' ? '£' : '₺';
        const amountTry = convertToTry(sub.amount, subCurr);
        const catLabel = categoryNameMap[sub.category] || sub.category || 'Düzenli Gider';

        return `
          <div class="subscription-card" style="border-top: 3px solid ${sub.cardColor};">
            <div class="sub-card-top">
              <div class="sub-brand-info">
                <div class="sub-logo-badge">${icon}</div>
                <div>
                  <div style="display:flex; align-items:center; gap:0.35rem; flex-wrap:wrap;">
                    <h4 class="sub-name" style="margin:0;">${escapeHtml(sub.name)}</h4>
                    ${sub.isEstimated ? '<span style="font-size:0.65rem; background:#fef3c7; color:#92400e; border:1px solid #fde68a; border-radius:4px; padding:1px 5px; font-weight:700;">📊 Tahmini</span>' : ''}
                  </div>
                  <span class="sub-category-tag">${escapeHtml(catLabel)}</span>
                </div>
              </div>

              <div class="sub-price-tag">
                ${sub.isEstimated ? '~' : ''}${isForeign ? `${subSymbol}${sub.amount}` : formatMoney(sub.amount)}
                ${isForeign ? `<div style="font-size:0.72rem; color:#38bdf8; font-weight:600;">≈ ${sub.isEstimated ? '~' : ''}${formatMoney(amountTry)}</div>` : ''}
                <div class="sub-cycle-text">${isYearly ? '/ yıl' : '/ ay'}</div>
              </div>
            </div>

            <!-- Assigned Payment Method Details Box -->
            <div class="sub-card-detail-box">
              <div style="display:flex; flex-direction:column; gap:0.25rem;">
                <span style="font-size:0.7rem; color:var(--text-muted);">Ödeme Yöntemi:</span>
                <span class="sub-assigned-card-pill" style="border-color: ${sub.cardColor};">
                  <span style="width:7px; height:7px; border-radius:50%; background:${sub.cardColor};"></span>
                  <strong>${escapeHtml(sub.cardNickname)}</strong> ${sub.cardLast4 ? `(•${sub.cardLast4})` : ''}
                </span>
              </div>

              <div style="display:flex; flex-direction:column; align-items:flex-end; gap:0.25rem;">
                <span style="font-size:0.7rem; color:var(--text-muted);">Ödeme Günü:</span>
                <span class="sub-billing-date-pill">
                  📅 Ayın ${billingDay}'i
                  <strong style="color: ${daysLeft <= 3 ? '#fb7185' : '#34d399'};">(${daysLeft === 0 ? 'Bugün!' : `${daysLeft} gün kaldı`})</strong>
                </span>
              </div>
            </div>

            ${sub.isFrozen ? `
              <div style="background:rgba(244,63,94,0.12); border:1px solid rgba(244,63,94,0.3); border-radius:6px; padding:0.35rem 0.6rem; font-size:0.72rem; color:#fb7185; display:flex; align-items:center; gap:0.35rem;">
                ⚠️ <strong>Uyarı:</strong> Bağlı kredi kartı dondurulduğu için bu aboneliğin ödemesi aksayabilir.
              </div>
            ` : ''}

            <!-- Card Actions -->
            <div style="display:flex; justify-content:flex-end; gap:0.5rem; margin-top:0.25rem; border-top:1px solid rgba(255,255,255,0.06); padding-top:0.6rem;">
              <button class="btn btn-secondary btn-sm" onclick="openEditSubscriptionModal('${sub.cardId}', '${sub.id}')" title="Düzenle">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                <span>Düzenle</span>
              </button>
              <button class="btn btn-danger-outline btn-sm" onclick="confirmDeleteSubscription('${sub.cardId}', '${sub.id}')" title="Sil">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                <span>Kaldır</span>
              </button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function getSubIcon(name = '', category = '') {
  const n = name.toLowerCase();
  if (category === 'Rent' || n.includes('kira')) return '🏠';
  if (category === 'Maintenance' || n.includes('aidat')) return '🏢';
  if (n.includes('netflix')) return '🎬';
  if (n.includes('spotify') || n.includes('deezer') || n.includes('apple music')) return '🎵';
  if (n.includes('youtube')) return '▶️';
  if (n.includes('chatgpt') || n.includes('openai') || n.includes('claude') || n.includes('midjourney')) return '🤖';
  if (n.includes('icloud') || n.includes('google') || n.includes('drive') || n.includes('dropbox') || n.includes('aws')) return '☁️';
  if (n.includes('amazon') || n.includes('prime')) return '📦';
  if (n.includes('adobe') || n.includes('figma') || n.includes('canva')) return '🎨';
  if (n.includes('turkcell') || n.includes('vodafone') || n.includes('telekom') || n.includes('fatura') || n.includes('elektrik') || n.includes('su') || n.includes('gaz')) return '⚡';
  if (n.includes('gym') || n.includes('fit') || n.includes('spor')) return '🏋️';
  if (category === 'Streaming') return '🍿';
  if (category === 'Software') return '💻';
  if (category === 'Cloud') return '🗄️';
  if (category === 'Bills') return '📄';
  if (category === 'Lifestyle') return '🌟';
  if (category === 'Education') return '🎓';
  return '⚡';
}

// 5.4. Dedicated Statement & Payment Timeline View (Ekstre & Ödeme Takvimi)
function renderTimelineView() {
  const container = document.getElementById('timelineContainer');
  if (!container) return;

  const now = new Date();
  const today = now.getDate();
  const currentMonthDays = getDaysInCurrentMonth();
  const currentMonthName = now.toLocaleString('tr-TR', { month: 'long' });

  const timelineEvents = [];

  // 1. Kredi Kartları (Kesim ve Son Ödeme Günleri)
  state.cards.forEach(card => {
    const bank = state.banks.find(b => b.id === card.bankId) || { name: 'Banka', color: '#3b82f6' };
    const lim = Number(card.limit) || 0;
    const debt = Number(card.usedBalance) || 0;
    const isKat = card.isParticipationBank || Number(card.minPaymentRatio) === 100;
    const minRatio = isKat ? 100 : (Number(card.minPaymentRatio) || (lim >= 25000 ? 40 : 20));
    const minDue = isKat ? debt : Math.round(debt * (minRatio / 100));

    let cutoffDay = card.dateMethod === 'exact' ? Number(card.cutoffDay) : getApproxDay(card.approxCutoffWeek);
    let dueDay = card.dateMethod === 'exact' ? Number(card.dueDay) : getApproxDay(card.approxDueWeek);
    if (!cutoffDay || isNaN(cutoffDay)) cutoffDay = 15;
    if (!dueDay || isNaN(dueDay)) dueDay = 25;

    // Kesim Günü Olayı
    let cutoffDaysLeft = cutoffDay >= today ? cutoffDay - today : cutoffDay + currentMonthDays - today;
    timelineEvents.push({
      id: `card-cut-${card.id}`,
      type: 'card_cutoff',
      category: 'cutoff',
      title: `${card.nickname} - Ekstre Kesimi`,
      sourceName: bank.name,
      color: bank.color || '#3b82f6',
      icon: '✂️',
      day: cutoffDay,
      daysLeft: cutoffDaysLeft,
      amount: 0,
      note: 'Dönem harcamaları hesaplanır ve faturalandırılır.'
    });

    // Son Ödeme Günü Olayı (Borç > 0 veya bu ay ödenmiş ise)
    const isPaid = !!card.isPaidThisMonth;
    const paidAmount = Number(card.paidThisMonthAmount) || 0;
    const totalMonthDebt = isPaid ? paidAmount : debt;

    if (totalMonthDebt > 0 || isPaid) {
      let dueDaysLeft = dueDay >= today ? dueDay - today : dueDay + currentMonthDays - today;
      timelineEvents.push({
        id: `card-due-${card.id}`,
        cardId: card.id,
        type: 'card_due',
        category: 'debt',
        title: `${card.nickname} - Son Ödeme Günü`,
        sourceName: bank.name,
        color: isPaid ? '#10b981' : '#f43f5e',
        icon: isPaid ? '✅' : '💳',
        day: dueDay,
        daysLeft: dueDaysLeft,
        amount: totalMonthDebt,
        isPaid: isPaid,
        minDue: minDue,
        isKatilim: isKat,
        note: isPaid 
          ? `🎉 ₺${formatMoney(paidAmount)} tutarındaki bu ayki dönem borcu ödendi ve kapatıldı.`
          : `Asgari: ₺${formatMoney(minDue)} ${isKat ? '(%100 Katılım)' : ''}`
      });
    }
  });

  // 2. Krediler (Aylık Taksit Ödeme Günleri)
  (state.loans || []).forEach(loan => {
    const totalInst = Number(loan.totalInstallments) || 1;
    const paidInst = Number(loan.paidInstallments) || 0;
    if (paidInst >= totalInst || loan.startCycle === 'next') return; // Gelecek ay başlayacak krediler bu ayın çıkışına eklenmez

    const bank = state.banks.find(b => b.id === loan.bankId) || { name: 'Banka', color: '#10b981' };
    const monthlyAmt = Number(loan.monthlyPayment) || 0;
    const payDay = Math.min(31, Math.max(1, Number(loan.paymentDay) || 15));
    let daysLeft = payDay >= today ? payDay - today : payDay + currentMonthDays - today;

    timelineEvents.push({
      id: `loan-${loan.id}`,
      loanId: loan.id,
      type: 'loan',
      category: 'loan',
      title: `${loan.title} - Kredi Taksiti`,
      sourceName: bank.name,
      color: '#0284c7',
      icon: '🏦',
      day: payDay,
      daysLeft: daysLeft,
      amount: monthlyAmt,
      note: `${paidInst + 1}. / ${totalInst} Taksit`
    });
  });

  // 3. Abonelikler, Kira, Bina Aidatı & Faturalar (Nakit, Havale, Kart)
  getAllSubscriptions().forEach(sub => {
    const origAmt = Number(sub.amount) || 0;
    if (origAmt <= 0) return;
    const tryAmt = convertToTry(origAmt, sub.currency || 'TRY');
    const payDay = Math.min(31, Math.max(1, Number(sub.billingDay) || 15));
    let daysLeft = payDay >= today ? payDay - today : payDay + currentMonthDays - today;

    let icon = getSubIcon(sub.name, sub.category);
    let paymentLabel = sub.paymentType === 'cash' ? '💵 Nakit / Elden' : (sub.paymentType === 'bank_transfer' ? '🏦 Banka Havalesi' : `💳 ${sub.cardNickname}`);
    let color = sub.paymentType === 'cash' ? '#10b981' : (sub.paymentType === 'bank_transfer' ? '#0284c7' : '#c084fc');

    timelineEvents.push({
      id: `sub-${sub.id}`,
      subId: sub.id,
      cardId: sub.cardId,
      type: 'subscription',
      category: sub.paymentType,
      title: sub.name,
      sourceName: paymentLabel,
      color: color,
      icon: icon,
      day: payDay,
      daysLeft: daysLeft,
      amount: tryAmt,
      originalAmount: origAmt,
      currency: sub.currency || 'TRY',
      isEstimated: !!sub.isEstimated,
      note: sub.cycle === 'yearly' ? 'Yıllık Yenilenme' : `${paymentLabel} ile tahsil edilir.`
    });
  });

  // 4. Aylık Maaş / Gelir Girişi (Profilde tanımlı ise)
  const salaryDay = Number(state.profile?.salaryDay) || 15;
  const monthlyIncome = Number(state.profile?.monthlyIncome) || 0;
  if (salaryDay) {
    let salaryDaysLeft = salaryDay >= today ? salaryDay - today : salaryDay + currentMonthDays - today;
    timelineEvents.push({
      id: 'salary-inflow-event',
      type: 'salary',
      category: 'income',
      title: '💵 Aylık Maaş & Gelir Girişi',
      sourceName: monthlyIncome > 0 ? `+₺${formatMoney(monthlyIncome)}` : 'Nakit Gelir',
      color: '#10b981',
      icon: '💰',
      day: salaryDay,
      daysLeft: salaryDaysLeft,
      amount: 0,
      incomeAmount: monthlyIncome,
      note: `Her ayın ${salaryDay}. günü gerçekleşen ana maaş/gelir girişi.`
    });
  }

  // Sırala: En yakın günlere göre
  timelineEvents.sort((a, b) => a.daysLeft - b.daysLeft);

  const urgentEvents = timelineEvents.filter(e => e.daysLeft <= 7 && e.amount > 0 && !e.isPaid);
  const urgentDot = document.getElementById('timelineUrgentDot');
  if (urgentDot) {
    urgentDot.style.display = urgentEvents.length > 0 ? 'inline-block' : 'none';
  }

  const paymentEvents = timelineEvents.filter(e => e.amount > 0 && e.type !== 'salary');
  const totalPlannedOutflow = paymentEvents.reduce((s, e) => s + e.amount, 0);
  const totalPaidOutflow = paymentEvents.filter(e => e.isPaid).reduce((s, e) => s + e.amount, 0);
  const totalRemainingOutflow = Math.max(0, totalPlannedOutflow - totalPaidOutflow);

  container.innerHTML = `
    <!-- Timeline Hero Header -->
    <div class="tab-section-header">
      <div>
        <h2 class="tab-section-title">📅 ${currentMonthName} Ayı Ekstre & Ödeme Takvimi</h2>
        <p class="tab-section-subtitle">Kredi kartı ekstre kesimleri, kredi taksitleri, ev kirası, aidat ve aboneliklerin gün bazlı nakit akışı</p>
      </div>
      <div style="display:flex; align-items:center; gap:0.5rem;">
        <button class="btn btn-secondary btn-sm" onclick="exportPdfReport()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ec4899" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="12" y1="11" x2="12" y2="17"></line></svg>
          <span>PDF Raporu</span>
        </button>
      </div>
    </div>

    <!-- Timeline Summary Banner with Planned, Paid & Remaining Outflow -->
    <div style="background: linear-gradient(135deg, rgba(147,51,234,0.12) 0%, rgba(59,130,246,0.08) 100%); border: 1px solid rgba(147,51,234,0.25); border-radius: var(--radius-md); padding: 0.85rem 1.1rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.75rem; margin-bottom:1rem;">
      <div style="display:flex; align-items:center; gap:0.5rem;">
        <span style="font-size:1.1rem;">📅</span>
        <span style="font-size:0.85rem; font-weight:800; color:#fff;">Bu Ayki Toplam Nakit Çıkışı (${paymentEvents.length} Ödeme)</span>
      </div>
      <div style="display:flex; align-items:center; gap:0.85rem; flex-wrap:wrap; font-size:0.82rem;">
        <span>💳 ${paymentEvents.filter(e => e.type === 'card_due').length} Kart</span>
        <span>🏦 ${paymentEvents.filter(e => e.type === 'loan').length} Kredi</span>
        <span>🏠/🍿 ${paymentEvents.filter(e => e.type === 'subscription').length} Kira & Gider</span>
        <span>Toplam: <strong style="color:#c084fc; font-size:0.95rem;">₺${formatMoney(totalPlannedOutflow)}</strong></span>
        ${totalPaidOutflow > 0 ? `<span style="background:rgba(16,185,129,0.2); color:#34d399; padding:0.15rem 0.5rem; border-radius:4px; font-weight:700;">✓ Ödenen: ₺${formatMoney(totalPaidOutflow)}</span>` : ''}
        ${totalRemainingOutflow > 0 && totalPaidOutflow > 0 ? `<span style="color:#fb7185; font-weight:700;">Kalan: ₺${formatMoney(totalRemainingOutflow)}</span>` : ''}
      </div>
    </div>

    <!-- Timeline Chronological Flow -->
    ${timelineEvents.length === 0 ? `
      <div class="empty-state">
        <h3>Henüz Takvime Eklenmiş Ödeme Yok</h3>
        <p>Kredi kartı, kredi veya düzenli kira/fatura gideri eklediğinizde ödeme günleriniz burada listelenir.</p>
      </div>
    ` : `
      <div style="display:flex; flex-direction:column; gap:0.75rem; margin-top:0.5rem;">
        ${timelineEvents.map(e => {
          const isToday = e.daysLeft === 0;
          const isUrgent = e.daysLeft <= 3 && e.amount > 0 && !e.isPaid;

          return `
            <div style="background: ${e.isPaid ? 'rgba(16,185,129,0.06)' : 'rgba(15, 23, 42, 0.6)'}; border: 1px solid ${e.isPaid ? 'rgba(16,185,129,0.3)' : isToday ? '#10b981' : isUrgent ? 'rgba(244,63,94,0.4)' : 'rgba(255,255,255,0.06)'}; border-left: 4px solid ${e.color}; border-radius: var(--radius-md); padding: 0.85rem 1.1rem; display:flex; justify-content:space-between; align-items:center; gap:1rem; flex-wrap:wrap;">
              <div style="display:flex; align-items:center; gap:0.85rem;">
                <div style="width:38px; height:38px; border-radius:var(--radius-md); background:${e.isPaid ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)'}; display:flex; align-items:center; justify-content:center; font-size:1.25rem;">
                  ${e.icon}
                </div>
                <div>
                  <div style="display:flex; align-items:center; gap:0.45rem; flex-wrap:wrap;">
                    <strong style="font-size:0.92rem; color:${e.isPaid ? '#34d399' : '#fff'};">${escapeHtml(e.title)}</strong>
                    ${e.isPaid ? '<span style="font-size:0.65rem; background:rgba(16,185,129,0.25); color:#34d399; border:1px solid rgba(16,185,129,0.4); border-radius:4px; padding:1px 6px; font-weight:800;">✓ Ödendi</span>' : ''}
                    ${e.isEstimated ? '<span style="font-size:0.65rem; background:#fef3c7; color:#92400e; border:1px solid #fde68a; border-radius:4px; padding:1px 5px; font-weight:700;">📊 Tahmini</span>' : ''}
                    <span style="font-size:0.72rem; color:var(--text-muted); background:rgba(255,255,255,0.05); padding:0.15rem 0.45rem; border-radius:4px;">${escapeHtml(e.sourceName)}</span>
                  </div>
                  <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.2rem;">
                    ${escapeHtml(e.note)}
                  </div>
                </div>
              </div>

              <div style="display:flex; align-items:center; gap:0.85rem; flex-wrap:wrap;">
                <div style="text-align:right;">
                  ${e.amount > 0 ? `
                    <div style="font-weight:800; font-size:1.05rem; color:${e.isPaid ? '#34d399' : e.type === 'card_due' ? '#f43f5e' : e.type === 'loan' ? '#38bdf8' : '#c084fc'};">
                      ${e.isEstimated ? '~' : ''}₺${formatMoney(e.amount)}
                    </div>
                  ` : `
                    <div style="font-size:0.8rem; font-weight:700; color:#38bdf8;">
                      Hesap Kesimi
                    </div>
                  `}
                  <div style="font-size:0.72rem; color:${e.isPaid ? '#34d399' : isToday ? '#34d399' : isUrgent ? '#fb7185' : 'var(--text-muted)'}; font-weight:600; margin-top:0.15rem;">
                    📅 Ayın ${e.day}. Günü • ${e.isPaid ? '✅ Ödeme Tamamlandı' : isToday ? '🔥 BUGÜN!' : `${e.daysLeft} gün kaldı`}
                  </div>
                </div>

                ${e.type === 'card_due' && e.cardId ? `
                  <button class="btn ${e.isPaid ? 'btn-secondary' : 'btn-emerald'} btn-sm" onclick="payCardFullDebt('${e.cardId}')" title="${e.isPaid ? 'Ödendi durumunu geri al ve borcu tekrar aç' : 'Dönem Borcunu Ödendi Olarak Kapat'}" style="padding:0.4rem 0.75rem; font-size:0.78rem; font-weight:700; border-radius:6px; display:inline-flex; align-items:center; gap:0.3rem;">
                    ${e.isPaid ? '↩️ Ödendi (Kapatıldı)' : '✅ Borcu Kapat'}
                  </button>
                ` : e.type === 'loan' && e.loanId ? `
                  <button class="btn btn-primary btn-sm" onclick="paySingleLoanInstallment('${e.loanId}')" title="Bu Ayki Kredi Taksitini Öde" style="padding:0.4rem 0.75rem; font-size:0.78rem; font-weight:700; border-radius:6px; display:inline-flex; align-items:center; gap:0.3rem;">
                    ✓ Taksit Öde
                  </button>
                ` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `}
  `;
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

  const debt = Number(card.usedBalance) || 0;
  if (debt <= 0) {
    showToast('Bu kartın güncel borcu bulunmamaktadır.');
    return;
  }

  if (confirm(`"${card.nickname}" kartının güncel ${formatMoney(debt)} tutarındaki dönem borcunu ödendi olarak kapatmak istiyor musunuz?\n\n(Bu ayki takvim toplam nakit çıkışınız silinmez, korunan tutar ile "✓ Ödendi" olarak işaretlenir).`)) {
    card.paidThisMonthAmount = debt;
    card.isPaidThisMonth = true;
    card.usedBalance = 0;
    saveToStorage();
    renderAll();
    showToast(`✅ "${card.nickname}" kartının ${formatMoney(debt)} tutarındaki dönem borcu ödendi olarak kapatıldı.`);
  }
}

// 6. Comprehensive Main Dashboard & Detailed Analytics View
function renderDashboardView() {
  const totalCardDebt = state.cards.reduce((sum, c) => sum + (Number(c.usedBalance) || 0), 0);

  // Kredilerin kalan toplam borcu (tüm aktif krediler)
  const totalLoanRemainingDebt = (state.loans || []).reduce((sum, l) => {
    const totalInst = Number(l.totalInstallments) || 1;
    const paidInst = Number(l.paidInstallments) || 0;
    const monthlyAmt = Number(l.monthlyPayment) || 0;
    return sum + Math.max(0, totalInst - paidInst) * monthlyAmt;
  }, 0);

  const totalUsed = totalCardDebt + totalLoanRemainingDebt;

  const totalLimit = state.cards.reduce((sum, c) => sum + (Number(c.limit) || 0), 0);
  const totalAvailable = Math.max(0, totalLimit - totalCardDebt); // Kart limiti bazlı kullanılabilir
  const utilizationRatio = totalLimit > 0 ? (totalCardDebt / totalLimit) * 100 : 0;
  
  const totalBanks = state.banks.length;
  const activeCards = state.cards.length;

  // 1. Total Ek Hesap (Overdraft) Limit
  const totalEkHesap = state.banks.reduce((sum, b) => sum + (Number(b.ekHesapLimit) || 0), 0);

  // 2. Total Minimum Payment Due This Month (kart asgari + kredi aylık taksit)
  const totalCardMinDue = state.cards.reduce((sum, c) => {
    const used = Number(c.usedBalance) || 0;
    if (used <= 0) return sum;
    const isKatilim = c.isParticipationBank || Number(c.minPaymentRatio) === 100;
    const ratio = isKatilim ? 100 : (Number(c.minPaymentRatio) || (Number(c.limit) >= 25000 ? 40 : 20));
    return sum + Math.round(used * (ratio / 100));
  }, 0);

  const totalMonthlyLoanPayment = (state.loans || []).reduce((sum, l) => {
    const totalInst = Number(l.totalInstallments) || 1;
    const paidInst = Number(l.paidInstallments) || 0;
    if (paidInst >= totalInst || l.startCycle === 'next') return sum; // tamamlandı veya gelecek ay başlayacak
    return sum + (Number(l.monthlyPayment) || 0);
  }, 0);

  const totalMinDue = totalCardMinDue + totalMonthlyLoanPayment;

  // 3.5. Total Monthly Subscriptions & Cash Outflows in TRY
  const allUnifiedSubs = getAllSubscriptions();
  const totalMonthlySubs = allUnifiedSubs.reduce((sum, sub) => {
    const tryAmt = convertToTry(sub.amount, sub.currency || 'TRY');
    return sum + (sub.cycle === 'yearly' ? tryAmt / 12 : tryAmt);
  }, 0);

  const totalMonthlyMandatory = totalMinDue + totalMonthlySubs;
  const monthlyIncome = Number(state.profile?.monthlyIncome) || 0;
  const incomeBurdenRatio = monthlyIncome > 0 ? (totalMonthlyMandatory / monthlyIncome) * 100 : 0;
  const remainingFreeCash = Math.max(0, monthlyIncome - totalMonthlyMandatory);

  // Render Cashflow Widget
  const cashflowEl = document.getElementById('cashflowWidgetContainer');
  if (cashflowEl) {
    let burdenColor = '#10b981';
    let burdenStatusText = 'Güvenli Nakit Dengesi';
    if (incomeBurdenRatio > 65) {
      burdenColor = '#f43f5e';
      burdenStatusText = 'Yüksek Yükümlülük Baskısı';
    } else if (incomeBurdenRatio > 40) {
      burdenColor = '#f59e0b';
      burdenStatusText = 'Dengeli / Kontrollü Yükümlülük';
    }

    cashflowEl.innerHTML = `
      <div class="cashflow-widget">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
          <div class="cashflow-widget-title">
            <span>💸</span>
            <span>Aylık Nakit Çıkışı & Zorunlu Ödemeler Özeti</span>
          </div>
          ${monthlyIncome > 0 ? `
            <span style="font-size:0.75rem; font-weight:700; color:${burdenColor}; background:rgba(0,0,0,0.25); border:1px solid ${burdenColor}40; padding:0.2rem 0.55rem; border-radius:20px;">
              ● ${burdenStatusText} (Gelirin %${incomeBurdenRatio.toFixed(1)}'i)
            </span>
          ` : ''}
        </div>

        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:0.75rem; margin-top:0.25rem;">
          <div class="cashflow-row">
            <span>💳 Kart Asgari Ödemeleri:</span>
            <strong style="color:#fbbf24;">${formatMoney(totalCardMinDue)}</strong>
          </div>
          <div class="cashflow-row">
            <span>🏦 Kredi Aylık Taksitleri:</span>
            <strong style="color:#38bdf8;">${formatMoney(totalMonthlyLoanPayment)}</strong>
          </div>
          <div class="cashflow-row">
            <span>🔁 Abonelikler & Faturalar:</span>
            <strong style="color:#c084fc;">${formatMoney(totalMonthlySubs)}</strong>
          </div>
        </div>

        <div class="cashflow-total-row">
          <div>
            <span style="font-size:0.82rem; color:var(--text-secondary);">Bu Ay Çıkacak Toplam Zorunlu Tutar:</span>
            <div style="font-size:1.15rem; color:#f43f5e; font-weight:800;">${formatMoney(totalMonthlyMandatory)}</div>
          </div>
          ${monthlyIncome > 0 ? `
            <div style="text-align:right;">
              <span style="font-size:0.78rem; color:var(--text-secondary);">Kalan Net Serbest Nakit:</span>
              <div style="font-size:1.15rem; color:#34d399; font-weight:800;">${formatMoney(remainingFreeCash)}</div>
            </div>
          ` : ''}
        </div>

        ${monthlyIncome > 0 ? `
          <div>
            <div style="display:flex; justify-content:space-between; font-size:0.72rem; color:var(--text-muted);">
              <span>Aylık Gelir: ${formatMoney(monthlyIncome)}</span>
              <span>Zorunlu Gider Yükü: %${incomeBurdenRatio.toFixed(1)}</span>
            </div>
            <div class="cashflow-income-bar">
              <div class="cashflow-income-fill" style="width: ${Math.min(100, incomeBurdenRatio)}%; background-color: ${burdenColor};"></div>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  // 3. Nearest Due Date Detection (Borcu olan kartlar ve aktif krediler)
  let nearestDueText = '-';
  let nearestDueSubText = t('noCardsYet');
  
  const now = new Date();
  const today = now.getDate();
  const daysInMonth = getDaysInCurrentMonth();
  const upcomingEvents = [];

  // Borcu olan kredi kartları
  state.cards.forEach(c => {
    const used = Number(c.usedBalance) || 0;
    if (used <= 0) return; // Borcu olmayan kartları en yakın ödeme listesine alma

    let due = c.dateMethod === 'exact' ? Number(c.dueDay) : getApproxDay(c.approxDueWeek);
    if (!due || isNaN(due)) due = 15;

    let daysLeft = due >= today ? due - today : due + daysInMonth - today;
    const isKatilim = c.isParticipationBank || Number(c.minPaymentRatio) === 100;
    const minRatio = isKatilim ? 100 : (Number(c.minPaymentRatio) || (Number(c.limit) >= 25000 ? 40 : 20));
    const minAmt = isKatilim ? used : Math.round((used * minRatio) / 100);

    const eventDate = new Date(now.getFullYear(), now.getMonth(), today + daysLeft);
    const eventMonthName = eventDate.toLocaleString('tr-TR', { month: 'short' });

    upcomingEvents.push({
      type: 'card',
      title: c.nickname,
      bankName: cBankName(c.bankId),
      day: due,
      monthName: eventMonthName,
      daysLeft: daysLeft,
      amount: minAmt,
      totalDebt: used,
      isKatilim
    });
  });

  // Aktif Krediler
  (state.loans || []).forEach(l => {
    const totalInst = Number(l.totalInstallments) || 1;
    const paidInst = Number(l.paidInstallments) || 0;
    if (paidInst >= totalInst) return; // Tamamlanan kredileri atla

    const monthlyAmt = Number(l.monthlyPayment) || 0;
    const remainingInst = totalInst - paidInst;
    const remainingDebt = remainingInst * monthlyAmt;
    const payDay = Math.min(31, Math.max(1, Number(l.paymentDay) || 15));

    let daysLeft = payDay >= today ? payDay - today : payDay + daysInMonth - today;
    const eventDate = new Date(now.getFullYear(), now.getMonth(), today + daysLeft);
    const eventMonthName = eventDate.toLocaleString('tr-TR', { month: 'short' });

    upcomingEvents.push({
      type: 'loan',
      title: l.title,
      bankName: cBankName(l.bankId),
      day: payDay,
      monthName: eventMonthName,
      daysLeft: daysLeft,
      amount: monthlyAmt,
      totalDebt: remainingDebt,
      remainingInst: remainingInst
    });
  });

  // 3. Düzenli Kira, Aidat, Faturalar & Abonelikler (Nakit / Havale / Kart)
  getAllSubscriptions().forEach(sub => {
    const amt = Number(sub.amount) || 0;
    if (amt <= 0) return;
    const tryAmt = convertToTry(amt, sub.currency || 'TRY');
    const payDay = Math.min(31, Math.max(1, Number(sub.billingDay) || 15));
    let daysLeft = payDay >= today ? payDay - today : payDay + daysInMonth - today;
    const eventDate = new Date(now.getFullYear(), now.getMonth(), today + daysLeft);
    const eventMonthName = eventDate.toLocaleString('tr-TR', { month: 'short' });
    const icon = getSubIcon(sub.name, sub.category);
    const methodStr = sub.paymentType === 'cash' ? '💵 Nakit' : (sub.paymentType === 'bank_transfer' ? '🏦 Havale/EFT' : `💳 ${sub.cardNickname}`);

    upcomingEvents.push({
      type: 'sub',
      title: sub.name,
      bankName: methodStr,
      icon: icon,
      day: payDay,
      monthName: eventMonthName,
      daysLeft: daysLeft,
      amount: tryAmt,
      originalAmount: amt,
      currency: sub.currency || 'TRY',
      totalDebt: tryAmt,
      isEstimated: !!sub.isEstimated
    });
  });

  // En yakın tarihe göre sırala
  upcomingEvents.sort((a, b) => a.daysLeft - b.daysLeft);

  if (upcomingEvents.length > 0) {
    const nearest = upcomingEvents[0];
    if (nearest.daysLeft === 0) {
      nearestDueText = 'Bugün!';
    } else if (nearest.daysLeft === 1) {
      nearestDueText = 'Yarın!';
    } else {
      nearestDueText = `${nearest.daysLeft} gün kaldı (${nearest.day} ${nearest.monthName})`;
    }

    if (nearest.type === 'card') {
      nearestDueSubText = `💳 <strong>${escapeHtml(nearest.title)}</strong> (${escapeHtml(nearest.bankName)})<br>
      <span style="color:#fb7185; font-weight:700;">Toplam Borç: ${formatMoney(nearest.totalDebt)}</span> • <span style="color:#fbbf24; font-weight:600;">Asgari: ${formatMoney(nearest.amount)}</span>`;
    } else if (nearest.type === 'loan') {
      nearestDueSubText = `🏦 <strong>${escapeHtml(nearest.title)}</strong> (${escapeHtml(nearest.bankName)})<br>
      <span style="color:#38bdf8; font-weight:700;">Aylık Taksit: ${formatMoney(nearest.amount)}</span> • <span style="color:#34d399; font-weight:600;">Kalan: ${formatMoney(nearest.totalDebt)} (${nearest.remainingInst} ay)</span>`;
    } else if (nearest.type === 'sub') {
      nearestDueSubText = `${nearest.icon || '🔁'} <strong>${escapeHtml(nearest.title)}</strong> (${escapeHtml(nearest.bankName)})<br>
      <span style="color:#c084fc; font-weight:700;">Tutar: ${nearest.isEstimated ? '~' : ''}₺${formatMoney(nearest.amount)}</span> • <span style="color:#94a3b8; font-weight:600;">${escapeHtml(nearest.bankName)}</span>`;
    }
  } else if (state.cards.length === 0 && (!state.loans || state.loans.length === 0) && getAllSubscriptions().length === 0) {
    nearestDueSubText = t('noCardsYet');
  } else {
    nearestDueText = 'Borç Yok';
    nearestDueSubText = '🎉 Tebrikler, ödenecek güncel borcunuz bulunmuyor.';
  }

  // Update KPI Elements in DOM
  const elTotalLimit = document.getElementById('statTotalLimit');
  if (elTotalLimit) elTotalLimit.textContent = formatMoney(totalLimit);

  const elTotalUsed = document.getElementById('statTotalUsed');
  if (elTotalUsed) elTotalUsed.textContent = formatMoney(totalUsed);

  const elTotalAvailable = document.getElementById('statTotalAvailable');
  if (elTotalAvailable) elTotalAvailable.textContent = formatMoney(totalAvailable);

  const elTotalEkHesap = document.getElementById('statTotalEkHesap');
  if (elTotalEkHesap) elTotalEkHesap.textContent = formatMoney(totalEkHesap);

  const elTotalMinDue = document.getElementById('statTotalMinDue');
  if (elTotalMinDue) elTotalMinDue.textContent = formatMoney(totalMinDue);

  const elNearestDue = document.getElementById('statNearestDue');
  if (elNearestDue) elNearestDue.textContent = nearestDueText;

  const elNearestDueSub = document.getElementById('statNearestDueSub');
  if (elNearestDueSub) elNearestDueSub.innerHTML = `<span>${nearestDueSubText}</span>`;

  const elUtilization = document.getElementById('statUtilizationRatio');
  if (elUtilization) elUtilization.textContent = `${utilizationRatio.toFixed(1)}%`;

  const meterFill = document.getElementById('statUtilizationFill');
  if (meterFill) {
    meterFill.style.width = `${Math.min(100, utilizationRatio)}%`;
    if (utilizationRatio < 35) {
      meterFill.style.backgroundColor = 'var(--accent-emerald)';
    } else if (utilizationRatio < 70) {
      meterFill.style.backgroundColor = 'var(--accent-amber)';
    } else {
      meterFill.style.backgroundColor = 'var(--accent-rose)';
    }
  }

  const elBankCount = document.getElementById('statBankCount');
  if (elBankCount) elBankCount.textContent = totalBanks;

  const elCardCount = document.getElementById('statCardCount');
  if (elCardCount) elCardCount.textContent = activeCards;

  const cardBadge = document.getElementById('cardsTabBadge');
  if (cardBadge) cardBadge.textContent = activeCards;

  // Sidebar Mini Portfolio Widget Sync
  const sideAvail = document.getElementById('sidebarAvailLimit');
  if (sideAvail) sideAvail.textContent = formatMoney(totalAvailable);

  const sideDebt = document.getElementById('sidebarDebt');
  if (sideDebt) sideDebt.textContent = formatMoney(totalUsed); // kart borcu + kredi borcu

  const sideUtilPct = document.getElementById('sidebarUtilPct');
  if (sideUtilPct) sideUtilPct.textContent = `%${utilizationRatio.toFixed(1)}`;

  const sideUtilFill = document.getElementById('sidebarUtilFill');
  if (sideUtilFill) {
    sideUtilFill.style.width = `${Math.min(100, utilizationRatio)}%`;
    sideUtilFill.style.backgroundColor = getUtilizationColor(utilizationRatio);
  }

  // 4. Financial Health Score Widget
  renderHealthScoreWidget(utilizationRatio, totalUsed, totalLimit, totalEkHesap);

  // 4.5. 🧠 Akıllı Kart Harcama Danışmanı (Best Card to Spend Right Now)
  renderSmartCardAdvisor();

  // 5. Chart 1: Bank-by-Bank Limit & Debt Breakdown
  renderBankAnalysisChart(totalLimit);

  // 6. Chart 2: Ek Hesap (Overdraft) Pool
  renderEkHesapAnalysisChart(totalEkHesap);

  // 7. Chart 3: Network & Card Type Breakdown
  renderNetworkAndTypeChart(totalLimit);

  // 8. Chart 4: Monthly Payment Flow & Cashflow Schedule
  renderPaymentFlowChart();

  // 9. Smart Financial Insights
  renderSmartInsights(utilizationRatio, totalUsed, totalLimit, totalEkHesap, totalMinDue);

  // 10. Executive Card Summary Table
  renderExecutiveTable();
}

// --------------------------------------------------------------------------
// 🧠 Smart Card Spending Advisor Engine ("Bugün Hangi Kartla Harcamalıyım?")
// --------------------------------------------------------------------------
function calculateCardDeferralDays(card, now = new Date()) {
  const today = now.getDate();
  const currentMonthDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const nextMonthDays = new Date(now.getFullYear(), now.getMonth() + 2, 0).getDate();

  let cutoffDay = card.dateMethod === 'exact' ? Number(card.cutoffDay) : getApproxDay(card.approxCutoffWeek);
  let dueDay = card.dateMethod === 'exact' ? Number(card.dueDay) : getApproxDay(card.approxDueWeek);
  if (!cutoffDay || isNaN(cutoffDay)) cutoffDay = 15;
  if (!dueDay || isNaN(dueDay)) dueDay = 25;

  let daysUntilPayment = 0;
  let isNextMonthCutoff = false;

  if (today > cutoffDay) {
    // Harcama bir sonraki ayın ekstresine kalır (Maksimum Vade Avantajı!)
    isNextMonthCutoff = true;
    const daysToNextCutoff = (currentMonthDays - today) + cutoffDay;
    const daysBetweenCutoffAndDue = dueDay >= cutoffDay ? (dueDay - cutoffDay) : (nextMonthDays - cutoffDay + dueDay);
    daysUntilPayment = daysToNextCutoff + (daysBetweenCutoffAndDue > 0 ? daysBetweenCutoffAndDue : 10);
  } else {
    // Harcama bu ayki ekstreye yansır
    const daysToThisCutoff = cutoffDay - today;
    const daysBetweenCutoffAndDue = dueDay >= cutoffDay ? (dueDay - cutoffDay) : (currentMonthDays - cutoffDay + dueDay);
    daysUntilPayment = daysToThisCutoff + (daysBetweenCutoffAndDue > 0 ? daysBetweenCutoffAndDue : 10);
  }

  const limit = Number(card.limit) || 0;
  const used = Number(card.usedBalance) || 0;
  const availableLimit = Math.max(0, limit - used);

  return {
    card,
    today,
    cutoffDay,
    dueDay,
    daysUntilPayment,
    isNextMonthCutoff,
    availableLimit
  };
}

function renderSmartCardAdvisor() {
  const container = document.getElementById('smartAdvisorContainer');
  if (!container) return;

  if (state.cards.length === 0) {
    container.innerHTML = '';
    return;
  }

  const now = new Date();
  const rankings = state.cards
    .map(c => calculateCardDeferralDays(c, now))
    .sort((a, b) => b.daysUntilPayment - a.daysUntilPayment);

  // Pick the best card that has available limit, or highest deferral
  const best = rankings.find(r => r.availableLimit > 0) || rankings[0];
  const bank = state.banks.find(b => b.id === best.card.bankId) || { name: 'Banka', color: '#38bdf8' };

  container.innerHTML = `
    <div class="smart-advisor-banner">
      <div class="smart-advisor-header">
        <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
          <span class="smart-advisor-badge">🧠 Akıllı Harcama Danışmanı</span>
          <span style="font-size:0.75rem; color:var(--text-muted);">Bugün (Ayın ${now.getDate()}'i) harcama için en avantajlı kart</span>
        </div>
        <button type="button" class="btn btn-secondary btn-sm" onclick="openSmartAdvisorModal()" style="font-size:0.75rem; padding:0.25rem 0.65rem;">
          📊 Tüm Kartların Vade Sıralaması (${rankings.length})
        </button>
      </div>

      <div class="smart-advisor-card-highlight">
        <div style="display:flex; align-items:center; gap:0.85rem;">
          <div style="font-size:1.9rem;">💳</div>
          <div>
            <div style="display:flex; align-items:center; gap:0.45rem; flex-wrap:wrap;">
              <span style="font-weight:800; font-size:1.05rem; color:#fff;">${escapeHtml(best.card.nickname)}</span>
              <span style="font-size:0.75rem; color:var(--text-muted);">(${escapeHtml(bank.name)}${best.card.last4 ? ` •${best.card.last4}` : ''})</span>
            </div>
            <div style="font-size:0.8rem; color:#38bdf8; margin-top:0.2rem;">
              ${best.isNextMonthCutoff ? '✨ Ekstresi yeni kesildi! Harcamanız 1 ay sonraki ekstreye kalır.' : `Ekstre kesimine ${best.cutoffDay - best.today} gün var.`}
              Kullanılabilir Limit: <strong>₺${formatMoney(best.availableLimit)}</strong>
            </div>
          </div>
        </div>

        <div class="smart-advisor-days-pill">
          <span>🔥</span>
          <span>${best.daysUntilPayment} Gün Sonra Ödeme</span>
        </div>
      </div>
    </div>
  `;
}

function openSmartAdvisorModal() {
  const listEl = document.getElementById('smartAdvisorRankingList');
  if (!listEl) return;

  const now = new Date();
  const rankings = state.cards
    .map(c => calculateCardDeferralDays(c, now))
    .sort((a, b) => b.daysUntilPayment - a.daysUntilPayment);

  listEl.innerHTML = rankings.map((item, idx) => {
    const b = state.banks.find(x => x.id === item.card.bankId) || { name: 'Banka', color: '#38bdf8' };
    const isTop = idx === 0;

    return `
      <div style="background: rgba(0,0,0,0.25); border: 1px solid ${isTop ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.06)'}; border-radius: var(--radius-md); padding: 0.75rem 1rem; display:flex; justify-content:space-between; align-items:center; gap:0.75rem; flex-wrap:wrap;">
        <div style="display:flex; align-items:center; gap:0.65rem;">
          <span style="font-weight:800; font-size:0.85rem; width:22px; height:22px; border-radius:50%; background:${isTop ? '#10b981' : '#334155'}; color:#fff; display:inline-flex; align-items:center; justify-content:center;">
            ${idx + 1}
          </span>
          <div>
            <div style="font-weight:700; font-size:0.9rem; color:#fff;">
              ${escapeHtml(item.card.nickname)}
              <span style="font-size:0.75rem; font-weight:normal; color:var(--text-muted);">(${escapeHtml(b.name)})</span>
            </div>
            <div style="font-size:0.72rem; color:var(--text-muted); margin-top:0.15rem;">
              Kesim Günü: ${item.cutoffDay}. Gün • Son Ödeme: ${item.dueDay}. Gün • Kalan Limit: ₺${formatMoney(item.availableLimit)}
            </div>
          </div>
        </div>

        <div style="text-align:right;">
          <div style="font-weight:800; font-size:0.92rem; color:${item.daysUntilPayment > 30 ? '#34d399' : item.daysUntilPayment > 15 ? '#38bdf8' : '#fbbf24'};">
            ${item.daysUntilPayment} Gün Vade
          </div>
          <div style="font-size:0.7rem; color:var(--text-muted);">
            ${item.isNextMonthCutoff ? 'Gelecek Ekstreye Kalır' : 'Bu Ayki Ekstreye Yansır'}
          </div>
        </div>
      </div>
    `;
  }).join('');

  document.getElementById('smartAdvisorModalOverlay').classList.add('active');
}

function closeSmartAdvisorModal() {
  document.getElementById('smartAdvisorModalOverlay').classList.remove('active');
}

// --------------------------------------------------------------------------
// 🗄️ Backup Vault Engine (Haftalık Otomatik Yedek & Geçmiş Noktaları Kasası)
// --------------------------------------------------------------------------
const BACKUP_VAULT_KEY = 'cardmon_backup_vault_v1'; // aikit:allow-secret -- localStorage key name for backups

function getBackupVault() {
  try {
    const raw = localStorage.getItem(BACKUP_VAULT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveBackupVault(vault) {
  try {
    localStorage.setItem(BACKUP_VAULT_KEY, JSON.stringify(vault.slice(0, 15)));
  } catch (e) {
    console.error('Failed to save backup vault:', e);
  }
}

function checkAndTriggerAutoWeeklyBackup() {
  const vault = getBackupVault();
  const lastAuto = vault.find(v => v.type === 'auto');
  const oneWeekMs = 7 * 24 * 60 * 60 * 1000;

  if (!lastAuto || (Date.now() - lastAuto.timestamp > oneWeekMs)) {
    if (state.cards.length > 0 || state.banks.length > 0) {
      createBackupSnapshot('auto');
    }
  }
}

function createBackupSnapshot(type = 'manual') {
  const vault = getBackupVault();
  const now = new Date();
  const totalDebt = state.cards.reduce((s, c) => s + (Number(c.usedBalance) || 0), 0) +
    (state.loans || []).reduce((s, l) => s + (Math.max(0, (l.totalInstallments || 1) - (l.paidInstallments || 0)) * (Number(l.monthlyPayment) || 0)), 0);

  const snapshot = {
    id: 'snap-' + Date.now(),
    timestamp: Date.now(),
    dateStr: now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    type: type,
    stats: {
      bankCount: state.banks.length,
      cardCount: state.cards.length,
      loanCount: (state.loans || []).length,
      subCount: (state.cashSubscriptions || []).length + state.cards.reduce((s, c) => s + (c.subscriptions || []).length, 0),
      totalDebt: totalDebt
    },
    data: {
      banks: JSON.parse(JSON.stringify(state.banks)),
      cards: JSON.parse(JSON.stringify(state.cards)),
      loans: JSON.parse(JSON.stringify(state.loans || [])),
      cashSubscriptions: JSON.parse(JSON.stringify(state.cashSubscriptions || [])),
      profile: JSON.parse(JSON.stringify(state.profile))
    }
  };

  vault.unshift(snapshot);
  saveBackupVault(vault);
  return snapshot;
}

function createManualBackupSnapshot() {
  createBackupSnapshot('manual');
  renderBackupVaultList();
  showToast('💾 Manuel yedek noktası başarıyla kasaya eklendi.');
}

function openBackupVaultModal() {
  renderBackupVaultList();
  document.getElementById('backupVaultModalOverlay').classList.add('active');
}

function closeBackupVaultModal() {
  document.getElementById('backupVaultModalOverlay').classList.remove('active');
}

function renderBackupVaultList() {
  const container = document.getElementById('backupVaultList');
  if (!container) return;

  const vault = getBackupVault();

  if (vault.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:1.5rem; color:var(--text-muted); font-size:0.85rem;">
        Henüz kayıtlı bir yedek noktası bulunmamaktadır. Yukarıdaki "+ Şimdi Yedek Al" butonuna basarak ilk yedeğinizi alabilirsiniz.
      </div>
    `;
    return;
  }

  container.innerHTML = vault.map(snap => {
    const isAuto = snap.type === 'auto';
    const s = snap.stats || {};

    return `
      <div class="backup-vault-item">
        <div>
          <div style="display:flex; align-items:center; gap:0.4rem; margin-bottom:0.25rem;">
            <span class="${isAuto ? 'backup-vault-tag-auto' : 'backup-vault-tag-manual'}">
              ${isAuto ? '🛡️ Otomatik Haftalık Yedek' : '💾 Manuel Yedek'}
            </span>
            <strong style="font-size:0.85rem; color:#fff;">${snap.dateStr}</strong>
          </div>
          <div style="font-size:0.75rem; color:var(--text-muted); display:flex; gap:0.65rem; flex-wrap:wrap;">
            <span>🏦 ${s.bankCount || 0} Banka</span>
            <span>💳 ${s.cardCount || 0} Kart</span>
            <span>📋 ${s.loanCount || 0} Kredi</span>
            <span>💸 Toplam Borç: <strong>₺${formatMoney(s.totalDebt || 0)}</strong></span>
          </div>
        </div>

        <div style="display:flex; align-items:center; gap:0.35rem;">
          <button type="button" class="btn btn-secondary btn-sm" onclick="downloadBackupSnapshotJson('${snap.id}')" title="Bu versiyonu JSON dosyası olarak indir">
            📥 İndir
          </button>
          <button type="button" class="btn btn-emerald btn-sm" onclick="restoreBackupSnapshot('${snap.id}')" title="Bu yedek noktasına geri dön">
            🔄 Geri Yükle
          </button>
          <button type="button" class="btn btn-danger-outline btn-sm" onclick="deleteBackupSnapshot('${snap.id}')" title="Bu yedeği kasadan sil">
            🗑️
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function restoreBackupSnapshot(snapId) {
  const vault = getBackupVault();
  const snap = vault.find(v => v.id === snapId);
  if (!snap || !snap.data) {
    alert('Yedek noktası bulunamadı.');
    return;
  }

  if (confirm(`⚠️ DİKKAT: "${snap.dateStr}" tarihli yedek noktasına geri dönmek istediğinize emin misiniz?\n\nMevcut verileriniz bu yedekteki veriler ile değiştirilecektir.`)) {
    state.banks = snap.data.banks || [];
    state.cards = snap.data.cards || [];
    state.loans = snap.data.loans || [];
    state.cashSubscriptions = snap.data.cashSubscriptions || [];
    if (snap.data.profile) {
      state.profile = { ...state.profile, ...snap.data.profile };
    }

    saveToStorage();
    renderAll();
    closeBackupVaultModal();
    showToast(`🔄 "${snap.dateStr}" yedeği başarıyla geri yüklendi.`);
  }
}

function downloadBackupSnapshotJson(snapId) {
  const vault = getBackupVault();
  const snap = vault.find(v => v.id === snapId);
  if (!snap || !snap.data) return;

  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(snap.data, null, 2));
  const a = document.createElement('a');
  a.setAttribute('href', dataStr);
  a.setAttribute('download', `cardmon_backup_${snap.dateStr.replace(/[\s,:]+/g, '_')}.json`);
  document.body.appendChild(a);
  a.click();
  a.remove();
  showToast('📥 Yedek JSON dosyası indirildi.');
}

function deleteBackupSnapshot(snapId) {
  let vault = getBackupVault();
  const snap = vault.find(v => v.id === snapId);
  if (!snap) return;

  if (confirm(`"${snap.dateStr}" tarihli yedeği kasadan silmek istediğinize emin misiniz?`)) {
    vault = vault.filter(v => v.id !== snapId);
    saveBackupVault(vault);
    renderBackupVaultList();
    showToast('🗑️ Yedek noktası kasadan silindi.');
  }
}

function cBankName(bankId) {
  const b = state.banks.find(x => x.id === bankId);
  return b ? b.name : 'Banka';
}

function renderHealthScoreWidget(utilizationRatio, totalUsed, totalLimit, totalEkHesap) {
  const pill = document.getElementById('healthScorePill');
  const fill = document.getElementById('healthScoreFill');
  const caption = document.getElementById('healthScoreCaption');
  if (!pill || !fill || !caption) return;

  if (totalLimit === 0) {
    pill.className = 'health-score-pill health-good';
    pill.textContent = t('healthGood');
    fill.style.width = '70%';
    caption.textContent = t('noCardsSub');
    return;
  }

  if (utilizationRatio === 0) {
    pill.className = 'health-score-pill health-excellent';
    pill.textContent = t('healthExcellent');
    fill.style.width = '100%';
    fill.style.background = 'linear-gradient(90deg, #10b981, #06b6d4)';
    caption.textContent = `Tebrikler! Hiç borcunuz bulunmuyor. Kullanılabilir limitiniz %100.`;
  } else if (utilizationRatio <= 30) {
    pill.className = 'health-score-pill health-excellent';
    pill.textContent = t('healthExcellent');
    fill.style.width = '90%';
    fill.style.background = 'linear-gradient(90deg, #10b981, #3b82f6)';
    caption.textContent = `Mükemmel! Limit doluluğunuz %${utilizationRatio.toFixed(1)} ile ideal güvenli aralıkta (<=%30).`;
  } else if (utilizationRatio <= 55) {
    pill.className = 'health-score-pill health-good';
    pill.textContent = t('healthGood');
    fill.style.width = '72%';
    fill.style.background = 'linear-gradient(90deg, #3b82f6, #f59e0b)';
    caption.textContent = `Dengeli. Limit doluluğunuz %${utilizationRatio.toFixed(1)}. Kredi skorunuzu korumak için %30 altına çekebilirsiniz.`;
  } else if (utilizationRatio <= 75) {
    pill.className = 'health-score-pill health-warning';
    pill.textContent = t('healthWarning');
    fill.style.width = '48%';
    fill.style.background = 'linear-gradient(90deg, #f59e0b, #f43f5e)';
    caption.textContent = `Dikkat: Limit doluluğunuz %${utilizationRatio.toFixed(1)} ile yüksek seviyede. Öncelikli borç ödemesi önerilir.`;
  } else {
    pill.className = 'health-score-pill health-critical';
    pill.textContent = t('healthCritical');
    fill.style.width = '25%';
    fill.style.background = '#f43f5e';
    caption.textContent = `Kritik Uyarı: Kart limitlerinizin %${utilizationRatio.toFixed(1)}'si dolu. Yüksek asgari ve faiz yükü oluşabilir.`;
  }
}

// Chart 1: Bank-by-Bank Limit & Debt
function renderBankAnalysisChart(totalLimit) {
  const el = document.getElementById('bankChartCanvas');
  if (!el) return;

  if (state.banks.length === 0) {
    el.innerHTML = `<p style="color:var(--text-muted); text-align:center;">${t('noBanksYet')}</p>`;
    return;
  }

  const bankStats = state.banks.map(bank => {
    const cards = state.cards.filter(c => c.bankId === bank.id);
    const limit = cards.reduce((sum, c) => sum + (Number(c.limit) || 0), 0);
    const debt = cards.reduce((sum, c) => sum + (Number(c.usedBalance) || 0), 0);
    const bankUtil = limit > 0 ? (debt / limit) * 100 : 0;
    return { bank, limit, debt, bankUtil, cardsCount: cards.length };
  }).sort((a, b) => b.limit - a.limit);

  el.innerHTML = `
    <div style="width: 100%; display: flex; flex-direction: column; gap: 1.1rem;">
      ${bankStats.map(item => {
        const sharePercent = totalLimit > 0 ? ((item.limit / totalLimit) * 100).toFixed(1) : 0;
        return `
          <div style="background: rgba(0,0,0,0.15); padding: 0.75rem 1rem; border-radius: var(--radius-md); border: 1px solid rgba(255,255,255,0.04);">
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; margin-bottom: 0.4rem;">
              <span style="font-weight: 700; display:flex; align-items:center; gap:0.5rem;">
                <span style="width:10px; height:10px; border-radius:50%; background:${item.bank.color}; display:inline-block;"></span>
                ${escapeHtml(item.bank.name)}
                <span style="font-size:0.72rem; color:var(--text-muted); font-weight:normal;">(${item.cardsCount} kart)</span>
              </span>
              <span>
                <strong style="color: var(--text-primary);">${formatMoney(item.limit)}</strong>
                <span style="color: var(--text-secondary); font-size:0.75rem;">(${sharePercent}%)</span>
              </span>
            </div>
            
            <div class="meter-bar" style="margin-bottom: 0.35rem; height: 6px;">
              <div class="meter-fill" style="width: ${sharePercent}%; background-color: ${item.bank.color};"></div>
            </div>

            <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--text-muted);">
              <span>Borç: <strong style="color:${item.debt > 0 ? 'var(--accent-rose)' : 'var(--text-secondary)'};">${formatMoney(item.debt)}</strong></span>
              <span>Doluluk: <strong style="color:${getUtilizationColor(item.bankUtil)};">%${item.bankUtil.toFixed(1)}</strong></span>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// Chart 2: Ek Hesap (Overdraft) Reserves
function renderEkHesapAnalysisChart(totalEkHesap) {
  const el = document.getElementById('ekHesapChartCanvas');
  if (!el) return;

  const banksWithEkHesap = state.banks.filter(b => Number(b.ekHesapLimit) > 0);

  if (banksWithEkHesap.length === 0) {
    el.innerHTML = `
      <div style="text-align:center; padding: 1.5rem 1rem;">
        <div style="font-size: 1.75rem; margin-bottom: 0.5rem;">🏦</div>
        <p style="color:var(--text-secondary); font-size:0.85rem; margin-bottom:0.75rem;">Henüz tanımlı bir Ek Hesap (KMH) limitiniz bulunmuyor.</p>
        <button class="btn btn-secondary btn-sm" onclick="openAddBankModal()">${t('addBank')} / Düzenle</button>
      </div>
    `;
    return;
  }

  el.innerHTML = `
    <div style="width: 100%; display: flex; flex-direction: column; gap: 1rem;">
      <div style="background: rgba(6, 182, 212, 0.1); border: 1px solid rgba(6, 182, 212, 0.25); border-radius: var(--radius-md); padding: 0.85rem 1rem; display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:0.85rem; font-weight:600; color:#22d3ee;">🛡️ Toplam Acil Durum Rezervi</span>
        <strong style="font-size:1.1rem; color:#ffffff;">${formatMoney(totalEkHesap)}</strong>
      </div>

      ${banksWithEkHesap.map(b => {
        const lim = Number(b.ekHesapLimit) || 0;
        const pct = totalEkHesap > 0 ? ((lim / totalEkHesap) * 100).toFixed(1) : 0;
        return `
          <div>
            <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.35rem;">
              <span style="font-weight: 600; display:flex; align-items:center; gap:0.4rem;">
                <span style="width:9px; height:9px; border-radius:50%; background:${b.color};"></span>
                ${escapeHtml(b.name)}
              </span>
              <span><strong>${formatMoney(lim)}</strong> (${pct}%)</span>
            </div>
            <div class="meter-bar">
              <div class="meter-fill" style="width: ${pct}%; background-color: ${b.color};"></div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// Chart 3: Network & Card Type
function renderNetworkAndTypeChart(totalLimit) {
  const el = document.getElementById('networkChartCanvas');
  if (!el) return;

  if (state.cards.length === 0) {
    el.innerHTML = `<p style="color:var(--text-muted); text-align:center;">${t('noCardsYet')}</p>`;
    return;
  }

  // Network stats
  const networkTotals = {};
  state.cards.forEach(c => {
    const net = c.network || 'Mastercard';
    if (!networkTotals[net]) networkTotals[net] = { count: 0, limit: 0 };
    networkTotals[net].count += 1;
    networkTotals[net].limit += Number(c.limit) || 0;
  });

  const netColors = {
    Mastercard: '#eb001b',
    Visa: '#1a1f71',
    Troy: '#00a4e4',
    Amex: '#007bc1'
  };

  // Card Type stats
  const typeCounts = {};
  state.cards.forEach(c => {
    const typeKey = c.type || 'typePersonal';
    typeCounts[typeKey] = (typeCounts[typeKey] || 0) + 1;
  });

  el.innerHTML = `
    <div style="width: 100%; display: flex; flex-direction: column; gap: 1.25rem;">
      <div style="display:flex; flex-direction:column; gap:0.75rem;">
        <span style="font-size:0.78rem; font-weight:700; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.04em;">Kart Şebekesi (Network) Payı</span>
        ${Object.entries(networkTotals).map(([net, data]) => {
          const percent = totalLimit > 0 ? ((data.limit / totalLimit) * 100).toFixed(1) : 0;
          const color = netColors[net] || '#3b82f6';
          return `
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 0.25rem;">
                <span style="font-weight: 600; display:flex; align-items:center; gap:0.4rem;">
                  <span style="width:8px; height:8px; border-radius:50%; background:${color};"></span>
                  ${net} (${data.count} kart)
                </span>
                <span><strong>${formatMoney(data.limit)}</strong> (${percent}%)</span>
              </div>
              <div class="meter-bar" style="height:5px;">
                <div class="meter-fill" style="width: ${percent}%; background-color: ${color};"></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <div style="padding-top:0.75rem; border-top:1px solid var(--border-color); display:flex; flex-wrap:wrap; gap:0.4rem;">
        <span style="font-size:0.75rem; color:var(--text-muted); width:100%; margin-bottom:0.2rem;">Kart Türleri Dağılımı:</span>
        ${Object.entries(typeCounts).map(([k, cnt]) => `
          <span style="background:rgba(255,255,255,0.06); padding:0.25rem 0.6rem; border-radius:999px; font-size:0.75rem; color:var(--text-primary); border:1px solid var(--border-color);">
            ${t(k)}: <strong>${cnt}</strong>
          </span>
        `).join('')}
      </div>
    </div>
  `;
}

// Chart 4: Monthly Cashflow Timing
function renderPaymentFlowChart() {
  const el = document.getElementById('paymentFlowCanvas');
  if (!el) return;

  if (state.cards.length === 0 && (!state.loans || state.loans.length === 0) && getAllSubscriptions().length === 0) {
    el.innerHTML = `<p style="color:var(--text-muted); text-align:center;">${t('noCardsYet')}</p>`;
    return;
  }

  const salaryDay = Number(state.profile?.salaryDay) || 15;

  const periods = {
    '1. Hafta (1-7)': { totalDebt: 0, count: 0, color: '#3b82f6', items: [] },
    '2. Hafta (8-14)': { totalDebt: 0, count: 0, color: '#10b981', items: [] },
    '3. Hafta (15-21)': { totalDebt: 0, count: 0, color: '#f59e0b', items: [] },
    '4. Hafta (22-28)': { totalDebt: 0, count: 0, color: '#8b5cf6', items: [] },
    'Ay Sonu (29-31)': { totalDebt: 0, count: 0, color: '#ec4899', items: [] }
  };

  state.cards.forEach(c => {
    let due = c.dateMethod === 'exact' ? Number(c.dueDay) : getApproxDay(c.approxDueWeek);
    if (!due || isNaN(due)) due = 15;
    const debt = Number(c.usedBalance) || Number(c.paidThisMonthAmount) || 0;
    if (debt <= 0) return;

    let periodKey = '3. Hafta (15-21)';
    if (due <= 7) periodKey = '1. Hafta (1-7)';
    else if (due <= 14) periodKey = '2. Hafta (8-14)';
    else if (due <= 21) periodKey = '3. Hafta (15-21)';
    else if (due <= 28) periodKey = '4. Hafta (22-28)';
    else periodKey = 'Ay Sonu (29-31)';

    periods[periodKey].totalDebt += debt;
    periods[periodKey].count += 1;
    periods[periodKey].cardCount = (periods[periodKey].cardCount || 0) + 1;
  });

  // Kredi taksitlerini de haftalık nakit akışına dahil et
  (state.loans || []).forEach(l => {
    const totalInst = Number(l.totalInstallments) || 1;
    const paidInst = Number(l.paidInstallments) || 0;
    if (paidInst >= totalInst || l.startCycle === 'next') return;

    const monthlyAmt = Number(l.monthlyPayment) || 0;
    const payDay = Math.min(31, Math.max(1, Number(l.paymentDay) || 15));

    let periodKey = '3. Hafta (15-21)';
    if (payDay <= 7) periodKey = '1. Hafta (1-7)';
    else if (payDay <= 14) periodKey = '2. Hafta (8-14)';
    else if (payDay <= 21) periodKey = '3. Hafta (15-21)';
    else if (payDay <= 28) periodKey = '4. Hafta (22-28)';
    else periodKey = 'Ay Sonu (29-31)';

    periods[periodKey].totalDebt += monthlyAmt;
    periods[periodKey].count += 1;
    periods[periodKey].loanCount = (periods[periodKey].loanCount || 0) + 1;
  });

  // Düzenli gider ve abonelikleri de haftalık nakit akışına dahil et
  getAllSubscriptions().forEach(sub => {
    const amt = Number(sub.amount) || 0;
    if (amt <= 0) return;
    const tryAmt = convertToTry(amt, sub.currency || 'TRY');
    const payDay = Math.min(31, Math.max(1, Number(sub.billingDay) || 15));

    let periodKey = '3. Hafta (15-21)';
    if (payDay <= 7) periodKey = '1. Hafta (1-7)';
    else if (payDay <= 14) periodKey = '2. Hafta (8-14)';
    else if (payDay <= 21) periodKey = '3. Hafta (15-21)';
    else if (payDay <= 28) periodKey = '4. Hafta (22-28)';
    else periodKey = 'Ay Sonu (29-31)';

    periods[periodKey].totalDebt += tryAmt;
    periods[periodKey].count += 1;
    periods[periodKey].subCount = (periods[periodKey].subCount || 0) + 1;
  });

  const grandDebt = Object.values(periods).reduce((s, p) => s + p.totalDebt, 0);

  el.innerHTML = `
    <div style="width: 100%; display: flex; flex-direction: column; gap: 0.9rem;">
      ${Object.entries(periods).map(([name, data]) => {
        const pct = grandDebt > 0 ? ((data.totalDebt / grandDebt) * 100).toFixed(1) : 0;
        let isSalaryWeek = false;
        if (name.includes('1-7') && salaryDay <= 7) isSalaryWeek = true;
        else if (name.includes('8-14') && salaryDay >= 8 && salaryDay <= 14) isSalaryWeek = true;
        else if (name.includes('15-21') && salaryDay >= 15 && salaryDay <= 21) isSalaryWeek = true;
        else if (name.includes('22-28') && salaryDay >= 22 && salaryDay <= 28) isSalaryWeek = true;
        else if (name.includes('29-31') && salaryDay >= 29) isSalaryWeek = true;

        const parts = [];
        if (data.cardCount > 0) parts.push(`${data.cardCount} Kart Ödemesi`);
        if (data.loanCount > 0) parts.push(`${data.loanCount} Kredi Taksiti`);
        if (data.subCount > 0) parts.push(`${data.subCount} Kira & Abonelik`);
        const subItemsStr = parts.length > 0 ? parts.join(', ') : 'Planlanan ödeme yok';

        return `
          <div>
            <div style="display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 0.25rem;">
              <span style="font-weight: 600; display:flex; align-items:center; gap:0.4rem; flex-wrap:wrap;">
                <span style="width:8px; height:8px; border-radius:50%; background:${data.color};"></span>
                <strong>${name}</strong>
                ${isSalaryWeek ? `<span style="font-size:0.68rem; color:#34d399; background:rgba(16,185,129,0.15); padding:0.1rem 0.4rem; border-radius:4px; font-weight:700;">Maaş Girişi (${salaryDay}'i)</span>` : ''}
                <span style="color:var(--text-muted); font-size:0.72rem;">• ${subItemsStr}</span>
              </span>
              <span><strong style="color:#fff;">₺${formatMoney(data.totalDebt)}</strong> <span style="color:var(--text-secondary); font-size:0.75rem;">(%${pct})</span></span>
            </div>
            <div class="meter-bar" style="height:6px;">
              <div class="meter-fill" style="width: ${pct}%; background-color: ${data.color};"></div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// 9. Smart Financial Insights
function renderSmartInsights(utilizationRatio, totalUsed, totalLimit, totalEkHesap, totalMinDue) {
  const container = document.getElementById('smartInsightsContainer');
  if (!container) return;

  if (state.cards.length === 0) {
    container.innerHTML = '';
    return;
  }

  const highUtilCards = state.cards.filter(c => {
    const lim = Number(c.limit) || 0;
    const debt = Number(c.usedBalance) || 0;
    return lim > 0 && (debt / lim) >= 0.5;
  });

  const insights = [];

  // Insight 1: Risk & High Util Alert
  if (highUtilCards.length > 0) {
    insights.push({
      type: 'warning',
      bg: 'rgba(245, 158, 11, 0.12)',
      border: 'rgba(245, 158, 11, 0.3)',
      icon: '⚠️',
      iconBg: 'rgba(245, 158, 11, 0.2)',
      title: 'Yüksek Limit Doluluğuna Sahip Kartlar',
      desc: `${highUtilCards.map(c => `<strong>${escapeHtml(c.nickname)}</strong> (%${((c.usedBalance/c.limit)*100).toFixed(0)})`).join(', ')} kartlarınız %50 üzerinde limit kullanıyor. Kredi notu optimizasyonu için ödeme yapılması önerilir.`
    });
  } else {
    insights.push({
      type: 'success',
      bg: 'rgba(16, 185, 129, 0.12)',
      border: 'rgba(16, 185, 129, 0.3)',
      icon: '✅',
      iconBg: 'rgba(16, 185, 129, 0.2)',
      title: 'Optimum Kredi Skoru Seviyesi',
      desc: 'Tüm kredi kartlarınızın doluluk oranı güvenli aralıkta tutuluyor. Finansal kredibiliteniz çok iyi durumda.'
    });
  }

  // Insight 2: Minimum payment advisory
  if (totalMinDue > 0) {
    insights.push({
      type: 'info',
      bg: 'rgba(59, 130, 246, 0.12)',
      border: 'rgba(59, 130, 246, 0.3)',
      icon: '💡',
      iconBg: 'rgba(59, 130, 246, 0.2)',
      title: 'Borç Kapatma Stratejisi (Çığ Yöntemi)',
      desc: `Bu ayki tahmini zorunlu asgari ödemeniz <strong>${formatMoney(totalMinDue)}</strong>. En yüksek bakiyeli kartınıza asgariden fazla ödeme yaparak faiz maliyetinizi asgari seviyeye indirebilirsiniz.`
    });
  }

  // Insight 3: Ek Hesap Safety Buffer
  if (totalEkHesap > 0) {
    insights.push({
      type: 'buffer',
      bg: 'rgba(6, 182, 212, 0.12)',
      border: 'rgba(6, 182, 212, 0.3)',
      icon: '🛡️',
      iconBg: 'rgba(6, 182, 212, 0.2)',
      title: 'Acil Durum Likidite Güvencesi',
      desc: `Toplam <strong>${formatMoney(totalEkHesap)}</strong> tutarındaki Ek Hesap limitiniz acil nakit ihtiyaçları veya gecikmeleri önlemek için aktif durumda.`
    });
  }

  // Insight 4: Subscriptions & Recurring Charges
  const allSubs = state.cards.flatMap(c => c.subscriptions || []);
  const totalSubAmount = allSubs.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
  if (allSubs.length > 0) {
    insights.push({
      type: 'info',
      bg: 'rgba(139, 92, 246, 0.12)',
      border: 'rgba(139, 92, 246, 0.3)',
      icon: '🔁',
      iconBg: 'rgba(139, 92, 246, 0.2)',
      title: 'Aylık Düzenli Abonelik & Otomatik Ödemeler',
      desc: `Kayıtlı <strong>${allSubs.length} adet</strong> aboneliğiniz için her ay tahmini <strong>${formatMoney(totalSubAmount)}</strong> düzenli çekim gerçekleşiyor. Kartlarınızı bloke ederken bu ödemeleri göz önünde bulundurunuz.`
    });
  }

  // Insight 5: Annual Card Fee Refund Alerts
  const feeCards = state.cards.filter(c => Number(c.annualFeeAmount) > 0 && c.annualFeeStatus === 'refundRequested');
  if (feeCards.length > 0) {
    insights.push({
      type: 'warning',
      bg: 'rgba(245, 158, 11, 0.12)',
      border: 'rgba(245, 158, 11, 0.3)',
      icon: '🏷️',
      iconBg: 'rgba(245, 158, 11, 0.2)',
      title: 'Kart Aidatı İade Talepleri Takibi',
      desc: `${feeCards.map(c => `<strong>${escapeHtml(c.nickname)}</strong> (${formatMoney(c.annualFeeAmount)})`).join(', ')} için aidat iade talebiniz bulunuyor. Banka müşteri hizmetlerinden iade veya puan durumunu kontrol ediniz.`
    });
  }

  container.innerHTML = insights.map(item => `
    <div class="insight-card" style="background:${item.bg}; border-color:${item.border};">
      <div class="insight-icon-box" style="background:${item.iconBg}; font-size:1.25rem;">
        ${item.icon}
      </div>
      <div class="insight-content">
        <h4>${item.title}</h4>
        <p>${item.desc}</p>
      </div>
    </div>
  `).join('');
}

// 10. Executive Card Summary Table
function renderExecutiveTable() {
  const container = document.getElementById('executiveTableContainer');
  if (!container) return;

  if (state.cards.length === 0) {
    container.innerHTML = `<p style="color:var(--text-muted); text-align:center; padding:2rem;">${t('noCardsYet')}</p>`;
    return;
  }

  container.innerHTML = `
    <table class="executive-table">
      <thead>
        <tr>
          <th>${t('cardNickname')}</th>
          <th>${t('bankName')}</th>
          <th>${t('cardLimit')}</th>
          <th>${t('usedAmount')}</th>
          <th>${t('availableAmount')}</th>
          <th>Doluluk %</th>
          <th>${t('minPaymentDue')}</th>
          <th>${t('paymentDueDate')}</th>
          <th>Durum</th>
        </tr>
      </thead>
      <tbody>
        ${state.cards.map(c => {
          const bank = state.banks.find(b => b.id === c.bankId);
          const limit = Number(c.limit) || 0;
          const debt = Number(c.usedBalance) || 0;
          const avail = Math.max(0, limit - debt);
          const util = limit > 0 ? (debt / limit) * 100 : 0;
          const isKatilim = c.isParticipationBank || Number(c.minPaymentRatio) === 100;
          const ratio = isKatilim ? 100 : (Number(c.minPaymentRatio) || (limit >= 25000 ? 40 : 20));
          const minDue = Math.round(debt * (ratio / 100));
          const dueStr = c.dateMethod === 'exact' ? `Her ayın ${c.dueDay}'i` : t(c.approxDueWeek || 'week3');

          let badgeClass = 'health-excellent';
          let badgeText = 'Düşük';
          if (util > 70) { badgeClass = 'health-critical'; badgeText = 'Kritik'; }
          else if (util > 40) { badgeClass = 'health-warning'; badgeText = 'Orta'; }

          return `
            <tr>
              <td>
                <div class="card-cell-title">
                  <span>💳</span>
                  <div>
                    <strong>${escapeHtml(c.nickname)}</strong>
                    <div style="font-size:0.75rem; color:var(--text-muted);">${c.network} ${c.last4 ? `(•${c.last4})` : ''}</div>
                  </div>
                </div>
              </td>
              <td>
                <span style="display:inline-flex; align-items:center; gap:0.4rem; font-weight:600;">
                  <span style="width:8px; height:8px; border-radius:50%; background:${bank ? bank.color : '#3b82f6'};"></span>
                  ${escapeHtml(bank ? bank.name : 'Banka')}
                </span>
              </td>
              <td><strong>${formatMoney(limit)}</strong></td>
              <td style="color:${debt > 0 ? '#fb7185' : 'var(--text-secondary)'}; font-weight:700;">${formatMoney(debt)}</td>
              <td style="color:#34d399; font-weight:600;">${formatMoney(avail)}</td>
              <td>
                <span style="font-weight:700; color:${getUtilizationColor(util)};">%${util.toFixed(1)}</span>
              </td>
              <td style="color:#fbbf24; font-weight:600;">
                ${debt > 0 ? `
                  <div>${formatMoney(minDue)}</div>
                  ${isKatilim ? `<span style="font-size:0.68rem; color:#34d399; font-weight:700;">🕌 %100 Katılım</span>` : `<span style="font-size:0.68rem; color:var(--text-muted);">(%${ratio})</span>`}
                ` : '-'}
              </td>
              <td><span style="color:var(--text-secondary); font-size:0.8rem;">${dueStr}</span></td>
              <td>
                <span class="health-score-pill ${badgeClass}">${badgeText}</span>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
      <tfoot>
        <tr style="background: rgba(255, 255, 255, 0.06); font-weight: 800; border-top: 2px solid var(--border-color);">
          <td colspan="2">Toplam Portföy (${state.cards.length} Kart)</td>
          <td style="color: #38bdf8; font-size:0.95rem;">${formatMoney(state.cards.reduce((s, c) => s + (Number(c.limit) || 0), 0))}</td>
          <td style="color: #fb7185; font-size:0.95rem;">${formatMoney(state.cards.reduce((s, c) => s + (Number(c.usedBalance) || 0), 0))}</td>
          <td style="color: #34d399; font-size:0.95rem;">${formatMoney(Math.max(0, state.cards.reduce((s, c) => s + (Number(c.limit) || 0), 0) - state.cards.reduce((s, c) => s + (Number(c.usedBalance) || 0), 0)))}</td>
          <td style="color: #fbbf24;">%${(state.cards.reduce((s, c) => s + (Number(c.limit) || 0), 0) > 0 ? (state.cards.reduce((s, c) => s + (Number(c.usedBalance) || 0), 0) / state.cards.reduce((s, c) => s + (Number(c.limit) || 0), 0)) * 100 : 0).toFixed(1)}</td>
          <td style="color: #fbbf24; font-size:0.95rem;">
            ${formatMoney(state.cards.reduce((s, c) => {
              const lim = Number(c.limit) || 0;
              const debt = Number(c.usedBalance) || 0;
              const isKat = c.isParticipationBank || Number(c.minPaymentRatio) === 100;
              const r = isKat ? 100 : (Number(c.minPaymentRatio) || (lim >= 25000 ? 40 : 20));
              return s + (isKat ? debt : Math.round(debt * (r / 100)));
            }, 0))}
          </td>
          <td colspan="2" style="font-size:0.75rem; color:var(--text-muted); font-weight:normal;">Konsolide Toplam</td>
        </tr>
      </tfoot>
    </table>
  `;
}

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
          <span style="color:#22d3ee;">${amount > 0 ? formatMoney(monthlyInstallment) : '₺0'} × ${installments} Ay</span>
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
          <span style="color:#22d3ee;">${amount > 0 ? formatMoney(monthlyInstallment) : '₺0'} × ${installments} Ay</span>
        </div>
        <div style="font-size:0.78rem; color:${isCutoffPassed ? '#f59e0b' : '#34d399'};">
          📅 <strong>Ekstre Kesim Günü:</strong> Ayın ${cutoffDay}'i (Bugün: ${today}. gün)
        </div>
        <div style="font-size:0.78rem; color:var(--text-secondary);">
          ${isCutoffPassed ? `
            ⚠️ <strong>1. Taksit Başlangıcı:</strong> Bu ayki ekstre kesildiği için ilk taksit <strong>bir sonraki ekstre döneminde</strong> ödenecektir.
          ` : `
            ✅ <strong>1. Taksit Başlangıcı:</strong> Ekstre kesim gününe henüz gelinmediği için ilk taksit <strong>bu ayki ekstreye</strong> yansıyacaktır.
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

  const currentDebt = Number(card.usedBalance) || 0;
  if (currentDebt <= 0) {
    showToast(`${card.nickname} kartında ödenecek borç bulunmuyor.`);
    return;
  }

  if (confirm(`"${card.nickname}" kartının ${formatMoney(currentDebt)} tutarındaki tüm dönem borcunu ödeyip sıfırlamak istiyor musunuz?`)) {
    card.usedBalance = 0;
    card.installments = []; // Clears all installments because full debt is settled
    saveToStorage();
    renderAll();
    showToast(`✅ ${card.nickname}: Tüm dönem borcu kapatıldı ve bakiye sıfırlandı.`);
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
  showToast(`${name} (${isEstimated ? 'Tahmini ' : ''}₺${formatMoney(amount)}) kaydedildi.`);
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
        <div style="font-size:1.15rem; font-weight:800; color:#fff; margin-top:0.15rem;">₺${formatMoney(y1.yearTotal)}</div>
        <div style="font-size:0.65rem; color:var(--text-muted); margin-top:0.1rem;">Aylık ₺${formatMoney(monthlyRent)}</div>
      </div>

      <div style="background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.3); border-radius:var(--radius-md); padding:0.75rem 0.85rem;">
        <div style="font-size:0.7rem; color:#fbbf24; font-weight:700; text-transform:uppercase;">5 Yılda Ödenen Kira</div>
        <div style="font-size:1.15rem; font-weight:800; color:#fbbf24; margin-top:0.15rem;">₺${formatMoney(y5.cumulativeRent)}</div>
        <div style="font-size:0.65rem; color:var(--text-muted); margin-top:0.1rem;">%${annualInflation} yıllık artışla</div>
      </div>

      <div style="background:rgba(56,189,248,0.1); border:1px solid rgba(56,189,248,0.3); border-radius:var(--radius-md); padding:0.75rem 0.85rem;">
        <div style="font-size:0.7rem; color:#38bdf8; font-weight:700; text-transform:uppercase;">5 Yıllık Yatırım Değeri</div>
        <div style="font-size:1.15rem; font-weight:800; color:#38bdf8; margin-top:0.15rem;">₺${formatMoney(y5.cumulativeInvestment)}</div>
        <div style="font-size:0.65rem; color:var(--text-muted); margin-top:0.1rem;">%${investmentReturn} bileşik getiriyle</div>
      </div>

      <div style="background:rgba(168,85,247,0.1); border:1px solid rgba(168,85,247,0.3); border-radius:var(--radius-md); padding:0.75rem 0.85rem;">
        <div style="font-size:0.7rem; color:#c084fc; font-weight:700; text-transform:uppercase;">10 Yılda Ödenen Kira</div>
        <div style="font-size:1.15rem; font-weight:800; color:#c084fc; margin-top:0.15rem;">₺${formatMoney(y10.cumulativeRent)}</div>
        <div style="font-size:0.65rem; color:var(--text-muted); margin-top:0.1rem;">10 yıllık kümülatif yük</div>
      </div>
    </div>

    <!-- Strategic Comparison Box -->
    <div style="background:rgba(15,23,42,0.7); border:1px solid rgba(255,255,255,0.08); border-radius:var(--radius-md); padding:0.85rem 1rem; margin-bottom:1rem;">
      <h4 style="font-size:0.88rem; font-weight:700; color:#fff; margin-bottom:0.4rem;">💡 Finansal Karşılaştırma: Ev Sahibi Olmak vs Kirada Kalmak</h4>
      <div style="font-size:0.8rem; line-height:1.45; color:var(--text-secondary); display:flex; flex-direction:column; gap:0.35rem;">
        <div>🏠 <strong>1. Kendi Evinizin Olması Durumunda:</strong> 5 yılda toplam <strong>₺${formatMoney(y5.cumulativeRent)}</strong> tutarındaki kira giderinden tamamen muaf kalırsınız. Bu tutar cebinizde birikim olarak kalır.</div>
        <div>📈 <strong>2. Gayrimenkul Değer Artışı:</strong> Ev fiyatları enflasyona karşı değer kazanırken, kira ödemek yerine ev sahibi olduğunuzda çift yönlü servet artışı sağlarsınız.</div>
        <div>🏦 <strong>3. Kredi Alternatifi:</strong> Aylık ₺${formatMoney(monthlyRent)} kira ödemesi, 120 ay vadeli bir konut kredisi taksitine dönüştürüldüğünde kira öder gibi kendi mülkünüzün sahibi olursunuz.</div>
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
              <td>₺${formatMoney(b.monthlyRent)}</td>
              <td>₺${formatMoney(b.yearTotal)}</td>
              <td style="color:#fbbf24; font-weight:700;">₺${formatMoney(b.cumulativeRent)}</td>
              <td style="color:#34d399; font-weight:700;">₺${formatMoney(b.cumulativeInvestment)}</td>
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
// User Profile & Settings Modal Logic
// --------------------------------------------------------------------------
function openProfileModal() {
  const p = state.profile || {};
  const firstNameInput = document.getElementById('profileFirstName');
  const lastNameInput = document.getElementById('profileLastName');
  const titleInput = document.getElementById('profileTitle');
  const avatarColorInput = document.getElementById('profileAvatarColor');
  const incomeInput = document.getElementById('profileIncome');
  const salaryDayInput = document.getElementById('profileSalaryDay');
  const currSelect = document.getElementById('profileCurrencySelect');
  const langSelect = document.getElementById('profileLangSelect');

  if (firstNameInput) firstNameInput.value = p.firstName || 'Yunus';
  if (lastNameInput) lastNameInput.value = p.lastName || 'Emre';
  if (titleInput) titleInput.value = p.title || 'Finansal Yönetici';
  if (avatarColorInput) avatarColorInput.value = p.avatarColor || '#3b82f6';
  if (incomeInput) incomeInput.value = p.monthlyIncome || '';
  if (salaryDayInput) salaryDayInput.value = p.salaryDay || 15;
  if (currSelect) currSelect.value = state.currency || 'TRY';
  if (langSelect) langSelect.value = state.lang || 'tr';

  document.getElementById('profileModalOverlay')?.classList.add('active');
}

function closeProfileModal() {
  document.getElementById('profileModalOverlay')?.classList.remove('active');
}

function handleProfileFormSubmit(e) {
  e.preventDefault();
  const firstName = document.getElementById('profileFirstName')?.value.trim() || 'Yunus';
  const lastName = document.getElementById('profileLastName')?.value.trim() || 'Emre';
  const title = document.getElementById('profileTitle')?.value.trim() || 'Finansal Yönetici';
  const avatarColor = document.getElementById('profileAvatarColor')?.value || '#3b82f6';
  const monthlyIncome = parseFloat(document.getElementById('profileIncome')?.value) || 0;
  const salaryDay = parseInt(document.getElementById('profileSalaryDay')?.value, 10) || 15;
  const currency = document.getElementById('profileCurrencySelect')?.value || 'TRY';
  const lang = document.getElementById('profileLangSelect')?.value || 'tr';

  state.profile = {
    ...state.profile,
    firstName,
    lastName,
    title,
    avatarColor,
    monthlyIncome,
    salaryDay
  };

  if (currency !== state.currency) setCurrency(currency);
  if (lang !== state.lang) setLanguage(lang);

  saveToStorage();
  closeProfileModal();
  renderAll();
  showToast('✅ Profil ve maaş günü başarıyla kaydedildi.');
}

// --------------------------------------------------------------------------
// Import / Export & Data Management
// --------------------------------------------------------------------------
function exportJsonBackup() {
  const data = {
    version: '2.0',
    exportDate: new Date().toISOString(),
    banks: state.banks,
    cards: state.cards,
    loans: state.loans,
    cashSubscriptions: state.cashSubscriptions,
    profile: state.profile
  };

  const jsonStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', jsonStr);
  downloadAnchor.setAttribute('download', `cardmon_backup_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function triggerImportJson() {
  const fileInput = document.getElementById('importFileInput');
  if (fileInput) fileInput.click();
}

function handleImportFile(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(event) {
    try {
      const parsed = JSON.parse(event.target.result);
      if (Array.isArray(parsed.banks) && Array.isArray(parsed.cards)) {
        state.banks = parsed.banks;
        state.cards = parsed.cards;
        state.loans = Array.isArray(parsed.loans) ? parsed.loans : [];
        state.cashSubscriptions = Array.isArray(parsed.cashSubscriptions) ? parsed.cashSubscriptions : [];
        if (parsed.profile && typeof parsed.profile === 'object') {
          state.profile = { ...state.profile, ...parsed.profile };
        }
        saveToStorage();
        renderAll();
        showToast(t('importedSuccess'));
      } else {
        alert(t('importError'));
      }
    } catch (err) {
      console.error(err);
      alert(t('importError'));
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

function exportCsvReport() {
  let csvContent = 'data:text/csv;charset=utf-8,';
  
  // Headers
  csvContent += 'Banka,Kart Adi,Son 4 Hane,Kart Turu,Sebeke,Limit,Guncel Borc,Kullanilabilir Limit,Doluluk %,Ekstre Kesim,Son Odeme\n';

  state.cards.forEach(c => {
    const bank = state.banks.find(b => b.id === c.bankId)?.name || 'Banka';
    const limit = Number(c.limit) || 0;
    const used = Number(c.usedBalance) || 0;
    const avail = Math.max(0, limit - used);
    const util = limit > 0 ? ((used / limit) * 100).toFixed(1) : '0';
    const cutoff = c.dateMethod === 'exact' ? `${c.cutoffDay}. Gun` : c.approxCutoffWeek;
    const due = c.dateMethod === 'exact' ? `${c.dueDay}. Gun` : c.approxDueWeek;

    const row = [
      `"${bank}"`,
      `"${c.nickname}"`,
      `"${c.last4 || ''}"`,
      `"${t(c.type || 'typePersonal')}"`,
      `"${c.network}"`,
      limit,
      used,
      avail,
      `"%${util}"`,
      `"${cutoff}"`,
      `"${due}"`
    ].join(',');

    csvContent += row + '\n';
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `cardmon_financial_report_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

// --------------------------------------------------------------------------
// Comprehensive Executive PDF Audit & Action Plan Report Generator
// --------------------------------------------------------------------------
function exportPdfReport() {
  try {
    let container = document.getElementById('pdfReportContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'pdfReportContainer';
      container.className = 'pdf-report-container';
      document.body.appendChild(container);
    }

    const now = new Date();
    const currentMonthName = now.toLocaleString('tr-TR', { month: 'long', year: 'numeric' });
    const fullDateStr = now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

    const p = state.profile || {};
    const userName = `${p.firstName || 'Yunus'} ${p.lastName || 'Emre'}`.trim();
    const userTitle = p.title || 'Finansal Portföy Sahibi';
    const monthlyIncome = Number(p.monthlyIncome) || 0;
    const salaryDay = Number(p.salaryDay) || 15;

    // 1. Aggregate Totals
    const totalCardLimit = state.cards.reduce((sum, c) => sum + (Number(c.limit) || 0), 0);
    const totalCardDebt = state.cards.reduce((sum, c) => sum + (Number(c.usedBalance) || 0), 0);
    const totalAvailable = Math.max(0, totalCardLimit - totalCardDebt);
    const cardUtilRatio = totalCardLimit > 0 ? (totalCardDebt / totalCardLimit) * 100 : 0;

    const totalLoanRemaining = (state.loans || []).reduce((sum, l) => {
      const totalInst = Number(l.totalInstallments) || 1;
      const paidInst = Number(l.paidInstallments) || 0;
      const monthlyAmt = Number(l.monthlyPayment) || 0;
      return sum + Math.max(0, totalInst - paidInst) * monthlyAmt;
    }, 0);

    const totalDebt = totalCardDebt + totalLoanRemaining;
    const totalEkHesap = state.banks.reduce((sum, b) => sum + (Number(b.ekHesapLimit) || 0), 0);

    // 2. Mandatory Monthly Outflows
    const totalCardMinDue = state.cards.reduce((sum, c) => {
      const used = Number(c.usedBalance) || 0;
      if (used <= 0) return sum;
      const isKatilim = c.isParticipationBank || Number(c.minPaymentRatio) === 100;
      const ratio = isKatilim ? 100 : (Number(c.minPaymentRatio) || (Number(c.limit) >= 25000 ? 40 : 20));
      return sum + Math.round(used * (ratio / 100));
    }, 0);

    const totalLoanMonthly = (state.loans || []).reduce((sum, l) => {
      const totalInst = Number(l.totalInstallments) || 1;
      const paidInst = Number(l.paidInstallments) || 0;
      if (paidInst >= totalInst || l.startCycle === 'next') return sum;
      return sum + (Number(l.monthlyPayment) || 0);
    }, 0);

    const allSubs = getAllSubscriptions();

    const totalSubsMonthlyTry = allSubs.reduce((sum, s) => {
      const tryAmt = convertToTry(s.amount, s.currency || 'TRY');
      return sum + (s.cycle === 'yearly' ? tryAmt / 12 : tryAmt);
    }, 0);

    const totalMandatoryOutflow = totalCardMinDue + totalLoanMonthly + totalSubsMonthlyTry;
    const incomeBurdenRatio = monthlyIncome > 0 ? (totalMandatoryOutflow / monthlyIncome) * 100 : 0;
    const remainingFreeCash = Math.max(0, monthlyIncome - totalMandatoryOutflow);
    const annualNetIncome = monthlyIncome * 12;
    const debtToAnnualIncomeRatio = annualNetIncome > 0 ? ((totalDebt / annualNetIncome) * 100) : 0;

    // 3. Dynamic Weekly Cashflow Buckets based on user's actual items & Salary Day
    const periods = {
      '1. Hafta (1-7)': { total: 0, count: 0, cards: [], loans: [], subs: [] },
      '2. Hafta (8-14)': { total: 0, count: 0, cards: [], loans: [], subs: [] },
      '3. Hafta (15-21)': { total: 0, count: 0, cards: [], loans: [], subs: [] },
      '4. Hafta (22-28)': { total: 0, count: 0, cards: [], loans: [], subs: [] },
      'Ay Sonu (29-31)': { total: 0, count: 0, cards: [], loans: [], subs: [] }
    };

    state.cards.forEach(c => {
      const debt = Number(c.usedBalance) || Number(c.paidThisMonthAmount) || 0;
      if (debt <= 0) return;
      let due = c.dateMethod === 'exact' ? Number(c.dueDay) : getApproxDay(c.approxDueWeek);
      if (!due || isNaN(due)) due = 15;
      let pKey = '3. Hafta (15-21)';
      if (due <= 7) pKey = '1. Hafta (1-7)';
      else if (due <= 14) pKey = '2. Hafta (8-14)';
      else if (due <= 21) pKey = '3. Hafta (15-21)';
      else if (due <= 28) pKey = '4. Hafta (22-28)';
      else pKey = 'Ay Sonu (29-31)';

      periods[pKey].total += debt;
      periods[pKey].count += 1;
      periods[pKey].cards.push({ name: c.nickname, amt: debt });
    });

    (state.loans || []).forEach(l => {
      const totalInst = Number(l.totalInstallments) || 1;
      const paidInst = Number(l.paidInstallments) || 0;
      if (paidInst >= totalInst || l.startCycle === 'next') return;
      const monthlyAmt = Number(l.monthlyPayment) || 0;
      const payDay = Math.min(31, Math.max(1, Number(l.paymentDay) || 15));
      let pKey = '3. Hafta (15-21)';
      if (payDay <= 7) pKey = '1. Hafta (1-7)';
      else if (payDay <= 14) pKey = '2. Hafta (8-14)';
      else if (payDay <= 21) pKey = '3. Hafta (15-21)';
      else if (payDay <= 28) pKey = '4. Hafta (22-28)';
      else pKey = 'Ay Sonu (29-31)';

      periods[pKey].total += monthlyAmt;
      periods[pKey].count += 1;
      periods[pKey].loans.push({ name: l.title, amt: monthlyAmt });
    });

    allSubs.forEach(s => {
      const amt = Number(s.amount) || 0;
      if (amt <= 0) return;
      const tryAmt = convertToTry(amt, s.currency || 'TRY');
      const payDay = Math.min(31, Math.max(1, Number(s.billingDay) || 15));
      let pKey = '3. Hafta (15-21)';
      if (payDay <= 7) pKey = '1. Hafta (1-7)';
      else if (payDay <= 14) pKey = '2. Hafta (8-14)';
      else if (payDay <= 21) pKey = '3. Hafta (15-21)';
      else if (payDay <= 28) pKey = '4. Hafta (22-28)';
      else pKey = 'Ay Sonu (29-31)';

      periods[pKey].total += tryAmt;
      periods[pKey].count += 1;
      periods[pKey].subs.push({ name: s.name, amt: tryAmt, cat: s.category });
    });

    const totalWeeklyOutflow = Object.values(periods).reduce((s, p) => s + p.total, 0);

    // 4. Installments Flattening
    const allInstallments = [];
    state.cards.forEach(c => {
      (c.installments || []).forEach(inst => {
        const totalAmt = Number(inst.totalAmount) || 0;
        const count = Number(inst.installmentCount) || 1;
        const paid = Number(inst.paidCount) || 0;
        const monthly = Number(inst.monthlyAmount) || (totalAmt / count);
        const remCount = Math.max(0, count - paid);
        const remTotal = remCount * monthly;
        allInstallments.push({
          cardNickname: c.nickname,
          bankName: cBankName(c.bankId),
          desc: inst.desc || 'Taksitli Harcama',
          totalAmount: totalAmt,
          installmentCount: count,
          paidCount: paid,
          remainingCount: remCount,
          monthlyAmount: monthly,
          remainingTotal: remTotal,
          startCycle: inst.startCycle
        });
      });
    });

    // 5. Cards with Annual Fee
    const annualFeeCards = state.cards.filter(c => (Number(c.annualFeeAmount) || 0) > 0);

    // 6. Diagnosis & Evaluation
    let healthClass = 'good';
    let healthTitle = 'Güvenli & Dengeli Portföy';
    let healthSummary = 'Borç ve limit kullanım oranları kontrol edilebilir güvenli seviyededir. Zorunlu aylık giderler gelirin sürdürülebilir sınırları içerisindedir.';
    
    if (cardUtilRatio > 70 || incomeBurdenRatio > 60) {
      healthClass = 'danger';
      healthTitle = 'Yüksek Risk & Acil Müdahale Gerekli';
      healthSummary = 'Kredi kartı limit doluluğu veya aylık zorunlu gider yükü kritik seviyededir (%70+). Findeks kredi skoru baskı altındadır ve serbest nakit akışı yetersizliği riski bulunmaktadır.';
    } else if (cardUtilRatio > 40 || incomeBurdenRatio > 40) {
      healthClass = 'warning';
      healthTitle = 'Orta Seviye Risk / Dikkat Gerektirir';
      healthSummary = 'Limitlerin önemli bir kısmı kullanılmaktadır (%40+). Harcamaların kontrol altına alınması, gereksiz aboneliklerin elenmesi ve borç eritme planına başlanması önerilir.';
    }

    const typeNameMap = {
      typePersonal: 'Bireysel',
      typeCommercial: 'Ticari / Şirket',
      typeStudent: 'Öğrenci',
      typePremium: 'Premium / Mil',
      typeOther: 'Diğer'
    };

    const loanTypeMap = {
      personal: 'İhtiyaç Kredisi',
      housing: 'Konut Kredisi',
      vehicle: 'Taşıt Kredisi',
      commercial: 'Ticari Kredi',
      other: 'Diğer Finansman'
    };

    // Generate HTML
    container.innerHTML = `
      <div class="pdf-page-header">
        <div>
          <h1 class="pdf-title">Kişiye Özel Finansal Denetim & Strateji Raporu</h1>
          <div class="pdf-subtitle">${currentMonthName} Ayı Konsolide Yönetici Raporu</div>
        </div>
        <div class="pdf-meta-box">
          <div><strong>Danışan / Portföy Sahibi:</strong> ${escapeHtml(userName)}</div>
          <div><strong>Unvan / Statü:</strong> ${escapeHtml(userTitle)}</div>
          <div><strong>Rapor Tarihi:</strong> ${fullDateStr}</div>
          <div><strong>Aylık Net Gelir:</strong> ${monthlyIncome > 0 ? formatMoney(monthlyIncome) + ` (Maaş Günü: Her ayın ${salaryDay}'i)` : 'Belirtilmedi'}</div>
        </div>
      </div>

      <!-- 1. Yönetici Teşhisi & Risk Rasyoları -->
      <div class="pdf-section">
        <div class="pdf-section-title">1. Finansal Teşhis & Genel Risk Değerlendirmesi</div>
        <div class="pdf-diagnosis-card ${healthClass}">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <strong style="font-size:11pt;">Genel Sağlık Durumu: ${healthTitle}</strong>
            <span style="font-size:9pt; font-weight:700;">Kart Doluluğu: %${cardUtilRatio.toFixed(1)} ${monthlyIncome > 0 ? `• Gelir Yükü (DTI): %${incomeBurdenRatio.toFixed(1)}` : ''}</span>
          </div>
          <p style="margin:0; font-size:9.5pt; line-height:1.45; color:#334155;">
            ${healthSummary}
          </p>
        </div>

        <!-- İleri Düzey Finansal Oranlar Matrisi -->
        <div class="pdf-kpi-grid" style="margin-top:8px;">
          <div class="pdf-kpi-item">
            <div class="pdf-kpi-label">Limit Doluluk (Findeks Riski)</div>
            <div class="pdf-kpi-val" style="color:${cardUtilRatio > 70 ? '#dc2626' : cardUtilRatio > 40 ? '#d97706' : '#16a34a'};">%${cardUtilRatio.toFixed(1)}</div>
            <div style="font-size:7.5pt; color:#64748b; margin-top:2px;">${cardUtilRatio < 30 ? 'Mükemmel (Kredi notu yüksek)' : cardUtilRatio < 70 ? 'Orta (Dikkat edilmeli)' : 'Kritik (Kredi notu düşebilir)'}</div>
          </div>
          <div class="pdf-kpi-item">
            <div class="pdf-kpi-label">Gelir Yükü / DTI Oranı</div>
            <div class="pdf-kpi-val" style="color:${incomeBurdenRatio > 50 ? '#dc2626' : '#2563eb'};">${monthlyIncome > 0 ? `%${incomeBurdenRatio.toFixed(1)}` : '—'}</div>
            <div style="font-size:7.5pt; color:#64748b; margin-top:2px;">Aylık gelirden zorunlu gider payı (İdeal: < %40)</div>
          </div>
          <div class="pdf-kpi-item">
            <div class="pdf-kpi-label">Toplam Borç Kaldıracı</div>
            <div class="pdf-kpi-val" style="color:#0f172a;">${annualNetIncome > 0 ? `%${debtToAnnualIncomeRatio.toFixed(1)}` : '—'}</div>
            <div style="font-size:7.5pt; color:#64748b; margin-top:2px;">Toplam borcun yıllık net gelire oranı</div>
          </div>
          <div class="pdf-kpi-item">
            <div class="pdf-kpi-label">KMH Acil Durum Tamponu</div>
            <div class="pdf-kpi-val" style="color:#10b981;">${formatMoney(totalEkHesap)}</div>
            <div style="font-size:7.5pt; color:#64748b; margin-top:2px;">Kayıtlı bankalardaki hazır nakit rezervi</div>
          </div>
        </div>

        <!-- Görsel Limit & Findeks Skala Çubuğu -->
        <div style="margin-top: 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px;">
          <div style="display:flex; justify-content:space-between; font-size:7.8pt; font-weight:700; color:#334155; margin-bottom:4px;">
            <span>Portföy Limit Kullanımı & Kalan Kapasite Metresi</span>
            <span>Kullanılan: %${cardUtilRatio.toFixed(1)} • Kalan Limit: %${(100 - cardUtilRatio).toFixed(1)}</span>
          </div>
          <div class="pdf-meter-bar-container">
            <div style="width: ${Math.min(100, cardUtilRatio)}%; background: ${cardUtilRatio > 70 ? '#ef4444' : cardUtilRatio > 40 ? '#f59e0b' : '#10b981'}; height: 100%;"></div>
            <div style="width: ${Math.max(0, 100 - cardUtilRatio)}%; background: #e2e8f0; height: 100%;"></div>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:7pt; color:#64748b; margin-top:2px;">
            <span>%0 (Güvenli Bölge)</span>
            <span>%30 (Findeks İdeal Limit)</span>
            <span>%70 (Kritik Risk Sınırı)</span>
            <span>%100 (Limit Sonu)</span>
          </div>
        </div>
      </div>

      <!-- 2. Konsolide Finansal Göstergeler (KPI Matrix) -->
      <div class="pdf-section">
        <div class="pdf-section-title">2. Konsolide Finansal Göstergeler (KPI Matrisi)</div>
        <div class="pdf-kpi-grid-6">
          <div class="pdf-kpi-item">
            <div class="pdf-kpi-label">Toplam Birleşik Kart Limiti</div>
            <div class="pdf-kpi-val" style="color:#2563eb;">${formatMoney(totalCardLimit)}</div>
          </div>
          <div class="pdf-kpi-item">
            <div class="pdf-kpi-label">Toplam Güncel Borç (Kart + Kredi)</div>
            <div class="pdf-kpi-val" style="color:#dc2626;">${formatMoney(totalDebt)}</div>
          </div>
          <div class="pdf-kpi-item">
            <div class="pdf-kpi-label">Kalan Net Kullanılabilir Limit</div>
            <div class="pdf-kpi-val" style="color:#16a34a;">${formatMoney(totalAvailable)}</div>
          </div>
          <div class="pdf-kpi-item">
            <div class="pdf-kpi-label">Bu Ay Zorunlu Nakit Çıkışı</div>
            <div class="pdf-kpi-val" style="color:#d97706;">${formatMoney(totalMandatoryOutflow)}</div>
          </div>
          <div class="pdf-kpi-item">
            <div class="pdf-kpi-label">Kalan Net Serbest Nakit</div>
            <div class="pdf-kpi-val" style="color:#10b981;">${monthlyIncome > 0 ? formatMoney(remainingFreeCash) : '—'}</div>
          </div>
          <div class="pdf-kpi-item">
            <div class="pdf-kpi-label">Kayıtlı Banka / Kart / Kredi</div>
            <div class="pdf-kpi-val" style="color:#475569;">${state.banks.length} / ${state.cards.length} / ${(state.loans || []).length}</div>
          </div>
        </div>
      </div>

      <!-- 3. Haftalık Nakit Akışı & Ödeme Takvimi Projeksiyonu -->
      <div class="pdf-section">
        <div class="pdf-section-title">3. Haftalık Nakit Akışı & Vade Dağılım Projeksiyonu</div>
        <table class="pdf-table">
          <thead>
            <tr>
              <th>Dönem</th>
              <th>Ödeme Kalemleri & Nakit Akışı İçeriği</th>
              <th>Ödeme Sayısı</th>
              <th>Dönem Toplam Çıkışı</th>
              <th>Aylık Çıkıştaki Payı & Dağılım</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(periods).map(([name, data]) => {
              const pct = totalWeeklyOutflow > 0 ? ((data.total / totalWeeklyOutflow) * 100).toFixed(1) : '0';
              let isSalaryWeek = false;
              if (name.includes('1-7') && salaryDay <= 7) isSalaryWeek = true;
              else if (name.includes('8-14') && salaryDay >= 8 && salaryDay <= 14) isSalaryWeek = true;
              else if (name.includes('15-21') && salaryDay >= 15 && salaryDay <= 21) isSalaryWeek = true;
              else if (name.includes('22-28') && salaryDay >= 22 && salaryDay <= 28) isSalaryWeek = true;
              else if (name.includes('29-31') && salaryDay >= 29) isSalaryWeek = true;

              const contentRows = [];
              if (isSalaryWeek) {
                contentRows.push(`<div style="color:#16a34a; font-weight:700; font-size:7.8pt;">Maaş & Gelir Girişi (Ayın ${salaryDay}'i)</div>`);
              }
              if (data.cards.length > 0) {
                contentRows.push(`<div style="font-size:7.5pt;"><strong>Kredi Kartı Ödemesi:</strong> ${data.cards.map(c => `${escapeHtml(c.name)} Kartı (${formatMoney(c.amt)})`).join(', ')}</div>`);
              }
              if (data.loans.length > 0) {
                contentRows.push(`<div style="font-size:7.5pt;"><strong>Kredi Taksiti:</strong> ${data.loans.map(l => `${escapeHtml(l.name)} (${formatMoney(l.amt)})`).join(', ')}</div>`);
              }
              if (data.subs.length > 0) {
                contentRows.push(`<div style="font-size:7.5pt; color:#475569;"><strong>Kira & Abonelik / Fatura:</strong> ${data.subs.map(s => `${escapeHtml(s.name)} (${formatMoney(s.amt)})`).join(', ')}</div>`);
              }
              if (contentRows.length === 0) {
                contentRows.push(`<div style="font-size:7.5pt; color:#94a3b8; font-style:italic;">Planlanan ödeme bulunmuyor (Sakin dönem)</div>`);
              }

              return `
                <tr>
                  <td><strong>${name}</strong></td>
                  <td>
                    <div style="display:flex; flex-direction:column; gap:2px;">
                      ${contentRows.join('')}
                    </div>
                  </td>
                  <td>${data.count} ödeme</td>
                  <td style="font-weight:700; color:${data.total > 0 ? '#0284c7' : '#64748b'};">₺${formatMoney(data.total)}</td>
                  <td>
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
                      <span class="pdf-badge ${Number(pct) > 40 ? 'pdf-badge-danger' : Number(pct) > 20 ? 'pdf-badge-warning' : 'pdf-badge-neutral'}">%${pct}</span>
                      <div class="pdf-meter-bar-container" style="height:6px; flex:1; margin:0;">
                        <div style="width: ${pct}%; background: #0284c7; height: 100%;"></div>
                      </div>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
          <tfoot>
            <tr style="background:#f8fafc; font-weight:800; border-top:1.5px solid #0f172a;">
              <td>Toplam</td>
              <td>Aylık Konsolide Nakit Çıkışı</td>
              <td>${Object.values(periods).reduce((s, p) => s + p.count, 0)} Ödeme</td>
              <td style="color:#0284c7;">₺${formatMoney(totalWeeklyOutflow)}</td>
              <td>%100.0</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- 4. Kredi Kartı Portföy Detayı -->
      <div class="pdf-section">
        <div class="pdf-section-title">4. Kredi Kartı Portföy Dağılımı</div>
        ${state.cards.length === 0 ? '<p style="font-size:8.5pt; color:#64748b;">Kayıtlı kredi kartı bulunmamaktadır.</p>' : `
        <table class="pdf-table">
          <thead>
            <tr>
              <th>Banka</th>
              <th>Kart Adı / Modeli</th>
              <th>Şebeke & Tür</th>
              <th>Limit</th>
              <th>Güncel Borç</th>
              <th>Kalan Limit</th>
              <th>Doluluk</th>
              <th>Kesim / Vade</th>
              <th>Asgari Tutar</th>
              <th>Risk Seviyesi</th>
            </tr>
          </thead>
          <tbody>
            ${state.cards.map(c => {
              const b = state.banks.find(x => x.id === c.bankId);
              const lim = Number(c.limit) || 0;
              const debt = Number(c.usedBalance) || 0;
              const avail = Math.max(0, lim - debt);
              const util = lim > 0 ? (debt / lim) * 100 : 0;
              const isKat = c.isParticipationBank || Number(c.minPaymentRatio) === 100;
              const minRatio = isKat ? 100 : (Number(c.minPaymentRatio) || (lim >= 25000 ? 40 : 20));
              const minDue = isKat ? debt : Math.round(debt * (minRatio / 100));
              const cutoffStr = c.dateMethod === 'exact' ? `${c.cutoffDay}. Gün` : t(c.approxCutoffWeek || 'week3');
              const dueDayStr = c.dateMethod === 'exact' ? `${c.dueDay}. Gün` : t(c.approxDueWeek || 'week3');
              const typeStr = typeNameMap[c.type] || 'Bireysel';

              return `
                <tr>
                  <td><strong>${escapeHtml(b ? b.name : 'Banka')}</strong></td>
                  <td>${escapeHtml(c.nickname)} ${c.last4 ? `(•${c.last4})` : ''}</td>
                  <td>${c.network || 'Mastercard'} • ${typeStr}</td>
                  <td>${formatMoney(lim)}</td>
                  <td style="font-weight:700; color:${debt > 0 ? '#dc2626' : '#64748b'};">${formatMoney(debt)}</td>
                  <td style="color:#16a34a;">${formatMoney(avail)}</td>
                  <td style="font-weight:700; color:${util > 75 ? '#dc2626' : util > 40 ? '#d97706' : '#16a34a'};">%${util.toFixed(1)}</td>
                  <td>${cutoffStr} / ${dueDayStr}</td>
                  <td style="font-weight:600; color:#d97706;">${debt > 0 ? `${formatMoney(minDue)} (%${minRatio}${isKat ? ' Katılım' : ''})` : '-'}</td>
                  <td>
                    ${util >= 80 ? '<span class="pdf-badge pdf-badge-danger">Kritik Doluluk</span>' : util >= 50 ? '<span class="pdf-badge pdf-badge-warning">Dikkat</span>' : debt === 0 ? '<span class="pdf-badge pdf-badge-success">Borçsuz</span>' : '<span class="pdf-badge pdf-badge-info">Normal</span>'}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
          <tfoot>
            <tr style="background:#f8fafc; font-weight:800; border-top:1.5px solid #0f172a;">
              <td colspan="3">Toplam Portföy (${state.cards.length} Kart)</td>
              <td>₺${formatMoney(totalCardLimit)}</td>
              <td style="color:#dc2626;">₺${formatMoney(totalCardDebt)}</td>
              <td style="color:#16a34a;">₺${formatMoney(totalAvailable)}</td>
              <td style="color:#2563eb;">%${cardUtilRatio.toFixed(1)}</td>
              <td>—</td>
              <td style="color:#d97706;">₺${formatMoney(totalCardMinDue)}</td>
              <td>Konsolide</td>
            </tr>
          </tfoot>
        </table>
        `}
      </div>

      <!-- 5. Taksitli Harcamalar & Gelecek Dönem Yükümlülükleri -->
      ${allInstallments.length > 0 ? `
      <div class="pdf-section">
        <div class="pdf-section-title">5. Aktif Taksitli Harcamalar & Gelecek Dönem Yükümlülükleri</div>
        <table class="pdf-table">
          <thead>
            <tr>
              <th>Kart / Banka</th>
              <th>Harcama Açıklaması</th>
              <th>Toplam Tutar</th>
              <th>Ödenen / Toplam Vade</th>
              <th>Aylık Taksit</th>
              <th>Kalan Toplam Borç</th>
              <th>Dönem Durumu</th>
            </tr>
          </thead>
          <tbody>
            ${allInstallments.map(inst => `
              <tr>
                <td><strong>${escapeHtml(inst.cardNickname)}</strong> <span style="font-size:7.5pt; color:#64748b;">(${escapeHtml(inst.bankName)})</span></td>
                <td>${escapeHtml(inst.desc)}</td>
                <td>${formatMoney(inst.totalAmount)}</td>
                <td>${inst.paidCount} / ${inst.installmentCount} Ay (${inst.remainingCount} ay kaldı)</td>
                <td style="font-weight:700; color:#0284c7;">${formatMoney(inst.monthlyAmount)}</td>
                <td style="font-weight:700; color:#dc2626;">${formatMoney(inst.remainingTotal)}</td>
                <td><span class="pdf-badge ${inst.startCycle === 'next' ? 'pdf-badge-warning' : 'pdf-badge-info'}">${inst.startCycle === 'next' ? 'Gelecek Dönem Başlayacak' : 'Cari Dönem Aktif'}</span></td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="background:#f8fafc; font-weight:800; border-top:1.5px solid #0f172a;">
              <td colspan="2">Toplam Taksitli Harcamalar (${allInstallments.length} Plan)</td>
              <td>₺${formatMoney(allInstallments.reduce((s, i) => s + (Number(i.totalAmount) || 0), 0))}</td>
              <td>—</td>
              <td style="color:#0284c7;">₺${formatMoney(allInstallments.reduce((s, i) => s + (Number(i.monthlyAmount) || 0), 0))}/ay</td>
              <td style="color:#dc2626;">₺${formatMoney(allInstallments.reduce((s, i) => s + (Number(i.remainingTotal) || 0), 0))}</td>
              <td>—</td>
            </tr>
          </tfoot>
        </table>
      </div>
      ` : ''}

      <!-- 6. Krediler & Sabit Taksitler -->
      ${state.loans && state.loans.length > 0 ? `
      <div class="pdf-section">
        <div class="pdf-section-title">6. Kredi & Uzun Vadeli Finansman Yükümlülükleri</div>
        <table class="pdf-table">
          <thead>
            <tr>
              <th>Banka</th>
              <th>Kredi Adı / Amacı</th>
              <th>Tür & Faiz Oranı</th>
              <th>Toplam Geri Ödeme</th>
              <th>Ödenen / Toplam Vade</th>
              <th>Aylık Taksit</th>
              <th>Kalan Toplam Borç</th>
              <th>Ödeme Günü</th>
            </tr>
          </thead>
          <tbody>
            ${state.loans.map(l => {
              const b = state.banks.find(x => x.id === l.bankId);
              const totalInst = Number(l.totalInstallments) || 1;
              const paidInst = Number(l.paidInstallments) || 0;
              const monthlyAmt = Number(l.monthlyPayment) || 0;
              const remInst = Math.max(0, totalInst - paidInst);
              const remDebt = remInst * monthlyAmt;
              const typeStr = loanTypeMap[l.type] || 'Kredi';

              return `
                <tr>
                  <td><strong>${escapeHtml(b ? b.name : 'Banka')}</strong></td>
                  <td>
                    ${escapeHtml(l.title)}
                    ${l.startCycle === 'next' ? '<span class="pdf-badge pdf-badge-warning" style="margin-left:3px; font-size:6.8pt;">İlk Taksit: Gelecek Ay (Eylül)</span>' : ''}
                  </td>
                  <td>${typeStr} ${l.interestRate ? `(%${l.interestRate})` : ''}</td>
                  <td>₺${formatMoney(Number(l.totalAmount) || 0)}</td>
                  <td>${paidInst} / ${totalInst} Ay (${remInst} ay kaldı)</td>
                  <td style="font-weight:700; color:#0284c7;">₺${formatMoney(monthlyAmt)}/ay</td>
                  <td style="font-weight:700; color:#ea580c;">₺${formatMoney(remDebt)}</td>
                  <td>${l.startCycle === 'next' ? `Eylül (Her ayın ${l.paymentDay || 15}'i)` : `Her ayın ${l.paymentDay || 15}'i`}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
          <tfoot>
            <tr style="background:#f8fafc; font-weight:800; border-top:1.5px solid #0f172a;">
              <td colspan="3">Toplam Krediler (${state.loans.length} Adet)</td>
              <td>₺${formatMoney(state.loans.reduce((s, l) => s + (Number(l.totalAmount) || 0), 0))}</td>
              <td>—</td>
              <td style="color:#0284c7;">₺${formatMoney(state.loans.reduce((s, l) => s + (Number(l.monthlyPayment) || 0), 0))}/ay</td>
              <td style="color:#ea580c;">₺${formatMoney(state.loans.reduce((s, l) => s + (Math.max(0, (Number(l.totalInstallments) || 0) - (Number(l.paidInstallments) || 0)) * (Number(l.monthlyPayment) || 0)), 0))}</td>
              <td>—</td>
            </tr>
          </tfoot>
        </table>
      </div>
      ` : ''}

      <!-- 7. Abonelikler, Faturalar, Kira & Düzenli Giderler -->
      ${allSubs.length > 0 ? `
      <div class="pdf-section">
        <div class="pdf-section-title">7. Düzenli Giderler, Faturalar, Kira & Abonelikler</div>
        <table class="pdf-table">
          <thead>
            <tr>
              <th>Gider / Hizmet Adı</th>
              <th>Kategori</th>
              <th>Ödeme Kanalı</th>
              <th>Ödeme Döngüsü</th>
              <th>Orijinal Tutar</th>
              <th>Aylık TRY Maliyeti</th>
              <th>Yıllık Toplam TRY Maliyeti</th>
            </tr>
          </thead>
          <tbody>
            ${allSubs.map(s => {
              const curr = s.currency || 'TRY';
              const origAmt = Number(s.amount) || 0;
              const tryAmtMonthly = s.cycle === 'yearly' ? convertToTry(origAmt, curr) / 12 : convertToTry(origAmt, curr);
              const tryAmtAnnual = tryAmtMonthly * 12;
              const symbol = curr === 'USD' ? '$' : (curr === 'EUR' ? '€' : (curr === 'GBP' ? '£' : '₺'));
              const catMap = {
                Rent: 'Kira',
                Maintenance: 'Aidat',
                Bills: 'Fatura',
                Streaming: 'Streaming',
                Software: 'Yazılım',
                Cloud: 'Bulut',
                Lifestyle: 'Spor',
                Education: 'Eğitim',
                Other: 'Diğer'
              };
              const catName = catMap[s.category] || s.category || 'Düzenli Gider';

              return `
                <tr>
                  <td>
                    <strong>${escapeHtml(s.name)}</strong>
                    ${s.isEstimated ? '<span class="pdf-badge pdf-badge-warning" style="margin-left:3px; font-size:6.8pt;">Tahmini</span>' : ''}
                  </td>
                  <td><span class="pdf-badge pdf-badge-neutral">${escapeHtml(catName)}</span></td>
                  <td>${escapeHtml(s.cardNickname)}</td>
                  <td>${s.cycle === 'yearly' ? 'Yıllık (Her yıl)' : `Aylık (Her ayın ${s.billingDay || 15}'i)`}</td>
                  <td style="font-weight:600;">${s.isEstimated ? '~' : ''}${symbol}${formatMoney(origAmt)} ${curr !== 'TRY' ? `(${curr})` : ''}</td>
                  <td style="font-weight:700; color:#7c3aed;">${s.isEstimated ? '~' : ''}₺${formatMoney(tryAmtMonthly)}/ay</td>
                  <td style="font-weight:700; color:#0f172a;">${s.isEstimated ? '~' : ''}₺${formatMoney(tryAmtAnnual)}/yıl</td>
                </tr>
              `;
            }).join('')}
          </tbody>
          <tfoot>
            <tr style="background:#f8fafc; font-weight:800; border-top:1.5px solid #0f172a;">
              <td colspan="5">Toplam Düzenli Giderler (${allSubs.length} Kalem)</td>
              <td style="color:#7c3aed;">₺${formatMoney(totalSubsMonthlyTry)}/ay</td>
              <td style="color:#0f172a;">₺${formatMoney(totalSubsMonthlyTry * 12)}/yıl</td>
            </tr>
          </tfoot>
        </table>
      </div>
      ` : ''}

      <!-- 8. Ev Sahibi Olma & Kira Kâr / Tasarruf Analizi -->
      ${(() => {
        const rentSub = allSubs.find(s => s.category === 'Rent' || s.name.toLowerCase().includes('kira'));
        const monthlyRent = rentSub ? convertToTry(rentSub.amount, rentSub.currency) : 24000;
        const annualInflation = 35;
        const investmentReturn = 40;

        let currentMonthly = monthlyRent;
        let cumulativeRent = 0;
        let cumulativeInvestment = 0;
        const monthlyInvestRate = Math.pow(1 + investmentReturn / 100, 1 / 12) - 1;

        const yearlyBreakdown = [];
        for (let y = 1; y <= 10; y++) {
          const yearTotal = currentMonthly * 12;
          cumulativeRent += yearTotal;

          for (let m = 1; m <= 12; m++) {
            cumulativeInvestment = (cumulativeInvestment + currentMonthly) * (1 + monthlyInvestRate);
          }

          yearlyBreakdown.push({
            year: y,
            monthlyRent: Math.round(currentMonthly),
            yearTotal: Math.round(yearTotal),
            cumulativeRent: Math.round(cumulativeRent),
            cumulativeInvestment: Math.round(cumulativeInvestment)
          });

          currentMonthly = currentMonthly * (1 + annualInflation / 100);
        }

        const y1 = yearlyBreakdown[0];
        const y5 = yearlyBreakdown[4];
        const y10 = yearlyBreakdown[9];

        return `
          <div class="pdf-section">
            <div class="pdf-section-title">8. Ev Sahibi Olma & Kira Kâr / Tasarruf Analizi</div>
            
            <div style="font-size:8.5pt; color:#475569; margin-bottom:8px; line-height:1.4;">
              Mevcut aylık <strong>₺${formatMoney(monthlyRent)}</strong> kiranız baz alınarak; ev sahibi olmanız durumunda cebinizde kalacak birikim, yıllık <strong>%${annualInflation}</strong> ortalama kira artış projeksiyonu ve <strong>%${investmentReturn}</strong> yıllık bileşik yatırım getirisiyle aşağıdaki gibi simüle edilmiştir.
            </div>

            <!-- Top Highlights Grid -->
            <div class="pdf-kpi-grid" style="margin-bottom:10px;">
              <div class="pdf-kpi-item" style="border-left:3px solid #10b981;">
                <div class="pdf-kpi-label">1 Yıllık Tasarruf</div>
                <div class="pdf-kpi-val" style="color:#10b981;">₺${formatMoney(y1.yearTotal)}</div>
                <div style="font-size:7.5pt; color:#64748b; margin-top:2px;">Aylık ₺${formatMoney(monthlyRent)}</div>
              </div>

              <div class="pdf-kpi-item" style="border-left:3px solid #f59e0b;">
                <div class="pdf-kpi-label">5 Yılda Ödenen Kira</div>
                <div class="pdf-kpi-val" style="color:#d97706;">₺${formatMoney(y5.cumulativeRent)}</div>
                <div style="font-size:7.5pt; color:#64748b; margin-top:2px;">%${annualInflation} yıllık artışla</div>
              </div>

              <div class="pdf-kpi-item" style="border-left:3px solid #0284c7;">
                <div class="pdf-kpi-label">5 Yıllık Yatırım Değeri</div>
                <div class="pdf-kpi-val" style="color:#0284c7;">₺${formatMoney(y5.cumulativeInvestment)}</div>
                <div style="font-size:7.5pt; color:#64748b; margin-top:2px;">%${investmentReturn} bileşik getiriyle</div>
              </div>

              <div class="pdf-kpi-item" style="border-left:3px solid #8b5cf6;">
                <div class="pdf-kpi-label">10 Yılda Ödenen Kira</div>
                <div class="pdf-kpi-val" style="color:#7c3aed;">₺${formatMoney(y10.cumulativeRent)}</div>
                <div style="font-size:7.5pt; color:#64748b; margin-top:2px;">10 yıllık kümülatif yük</div>
              </div>
            </div>

            <!-- Strategic Comparison Box -->
            <div class="pdf-sim-box" style="background:#f8fafc; border-color:#cbd5e1; border-left-color:#3b82f6; margin-bottom:10px;">
              <strong style="color:#1e293b; font-size:9pt; display:block; margin-bottom:4px;">Finansal Karşılaştırma: Ev Sahibi Olmak vs Kirada Kalmak</strong>
              <div style="font-size:8pt; line-height:1.45; color:#334155; display:flex; flex-direction:column; gap:3px;">
                <div><strong>1. Kendi Evinizin Olması Durumunda:</strong> 5 yılda toplam <strong>₺${formatMoney(y5.cumulativeRent)}</strong> tutarındaki kira giderinden tamamen muaf kalırsınız. Bu tutar cebinizde birikim olarak kalır.</div>
                <div><strong>2. Gayrimenkul Değer Artışı:</strong> Ev fiyatları enflasyona karşı değer kazanırken, kira ödemek yerine ev sahibi olduğunuzda çift yönlü servet artışı sağlarsınız.</div>
                <div><strong>3. Kredi Alternatifi:</strong> Aylık ₺${formatMoney(monthlyRent)} kira ödemesi, 120 ay vadeli bir konut kredisi taksitine dönüştürüldüğünde kira öder gibi kendi mülkünüzün sahibi olursunuz.</div>
              </div>
            </div>

            <!-- 10-Year Projection Table -->
            <div style="font-size:8.5pt; font-weight:700; color:#0f172a; margin-bottom:4px;">Yıllara Göre Projeksiyon Tablosu (10 Yıl)</div>
            <table class="pdf-table" style="font-size:8pt;">
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
                    <td>₺${formatMoney(b.monthlyRent)}</td>
                    <td>₺${formatMoney(b.yearTotal)}</td>
                    <td style="color:#d97706; font-weight:700;">₺${formatMoney(b.cumulativeRent)}</td>
                    <td style="color:#16a34a; font-weight:700;">₺${formatMoney(b.cumulativeInvestment)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      })()}

      <!-- 9. Yıllık Kredi Kartı Üyelik Ücretleri (Banka Kart Aidatı Durumu) -->
      <div class="pdf-section">
        <div class="pdf-section-title">9. Kredi Kartı Yıllık Üyelik Ücretleri (Kart Aidatı Durumu)</div>
        ${annualFeeCards.length > 0 ? `
        <table class="pdf-table">
          <thead>
            <tr>
              <th>Banka / Kart</th>
              <th>Yıllık Aidat Tutarı</th>
              <th>Aidat Kesim Ayı</th>
              <th>Güncel İade / Muafiyet Durumu</th>
              <th>Tasarruf Notu</th>
            </tr>
          </thead>
          <tbody>
            ${annualFeeCards.map(c => {
              const b = state.banks.find(x => x.id === c.bankId);
              const fee = Number(c.annualFeeAmount) || 0;
              const statusMap = {
                paid: 'Ödendi / Kesildi',
                refund_requested: 'İade Talep Edildi',
                refunded: 'Puan / Nakit Olarak İade Alındı',
                exempt: 'Aidatsız / Muaf',
                none: 'Takip Edilmiyor'
              };
              const statusStr = statusMap[c.annualFeeStatus] || 'Belirtilmedi';

              return `
                <tr>
                  <td><strong>${escapeHtml(b ? b.name : 'Banka')}</strong> - ${escapeHtml(c.nickname)}</td>
                  <td style="font-weight:700; color:#ea580c;">₺${formatMoney(fee)}</td>
                  <td>${c.annualFeeMonth ? `${c.annualFeeMonth}. Ay` : 'Belirtilmedi'}</td>
                  <td><span class="pdf-badge ${c.annualFeeStatus === 'refunded' || c.annualFeeStatus === 'exempt' ? 'pdf-badge-success' : 'pdf-badge-warning'}">${statusStr}</span></td>
                  <td style="font-size:8pt; color:#64748b;">Ekstreye yansıdığında müşteri hizmetlerinden puan/iade talebinde bulunulabilir.</td>
                </tr>
              `;
            }).join('')}
          </tbody>
          <tfoot>
            <tr style="background:#f8fafc; font-weight:800; border-top:1.5px solid #0f172a;">
              <td>Toplam Kart Aidatları (${annualFeeCards.length} Kart)</td>
              <td style="color:#dc2626;">₺${formatMoney(annualFeeCards.reduce((s, c) => s + (Number(c.annualFeeAmount) || 0), 0))}</td>
              <td colspan="3" style="font-weight:normal; color:#64748b; font-size:7.5pt;">Konsolide yıllık kart üyelik maliyeti</td>
            </tr>
          </tfoot>
        </table>
        ` : `
        <div class="pdf-sim-box" style="background:#f0fdf4; border-color:#bbf7d0; border-left-color:#16a34a;">
          <strong style="color:#166534; font-size:9pt; display:block; margin-bottom:2px;">Tüm Kartlarınız Yıllık Kart Aidatından Muaftır.</strong>
          Portföyünüzde kayıtlı ${state.cards.length} adet kredi kartının hiçbirinde yıllık üyelik aidatı bulunmamaktadır (veya tümü aidatsız/muaf olarak tanımlanmıştır). Yıllık kart aidatı maliyetiniz <strong>₺0</strong>'dir.
        </div>
        `}
      </div>

      <!-- 10. Yıllık Tasarruf & Gider Optimizasyon Potansiyeli -->
      ${(() => {
        const digitalSubs = allSubs.filter(s => s.category !== 'Rent' && s.category !== 'Maintenance' && s.category !== 'Bills' && !s.name.toLowerCase().includes('kira') && !s.name.toLowerCase().includes('aidat') && !s.name.toLowerCase().includes('fatura'));
        const digitalSubsMonthlyTry = digitalSubs.reduce((sum, s) => {
          const tryAmt = convertToTry(s.amount, s.currency || 'TRY');
          return sum + (s.cycle === 'yearly' ? tryAmt / 12 : tryAmt);
        }, 0);
        const digitalSubsAnnualTry = digitalSubsMonthlyTry * 12;
        const digitalSavingsAnnual = digitalSubsAnnualTry * 0.4;

        return `
          <div class="pdf-section">
            <div class="pdf-section-title">10. Yıllık Tasarruf & Serbest Nakit Kazanım Potansiyeli</div>
            <div class="pdf-kpi-grid">
              <div class="pdf-kpi-item">
                <div class="pdf-kpi-label">Yıllık Dijital Abonelik Yükü</div>
                <div class="pdf-kpi-val" style="color:#7c3aed;">₺${formatMoney(digitalSubsAnnualTry)}</div>
                <div style="font-size:7.5pt; color:#64748b; margin-top:2px;">${digitalSubs.length} adet dijital servis (kira/fatura hariç)</div>
              </div>
              <div class="pdf-kpi-item">
                <div class="pdf-kpi-label">Yıllık Kart Aidatı Maliyeti</div>
                <div class="pdf-kpi-val" style="color:#16a34a;">₺0 (Muaf)</div>
                <div style="font-size:7.5pt; color:#64748b; margin-top:2px;">Tüm kartlarınız aidatsız statüdedir</div>
              </div>
              <div class="pdf-kpi-item">
                <div class="pdf-kpi-label">Tahmini Yıllık Tasarruf Potansiyeli</div>
                <div class="pdf-kpi-val" style="color:#16a34a;">₺${formatMoney(digitalSavingsAnnual)}</div>
                <div style="font-size:7.5pt; color:#64748b; margin-top:2px;">İsteğe bağlı dijital servis optimizasyonu</div>
              </div>
              <div class="pdf-kpi-item">
                <div class="pdf-kpi-label">Aylık Serbest Nakit Katkısı</div>
                <div class="pdf-kpi-val" style="color:#10b981;">₺${formatMoney(digitalSavingsAnnual / 12)}/ay</div>
                <div style="font-size:7.5pt; color:#64748b; margin-top:2px;">Doğrudan tasarrufa aktarılabilir tutar</div>
              </div>
            </div>
          </div>
        `;
      })()}

      <!-- 11. Akıllı Harcama & Vade Optimizasyon Danışmanı -->
      ${(() => {
        const smartRankings = state.cards.map(c => calculateCardDeferralDays(c, now)).sort((a, b) => b.daysUntilPayment - a.daysUntilPayment);
        if (smartRankings.length === 0) return '';
        const bestSmartCard = smartRankings.find(r => r.availableLimit > 0) || smartRankings[0];
        const bestBank = state.banks.find(x => x.id === bestSmartCard.card.bankId) || { name: 'Banka' };

        return `
          <div class="pdf-section">
            <div class="pdf-section-title">11. Akıllı Harcama & Vade Optimizasyon Danışmanı (Sıfır Faizli Nakit Finansmanı)</div>
            
            <div class="pdf-sim-box" style="background:#f0f9ff; border-color:#bae6fd; border-left-color:#0284c7; margin-bottom:10px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                <strong style="color:#0369a1; font-size:10pt;">Bugünün En Avantajlı Harcama Kartı: ${escapeHtml(bestSmartCard.card.nickname)} (${escapeHtml(bestBank.name)})</strong>
                <span class="pdf-badge pdf-badge-success" style="font-size:8.5pt;">${bestSmartCard.daysUntilPayment} Gün Sonra Ödeme</span>
              </div>
              <p style="margin:0; font-size:8.5pt; color:#334155; line-height:1.45;">
                Rapor tarihi (<strong>${fullDateStr}</strong>) itibarıyla yapacağınız bir harcamada ödemeyi en uzun süreye erteleyen kartınız <strong>${escapeHtml(bestSmartCard.card.nickname)}</strong>'dir. 
                ${bestSmartCard.isNextMonthCutoff ? 'Ekstresi yeni kesildiği için bugün yapılacak harcama bir sonraki ayın ekstresine kalır ve <strong>' + bestSmartCard.daysUntilPayment + ' gün boyunca sıfır maliyetli nakit finansmanı</strong> sağlar.' : 'Ekstre kesimine ' + (bestSmartCard.cutoffDay - bestSmartCard.today) + ' gün bulunmaktadır.'}
                Kullanılabilir Serbest Limit: <strong>₺${formatMoney(bestSmartCard.availableLimit)}</strong>.
              </p>
            </div>

            <table class="pdf-table">
              <thead>
                <tr>
                  <th>Öneri Sırası</th>
                  <th>Kart Adı & Modeli</th>
                  <th>Banka</th>
                  <th>Kesim Günü</th>
                  <th>Son Ödeme Günü</th>
                  <th>Ödeme Erteleme (Vade)</th>
                  <th>Dönem Durumu</th>
                  <th>Kullanılabilir Limit</th>
                </tr>
              </thead>
              <tbody>
                ${smartRankings.map((r, idx) => {
                  const b = state.banks.find(x => x.id === r.card.bankId) || { name: 'Banka' };
                  const isTop = idx === 0;

                  return `
                    <tr style="${isTop ? 'background:#f0fdf4; font-weight:600;' : ''}">
                      <td><strong style="color:${isTop ? '#16a34a' : '#64748b'};">#${idx + 1} ${isTop ? '(En Avantajlı)' : ''}</strong></td>
                      <td><strong>${escapeHtml(r.card.nickname)}</strong></td>
                      <td>${escapeHtml(b.name)}</td>
                      <td>${r.cutoffDay}. Gün</td>
                      <td>${r.dueDay}. Gün</td>
                      <td style="font-weight:700; color:${r.daysUntilPayment > 30 ? '#16a34a' : r.daysUntilPayment > 15 ? '#2563eb' : '#d97706'};">
                        ${r.daysUntilPayment} Gün Vade
                      </td>
                      <td><span class="pdf-badge ${r.isNextMonthCutoff ? 'pdf-badge-success' : 'pdf-badge-neutral'}">${r.isNextMonthCutoff ? 'Gelecek Ekstreye Kalır' : 'Bu Ayki Ekstreye Yansır'}</span></td>
                      <td style="color:#16a34a; font-weight:700;">₺${formatMoney(r.availableLimit)}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `;
      })()}

      <!-- 12. Asgari Ödeme Faizi & Maliyet Simülasyonu -->
      <div class="pdf-section">
        <div class="pdf-section-title">12. Finansal Uyarı: Sadece Asgari Ödeme Yapmanın Maliyeti</div>
        <div class="pdf-sim-box">
          <strong>Sadece Asgari Ödeme Durumu ve Bileşik Faiz Riski:</strong>
          <p style="margin-top:4px; color:#451a03;">
            Kredi kartı borcunun sadece asgari tutarını (<strong>₺${formatMoney(totalCardMinDue)}</strong>) ödediğinizde, geriye kalan <strong>₺${formatMoney(Math.max(0, totalCardDebt - totalCardMinDue))}</strong> tutarındaki borca her ay TCMB akdi faizi ve üzerine %30 vergi (KKDF + BSMV) eklenir. Borcunuza faiz işletildikçe anapara erimez ve borç sarmalına dönüşür.
            Ayrıca <strong>Katılım bankalarında</strong> borç devri ve faiz işletimi olmadığı için borcun %100'ünün ödenmesi yasal zorunluluktur; aksi halde kart kullanıma kapanır ve yasal takip riski doğar.
          </p>
        </div>
      </div>

      <!-- 13. Finansal Okuryazarlık & Terimler Sözlüğü (Hiç bilmeyenler için) -->
      <div class="pdf-section">
        <div class="pdf-section-title">13. Finansal Okuryazarlık & Temel Terimler Kılavuzu</div>
        <div class="pdf-glossary-grid">
          <div class="pdf-glossary-card">
            <strong>Asgari Ödeme Tutarı Nedir?</strong>
            <p>Bir kredi kartının gecikmeye düşmemesi için o ay ödenmesi gereken yasal en düşük tutardır (Limiti 25.000 TL altı kartlarda %20, 25.000 TL ve üstü kartlarda %40'tır). Sadece asgariyi ödemek kartınızı açık tutar ancak kalan borca faiz işletilir.</p>
          </div>
          <div class="pdf-glossary-card">
            <strong>Katılım Bankası %100 Asgari Kuralı Nedir?</strong>
            <p>Faizsiz bankacılık prensibi gereği katılım bankası kredi kartlarında gecikme faizi ve borç erteleme bulunmaz. Bu nedenle ekstredeki dönem borcunun tamamı (%100) asgari tutardır ve her ay eksiksiz kapatılmalıdır.</p>
          </div>
          <div class="pdf-glossary-card">
            <strong>Findeks Kredi Notu & Limit Doluluğu Nedir?</strong>
            <p>Bankaların size kredi veya kart verirken baktığı 1-1900 arası güven skorudur. Kart limitlerinizin %70'ten fazlasını dolu tutmak, borcunuzu düzenli ödeseniz bile kredi notunuzu düşürür. Notu yükseltmek için doluluk %30 altında tutulmalıdır.</p>
          </div>
          <div class="pdf-glossary-card">
            <strong>KMH / Ek Hesap (Avans Hesap) Nedir?</strong>
            <p>Vadesiz mevduat hesabınızda bakiye kalmadığında eksiye düşerek para çekmenizi veya fatura ödemenizi sağlayan hazır kredi limitidir. Kullanıldığı gün kadar günlük faiz işletilir; acil nakit tamponu olarak kullanılmalıdır.</p>
          </div>
          <div class="pdf-glossary-card">
            <strong>Ekstre Kesim ve Son Ödeme Tarihi Farkı Nedir?</strong>
            <p>Ekstre kesim günü, geriye dönük 1 aylık harcamalarınızın faturalandığı gündür. Son ödeme tarihi ise bu faturanın faizsiz ödenebileceği son gündür (kesimden yaklaşık 10 gün sonra).</p>
          </div>
          <div class="pdf-glossary-card">
            <strong>Gelir Yükü Oranı (DTI - Debt to Income) Nedir?</strong>
            <p>Aylık net maaşınızın ne kadarının zorunlu borç ve taksitlere gittiğini gösterir. Bu oranın %40'ın altında olması sağlıklı, %50'nin üstünde olması ise finansal sıkışıklık alarmıdır.</p>
          </div>
        </div>
      </div>

      <!-- 14. Somut Müdahale & Stratejik Eylem Planı -->
      <div class="pdf-section">
        <div class="pdf-section-title">14. 4 Aşamalı Stratejik Müdahale & Borç İyileştirme Planı</div>
        
        <div class="pdf-action-item">
          <div class="pdf-action-num">1</div>
          <div>
            <strong>Aşama 1 (Bu Hafta / Acil Likidite): %80+ Limit Doluluğu Olan Kartların Rahatlatılması</strong>
            <div style="color:#475569; font-size:8.5pt; margin-top:2px;">
              Limiti %80 ve üzeri dolu olan kartlar bireysel Findeks kredi skorunu doğrudan aşağı çeker. İlk serbest nakit akışını bu kartların bakiyesini %50 altına indirmek için kullanın.
            </div>
          </div>
        </div>

        <div class="pdf-action-item">
          <div class="pdf-action-num">2</div>
          <div>
            <strong>Aşama 2 (Kısa Vade - 1. Ay): Katılım Bankası Borçları ve Düzenli Gider Optimizasyonu</strong>
            <div style="color:#475569; font-size:8.5pt; margin-top:2px;">
              Katılım bankacılığı prensibinde borç devredilemez; asgari ödeme tutarı borcun %100'üdür. Gecikme cezası ve sicil bozulmaması için maaş gününde ilk kapatılması gereken kalemdir. Ayrıca kayıtlı ${allSubs.length} adet abonelikten (aylık ₺${formatMoney(totalSubsMonthlyTry)}) kullanılmayanlar iptal edilmelidir.
            </div>
          </div>
        </div>

        <div class="pdf-action-item">
          <div class="pdf-action-num">3</div>
          <div>
            <strong>Aşama 3 (Orta Vade - 3-6 Ay): Taksitli Alışverişlerin Tasfiyesi & Findeks Skorunu 1600+ Seviyesine Çıkarma</strong>
            <div style="color:#475569; font-size:8.5pt; margin-top:2px;">
              Mevcut ${allInstallments.length} adet taksitli planın (toplam ₺${formatMoney(allInstallments.reduce((s, i) => s + i.remainingTotal, 0))}) vadeleri tamamlandıkça yeni taksitli harcama yapmayarak serbest nakit akışınızı artırın. Toplam limit doluluğu %30 altına indiğinde kredi notunuz en üst banda çıkacaktır.
            </div>
          </div>
        </div>

        <div class="pdf-action-item">
          <div class="pdf-action-num">4</div>
          <div>
            <strong>Aşama 4 (Uzun Vade - 12 Ay): Pozitif Serbest Nakit Akışı & Acil Durum Fonu İnşası</strong>
            <div style="color:#475569; font-size:8.5pt; margin-top:2px;">
              Aylık zorunlu gider yükünüzü net gelirinizin %40'ının altında tutarak, KMH rezervlerine bağımlı kalmadan en az 3 aylık zorunlu gider tutarı kadar (₺${formatMoney(totalMandatoryOutflow * 3)}) serbest likit acil durum fonu oluşturun.
            </div>
          </div>
        </div>
      </div>

      <div class="pdf-footer-note">
        <span>CardMon Finansal Analiz & Denetim Raporu</span>
        <span>${fullDateStr} • Gizli & Kişiye Özel Finansal Denetim ve Strateji Raporu</span>
      </div>
    `;

    showToast('Ağustos 2026 Detaylı Finansal Denetim Raporu hazırlanıyor...');
    setTimeout(() => {
      window.print();
    }, 150);
  } catch (err) {
    console.error('PDF export error:', err);
    alert('PDF raporu oluşturulurken bir hata oluştu: ' + (err.message || err));
  }
}

function confirmClearAllData() {
  if (confirm(t('confirmClear'))) {
    state.banks = [];
    state.cards = [];
    state.loans = [];
    saveToStorage();
    renderAll();
    showToast(t('clearedSuccess'));
  }
}

// --------------------------------------------------------------------------
// Helper Utilities
// --------------------------------------------------------------------------
function getDaysInCurrentMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
}

function getApproxDay(approxWeekKey) {
  switch (approxWeekKey) {
    case 'week1': return 4;
    case 'week2': return 11;
    case 'week3': return 18;
    case 'week4': return 25;
    case 'weekMonthEnd': return 29;
    default: return 15;
  }
}

function getUtilizationColor(utilization) {
  if (utilization <= 30) return 'var(--accent-emerald)';
  if (utilization <= 70) return 'var(--accent-amber)';
  return 'var(--accent-rose)';
}

function getNetworkLogoSvg(network) {
  switch (network) {
    case 'Mastercard':
      return `
        <svg width="34" height="22" viewBox="0 0 36 24">
          <circle cx="13" cy="12" r="10" fill="#EB001B" fill-opacity="0.9"/>
          <circle cx="23" cy="12" r="10" fill="#F79E1B" fill-opacity="0.85"/>
        </svg>
      `;
    case 'Visa':
      return `<span style="font-weight:900; letter-spacing:-0.05em; font-size:1.15rem; color:#ffffff;">VISA</span>`;
    case 'Troy':
      return `<span style="font-weight:900; letter-spacing:0.02em; font-size:0.95rem; color:#00a4e4; background:#ffffff; padding:0.1rem 0.35rem; border-radius:4px;">TROY</span>`;
    case 'Amex':
      return `<span style="font-weight:800; font-size:0.85rem; color:#ffffff; background:#007bc1; padding:0.15rem 0.35rem; border-radius:4px;">AMEX</span>`;
    default:
      return `<span style="font-weight:800; font-size:0.85rem;">CARD</span>`;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function showToast(msg) {
  let toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toastContainer';
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
    <span>${escapeHtml(msg)}</span>
  `;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

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
window.openProfileModal = openProfileModal;
window.closeProfileModal = closeProfileModal;
window.payCardFullDebt = payCardFullDebt;
