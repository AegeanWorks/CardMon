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

