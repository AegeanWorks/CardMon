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

let lastBackupSaveOk = true;

function saveBackupVault(vault) {
  try {
    localStorage.setItem(BACKUP_VAULT_KEY, JSON.stringify(vault.slice(0, 15)));
    lastBackupSaveOk = true;
    return true;
  } catch (e) {
    console.error('Failed to save backup vault:', e);
    lastBackupSaveOk = false;
    return false;
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
    id: 'snap-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
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
  if (lastBackupSaveOk) {
    showToast('💾 Manuel yedek noktası başarıyla kasaya eklendi.');
  } else {
    showToast('⚠️ Yedek kaydedilemedi; lütfen depolama alanını kontrol edin.');
  }
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
              ${isAuto ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> Otomatik Haftalık Yedek' : '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> Manuel Yedek'}
            </span>
            <strong style="font-size:0.85rem; color:#fff;">${snap.dateStr}</strong>
          </div>
          <div style="font-size:0.75rem; color:var(--text-muted); display:flex; gap:0.65rem; flex-wrap:wrap;">
            <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><line x1="3" y1="21" x2="21" y2="21"></line><line x1="3" y1="10" x2="21" y2="10"></line><path d="M5 10l7-7 7 7"></path><line x1="5" y1="21" x2="5" y2="10"></line><line x1="19" y1="21" x2="19" y2="10"></line><line x1="9" y1="21" x2="9" y2="14"></line><line x1="15" y1="21" x2="15" y2="14"></line></svg> ${s.bankCount || 0} Banka</span>
            <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><rect x="1" y="4" width="22" height="16" rx="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg> ${s.cardCount || 0} Kart</span>
            <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg> ${s.loanCount || 0} Kredi</span>
            <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="3"></circle></svg> Toplam Borç: <strong>${formatMoney(s.totalDebt || 0)}</strong></span>
          </div>
        </div>

        <div style="display:flex; align-items:center; gap:0.35rem;">
          <button type="button" class="btn btn-secondary btn-sm" onclick="downloadBackupSnapshotJson('${snap.id}')" title="Bu versiyonu JSON dosyası olarak indir">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> İndir
          </button>
          <button type="button" class="btn btn-emerald btn-sm" onclick="restoreBackupSnapshot('${snap.id}')" title="Bu yedek noktasına geri dön">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg> Geri Yükle
          </button>
          <button type="button" class="btn btn-danger-outline btn-sm" onclick="deleteBackupSnapshot('${snap.id}')" title="Bu yedeği kasadan sil">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
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

function renderHealthScoreWidget(utilizationRatio, totalUsed, totalLimit, totalEkHesap, incomeBurdenRatio = 0) {
  const pill = document.getElementById('healthScorePill');
  const fill = document.getElementById('healthScoreFill');
  const caption = document.getElementById('healthScoreCaption');
  if (!pill || !fill || !caption) return;

  const actions = document.getElementById('welcomeEmptyActions');
  if (actions) actions.hidden = totalLimit !== 0;

  const pdfBtn = document.getElementById('topbarPdfBtn');
  if (pdfBtn) {
    pdfBtn.disabled = totalLimit === 0;
    pdfBtn.title = totalLimit === 0 ? t('pdfEmptyHint') : t('pdfReportHint');
  }

  if (totalLimit === 0) {
    pill.className = 'health-score-pill health-empty';
    pill.textContent = t('healthNoData');
    fill.style.width = '0%';
    caption.textContent = t('healthEmptyHint');
    return;
  }

  // A safe utilization score must not hide a dangerous cashflow burden.
  const burden = Number(incomeBurdenRatio) || 0;
  if (burden > 65) {
    pill.className = 'health-score-pill health-critical';
    pill.textContent = t('healthCritical');
    fill.style.width = '25%';
    fill.style.background = '#f43f5e';
    caption.textContent = `Zorunlu ödemeler gelirinizin %${burden.toFixed(1)}'ini aşıyor; limit doluluğunuz %${utilizationRatio.toFixed(1)} güvenli olsa da nakit akışı riski yüksek.`;
    return;
  }
  if (burden > 40) {
    pill.className = 'health-score-pill health-warning';
    pill.textContent = t('healthWarning');
    fill.style.width = '48%';
    fill.style.background = 'linear-gradient(90deg, #f59e0b, #f43f5e)';
    caption.textContent = `Limit doluluğunuz %${utilizationRatio.toFixed(1)} güvenli olsa da zorunlu ödemeler gelirinizin %${burden.toFixed(1)}'ini oluşturuyor. Nakit akışınızı gözden geçirin.`;
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
        <div style="margin-bottom: 0.5rem;"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="21" x2="21" y2="21"></line><line x1="3" y1="10" x2="21" y2="10"></line><path d="M5 10l7-7 7 7"></path><line x1="5" y1="21" x2="5" y2="10"></line><line x1="19" y1="21" x2="19" y2="10"></line><line x1="9" y1="21" x2="9" y2="14"></line><line x1="15" y1="21" x2="15" y2="14"></line></svg></div>
        <p style="color:var(--text-secondary); font-size:0.85rem; margin-bottom:0.75rem;">Henüz tanımlı bir Ek Hesap (KMH) limitiniz bulunmuyor.</p>
        <button class="btn btn-secondary btn-sm" onclick="openAddBankModal()">${t('addBank')} / Düzenle</button>
      </div>
    `;
    return;
  }

  el.innerHTML = `
    <div style="width: 100%; display: flex; flex-direction: column; gap: 1rem;">
      <div style="background: rgba(6, 182, 212, 0.1); border: 1px solid rgba(6, 182, 212, 0.25); border-radius: var(--radius-md); padding: 0.85rem 1rem; display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:0.85rem; font-weight:600; color:#22d3ee;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> Toplam Acil Durum Rezervi</span>
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
              <span><strong style="color:#fff;">${formatMoney(data.totalDebt)}</strong> <span style="color:var(--text-secondary); font-size:0.75rem;">(%${pct})</span></span>
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
// Line-art SVGs for the smart-insight cards (no emoji mix).
const INSIGHT_ICON_SVG = {
  warning: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12" y2="17"></line></svg>',
  success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="8 12 11 15 16 9"></polyline></svg>',
  info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"></path><path d="M10 22h4"></path><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"></path></svg>',
  buffer: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>',
  recurring: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>',
  fee: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7" y2="7"></line></svg>'
};

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
      icon: INSIGHT_ICON_SVG.warning,
      iconBg: 'rgba(245, 158, 11, 0.2)',
      title: 'Yüksek Limit Doluluğuna Sahip Kartlar',
      desc: `${highUtilCards.map(c => `<strong>${escapeHtml(c.nickname)}</strong> (%${((c.usedBalance/c.limit)*100).toFixed(0)})`).join(', ')} kartlarınız %50 üzerinde limit kullanıyor. Kredi notu optimizasyonu için ödeme yapılması önerilir.`
    });
  } else {
    insights.push({
      type: 'success',
      bg: 'rgba(16, 185, 129, 0.12)',
      border: 'rgba(16, 185, 129, 0.3)',
      icon: INSIGHT_ICON_SVG.success,
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
      icon: INSIGHT_ICON_SVG.info,
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
      icon: INSIGHT_ICON_SVG.buffer,
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
      icon: INSIGHT_ICON_SVG.recurring,
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
      icon: INSIGHT_ICON_SVG.fee,
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
                  <span><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><rect x="1" y="4" width="22" height="16" rx="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg></span>
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
                  ${isKatilim ? `<span style="font-size:0.68rem; color:#34d399; font-weight:700;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><path d="M12 2l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-1.5L12 2z"></path></svg> %100 Katılım</span>` : `<span style="font-size:0.68rem; color:var(--text-muted);">(%${ratio})</span>`}
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

