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

