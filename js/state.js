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
    if (typeof markFileSystemDirty === 'function') {
      markFileSystemDirty();
    }
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

