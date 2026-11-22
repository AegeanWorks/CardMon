// ==========================================================================
// CARDMON - ENGLISH OVERLAY FOR LEGACY LABELS
// The original interface contains hard-coded Turkish text in index.html.
// For a public release, this module translates exact matches of known Turkish
// dictionary strings when English is selected, and restores them on switch
// back. It stores originals so the operation is fully reversible.
// ==========================================================================

'use strict';

const EN_OVERLAY_ATTRIBUTES = ['title', 'placeholder', 'aria-label'];

// Explicit translations for legacy hard-coded strings that never had i18n keys.
const EN_EXPLICIT_MAP = {
  'CardMon | Banka & Kredi Kartı Portföy Yöneticisi': 'CardMon | Bank & Credit Card Portfolio Manager',
  'Akıllı Kart & Limit Takibi': 'Smart Card & Limit Tracking',
  'Yedek Geçmişi & Kasa': 'Backup History & Vault',
  'Yedek Yükle (JSON)': 'Import Backup (JSON)',
  'CSV Raporu İndir': 'Download CSV Report',
  'Klavye Kısayolları (?)': 'Keyboard Shortcuts (?)',
  'Tüm Verileri Temizle': 'Clear All Data',
  'Finansal Özet & Portföy Analizi': 'Financial Summary & Portfolio Analysis',
  'Mükemmel': 'Excellent',
  'Limit doluluk oranınız güvenli aralıkta (%24.8).': 'Your utilization is in a safe range (24.8%).',
  'Kayıtlı Banka:': 'Registered banks:',
  'Hemen kullanılabilir bakiye': 'Immediately available balance',
  'Genel Doluluk Oranı': 'Overall utilization rate',
  'Bu Ayki Asgari Ödeme': 'Minimum payment this month',
  'Yaklaşan ödeme bekleniyor': 'Upcoming payment expected',
  'Her bankadaki toplam limit ve borç kullanım oranları': 'Total limits and debt utilization per bank',
  'Bankalardaki hazır nakit avans ve kredili mevduat limitleri': 'Ready cash advance and overdraft limits by bank',
  'Kart Şebekesi & Tür Dağılımı': 'Card Network & Type Distribution',
  'Haftalık dönemlere göre yaklaşan ekstre ve ödeme yoğunluğu': 'Upcoming statements and payment density by week',
  'PDF İndir': 'Download PDF',
  'Banka Hesaplarım & Limit Dağılımı': 'My Bank Accounts & Limit Distribution',
  'Vadesiz hesaplarınız, banka kartlarınız ve tanımlı banka bilgileri': 'Your checking accounts, debit cards and defined bank details',
  'Kredi Kartlarım & Limit Yönetimi': 'My Credit Cards & Limit Management',
  'Tüm kredi kartlarınız, alışveriş kısıtlamaları, sanal kartlar ve taksitler': 'All your credit cards, purchase restrictions, virtual cards and installments',
  'Tüm Kartlar': 'All Cards',
  '-- Banka Seçin --': '-- Select Bank --',
  'Asgari Ödeme Oranı (%)': 'Minimum Payment Ratio (%)',
  'Katılım Bankası (%100 Tüm Borç)': 'Participation Bank (100% of total debt)',
  '%20 (25.000 TL altı limitler için standart)': '20% (standard for limits under 25,000 TRY)',
  '%40 (25.000 TL ve üstü limitler için standart)': '40% (standard for limits of 25,000 TRY and above)',
  '🟢 %100 - Katılım Bankacılığı / Faizsiz (Tüm Borç)': '🟢 100% - Participation banking / interest-free (full debt)',
  'Katılım Bankacılığı Prensibi:': 'Participation Banking Principle:',
  'Bu kartta borç devri ve faiz uygulanmaz; her ay dönem borcunun tamamı (%100) asgari ödeme tutarıdır.': 'This card has no balance carryover or interest; the full statement balance (100%) is the minimum payment each month.',
  'Akıllı Ekstre & Ödeme Takvimi': 'Smart Statement & Payment Calendar',
  'Hafta ve gerçek gün entegre çalışır': 'Works with both weeks and exact days',
  'Ekstre Kesim Haftası / Genel Dönem': 'Statement Cut-off Week / General Period',
  'Ay Sonu (29-31 Son Günler)': 'End of Month (last days 29-31)',
  'Bu Ayki Gerçek Kesim Günü': 'Exact cut-off day this month',
  'Hızlı Son Ödeme:': 'Quick due date:',
  '+10 Gün (Standart)': '+10 Days (Standard)',
  '+14 Gün': '+14 Days',
  '+11 Gün (Hafta Sonu Kayması)': '+11 Days (weekend shift)',
  'İnternet / E-Ticaret': 'Internet / E-commerce',
  'Yurt Dışı Alışverişi': 'International purchases',
  'Kartı Geçici Olarak Dondur / Kilitle': 'Temporarily freeze / lock card',
  'Yıllık Kart Üyelik Ücreti (Banka Aidatı ₺)': 'Annual Card Membership Fee (bank fee, TRY)',
  '-- Seçilmedi --': '-- Not selected --',
  'Şubat (2. Ay)': 'February (Month 2)',
  'Mayıs (5. Ay)': 'May (Month 5)',
  'Ağustos (8. Ay)': 'August (Month 8)',
  'Eylül (9. Ay)': 'September (Month 9)',
  'Kasım (11. Ay)': 'November (Month 11)',
  'Aralık (12. Ay)': 'December (Month 12)',
  'Seçilmedi / Belirsiz': 'Not selected / Unknown',
  'Aidatsız / Yıllık Ücretten Muaf Kart': 'No annual fee / fee-exempt card',
  'Kart Görsel Teması': 'Card visual theme',
  'Hazır Banka Seçimi': 'Quick bank selection',
  'Bu Bankada Kredi Kartınız Var mı?': 'Do you have a credit card with this bank?',
  'Kredi Kartı Bilgisi Ekle': 'Add Credit Card Details',
  'Güncel Borç (₺)': 'Current Debt (TRY)',
  'Kart şebekesi': 'Card network',
  'Ticari / şirket': 'Commercial / business',
  'Öğrenci / Genç': 'Student / youth',
  '💡 Kart adı ve limit girilirse banka ile birlikte yeni bir kart kaydı otomatik oluşturulur.': '💡 If you enter a card name and limit, a new card is created automatically with the bank.',
  'Borç / Gelir oranını hesaplamak için kullanılır': 'Used to calculate the debt-to-income ratio',
  'Maaş / Gelir Günü (1-31)': 'Salary / income day (1-31)',
  'Varsayılan Para Birimi': 'Default currency',
  '₺ Türk Lirası (TRY)': '₺ Turkish Lira (TRY)',
  '$ Amerikan Doları (USD)': '$ US Dollar (USD)',
  '£ İngiliz Sterlini (GBP)': '£ British Pound (GBP)',
  '🇹🇷 Türkçe': '🇹🇷 Turkish',
  'Farklı Kaydet': 'Save As',
  'Dosyadan Aç': 'Open from File',
  'Yedek Kasası & Geçmiş Noktalar': 'Backup Vault & History',
  'Değişiklikleri Kaydet': 'Save Changes',
  'Hızlı İşlem & Taksit': 'Quick Transaction & Installments',
  'Borç Ödeme Yap': 'Make a Debt Payment',
  'Hızlı Ödeme Seçenekleri:': 'Quick payment options:',
  'İşlem Tutarı (₺)': 'Transaction amount (TRY)',
  'Açıklama / Harcama Kalemi': 'Description / expense item',
  'Harcama Hangi Ekstreye Yansısın?': 'Which statement should this expense appear on?',
  '⚠️ Sonraki ekstre seçildi — harcama': '⚠️ Next statement selected — the expense',
  'bu ayki borç bakiyenizi etkilemez': 'will not affect this month’s balance',
  ', sonraki ekstre keşiminden itibaren taksitler başlar. Kartınızdaki “Planlanan” bölümünde görünecektir.': ', installments start after the next cut-off. It will appear in the “Planned” section of your card.',
  'İşlemi Uygula': 'Apply Transaction',
  'Bağlı Ana Kredi Kartı': 'Linked primary credit card',
  'Sanal Kart Adı / Kullanım Amacı': 'Virtual card name / purpose',
  'Bu limit ana kartınızın kullanılabilir limitinden harcar.': 'This limit is drawn from your primary card’s available limit.',
  'İnternet Alışverişine Açık': 'Enabled for online shopping',
  'Sanal Kartı Kaydet': 'Save Virtual Card',
  'Hızlı Popüler Seçimler:': 'Quick popular selections:',
  'Ev Kirası (₺25.000 / Nakit)': 'Rent (25,000 TRY / cash)',
  'Bina Aidatı (₺1.500 / Nakit)': 'Building fees (1,500 TRY / cash)',
  'Ödeme Yöntemi & Kaynağı': 'Payment method & source',
  'Gider / Abonelik / Kira Adı': 'Expense / subscription / rent name',
  'Değişken / Tahmini Tutar (Aydan aya değişen fatura, aidat vb.)': 'Variable / estimated amount (bills, fees etc. that change monthly)',
  'İşaretlendiğinde tutar listelerde ve takvimde yaklaşık değer (~₺...) olarak gösterilir.': 'When checked, the amount is shown as an approximate value (~TRY...) in lists and the calendar.',
  '🏢 Bina / Site Aidatı': '🏢 Building / complex fees',
  '⚡ Faturalar (Elektrik, Su, Doğalgaz, GSM)': '⚡ Bills (electricity, water, gas, mobile)',
  '🎬 Dizi, Film & Müzik (Streaming)': '🎬 TV, Film & Music (streaming)',
  '🤖 Yazılım, SaaS & Yapay Zeka': '🤖 Software, SaaS & AI',
  '🏋️ Spor, Sağlık & Yaşam': '🏋️ Sports, Health & Lifestyle',
  '🎓 Eğitim & Kurslar': '🎓 Education & Courses',
  '📦 Diğer Düzenli Giderler': '📦 Other recurring expenses',
  'Ödeme Sıklığı': 'Payment frequency',
  'Aylık (Her Ay)': 'Monthly (every month)',
  'Yıllık (Yılda 1 Kez)': 'Yearly (once a year)',
  'Aylık Ödeme / Çekim Günü (1-31)': 'Monthly payment / charge day (1-31)',
  'Ödeme takviminizde ve yaklaşan ödemeler tablonuzda bu gün baz alınır.': 'This day is used in your payment calendar and upcoming payments table.',
  'Aboneliği Kaydet': 'Save Subscription',
  'Toplam Geri Ödeme Tutarı (₺)': 'Total repayment amount (TRY)',
  'Aylık Taksit Tutarı (₺)': 'Monthly installment amount (TRY)',
  'Şimdiye Kadar Ödenen Taksit': 'Installments paid so far',
  'Aylık Ödeme Günü (1-31)': 'Monthly payment day (1-31)',
  'Aylık Faiz Oranı (% Opsiyonel)': 'Monthly interest rate (% optional)',
  'İlk Taksit Başlangıç Dönemi': 'First installment start cycle',
  'Kredi Notları / Açıklama (Opsiyonel)': 'Loan notes / description (optional)',
  'Akıllı Kart Harcama & Vade Sıralaması': 'Smart card spending & installment ranking',
  '40 güne kadar sıfır faizli nakit finansmanı': 'Interest-free cash financing for up to 40 days',
  'Güvenli Yedek Kasası & Geçmiş Versiyonlar': 'Secure Backup Vault & Previous Versions',
  'Otomatik Haftalık Yedekleme Aktif': 'Automatic weekly backup active',
  'Her hafta ve önemli değişikliklerde tarayıcı içinde güvenli anlık görüntü saklanır.': 'A secure snapshot is stored in the browser weekly and after important changes.',
  '+ Şimdi Yedek Al': '+ Back Up Now',
  'Kayıtlı Yedek Noktaları': 'Saved backup points',
  'Aylık Ödenen Kira Tutarı (₺)': 'Monthly rent paid (TRY)',
  'Yıllık Ortalama Kira Artışı (%)': 'Average annual rent increase (%)',
  'Tasarrufun Yıllık Yatırım Getirisi (% Fon / Altın / Faiz)': 'Annual investment return on savings (% fund / gold / interest)',
  'Klavye Kısayolları': 'Keyboard Shortcuts',
  'CardMon içerisinde hızlı gezinmek ve aksiyon almak için aşağıdaki klavye kısayollarını kullanabilirsiniz:': 'Use these keyboard shortcuts to navigate and act quickly in CardMon:',
  'Sekme Değiştir (Genel Bakış ... Takvim)': 'Switch tabs (Overview ... Calendar)',
  'Portföyü Diske Kaydet': 'Save portfolio to disk',
  'Açık Pencereyi / Modalı Kapat': 'Close open window / modal',
  'Kısayol Rehberini Aç / Kapat': 'Open / close shortcut guide',
  'Portföyünüzü aynı Wi-Fi ağındaki CardMon sunucusuna senkronize edin ve Android uygulamasını buradan indirin.': 'Sync your portfolio with the CardMon server on the same Wi-Fi network and download the Android app here.',
  'Telefon tarayıcısı için doğrudan APK sayfasını aç / Open the phone-friendly APK page →': 'Open the phone-friendly APK page →',
  'Para Zamanlaması &amp; FX': 'Money Timing & FX',
  'Para Zamanlaması & FX': 'Money Timing & FX'
};

// Runtime-generated labels, toasts and demo descriptions from the JS modules.
const EN_RUNTIME_MAP = {
  '💾 Manuel yedek noktası başarıyla kasaya eklendi.': '💾 Manual backup snapshot saved to the vault.',
  '⚠️ Yedek kaydedilemedi; lütfen depolama alanını kontrol edin.': '⚠️ Backup could not be saved; please check storage space.',
  'Bu versiyonu JSON dosyası olarak indir': 'Download this version as a JSON file',
  'Yedek noktası bulunamadı.': 'No backup snapshot found.',
  '🗑️ Yedek noktası kasadan silindi.': '🗑️ Backup snapshot deleted from the vault.',
  'Tebrikler! Hiç borcunuz bulunmuyor. Kullanılabilir limitiniz %100.': 'Congratulations! You have no debt. 100% of your limit is available.',
  'Henüz tanımlı bir Ek Hesap (KMH) limitiniz bulunmuyor.': 'No overdraft limit has been defined yet.',
  'Planlanan ödeme yok': 'No planned payments',
  'Yüksek Limit Doluluğuna Sahip Kartlar': 'Cards with high utilization',
  'Tüm kredi kartlarınızın doluluk oranı güvenli aralıkta tutuluyor. Finansal kredibiliteniz çok iyi durumda.': 'All your credit cards are within a safe utilization range. Your creditworthiness is very good.',
  'Borç Kapatma Stratejisi (Çığ Yöntemi)': 'Debt payoff strategy (avalanche method)',
  'Acil Durum Likidite Güvencesi': 'Emergency liquidity buffer',
  'Aylık Düzenli Abonelik & Otomatik Ödemeler': 'Monthly subscriptions & automatic payments',
  'Kart Aidatı İade Talepleri Takibi': 'Card fee refund request tracking',
  'Düşük': 'Low',
  'Otomatik Haftalık Yedek': 'Automatic weekly backup',
  'Geri Yükle': 'Restore',
  'İndir': 'Download',
  'açıldı (aktif).': 'enabled (active).',
  'bloke edildi (kapalı).': 'blocked (disabled).',
  'İzin': 'Permission',
  'Yurtdışı Alışveriş': 'International purchases',
  'Lütfen banka ve kart adını giriniz. / Please provide bank and card name.': 'Please provide bank and card name.',
  'Güncel Borç / Limit': 'Current debt / limit',
  'Borç Ödemesini Kaydet (₺ Düşür)': 'Save debt payment (reduces TRY balance)',
  'Harcamayı Ekle (₺ Borca Ekle)': 'Add expense (adds to TRY debt)',
  'Borç Ödeme': 'Debt payment',
  'Lütfen geçerli bir tutar giriniz.': 'Please enter a valid amount.',
  '✓ Ödendi': '✓ Paid',
  'taksit planı': 'installment plan',
  'Sanal Kartı Düzenle': 'Edit virtual card',
  'Sanal kart başarıyla kaydedildi.': 'Virtual card saved successfully.',
  'Bu sanal kartı silmek istediğinize emin misiniz?': 'Are you sure you want to delete this virtual card?',
  'Banka Havalesi / Otomatik Ödeme': 'Bank transfer / automatic payment',
  'Nakit / Elden Ödeme': 'Cash / in-person payment',
  '💵 / 🏦 Nakit & Banka Ödemeleri': '💵 / 🏦 Cash & bank payments',
  '💳 Kayıtlı Kredi Kartları': '💳 Saved credit cards',
  'Düzenli Gideri / Aboneliği Düzenle': 'Edit recurring expense / subscription',
  'Finansal Karşılaştırma: Ev Sahibi Olmak vs Kirada Kalmak': 'Financial comparison: owning vs renting a home',
  'Finansal Portföy Sahibi': 'Portfolio owner',
  'Güvenli & Dengeli Portföy': 'Secure & balanced portfolio',
  'Mükemmel (Kredi notu yüksek)': 'Excellent (high credit score)',
  'Kritik (Kredi notu düşebilir)': 'Critical (credit score may drop)',
  'Gelecek Dönem Başlayacak': 'Starts next cycle',
  'Cari Dönem Aktif': 'Current cycle active',
  'Yıllık (Her yıl)': 'Yearly (every year)',
  'Ödendi / Kesildi': 'Paid / charged',
  'İade Talep Edildi': 'Refund requested',
  'Puan / Nakit Olarak İade Alındı': 'Refunded as points / cash',
  'Aidatsız / Muaf': 'No fee / exempt',
  'Tüm kartlarınız aidatsız statüdedir': 'All your cards have no annual fee',
  '(En Avantajlı)': '(Best option)',
  'Gelecek Ekstreye Kalır': 'Carries over to next statement',
  'Bu Ayki Ekstreye Yansır': 'Appears on this month’s statement',
  'Bugün Hangi Kartla Harcamalıyım?': 'Which card should I use today?',
  'Akıllı Harcama Danışmanı': 'Smart spending advisor',
  'Maaş Hesabı & Ana Kart': 'Salary account & primary card',
  'Katılım Bankacılığı (Faizsiz)': 'Participation banking (interest-free)',
  'Otomatik Ödeme Talimatları': 'Automatic payment orders',
  'World Puan Avantajları': 'World points benefits',
  'Chip-para Kampanyaları': 'Chip-money campaigns',
  'Masrafsız Bankacılık': 'Fee-free banking',
  'Sadece Vadesiz & Yatırım Hesabı': 'Checking & investment account only',
  'Spotify Aile Planı': 'Spotify Family Plan',
  'Yurtdışı SaaS & Hosting': 'International SaaS & Hosting',
  'Geçici Alışveriş Kartı': 'Temporary shopping card',
  'İhtiyaç Kredisi (Ev Tadilatı)': 'Personal loan (home renovation)',
  'Maaş hesabından otomatik çekiliyor': 'Automatically deducted from salary account',
  'Taşıt Kredisi (Araç Alımı)': 'Auto loan (vehicle purchase)',
  'Planlanan ödeme bulunmuyor (Sakin dönem)': 'No planned payments (quiet period)',
  'Kayıtlı kredi kartı bulunmamaktadır.': 'No credit cards registered.',
  'Konsolide yıllık kart üyelik maliyeti': 'Consolidated annual card membership cost',
  'Diğer / Other Bank': 'Other Bank',
  '%100 Katılım': '100% Participation'
};

let enOverlayEntries = [];

function enTranslationMap() {
  const map = new Map();
  if (typeof I18N === 'undefined' || !I18N.tr || !I18N.en) return map;
  for (const key of Object.keys(I18N.tr)) {
    const turkish = I18N.tr[key];
    const english = I18N.en[key];
    if (typeof turkish !== 'string' || typeof english !== 'string') continue;
    const from = turkish.trim();
    const to = english.trim();
    if (from && to && from !== to && !map.has(from)) map.set(from, to);
  }
  for (const key of Object.keys(EN_EXPLICIT_MAP)) {
    if (!map.has(key)) map.set(key, EN_EXPLICIT_MAP[key]);
  }
  for (const key of Object.keys(EN_RUNTIME_MAP)) {
    if (!map.has(key)) map.set(key, EN_RUNTIME_MAP[key]);
  }
  return map;
}

function enTranslateText(text) {
  if (typeof currentLang === 'undefined' || currentLang !== 'en' || !text) return text;
  const value = String(text);
  return enTranslationMap().get(value.trim()) || value;
}

function clearEnglishOverlay() {
  for (const entry of enOverlayEntries) {
    try {
      if (entry.attr) entry.node.setAttribute(entry.attr, entry.original);
      else entry.node.nodeValue = entry.original;
    } catch (err) {
      /* element may have been removed from the DOM */
    }
  }
  enOverlayEntries = [];
}

function applyEnglishOverlay(root) {
  clearEnglishOverlay();
  if (typeof currentLang === 'undefined' || currentLang !== 'en') return;
  if (typeof document === 'undefined' || typeof document.createTreeWalker !== 'function') return;

  const map = enTranslationMap();
  if (!map.size) return;
  const target = root || document.body;
  if (!target) return;

  const textNodes = [];
  const walker = document.createTreeWalker(target, 4); // NodeFilter.SHOW_TEXT
  let node = walker.nextNode();
  while (node) {
    const tag = node.parentNode && node.parentNode.nodeName;
    if (tag !== 'SCRIPT' && tag !== 'STYLE' && typeof node.nodeValue === 'string') {
      textNodes.push(node);
    }
    node = walker.nextNode();
  }

  const phrases = Array.from(map.entries())
    .filter(([key]) => key.length >= 12)
    .sort((left, right) => right[0].length - left[0].length);

  for (const textNode of textNodes) {
    const original = textNode.nodeValue;
    const key = original.trim();
    const translated = key && map.get(key);
    let updated = translated ? original.replace(key, translated) : original;
    if (!translated) {
      // Generated HTML often leaves a Turkish phrase inside a larger text node.
      for (const [phrase, english] of phrases) {
        if (updated.includes(phrase)) updated = updated.split(phrase).join(english);
      }
    }
    if (updated === original) continue;
    enOverlayEntries.push({ node: textNode, attr: null, original });
    textNode.nodeValue = updated;
  }

  const elements = typeof document.querySelectorAll === 'function' ? document.querySelectorAll('*') : [];
  for (const element of elements) {
    for (const attr of EN_OVERLAY_ATTRIBUTES) {
      let value;
      try { value = element.getAttribute(attr); } catch (err) { continue; }
      if (!value) continue;
      const translated = map.get(value.trim());
      if (!translated) continue;
      enOverlayEntries.push({ node: element, attr, original: value });
      element.setAttribute(attr, translated);
    }
  }
}

function refreshEnglishOverlay() {
  applyEnglishOverlay();
}

if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refreshEnglishOverlay);
  } else {
    refreshEnglishOverlay();
  }
}
