// --------------------------------------------------------------------------
// Import / Export & Data Management
// --------------------------------------------------------------------------
// Captured before any persisted profile is loaded, so a full clear can restore
// the shipped defaults without duplicating them here.
const DEFAULT_PROFILE = JSON.parse(JSON.stringify(state.profile));

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

  downloadText(`cardmon_backup_${new Date().toISOString().slice(0, 10)}.json`,
    JSON.stringify(data, null, 2), 'text/json');
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

function csvCell(value) {
  return '"' + String(value == null ? '' : value).replace(/"/g, '""') + '"';
}

function exportCsvReport() {
  let csvContent = '';

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
      csvCell(bank),
      csvCell(c.nickname),
      csvCell(c.last4 || ''),
      csvCell(t(c.type || 'typePersonal')),
      csvCell(c.network),
      limit,
      used,
      avail,
      csvCell(`%${util}`),
      csvCell(cutoff),
      csvCell(due)
    ].join(',');

    csvContent += row + '\n';
  });

  downloadText(`cardmon_financial_report_${new Date().toISOString().slice(0, 10)}.csv`, csvContent, 'text/csv');
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
    const nextMonthName = new Date(now.getFullYear(), now.getMonth() + 1, 1).toLocaleString('tr-TR', { month: 'long' });
    const fullDateStr = now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

    const p = state.profile || {};
    const userName = `${p.firstName || 'CardMon'} ${p.lastName || 'User'}`.trim();
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
      const debt = Number(c.usedBalance) || 0;
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
    const annualFeeTotal = annualFeeCards.reduce((s, c) => s + (Number(c.annualFeeAmount) || 0), 0);

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
                contentRows.push(`<div style="color:#16a34a; font-weight:700; font-size:7.8pt;">Maaş & Gelir Girişi (Ayın ${salaryDay}${turkishDaySuffix(salaryDay)})</div>`);
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
                  <td style="font-weight:700; color:${data.total > 0 ? '#0284c7' : '#64748b'};">${formatMoney(data.total)}</td>
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
              <td style="color:#0284c7;">${formatMoney(totalWeeklyOutflow)}</td>
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
                  <td>${escapeHtml(c.network || 'Mastercard')} • ${typeStr}</td>
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
              <td>${formatMoney(totalCardLimit)}</td>
              <td style="color:#dc2626;">${formatMoney(totalCardDebt)}</td>
              <td style="color:#16a34a;">${formatMoney(totalAvailable)}</td>
              <td style="color:#2563eb;">%${cardUtilRatio.toFixed(1)}</td>
              <td>—</td>
              <td style="color:#d97706;">${formatMoney(totalCardMinDue)}</td>
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
              <td>${formatMoney(allInstallments.reduce((s, i) => s + (Number(i.totalAmount) || 0), 0))}</td>
              <td>—</td>
              <td style="color:#0284c7;">${formatMoney(allInstallments.reduce((s, i) => s + (Number(i.monthlyAmount) || 0), 0))}/ay</td>
              <td style="color:#dc2626;">${formatMoney(allInstallments.reduce((s, i) => s + (Number(i.remainingTotal) || 0), 0))}</td>
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
                    ${l.startCycle === 'next' ? '<span class="pdf-badge pdf-badge-warning" style="margin-left:3px; font-size:6.8pt;">İlk Taksit: Gelecek Ay (${nextMonthName})</span>' : ''}
                  </td>
                  <td>${typeStr} ${l.interestRate ? `(%${l.interestRate})` : ''}</td>
                  <td>${formatMoney(Number(l.totalAmount) || 0)}</td>
                  <td>${paidInst} / ${totalInst} Ay (${remInst} ay kaldı)</td>
                  <td style="font-weight:700; color:#0284c7;">${formatMoney(monthlyAmt)}/ay</td>
                  <td style="font-weight:700; color:#ea580c;">${formatMoney(remDebt)}</td>
                  <td>${l.startCycle === 'next' ? `${nextMonthName} (Her ayın ${l.paymentDay || 15}'i)` : `Her ayın ${l.paymentDay || 15}'i`}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
          <tfoot>
            <tr style="background:#f8fafc; font-weight:800; border-top:1.5px solid #0f172a;">
              <td colspan="3">Toplam Krediler (${state.loans.length} Adet)</td>
              <td>${formatMoney(state.loans.reduce((s, l) => s + (Number(l.totalAmount) || 0), 0))}</td>
              <td>—</td>
              <td style="color:#0284c7;">${formatMoney(state.loans.reduce((s, l) => s + (Number(l.monthlyPayment) || 0), 0))}/ay</td>
              <td style="color:#ea580c;">${formatMoney(state.loans.reduce((s, l) => s + (Math.max(0, (Number(l.totalInstallments) || 0) - (Number(l.paidInstallments) || 0)) * (Number(l.monthlyPayment) || 0)), 0))}</td>
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
                  <td style="font-weight:600;">${s.isEstimated ? '~' : ''}${formatMoney(origAmt, curr)} ${curr !== 'TRY' ? `(${curr})` : ''}</td>
                  <td style="font-weight:700; color:#7c3aed;">${s.isEstimated ? '~' : ''}${formatMoney(tryAmtMonthly)}/ay</td>
                  <td style="font-weight:700; color:#0f172a;">${s.isEstimated ? '~' : ''}${formatMoney(tryAmtAnnual)}/yıl</td>
                </tr>
              `;
            }).join('')}
          </tbody>
          <tfoot>
            <tr style="background:#f8fafc; font-weight:800; border-top:1.5px solid #0f172a;">
              <td colspan="5">Toplam Düzenli Giderler (${allSubs.length} Kalem)</td>
              <td style="color:#7c3aed;">${formatMoney(totalSubsMonthlyTry)}/ay</td>
              <td style="color:#0f172a;">${formatMoney(totalSubsMonthlyTry * 12)}/yıl</td>
            </tr>
          </tfoot>
        </table>
      </div>
      ` : ''}

      <!-- 8. Ev Sahibi Olma & Kira Kâr / Tasarruf Analizi -->
      ${(() => {
        const rentSub = allSubs.find(s => s.category === 'Rent' || s.name.toLowerCase().includes('kira'));
        if (!rentSub) {
          return `
            <div class="pdf-section">
              <div class="pdf-section-title">8. Ev Sahibi Olma & Kira Kâr / Tasarruf Analizi</div>
              <div style="font-size:8.5pt; color:#475569; margin-bottom:8px; line-height:1.4;">
                Kira projeksiyonu için Kira kategorisinde bir abonelik tanımlayın. Mevcut kiranız olmadan varsayılan bir tutar varsayılamaz.
              </div>
            </div>
          `;
        }
        const monthlyRent = convertToTry(rentSub.amount, rentSub.currency);
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
              Mevcut aylık <strong>${formatMoney(monthlyRent)}</strong> kiranız baz alınarak; ev sahibi olmanız durumunda cebinizde kalacak birikim, yıllık <strong>%${annualInflation}</strong> ortalama kira artış projeksiyonu ve <strong>%${investmentReturn}</strong> yıllık bileşik yatırım getirisiyle aşağıdaki gibi simüle edilmiştir.
            </div>

            <!-- Top Highlights Grid -->
            <div class="pdf-kpi-grid" style="margin-bottom:10px;">
              <div class="pdf-kpi-item" style="border-left:3px solid #10b981;">
                <div class="pdf-kpi-label">1 Yıllık Tasarruf</div>
                <div class="pdf-kpi-val" style="color:#10b981;">${formatMoney(y1.yearTotal)}</div>
                <div style="font-size:7.5pt; color:#64748b; margin-top:2px;">Aylık ${formatMoney(monthlyRent)}</div>
              </div>

              <div class="pdf-kpi-item" style="border-left:3px solid #f59e0b;">
                <div class="pdf-kpi-label">5 Yılda Ödenen Kira</div>
                <div class="pdf-kpi-val" style="color:#d97706;">${formatMoney(y5.cumulativeRent)}</div>
                <div style="font-size:7.5pt; color:#64748b; margin-top:2px;">%${annualInflation} yıllık artışla</div>
              </div>

              <div class="pdf-kpi-item" style="border-left:3px solid #0284c7;">
                <div class="pdf-kpi-label">5 Yıllık Yatırım Değeri</div>
                <div class="pdf-kpi-val" style="color:#0284c7;">${formatMoney(y5.cumulativeInvestment)}</div>
                <div style="font-size:7.5pt; color:#64748b; margin-top:2px;">%${investmentReturn} bileşik getiriyle</div>
              </div>

              <div class="pdf-kpi-item" style="border-left:3px solid #8b5cf6;">
                <div class="pdf-kpi-label">10 Yılda Ödenen Kira</div>
                <div class="pdf-kpi-val" style="color:#7c3aed;">${formatMoney(y10.cumulativeRent)}</div>
                <div style="font-size:7.5pt; color:#64748b; margin-top:2px;">10 yıllık kümülatif yük</div>
              </div>
            </div>

            <!-- Strategic Comparison Box -->
            <div class="pdf-sim-box" style="background:#f8fafc; border-color:#cbd5e1; border-left-color:#3b82f6; margin-bottom:10px;">
              <strong style="color:#1e293b; font-size:9pt; display:block; margin-bottom:4px;">Finansal Karşılaştırma: Ev Sahibi Olmak vs Kirada Kalmak</strong>
              <div style="font-size:8pt; line-height:1.45; color:#334155; display:flex; flex-direction:column; gap:3px;">
                <div><strong>1. Kendi Evinizin Olması Durumunda:</strong> 5 yılda toplam <strong>${formatMoney(y5.cumulativeRent)}</strong> tutarındaki kira giderinden tamamen muaf kalırsınız. Bu tutar cebinizde birikim olarak kalır.</div>
                <div><strong>2. Gayrimenkul Değer Artışı:</strong> Ev fiyatları enflasyona karşı değer kazanırken, kira ödemek yerine ev sahibi olduğunuzda çift yönlü servet artışı sağlarsınız.</div>
                <div><strong>3. Kredi Alternatifi:</strong> Aylık ${formatMoney(monthlyRent)} kira ödemesi, 120 ay vadeli bir konut kredisi taksitine dönüştürüldüğünde kira öder gibi kendi mülkünüzün sahibi olursunuz.</div>
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
                    <td>${formatMoney(b.monthlyRent)}</td>
                    <td>${formatMoney(b.yearTotal)}</td>
                    <td style="color:#d97706; font-weight:700;">${formatMoney(b.cumulativeRent)}</td>
                    <td style="color:#16a34a; font-weight:700;">${formatMoney(b.cumulativeInvestment)}</td>
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
                  <td style="font-weight:700; color:#ea580c;">${formatMoney(fee)}</td>
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
              <td style="color:#dc2626;">${formatMoney(annualFeeCards.reduce((s, c) => s + (Number(c.annualFeeAmount) || 0), 0))}</td>
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
                <div class="pdf-kpi-val" style="color:#7c3aed;">${formatMoney(digitalSubsAnnualTry)}</div>
                <div style="font-size:7.5pt; color:#64748b; margin-top:2px;">${digitalSubs.length} adet dijital servis (kira/fatura hariç)</div>
              </div>
              <div class="pdf-kpi-item">
                <div class="pdf-kpi-label">Yıllık Kart Aidatı Maliyeti</div>
                <div class="pdf-kpi-val" style="color:${annualFeeTotal > 0 ? '#dc2626' : '#16a34a'};">${annualFeeTotal > 0 ? formatMoney(annualFeeTotal) : '₺0 (Muaf)'}</div>
                <div style="font-size:7.5pt; color:#64748b; margin-top:2px;">${annualFeeTotal > 0 ? `${annualFeeCards.length} kartta yıllık aidat takibi` : 'Tüm kartlarınız aidatsız statüdedir'}</div>
              </div>
              <div class="pdf-kpi-item">
                <div class="pdf-kpi-label">Tahmini Yıllık Tasarruf Potansiyeli</div>
                <div class="pdf-kpi-val" style="color:#16a34a;">${formatMoney(digitalSavingsAnnual)}</div>
                <div style="font-size:7.5pt; color:#64748b; margin-top:2px;">İsteğe bağlı dijital servis optimizasyonu</div>
              </div>
              <div class="pdf-kpi-item">
                <div class="pdf-kpi-label">Aylık Serbest Nakit Katkısı</div>
                <div class="pdf-kpi-val" style="color:#10b981;">${formatMoney(digitalSavingsAnnual / 12)}/ay</div>
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
        const topRankIndex = smartRankings.indexOf(bestSmartCard);
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
                Kullanılabilir Serbest Limit: <strong>${formatMoney(bestSmartCard.availableLimit)}</strong>.
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
                  const isTop = idx === topRankIndex;

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
                      <td style="color:#16a34a; font-weight:700;">${formatMoney(r.availableLimit)}</td>
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
            Kredi kartı borcunun sadece asgari tutarını (<strong>${formatMoney(totalCardMinDue)}</strong>) ödediğinizde, geriye kalan <strong>${formatMoney(Math.max(0, totalCardDebt - totalCardMinDue))}</strong> tutarındaki borca her ay TCMB akdi faizi ve üzerine %30 vergi (KKDF + BSMV) eklenir. Borcunuza faiz işletildikçe anapara erimez ve borç sarmalına dönüşür.
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
              Katılım bankacılığı prensibinde borç devredilemez; asgari ödeme tutarı borcun %100'üdür. Gecikme cezası ve sicil bozulmaması için maaş gününde ilk kapatılması gereken kalemdir. Ayrıca kayıtlı ${allSubs.length} adet abonelikten (aylık ${formatMoney(totalSubsMonthlyTry)}) kullanılmayanlar iptal edilmelidir.
            </div>
          </div>
        </div>

        <div class="pdf-action-item">
          <div class="pdf-action-num">3</div>
          <div>
            <strong>Aşama 3 (Orta Vade - 3-6 Ay): Taksitli Alışverişlerin Tasfiyesi & Findeks Skorunu 1600+ Seviyesine Çıkarma</strong>
            <div style="color:#475569; font-size:8.5pt; margin-top:2px;">
              Mevcut ${allInstallments.length} adet taksitli planın (toplam ${formatMoney(allInstallments.reduce((s, i) => s + i.remainingTotal, 0))}) vadeleri tamamlandıkça yeni taksitli harcama yapmayarak serbest nakit akışınızı artırın. Toplam limit doluluğu %30 altına indiğinde kredi notunuz en üst banda çıkacaktır.
            </div>
          </div>
        </div>

        <div class="pdf-action-item">
          <div class="pdf-action-num">4</div>
          <div>
            <strong>Aşama 4 (Uzun Vade - 12 Ay): Pozitif Serbest Nakit Akışı & Acil Durum Fonu İnşası</strong>
            <div style="color:#475569; font-size:8.5pt; margin-top:2px;">
              Aylık zorunlu gider yükünüzü net gelirinizin %40'ının altında tutarak, KMH rezervlerine bağımlı kalmadan en az 3 aylık zorunlu gider tutarı kadar (${formatMoney(totalMandatoryOutflow * 3)}) serbest likit acil durum fonu oluşturun.
            </div>
          </div>
        </div>
      </div>

      <div class="pdf-footer-note">
        <span>CardMon Finansal Analiz & Denetim Raporu</span>
        <span>${fullDateStr} • Gizli & Kişiye Özel Finansal Denetim ve Strateji Raporu</span>
      </div>
    `;

    showToast(`${currentMonthName} Detaylı Finansal Denetim Raporu hazırlanıyor...`);
    setTimeout(() => {
      triggerPrint();
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
    state.cashSubscriptions = [];
    state.profile = JSON.parse(JSON.stringify(DEFAULT_PROFILE));
    saveToStorage();
    renderAll();
    showToast(t('clearedSuccess'));
  }
}

