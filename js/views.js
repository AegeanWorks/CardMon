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

// Sidebar count badge: hide zero counts so empty navigation stays clean.
function setTabBadge(id, count) {
  const badge = document.getElementById(id);
  if (!badge) return;
  badge.textContent = count;
  badge.hidden = !count;
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
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="3"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg> ₺ Borç Öde
            </button>
            <button class="btn-quick-tx btn-add-expense" onclick="openQuickTxModal('${c.id}', 'expense')" title="Harcama / Taksit Ekle">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8h12l1 12H5L6 8z"></path><path d="M9 8V6a3 3 0 0 1 6 0v2"></path></svg> ₺ Harcama / Taksit
            </button>
          </div>

          <!-- Permissions & Purchase Security Controls -->
          <div class="card-permissions-bar">
            ${isFrozen ? `
              <div class="perm-pill frozen-badge" onclick="toggleCardPermission('${c.id}', 'isFrozen')" title="Kilidi Kaldırmak İçin Tıklayın">
                Kart Kilitli / Donduruldu (Tıkla ve Aç)
              </div>
            ` : `
              <div class="perm-pill ${perms.internet ? 'active' : 'blocked'}" onclick="toggleCardPermission('${c.id}', 'internet')" title="İnternet Alışverişini Aç/Kapat">
                <span class="perm-status-dot"></span> İnternet: ${perms.internet ? 'Açık' : 'Bloke'}
              </div>
              <div class="perm-pill ${perms.abroad ? 'active' : 'blocked'}" onclick="toggleCardPermission('${c.id}', 'abroad')" title="Yurtdışı Alışverişini Aç/Kapat">
                <span class="perm-status-dot"></span> Yurtdışı: ${perms.abroad ? 'Açık' : 'Bloke'}
              </div>
              <div class="perm-pill ${perms.contactless ? 'active' : 'blocked'}" onclick="toggleCardPermission('${c.id}', 'contactless')" title="Temassız Ödemeyi Aç/Kapat">
                <span class="perm-status-dot"></span> Temassız
              </div>
              <div class="perm-pill ${perms.cashAdvance ? 'active' : 'blocked'}" onclick="toggleCardPermission('${c.id}', 'cashAdvance')" title="Nakit Avansı Aç/Kapat">
                <span class="perm-status-dot"></span> Avans
              </div>
              <div class="perm-pill active" onclick="toggleCardPermission('${c.id}', 'isFrozen')" title="Kartı Geçici Dondur" style="color:#94a3b8; background:rgba(255,255,255,0.05); border-color:rgba(255,255,255,0.1);">
                Dondur
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
                ${cardSubsTotalTry > 0 ? `<span class="sub-total-badge">${formatMoney(cardSubsTotalTry)}/ay</span>` : ''}
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
    <div class="view-summary-banner cards-summary-banner">
      <div class="banner-title-group">
        <span class="banner-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="3"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg></span>
        <span class="banner-heading">Kredi Kartları Portföy Toplamı (${state.cards.length} Kart)</span>
      </div>
      <div class="banner-metrics-group">
        <span>Toplam Limit: <strong style="color:#38bdf8;">${formatMoney(totalCardsLimit)}</strong></span>
        <span>Toplam Borç: <strong style="color:#fb7185;">${formatMoney(totalCardsDebt)}</strong></span>
        <span>Kullanılabilir: <strong style="color:#34d399;">${formatMoney(totalCardsAvail)}</strong></span>
        <span>Asgari Yükü: <strong style="color:#fbbf24;">${formatMoney(totalCardsMinDue)}</strong></span>
      </div>
    </div>
    ${cardsHtml}
  `;
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
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg> ${escapeHtml(bank.notes)}
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
            <span class="bank-stat-value" style="color:${totalBankDebt > 0 ? '#fb7185' : 'var(--text-secondary)'};">
              ${formatMoney(totalBankDebt)}
            </span>
          </div>
        </div>

        ${totalBankLimit > 0 ? `
          <div style="margin-top:-0.3rem;">
            <div style="display:flex; justify-content:space-between; font-size:0.72rem; color:var(--text-muted); margin-bottom:0.25rem;">
              <span>Doluluk: <strong style="color:${getUtilizationColor((totalBankDebt / totalBankLimit) * 100)};">%${((totalBankDebt / totalBankLimit) * 100).toFixed(1)}</strong></span>
              <span>Kullanılabilir: <strong style="color:#34d399;">${formatMoney(Math.max(0, totalBankLimit - totalBankDebt))}</strong></span>
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
              <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="vertical-align:middle;"><rect x="2" y="5" width="20" height="14" rx="3"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg> <strong>${escapeHtml(c.nickname)}</strong> (${c.network})</span>
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
    <div class="view-summary-banner banks-summary-banner">
      <div class="banner-title-group">
        <span class="banner-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"></path><path d="M5 21V10l7-5 7 5v11"></path><path d="M9 21v-6h6v6"></path></svg></span>
        <span class="banner-heading">Banka Portföyü Toplamı (${state.banks.length} Banka)</span>
      </div>
      <div class="banner-metrics-group">
        <span>Tanımlı Kart: <strong>${totalBanksCardsCount} Adet</strong></span>
        ${totalBanksSharedLimit > 0 ? `<span>Ortak Limit: <strong style="color:#38bdf8;">${formatMoney(totalBanksSharedLimit)}</strong></span>` : ''}
        <span>Toplam Ek Hesap (KMH): <strong style="color:#22d3ee;">${formatMoney(totalBanksEkHesap)}</strong></span>
      </div>
    </div>
    ${banksHtml}
  `;

  setTabBadge('banksTabBadge', state.banks.length);
}

// 5.1. Dedicated Ek Hesaplar (KMH / Overdrafts) View
function renderEkHesapView() {
  const container = document.getElementById('ekHesapContainer');
  if (!container) return;

  const totalEkHesap = state.banks.reduce((sum, b) => sum + (Number(b.ekHesapLimit) || 0), 0);
  const banksWithEkHesap = state.banks.filter(b => Number(b.ekHesapLimit) > 0);

  setTabBadge('ekHesapTabBadge', banksWithEkHesap.length);

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
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg> ${escapeHtml(bank.notes)}
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

  setTabBadge('loansTabBadge', activeLoans.length);

  const today = new Date().getDate();

  container.innerHTML = `
    <!-- Loans Hero Summary Banner -->
    <div class="loans-hero-card">
      <div>
        <div class="loans-hero-title">
          <span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"></path><path d="M5 21V10l7-5 7 5v11"></path><path d="M9 21v-6h6v6"></path></svg></span>
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
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><rect x="3" y="5" width="18" height="16" rx="2"></rect><line x1="16" y1="3" x2="16" y2="7"></line><line x1="8" y1="3" x2="8" y2="7"></line><line x1="3" y1="11" x2="21" y2="11"></line></svg> Her ayın <strong>${payDay}. günü</strong>
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
            ${loan.notes ? `<div style="font-size:0.72rem; color:var(--text-muted); border-top:1px dashed rgba(255,255,255,0.06); padding-top:0.35rem;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg> ${escapeHtml(loan.notes)}</div>` : ''}
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
  setTabBadge('subscriptionsTabBadge', allSubs.length);

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
          <span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path><path d="M3 22v-6h6"></path><path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path></svg></span>
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
              <span class="rent-sim-pill"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><path d="M3 11l9-8 9 8"></path><path d="M5 10v10h14V10"></path><path d="M9 20v-6h6v6"></path></svg> Konut & Kira Kâr Analizi</span>
              <strong style="font-size:0.95rem; color:#fff;">Evin Olsaydı Kiradan Ne Kadar Kâr Edecektin?</strong>
            </div>
            <button type="button" class="btn btn-emerald btn-sm" onclick="openRentSimulatorModal()">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg> Detaylı Simülatör & Hesaplama
            </button>
          </div>

          <p style="font-size:0.8rem; color:var(--text-muted); margin:0 0 0.5rem 0;">
            ${rentSub ? `Kayıtlı <strong>${formatMoney(detectedMonthlyRent)}/ay</strong> kiranız baz alınarak hesaplanmıştır.` : `Aylık tahmini <strong>${formatMoney(detectedMonthlyRent)}/ay</strong> kira baz alınmıştır.`}
            Kira ödemek yerine ev sahibi olunduğunda cebinizde kalacak net tutarlar:
          </p>

          <div class="rent-sim-grid">
            <div class="rent-sim-stat">
              <span class="rent-sim-stat-label">1 Yılda Cebinde Kalacak</span>
              <span class="rent-sim-stat-val" style="color:#34d399;">${formatMoney(detectedMonthlyRent * 12)}</span>
              <span style="font-size:0.7rem; color:var(--text-muted);">Yıllık net kira tasarrufu</span>
            </div>
            <div class="rent-sim-stat">
              <span class="rent-sim-stat-label">5 Yılda Kümülatif Tasarruf</span>
              <span class="rent-sim-stat-val" style="color:#fbbf24;">${formatMoney(fiveYearRentTotal)}</span>
              <span style="font-size:0.7rem; color:var(--text-muted);">%35 yıllık kira artışı dahil</span>
            </div>
            <div class="rent-sim-stat">
              <span class="rent-sim-stat-label">5 Yıllık Yatırım Değeri</span>
              <span class="rent-sim-stat-val" style="color:#38bdf8;">${formatMoney(fiveYearInvestmentTotal)}</span>
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
        const icon = subIconSvg(getSubIcon(sub.name, sub.category));
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

// Subscription card icons: map the semantic emoji to a line-art SVG for display.
function subIconSvg(emoji) {
  const wrap = (paths) => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
  switch (emoji) {
    case '🏠': return wrap('<path d="M3 11l9-8 9 8"></path><path d="M5 10v10h14V10"></path>');
    case '🏢': return wrap('<rect x="4" y="3" width="16" height="18" rx="2"></rect><line x1="9" y1="8" x2="9" y2="8"></line><line x1="15" y1="8" x2="15" y2="8"></line><line x1="9" y1="13" x2="9" y2="13"></line><line x1="15" y1="13" x2="15" y2="13"></line>');
    case '🎬': case '🍿': return wrap('<rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="M7 5l2 3M17 5l-2 3M3 10h18"></path>');
    case '🎵': return wrap('<path d="M9 18V5l10-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="16" cy="16" r="3"></circle>');
    case '▶️': return wrap('<circle cx="12" cy="12" r="9"></circle><path d="M10 8l6 4-6 4z"></path>');
    case '🤖': case '🌟': case '🎓': return wrap('<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"></path>');
    case '☁️': return wrap('<path d="M6 18a4 4 0 0 1 0-8 6 6 0 0 1 11-2 4 4 0 0 1 1 8z"></path>');
    case '📦': case '🗄️': return wrap('<rect x="3" y="7" width="18" height="13" rx="2"></rect><path d="M3 12h18M12 7v13"></path>');
    case '🎨': return wrap('<circle cx="12" cy="12" r="9"></circle><circle cx="8" cy="9" r="1"></circle><circle cx="15" cy="8" r="1"></circle><circle cx="16" cy="14" r="1"></circle>');
    case '⚡': case '🏋️': return wrap('<path d="M13 2L4 14h7l-1 8 9-12h-7z"></path>');
    case '💻': return wrap('<rect x="3" y="5" width="18" height="12" rx="2"></rect><path d="M2 20h20"></path>');
    case '📄': return wrap('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6"></path>');
    default: return wrap('<circle cx="12" cy="12" r="3"></circle>');
  }
}

// Timeline event icons: one line-art glyph per event kind, no emoji mix.
const TIMELINE_EVENT_SVG = {
  paid: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M8 12l3 3 5-6"></path></svg>',
  cutoff: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg>',
  due: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="3"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>',
  loan: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"></path><path d="M5 21V10l7-5 7 5v11"></path></svg>',
  sub: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8h12l1 12H5L6 8z"></path><path d="M9 8V6a3 3 0 0 1 6 0v2"></path></svg>',
  rent: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"></path><path d="M5 10v10h14V10"></path></svg>'
};

function timelineEventSvg(e) {
  if (e.isPaid) return TIMELINE_EVENT_SVG.paid;
  if (e.type === 'card_cutoff') return TIMELINE_EVENT_SVG.cutoff;
  if (e.type === 'loan') return TIMELINE_EVENT_SVG.loan;
  if (e.type === 'subscription') {
    return (e.category === 'Rent' || /kira/i.test(e.title || ''))
      ? TIMELINE_EVENT_SVG.rent : TIMELINE_EVENT_SVG.sub;
  }
  return TIMELINE_EVENT_SVG.due;
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
          ? `🎉 ${formatMoney(paidAmount)} tutarındaki bu ayki dönem borcu ödendi ve kapatıldı.`
          : `Asgari: ${formatMoney(minDue)} ${isKat ? '(%100 Katılım)' : ''}`
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
      sourceName: monthlyIncome > 0 ? `+${formatMoney(monthlyIncome)}` : 'Nakit Gelir',
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
        <h2 class="tab-section-title"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><rect x="3" y="5" width="18" height="16" rx="2"></rect><line x1="16" y1="3" x2="16" y2="7"></line><line x1="8" y1="3" x2="8" y2="7"></line><line x1="3" y1="11" x2="21" y2="11"></line></svg> ${currentMonthName} Ayı Ekstre & Ödeme Takvimi</h2>
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
    <div class="view-summary-banner timeline-summary-banner">
      <div class="banner-title-group">
        <span class="banner-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"></rect><line x1="16" y1="3" x2="16" y2="7"></line><line x1="8" y1="3" x2="8" y2="7"></line><line x1="3" y1="11" x2="21" y2="11"></line></svg></span>
        <span class="banner-heading">Bu Ayki Toplam Nakit Çıkışı (${paymentEvents.length} Ödeme)</span>
      </div>
      <div class="banner-metrics-group">
        <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;"><rect x="2" y="5" width="20" height="14" rx="3"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg> ${paymentEvents.filter(e => e.type === 'card_due').length} Kart</span>
        <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><path d="M3 21h18"></path><path d="M5 21V10l7-5 7 5v11"></path><path d="M9 21v-6h6v6"></path></svg> ${paymentEvents.filter(e => e.type === 'loan').length} Kredi</span>
        <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><path d="M3 11l9-8 9 8"></path><path d="M5 10v10h14V10"></path></svg> ${paymentEvents.filter(e => e.type === 'subscription').length} Kira & Gider</span>
        <span>Toplam: <strong style="color:#c084fc;">${formatMoney(totalPlannedOutflow)}</strong></span>
        ${totalPaidOutflow > 0 ? `<span style="background:rgba(16,185,129,0.18); color:#34d399; padding:0.15rem 0.5rem; border-radius:4px; font-weight:700;">✓ Ödenen: ${formatMoney(totalPaidOutflow)}</span>` : ''}
        ${totalRemainingOutflow > 0 && totalPaidOutflow > 0 ? `<span style="color:#fb7185; font-weight:700;">Kalan: ${formatMoney(totalRemainingOutflow)}</span>` : ''}
      </div>
    </div>

    <!-- Timeline Chronological Flow -->
    ${timelineEvents.length === 0 ? `
      <div class="empty-state">
        <h3>Henüz Takvime Eklenmiş Ödeme Yok</h3>
        <p>Kredi kartı, kredi veya düzenli kira/fatura gideri eklediğinizde ödeme günleriniz burada listelenir.</p>
      </div>
    ` : `
      <div class="timeline-container" style="margin-top:0.5rem;">
        ${timelineEvents.map(e => {
          const isToday = e.daysLeft === 0;
          const isUrgent = e.daysLeft <= 3 && e.amount > 0 && !e.isPaid;
          const cardObj = e.cardId ? state.cards.find(c => c.id === e.cardId) : null;
          const hasInst = cardObj && cardObj.installments && cardObj.installments.length > 0;

          return `
            <div class="timeline-event-card ${e.isPaid ? 'is-paid' : ''} ${isUrgent ? 'is-urgent' : ''} ${isToday ? 'is-today' : ''}" style="border-left-color: ${e.color};">
              <div class="timeline-event-left">
                <div class="timeline-event-icon-box">
                  ${timelineEventSvg(e)}
                </div>
                <div class="timeline-event-info">
                  <div class="timeline-event-title-row">
                    <strong class="timeline-event-title">${escapeHtml(e.title)}</strong>
                    ${e.isPaid ? '<span style="font-size:0.65rem; background:rgba(16,185,129,0.25); color:#34d399; border:1px solid rgba(16,185,129,0.4); border-radius:4px; padding:1px 6px; font-weight:800;">✓ Ödendi</span>' : ''}
                    ${e.isEstimated ? '<span style="font-size:0.65rem; background:#fef3c7; color:#92400e; border:1px solid #fde68a; border-radius:4px; padding:1px 5px; font-weight:700;">📊 Tahmini</span>' : ''}
                    <span class="timeline-event-tag">${escapeHtml(e.sourceName)}</span>
                  </div>
                  <div class="timeline-event-note">
                    ${escapeHtml(e.note)}
                  </div>
                </div>
              </div>

              <div class="timeline-event-right">
                <div class="timeline-event-amount-block">
                  ${e.amount > 0 ? `
                    <div class="timeline-event-amount" style="color:${e.isPaid ? '#34d399' : e.type === 'card_due' ? '#f43f5e' : e.type === 'loan' ? '#38bdf8' : '#c084fc'};">
                      ${e.isEstimated ? '~' : ''}${formatMoney(e.amount)}
                    </div>
                  ` : `
                    <div style="font-size:0.8rem; font-weight:700; color:#38bdf8;">
                      Hesap Kesimi
                    </div>
                  `}
                  <div class="timeline-event-due-text" style="color:${e.isPaid ? '#34d399' : isToday ? '#34d399' : isUrgent ? '#fb7185' : 'var(--text-muted)'};">
                    📅 Ayın ${e.day}. Günü • ${e.isPaid ? '✅ Ödeme Tamamlandı' : isToday ? '🔥 BUGÜN!' : `${e.daysLeft} gün kaldı`}
                  </div>
                </div>

                <div class="timeline-event-actions" style="display:flex; align-items:center; gap:0.4rem;">
                  ${e.type === 'card_due' && e.cardId ? `
                    <button class="btn ${e.isPaid ? 'btn-secondary' : 'btn-emerald'} btn-sm" onclick="payCardFullDebt('${e.cardId}')" title="${e.isPaid ? 'Ödendi durumunu geri al ve borcu tekrar aç' : 'Dönem Borcunu Ödendi Olarak Kapat'}" style="padding:0.4rem 0.75rem; font-size:0.78rem; font-weight:700; border-radius:6px; display:inline-flex; align-items:center; gap:0.3rem;">
                      ${e.isPaid ? '↩️ Ödendi (Kapatıldı)' : '✅ Borcu Kapat'}
                    </button>
                    ${(!e.isPaid && hasInst) ? `
                      <button class="btn btn-secondary btn-sm" onclick="payCardMonthlyInstallments('${e.cardId}')" title="Bu Ayki Taksitleri Öde ve Borçtan Düş" style="padding:0.4rem 0.75rem; font-size:0.78rem; font-weight:700; border-radius:6px; display:inline-flex; align-items:center; gap:0.3rem;">
                        💳 Taksiti Düş
                      </button>
                    ` : ''}
                  ` : e.type === 'loan' && e.loanId ? `
                    <button class="btn btn-primary btn-sm" onclick="paySingleLoanInstallment('${e.loanId}')" title="Bu Ayki Kredi Taksitini Öde" style="padding:0.4rem 0.75rem; font-size:0.78rem; font-weight:700; border-radius:6px; display:inline-flex; align-items:center; gap:0.3rem;">
                      ✓ Taksit Öde
                    </button>
                  ` : ''}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `}
  `;
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
        <div class="cashflow-widget-header">
          <div class="cashflow-widget-title">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            <span>Aylık Nakit Çıkışı & Zorunlu Ödemeler Özeti</span>
          </div>
          ${monthlyIncome > 0 ? `
            <span class="cashflow-burden-pill" style="color:${burdenColor}; border-color:${burdenColor}40;">
              <span class="burden-dot" style="background-color:${burdenColor};"></span>
              ${burdenStatusText} (Gelirin %${incomeBurdenRatio.toFixed(1)}'i)
            </span>
          ` : ''}
        </div>

        <div class="cashflow-grid">
          <div class="cashflow-metric-card">
            <div class="cashflow-metric-header">
              <span class="cashflow-metric-dot" style="background:#f59e0b;"></span>
              <span class="cashflow-metric-label">Kart Asgari Ödemeleri</span>
            </div>
            <strong class="cashflow-metric-value" style="color:var(--accent-amber);">${formatMoney(totalCardMinDue)}</strong>
          </div>
          <div class="cashflow-metric-card">
            <div class="cashflow-metric-header">
              <span class="cashflow-metric-dot" style="background:var(--accent-cyan);"></span>
              <span class="cashflow-metric-label">Kredi Aylık Taksitleri</span>
            </div>
            <strong class="cashflow-metric-value" style="color:var(--accent-cyan);">${formatMoney(totalMonthlyLoanPayment)}</strong>
          </div>
          <div class="cashflow-metric-card">
            <div class="cashflow-metric-header">
              <span class="cashflow-metric-dot" style="background:var(--accent-purple);"></span>
              <span class="cashflow-metric-label">Abonelikler & Faturalar</span>
            </div>
            <strong class="cashflow-metric-value" style="color:var(--accent-purple);">${formatMoney(totalMonthlySubs)}</strong>
          </div>
        </div>

        <div class="cashflow-total-row">
          <div class="cashflow-total-block">
            <span class="cashflow-total-label">Bu Ay Çıkacak Toplam Zorunlu Tutar</span>
            <div class="cashflow-total-val alert-rose">${formatMoney(totalMonthlyMandatory)}</div>
          </div>
          ${monthlyIncome > 0 ? `
            <div class="cashflow-total-block align-right">
              <span class="cashflow-total-label">Kalan Net Serbest Nakit</span>
              <div class="cashflow-total-val" style="color:${burdenColor};">${formatMoney(remainingFreeCash)}</div>
            </div>
          ` : ''}
        </div>

        ${monthlyIncome > 0 ? `
          <div>
            <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--text-muted); margin-bottom:0.25rem;">
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
  let nearestDueText = t('nearestDueNone');
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
      <span style="color:#c084fc; font-weight:700;">Tutar: ${nearest.isEstimated ? '~' : ''}${formatMoney(nearest.amount)}</span> • <span style="color:#94a3b8; font-weight:600;">${escapeHtml(nearest.bankName)}</span>`;
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

  setTabBadge('cardsTabBadge', activeCards);

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
  renderHealthScoreWidget(utilizationRatio, totalUsed, totalLimit, totalEkHesap, incomeBurdenRatio);

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

