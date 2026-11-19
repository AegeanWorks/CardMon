// Internationalization Dictionary & Helpers (TR & ENG)
const I18N = {
  tr: {
    // Header & Meta
    appTitle: "CardMon",
    appSubtitle: "Tüm banka limitleri, kart ekstreleri ve taksitler tek ekranda",
    langToggle: "English",
    currency: "Para Birimi",
    autoSaved: "Otomatik Kaydedildi",
    saving: "Kaydediliyor...",
    
    // Actions & Buttons
    addCard: "Yeni Kart Ekle",
    addBank: "Yeni Banka Ekle",
    editCard: "Kartı Düzenle",
    editBank: "Bankayı Düzenle",
    deleteCard: "Kartı Sil",
    deleteBank: "Bankayı Sil",
    save: "Kaydet",
    cancel: "İptal",
    loadDemo: "Örnek Veri Yükle",
    saveToFile: "Dosyaya Kaydet",
    saveFileAs: "Farklı Kaydet...",
    openFromFile: "Dosyadan Aç...",
    activeFile: "Aktif Dosya",
    fileSavedSuccess: "Portföy dosyaya başarıyla kaydedildi",
    fileLoadedSuccess: "Portföy dosyadan başarıyla yüklendi",
    fileSaveError: "Dosya kaydedilirken hata oluştu",
    fileLoadError: "Dosya yüklenirken hata oluştu: Geçersiz dosya formatı",
    unsavedChanges: "Kaydedilmemiş Değişiklikler",
    fileSynced: "Dosya Eşitlendi",
    exportJson: "Yedek İndir (JSON)",
    importJson: "Yedek Yükle",
    exportCsv: "CSV Olarak İndir",
    exportPdf: "PDF Raporu İndir",
    clearAll: "Tümünü Temizle",
    confirmClear: "Tüm banka ve kart verilerini silmek istediğinize emin misiniz?",
    confirmDeleteCard: "Bu kredi kartını silmek istediğinize emin misiniz?",
    confirmDeleteBank: "Bu bankayı ve bağlı tüm kartları silmek istediğinize emin misiniz?",
    searchPlaceholder: "Kart veya banka adı ara...",
    allBanks: "Tüm Bankalar",
    allTypes: "Tüm Kart Tipleri",
    filterBy: "Filtrele",
    sortBy: "Sırala",
    sortLimitDesc: "Limit (Yüksekten Düşüğe)",
    sortLimitAsc: "Limit (Düşükten Yükseğe)",
    sortDebtDesc: "Borç / Kullanım (En Çok)",
    sortCutoff: "Yaklaşan Ekstre Tarihi",
    sortDueDate: "Yaklaşan Son Ödeme Tarihi",
    sortBankName: "Banka Adı (A-Z)",
    
    // Overview Metrics
    totalCombinedLimit: "Toplam Birleşik Limit",
    totalUsedBalance: "Toplam Güncel Borç",
    totalAvailableLimit: "Kalan Kullanılabilir Limit",
    overallUtilization: "Genel Limit Doluluk Oranı",
    totalBanksCount: "Kayıtlı Banka",
    activeCardsCount: "Aktif Kredi Kartı",
    banksWithCards: "Kredi Kartı Olan Banka",
    banksWithoutCards: "Kartsız / Hesap Bankası",
    
    // Navigation Tabs
    tabDashboard: "Genel Bakış & Analiz",
    tabBanks: "Banka Hesaplarım",
    tabEkHesap: "Ek Hesaplar (KMH)",
    tabCards: "Kredi Kartlarım",
    tabLoans: "Kredilerim",
    tabSubscriptions: "Abonelikler",
    tabTimeline: "Ekstre & Ödeme Takvimi",
    
    // Profile & Settings
    profileSettings: "Profil & Ayarlar",
    editProfile: "Profili Düzenle",
    userProfile: "Kullanıcı Profili",
    firstName: "Ad",
    lastName: "Soyad",
    userTitle: "Unvan / Meslek",
    monthlyIncome: "Aylık Net Gelir (Opsiyonel)",
    salaryDay: "Maaş / Gelir Günü",
    profileSaved: "Profil ve ayarlar kaydedildi.",
    welcomeBack: "Hoş Geldiniz",
    welcomeSubtitle: "Banka limitleriniz, ek hesap rezervleriniz ve kredi kartı ödeme projeksiyonlarınız aşağıda özetlenmiştir.",
    welcomeEmptySubtitle: "Banka veya kart ekledikçe limit, borç ve ödeme özetleri burada görünür.",
    analyticsEmptyTitle: "Analizler veriyle gelir",
    analyticsEmptyDesc: "Banka veya kart eklediğinizde limit dağılımı, ödeme yoğunluğu ve akıllı öneriler burada görünür.",
    pdfReportHint: "Finansal PDF Raporunu İndir",
    pdfEmptyHint: "Rapor oluşturmak için önce banka veya kart ekleyin",
    financialHealth: "Finansal Sağlık Durumu",
    healthExcellent: "Mükemmel / Düşük Risk",
    healthGood: "İyi / Dengeli",
    healthNoData: "Veri Yok",
    healthEmptyHint: "Henüz banka veya kart eklenmedi. Örnek veri yükleyerek ya da yeni banka ekleyerek başlayın.",
    healthWarning: "Dikkat / Yüksek Doluluk",
    healthCritical: "Kritik / Aşırı Borçlanma",
    totalEkHesapLimit: "Toplam Ek Hesap (KMH) Limiti",
    totalMinPaymentDue: "Bu Ayki Toplam Asgari Tutar",
    nearestDueDate: "En Yakın Ödeme",
    nearestDueNone: "Yok",
    dataManagement: "Veri Yönetimi & Yedekleme",
    backupRestore: "Yedek Al & Yükle",
    quickActions: "Hızlı İşlemler",
    
    // Detailed Analytics
    bankDebtAnalysis: "Banka Bazlı Limit & Borç Analizi",
    ekHesapAnalysis: "Ek Hesap (KMH / Avans) Dağılımı",
    networkAndTypeAnalysis: "Kart Şebekesi & Tür Analizi",
    paymentFlowAnalysis: "Aylık Ödeme & Nakit Akış Dağılımı",
    smartInsights: "Akıllı Finansal Öneriler & Risk Analizi",
    executiveTable: "Tüm Kartların Yönetici Özeti",
    noDebt: "Borç Yok",
    safeBuffer: "Güvenli Yedek Akçe",
    recommendation: "Finansal Tavsiye",
    cardSummaryTable: "Kart Özet Tablosu",
    
    // Card Form & Details
    bankName: "Banka Adı",
    selectBank: "Banka Seçin",
    customBank: "Özel Banka Adı",
    cardNickname: "Kart Adı / Modeli",
    cardNicknamePlaceholder: "Örn: Bonus Platinum, World Gold, Maximum Genç",
    cardNumberLast4: "Son 4 Hane (İsteğe Bağlı)",
    cardNumberLast4Placeholder: "1234",
    cardNetwork: "Kart Şebekesi",
    cardType: "Kart Türü",
    typePersonal: "Bireysel Kart",
    typeCommercial: "Ticari / Şirket Kartı",
    typeMiles: "Mil / Seyahat Kartı",
    typeCashback: "Puan / Cashback Kartı",
    typeStudent: "Öğrenci / Genç Kartı",
    typeVirtual: "Sanal Kart",
    
    // Limits
    cardLimit: "Kart Limiti",
    usedAmount: "Kullanılan Tutar (Güncel Borç)",
    availableAmount: "Kullanılabilir Limit",
    minPaymentRatio: "Asgari Ödeme Oranı",
    minPaymentDue: "Tahmini Asgari Tutar",

    // Permissions & Purchase Security
    permissions: "Alışveriş & Güvenlik İzinleri",
    permInternet: "İnternet Alışverişi",
    permAbroad: "Yurt Dışı Alışveriş",
    permContactless: "Temassız Ödeme",
    permCashAdvance: "Nakit Avans",
    permFrozen: "Kart Donduruldu / Kilitli",
    permActive: "Kart Aktif",
    cardStatusActive: "Aktif",
    cardStatusFrozen: "Donduruldu (Bloke)",

    // Virtual Cards (Sanal Kartlar)
    virtualCards: "Sanal Kartlar",
    addVirtualCard: "Sanal Kart Ekle",
    virtualCardName: "Sanal Kart Adı / Amacı",
    virtualCardLimit: "Sanal Kart Limiti",
    virtualCardLast4: "Sanal Kart Son 4 Hane",
    noVirtualCards: "Bağlı sanal kart bulunmuyor",

    // Annual Card Fee & Subscriptions
    annualFee: "Yıllık Kart Üyelik Ücreti (Banka Aidatı)",
    annualFeeMonth: "Kart Ücreti Kesim Ayı",
    annualFeeRefundStatus: "Banka Kart Ücreti İade / İtiraz Durumu",
    feePaid: "Banka Kesti / Ödendi",
    feeRefundRequested: "Bankadan İade İstendi (Bekliyor)",
    feeRefunded: "Banka İade Etti / Bonus Yüklendi",
    feeExempt: "Aidatsız / Yıllık Ücretten Muaf",
    // Loans (Krediler)
    loans: "Krediler",
    addLoan: "Yeni Kredi Ekle",
    editLoan: "Krediyi Düzenle",
    deleteLoan: "Krediyi Sil",
    confirmDeleteLoan: "Bu kredi kaydını silmek istediğinize emin misiniz?",
    loanSaved: "Kredi bilgisi kaydedildi.",
    loanDeleted: "Kredi kaydı silindi.",
    payLoanInstallment: "Taksit Öde",
    loanName: "Kredi Adı / Amacı",
    loanType: "Kredi Türü",
    loanTypePersonal: "İhtiyaç Kredisi",
    loanTypeHousing: "Konut Kredisi",
    loanTypeVehicle: "Taşıt Kredisi",
    loanTypeCommercial: "Ticari / KOBİ Kredisi",
    loanTypeOther: "Diğer Kredi",
    totalLoanAmount: "Toplam Geri Ödeme Tutarı",
    monthlyInstallmentAmount: "Aylık Taksit Tutarı",
    totalInstallmentMonths: "Toplam Vade (Ay)",
    paidInstallmentMonths: "Ödenen Taksit Sayısı",
    loanPaymentDay: "Aylık Ödeme Günü",
    loanInterestRate: "Aylık Faiz Oranı (%)",
    remainingLoanDebt: "Kalan Toplam Kredi Borcu",
    noLoansYet: "Henüz kayıtlı kredi bulunmuyor",

    subscriptions: "Bağlı Abonelikler",
    addSubscription: "Abonelik Ekle",
    subscriptionName: "Abonelik Adı (Örn: Netflix, Spotify)",
    subscriptionAmount: "Aylık Tutar",
    noSubscriptions: "Kayıtlı abonelik yok",

    // Quick Transactions & Installments
    payDebt: "Borç Öde",
    addExpense: "Harcama Ekle",
    txAmount: "İşlem Tutarı",
    installmentsCount: "Taksit Sayısı",
    singlePayment: "Tek Çekim (1 Taksit)",
    installmentRuleNotice: "Taksit Başlangıcı",
    nextCycleNotice: "Ekstre kesim tarihi geçtiği için 1. taksit sonraki ekstrede ödenecektir.",
    currentCycleNotice: "1. taksit bu ayki ekstreye yansıyacaktır.",
    
    // Statement and Payment Dates
    dateSelectionType: "Tarih Belirleme Yöntemi",
    dateExactDay: "Ayın Belirli Günü (Örn: 15'i)",
    dateApproxWeek: "Yaklaşık Hafta (Örn: 2. Hafta)",
    cutoffDay: "Ekstre Kesim Günü",
    cutoffDayPlaceholder: "1 - 31 arası gün",
    approxWeek: "Yaklaşık Ekstre Dönemi",
    week1: "1. Hafta (Ayın 1 - 7'si arası)",
    week2: "2. Hafta (Ayın 8 - 14'ü arası)",
    week3: "3. Hafta (Ayın 15 - 21'i arası)",
    week4: "4. Hafta (Ayın 22 - 28'i arası)",
    weekMonthEnd: "Ay Sonu (Son Günler)",
    
    paymentDueDate: "Son Ödeme Tarihi",
    dueDay: "Son Ödeme Günü",
    dueDayPlaceholder: "1 - 31 arası gün",
    dueAutoRule: "Ekstre kesiminden 10 gün sonra (Standart)",
    dueWeekSelect: "Yaklaşık Ödeme Haftası",
    
    cardTheme: "Kart Tasarım Teması",
    themeMidnight: "Gece Mavisi & Altın",
    themeEmerald: "Zümrüt Yeşili",
    themeRuby: "Yakut Kırmızısı",
    themeAmethyst: "Ametist Moru",
    themeObsidian: "Obsidyen Siyahı",
    themeSilver: "Gümüş Platin",
    themeSunset: "Gün Batımı Turuncusu",
    themeOcean: "Okyanus Turkuazı",
    
    // Bank Form & Details
    bankHasCard: "Bu Bankada Kredi Kartım Var",
    bankHasCardYes: "Evet, Kredi Kartı Mevcut",
    bankHasCardNo: "Hayır, Sadece Vadesiz / Hesap Var",
    bankSharedLimit: "Banka Toplam Ortak Limiti (Opsiyonel)",
    bankSharedLimitHelp: "Bazı bankalar birden fazla kart için ortak limit tanımlar",
    bankEkHesapLimit: "Ek Hesap Limiti (Opsiyonel)",
    bankEkHesapLimitHelp: "Kredili mevduat hesabı / avans hesap limiti",
    bankNotes: "Banka Notları / Şube",
    bankNotesPlaceholder: "Maaş bankası, EFT masrafsız, vb.",
    
    // Timeline & Status
    cutoffUpcoming: "Yaklaşan Ekstre",
    paymentUpcoming: "Yaklaşan Son Ödeme",
    daysLeft: "gün kaldı",
    today: "Bugün!",
    passed: "geçti",
    tomorrow: "Yarın",
    thisWeek: "Bu Hafta",
    nextWeek: "Gelecek Hafta",
    laterThisMonth: "Bu Ay İçinde",
    
    // Utilization
    safeLevel: "Düşük / Güvenli",
    moderateLevel: "Orta Seviye",
    highLevel: "Yüksek Borç Oranı",
    criticalLevel: "Kritik Seviye!",
    
    // Empty States
    noCardsYet: "Henüz kayıtlı kredi kartı yok",
    noCardsSub: "Yukarıdaki 'Yeni Kart Ekle' butonuna tıklayarak ilk kartınızı ekleyin veya 'Örnek Veri Yükle' ile hazır şablonu deneyin.",
    noBanksYet: "Kayıtlı banka bulunamadı",
    noResultsFound: "Aramanızla eşleşen kart bulunamadı.",
    
    // Alerts
    demoLoaded: "Örnek banka ve kart verileri başarıyla yüklendi!",
    importedSuccess: "Yedek başarıyla içeri aktarıldı!",
    importError: "Yedek dosyası okunurken hata oluştu. Lütfen geçerli bir JSON dosyası seçin.",
    clearedSuccess: "Tüm veriler temizlendi.",
    cardSaved: "Kredi kartı kaydedildi.",
    bankSaved: "Banka bilgisi kaydedildi.",
    cardDeleted: "Kredi kartı silindi.",
    bankDeleted: "Banka silindi."
  },
  
  en: {
    // Header & Meta
    appTitle: "CardMon",
    appSubtitle: "All bank limits, credit card statements and installment projections in one place",
    langToggle: "Türkçe",
    currency: "Currency",
    autoSaved: "Auto-Saved",
    saving: "Saving...",
    
    // Actions & Buttons
    addCard: "Add Credit Card",
    addBank: "Add Bank",
    editCard: "Edit Card",
    editBank: "Edit Bank",
    deleteCard: "Delete Card",
    deleteBank: "Delete Bank",
    save: "Save",
    cancel: "Cancel",
    loadDemo: "Load Demo Data",
    saveToFile: "Save to File",
    saveFileAs: "Save As...",
    openFromFile: "Open File...",
    activeFile: "Active File",
    fileSavedSuccess: "Portfolio successfully saved to file",
    fileLoadedSuccess: "Portfolio successfully loaded from file",
    fileSaveError: "Error saving file",
    fileLoadError: "Error loading file: Invalid format",
    unsavedChanges: "Unsaved Changes",
    fileSynced: "File Synced",
    exportJson: "Export Backup (JSON)",
    importJson: "Import Backup",
    exportCsv: "Export CSV",
    exportPdf: "Export PDF Report",
    clearAll: "Clear All Data",
    confirmClear: "Are you sure you want to delete all banks and cards data?",
    confirmDeleteCard: "Are you sure you want to delete this credit card?",
    confirmDeleteBank: "Are you sure you want to delete this bank and all its associated cards?",
    searchPlaceholder: "Search card or bank name...",
    allBanks: "All Banks",
    allTypes: "All Card Types",
    filterBy: "Filter",
    sortBy: "Sort By",
    sortLimitDesc: "Limit (High to Low)",
    sortLimitAsc: "Limit (Low to High)",
    sortDebtDesc: "Debt / Balance (Most to Least)",
    sortCutoff: "Upcoming Statement Date",
    sortDueDate: "Upcoming Due Date",
    sortBankName: "Bank Name (A-Z)",
    
    // Overview Metrics
    totalCombinedLimit: "Total Combined Limit",
    totalUsedBalance: "Total Current Debt",
    totalAvailableLimit: "Total Available Limit",
    overallUtilization: "Overall Credit Utilization",
    totalBanksCount: "Registered Banks",
    activeCardsCount: "Active Credit Cards",
    banksWithCards: "Banks with Cards",
    banksWithoutCards: "Account Only (No Card)",
    
    // Navigation Tabs
    tabDashboard: "Dashboard & Analysis",
    tabBanks: "Bank Accounts",
    tabEkHesap: "Overdrafts (KMH)",
    tabCards: "Credit Cards",
    tabLoans: "Loans & Credits",
    tabSubscriptions: "Subscriptions",
    tabTimeline: "Payment Calendar",
    
    // Profile & Settings
    profileSettings: "Profile & Settings",
    editProfile: "Edit Profile",
    userProfile: "User Profile",
    firstName: "First Name",
    lastName: "Last Name",
    userTitle: "Title / Profession",
    monthlyIncome: "Monthly Net Income (Optional)",
    salaryDay: "Salary / Income Day",
    profileSaved: "Profile and settings saved.",
    welcomeBack: "Welcome back",
    welcomeSubtitle: "Your bank limits, overdraft reserves and credit card payment projections are summarized below.",
    welcomeEmptySubtitle: "Add a bank or card and your limits, debt and payment summaries will appear here.",
    analyticsEmptyTitle: "Analytics appear with data",
    analyticsEmptyDesc: "Add a bank or card and limit distribution, payment intensity and smart insights will show up here.",
    pdfReportHint: "Download financial PDF report",
    pdfEmptyHint: "Add a bank or card first to create a report",
    financialHealth: "Financial Health Score",
    healthExcellent: "Excellent / Low Risk",
    healthGood: "Good / Balanced",
    healthNoData: "No Data",
    healthEmptyHint: "No banks or cards yet. Start by loading demo data or adding a new bank.",
    healthWarning: "Caution / High Utilization",
    healthCritical: "Critical / Over-leveraged",
    totalEkHesapLimit: "Total Overdraft (KMH) Limit",
    totalMinPaymentDue: "Total Min Payment Due This Month",
    nearestDueDate: "Next Due Date",
    nearestDueNone: "None",
    dataManagement: "Data Management & Backup",
    backupRestore: "Backup & Restore",
    quickActions: "Quick Actions",
    
    // Detailed Analytics
    bankDebtAnalysis: "Bank-by-Bank Limit & Debt Analysis",
    ekHesapAnalysis: "Overdraft (KMH / Advance) Distribution",
    networkAndTypeAnalysis: "Card Network & Type Distribution",
    paymentFlowAnalysis: "Monthly Payment & Cashflow Timing",
    smartInsights: "Smart Financial Insights & Risk Advisory",
    executiveTable: "Executive Card Summary",
    noDebt: "No Debt",
    safeBuffer: "Emergency Safety Buffer",
    recommendation: "Financial Advisory",
    cardSummaryTable: "Card Summary Table",
    
    // Card Form & Details
    bankName: "Bank Name",
    selectBank: "Select Bank",
    customBank: "Custom Bank Name",
    cardNickname: "Card Name / Product",
    cardNicknamePlaceholder: "e.g., Bonus Platinum, World Gold, Maximum",
    cardNumberLast4: "Last 4 Digits (Optional)",
    cardNumberLast4Placeholder: "1234",
    cardNetwork: "Card Scheme / Network",
    cardType: "Card Type",
    typePersonal: "Personal Card",
    typeCommercial: "Commercial / Corporate",
    typeMiles: "Miles & Travel",
    typeCashback: "Points & Cashback",
    typeStudent: "Student / Youth",
    typeVirtual: "Virtual Card",
    
    // Limits
    cardLimit: "Card Limit",
    usedAmount: "Used Amount (Current Debt)",
    availableAmount: "Available Limit",
    minPaymentRatio: "Min. Payment Ratio",
    minPaymentDue: "Est. Minimum Due",

    // Permissions & Purchase Security
    permissions: "Security & Purchase Permissions",
    permInternet: "Online Shopping",
    permAbroad: "International Purchases",
    permContactless: "Contactless Payment",
    permCashAdvance: "Cash Advance",
    permFrozen: "Card Frozen / Locked",
    permActive: "Card Active",
    cardStatusActive: "Active",
    cardStatusFrozen: "Frozen (Blocked)",

    // Virtual Cards (Sanal Kartlar)
    virtualCards: "Virtual Cards",
    addVirtualCard: "Add Virtual Card",
    virtualCardName: "Virtual Card Purpose / Name",
    virtualCardLimit: "Virtual Card Limit",
    virtualCardLast4: "Virtual Card Last 4 Digits",
    noVirtualCards: "No virtual cards linked",

    // Annual Card Fee & Subscriptions
    annualFee: "Annual Card Fee",
    annualFeeMonth: "Annual Fee Month",
    annualFeeRefundStatus: "Fee Status / Refund",
    feePaid: "Charged / Paid",
    feeRefundRequested: "Refund Requested",
    feeRefunded: "Refunded (Points/Cash)",
    feeExempt: "Fee Exempt",
    // Loans (Krediler)
    loans: "Loans & Credits",
    addLoan: "Add New Loan",
    editLoan: "Edit Loan",
    deleteLoan: "Delete Loan",
    confirmDeleteLoan: "Are you sure you want to delete this loan record?",
    loanSaved: "Loan details saved successfully.",
    loanDeleted: "Loan record deleted.",
    payLoanInstallment: "Pay Installment",
    loanName: "Loan Title / Purpose",
    loanType: "Loan Type",
    loanTypePersonal: "Personal Loan",
    loanTypeHousing: "Mortgage / Housing",
    loanTypeVehicle: "Auto / Vehicle Loan",
    loanTypeCommercial: "Commercial / Business Loan",
    loanTypeOther: "Other Loan",
    totalLoanAmount: "Total Repayment Amount",
    monthlyInstallmentAmount: "Monthly Installment",
    totalInstallmentMonths: "Total Term (Months)",
    paidInstallmentMonths: "Paid Installments",
    loanPaymentDay: "Monthly Payment Day",
    loanInterestRate: "Monthly Interest Rate (%)",
    remainingLoanDebt: "Total Remaining Loan Debt",
    noLoansYet: "No active loans added yet",

    subscriptions: "Linked Subscriptions",
    addSubscription: "Add Subscription",
    subscriptionName: "Subscription Name (e.g. Netflix)",
    subscriptionAmount: "Monthly Amount",
    noSubscriptions: "No active subscriptions",

    // Quick Transactions & Installments
    payDebt: "Pay Debt",
    addExpense: "Add Expense",
    txAmount: "Transaction Amount",
    installmentsCount: "Installments",
    singlePayment: "Single Charge (1 Installment)",
    installmentRuleNotice: "Installment Start Cycle",
    nextCycleNotice: "Statement cut-off has passed; 1st installment will be due next cycle.",
    currentCycleNotice: "1st installment will be included in the current statement.",
    
    // Statement and Payment Dates
    dateSelectionType: "Date Specification Method",
    dateExactDay: "Exact Day of Month (e.g. 15th)",
    dateApproxWeek: "Approximate Week (e.g. 2nd Week)",
    cutoffDay: "Statement Cut-off Day",
    cutoffDayPlaceholder: "Day between 1 - 31",
    approxWeek: "Approximate Cut-off Period",
    week1: "1st Week (Days 1 - 7)",
    week2: "2nd Week (Days 8 - 14)",
    week3: "3rd Week (Days 15 - 21)",
    week4: "4th Week (Days 22 - 28)",
    weekMonthEnd: "End of Month (Last Days)",
    
    paymentDueDate: "Payment Due Date",
    dueDay: "Due Day of Month",
    dueDayPlaceholder: "Day between 1 - 31",
    dueAutoRule: "10 days after cut-off (Standard)",
    dueWeekSelect: "Approximate Payment Week",
    
    cardTheme: "Card Visual Theme",
    themeMidnight: "Midnight Blue & Gold",
    themeEmerald: "Emerald Green",
    themeRuby: "Ruby Red",
    themeAmethyst: "Amethyst Violet",
    themeObsidian: "Obsidian Black",
    themeSilver: "Platinum Silver",
    themeSunset: "Sunset Orange",
    themeOcean: "Ocean Teal",
    
    // Bank Form & Details
    bankHasCard: "Do you have a Credit Card with this bank?",
    bankHasCardYes: "Yes, Has Credit Card(s)",
    bankHasCardNo: "No, Account Only (No Cards)",
    bankSharedLimit: "Bank Shared Total Limit (Optional)",
    bankSharedLimitHelp: "Some banks assign a shared total pool limit for all their cards",
    bankEkHesapLimit: "Overdraft Limit (Optional)",
    bankEkHesapLimitHelp: "Overdraft or advance account limit",
    bankNotes: "Bank Notes / Branch",
    bankNotesPlaceholder: "Salary bank, fee-free EFT, etc.",
    
    // Timeline & Status
    cutoffUpcoming: "Upcoming Statement Cut",
    paymentUpcoming: "Upcoming Payment Due",
    daysLeft: "days left",
    today: "Today!",
    passed: "passed",
    tomorrow: "Tomorrow",
    thisWeek: "This Week",
    nextWeek: "Next Week",
    laterThisMonth: "Later This Month",
    
    // Utilization
    safeLevel: "Low / Healthy",
    moderateLevel: "Moderate",
    highLevel: "High Debt Level",
    criticalLevel: "Critical Risk!",
    
    // Empty States
    noCardsYet: "No credit cards added yet",
    noCardsSub: "Click 'Add Credit Card' above to add your first card or click 'Load Demo Data' to test immediately.",
    noBanksYet: "No registered banks found",
    noResultsFound: "No cards matched your search/filter.",
    
    // Alerts
    demoLoaded: "Demo banks and credit cards loaded successfully!",
    importedSuccess: "Backup data imported successfully!",
    importError: "Failed to read backup file. Please select a valid JSON file.",
    clearedSuccess: "All data cleared successfully.",
    cardSaved: "Credit card saved.",
    bankSaved: "Bank information saved.",
    cardDeleted: "Credit card deleted.",
    bankDeleted: "Bank deleted."
  }
};

// Current Active Language ('tr' or 'en')
let currentLang = localStorage.getItem('bank_app_lang') || 'tr';
let currentCurrency = localStorage.getItem('bank_app_currency') || 'TRY';

function setLanguage(lang) {
  if (I18N[lang]) {
    currentLang = lang;
    localStorage.setItem('bank_app_lang', lang);
    document.documentElement.lang = lang;
    updatePageTranslations();
  }
}

function t(key) {
  if (I18N[currentLang] && I18N[currentLang][key]) {
    return I18N[currentLang][key];
  }
  if (I18N.tr[key]) {
    return I18N.tr[key];
  }
  return key;
}

function setCurrency(curr) {
  currentCurrency = curr;
  localStorage.setItem('bank_app_currency', curr);
}

function formatMoney(amount, currency = currentCurrency) {
  if (isNaN(amount) || amount === null || amount === undefined) amount = 0;
  const symbols = {
    TRY: '₺',
    USD: '$',
    EUR: '€',
    GBP: '£'
  };
  const symbol = symbols[currency] || '₺';
  
  const locale = currentLang === 'tr' ? 'tr-TR' : 'en-US';
  const formattedNumber = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
  
  return currentLang === 'tr' ? `${formattedNumber} ${symbol}` : `${symbol}${formattedNumber}`;
}

function updatePageTranslations() {
  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) {
      el.textContent = t(key);
    }
  });

  const placeholders = document.querySelectorAll('[data-i18n-placeholder]');
  placeholders.forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key) {
      el.placeholder = t(key);
    }
  });

  const titles = document.querySelectorAll('[data-i18n-title]');
  titles.forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    if (key) {
      el.title = t(key);
    }
  });
}
