// ==========================================================================
// CARDMON - MONEY INSIGHTS TAB
// Renders the interest-free timing table and the FX/inflation view.
// ==========================================================================

'use strict';

function saveFxSettingsFromUi() {
  const rate = document.getElementById('inflationRateInput');
  const months = document.getElementById('inflationMonthsInput');
  const shock = document.getElementById('fxShockInput');
  const settings = loadFxSettings();
  if (rate) settings.monthlyInflationPct = Number(rate.value) || 0;
  if (months) settings.months = Number(months.value) || 0;
  if (shock) settings.shockPct = Number(shock.value) || 0;
  saveFxSettings(settings);
  renderMoneyInsights();
}

function renderTimingSection() {
  const plans = typeof timingPlans === 'function' ? timingPlans(state.cards || []) : [];
  let rows = '';
  if (!plans.length) {
    rows = `<p style="font-size:0.82rem; color:var(--text-muted);">${escapeHtml(t('noTimingData'))}</p>`;
  } else {
    rows = plans.map((plan) => {
      const bank = (state.banks || []).find((b) => b.id === plan.card.bankId) || { name: '' };
      const waitDay = plan.waitDate.getDate();
      const recommendation = plan.recommendWait
        ? `<span class="mi-pill mi-wait">${escapeHtml(t('recommendWait'))}</span>`
        : `<span class="mi-pill mi-buy">${escapeHtml(t('buyToday'))}</span>`;
      return `
        <div class="mi-row">
          <div class="mi-card-name">
            <strong>${escapeHtml(plan.card.nickname || t('cardColumn'))}</strong>
            <span>${escapeHtml(bank.name)}</span>
          </div>
          <div class="mi-metric"><strong>${plan.current.freeDays}</strong><span>${escapeHtml(t('todayFreeDays'))}</span></div>
          <div class="mi-metric"><strong>${waitDay}</strong><span>${escapeHtml(t('waitUntil'))}</span></div>
          <div class="mi-metric"><strong>${plan.extraDays > 0 ? '+' : ''}${plan.extraDays}</strong><span>${escapeHtml(t('extraDays'))}</span></div>
          <div>${recommendation}</div>
        </div>`;
    }).join('');
  }

  return `
    <section class="mi-section">
      <div class="section-header-row"><h3>${escapeHtml(t('timingTitle'))}</h3></div>
      <p style="font-size:0.8rem; color:var(--text-muted); line-height:1.5;">${escapeHtml(t('timingDesc'))}</p>
      <div class="mi-table">${rows}</div>
    </section>`;
}

function renderFxSection() {
  const settings = loadFxSettings();
  const debt = totalPortfolioDebt(state);
  const real = inflationAdjusted(debt, settings.monthlyInflationPct, settings.months);
  const exposure = fxExposure(state.cashSubscriptions || [], exchangeRates);
  const scenario = fxScenario(exposure.totalTry, settings.shockPct);
  const alerts = fxAlerts(exposure, (state.profile && state.profile.monthlyIncome) || 0);
  const alertHtml = alerts.map((alert) => {
    const key = alert.code === 'fxShare' ? 'fxShareInfo' : 'fxIncomeWarn';
    return `<div class="mi-alert ${alert.kind === 'warning' ? 'warning' : ''}">${escapeHtml(t(key, { value: alert.value.toFixed(0) }))}</div>`;
  }).join('');

  const feedError = typeof inflationFeedError === 'function' ? inflationFeedError() : '';
  const feedStatus = feedError
    ? t('inflationFeedError', { error: feedError })
    : (settings.inflationPeriod
      ? t('inflationFeedStatus', {
        source: 'TÜİK',
        period: settings.inflationPeriod,
        monthly: settings.monthlyInflationPct,
        annual: settings.annualInflationPct
      })
      : '');
  const feedHtml = `
    <div class="mi-feed">
      <label class="mi-auto">
        <input type="checkbox" id="autoInflationCheck" onchange="setAutoInflationFromUi(this.checked)" ${settings.autoInflation !== false ? 'checked' : ''}>
        ${escapeHtml(t('autoInflation'))}
      </label>
      <button type="button" class="btn btn-secondary btn-sm" onclick="refreshInflationNow()">${escapeHtml(t('refreshInflation'))}</button>
      ${feedStatus ? `<div class="mi-feed-status ${feedError ? 'error' : ''}">${escapeHtml(feedStatus)}</div>` : ''}
    </div>`;

  const entries = exposure.entries.map((entry) => `
    <div class="mi-row">
      <div class="mi-card-name"><strong>${escapeHtml(entry.currency)}</strong><span>× ${entry.rate}</span></div>
      <div class="mi-metric"><strong>${escapeHtml(formatMoney(entry.original, entry.currency))}</strong><span>${escapeHtml(entry.currency)}</span></div>
      <div class="mi-metric"><strong>${escapeHtml(formatMoney(entry.tryAmount, 'TRY'))}</strong><span>TRY</span></div>
    </div>`).join('') || '<p style="font-size:0.8rem; color:var(--text-muted);">—</p>';

  return `
    <section class="mi-section">
      <div class="section-header-row"><h3>${escapeHtml(t('fxTitle'))}</h3></div>
      <p style="font-size:0.8rem; color:var(--text-muted); line-height:1.5;">${escapeHtml(t('fxDesc'))}</p>
      ${feedHtml}
      <div class="mi-inputs">
        <label>${escapeHtml(t('inflationRate'))}<input type="number" id="inflationRateInput" class="form-input" min="0" max="100" step="0.1" value="${settings.monthlyInflationPct}"></label>
        <label>${escapeHtml(t('months'))}<input type="number" id="inflationMonthsInput" class="form-input" min="1" max="120" step="1" value="${settings.months}"></label>
        <label>${escapeHtml(t('fxShock'))}<input type="number" id="fxShockInput" class="form-input" min="0" max="100" step="1" value="${settings.shockPct}"></label>
        <button type="button" class="btn btn-primary btn-sm" onclick="saveFxSettingsFromUi()">${escapeHtml(t('applySettings'))}</button>
      </div>
      <div class="mi-stats">
        <div class="mi-stat"><span>${escapeHtml(t('nominalDebt'))}</span><strong>${escapeHtml(formatMoney(real.nominal, 'TRY'))}</strong></div>
        <div class="mi-stat"><span>${escapeHtml(t('realDebt'))}</span><strong>${escapeHtml(formatMoney(real.real, 'TRY'))}</strong></div>
        <div class="mi-stat"><span>${escapeHtml(t('erosion'))}</span><strong>${escapeHtml(formatMoney(real.erosion, 'TRY'))} · ${real.erosionPct.toFixed(1)}%</strong></div>
        <div class="mi-stat"><span>${escapeHtml(t('fxExposure'))}</span><strong>${escapeHtml(formatMoney(exposure.fxTry, 'TRY'))}</strong></div>
        <div class="mi-stat"><span>${escapeHtml(t('shockedTotal'))}</span><strong>${escapeHtml(formatMoney(scenario.shocked, 'TRY'))}</strong></div>
      </div>
      ${alertHtml}
      <div class="mi-table">${entries}</div>
    </section>`;
}

function loadMemurSalary() {
  // aikit:allow-secret -- localStorage key name, not a credential
  try { return Number(localStorage.getItem('cardmon_memur_salary_v1')) || 0; } catch (err) { return 0; }
}

function setMemurSalaryFromUi() {
  const input = document.getElementById('memurSalaryInput');
  const value = input ? Number(input.value) || 0 : 0;
  // aikit:allow-secret -- localStorage key name, not a credential
  try { localStorage.setItem('cardmon_memur_salary_v1', String(value)); } catch (err) { /* optional */ }
  renderMemurSalaryResult();
}

function renderMemurSalaryResult() {
  const el = document.getElementById('memurSalaryResult');
  if (!el) return;
  const payload = typeof getInflationPayload === 'function' ? getInflationPayload() : null;
  const info = payload && typeof nextRaiseInfo === 'function' ? nextRaiseInfo(payload) : null;
  if (!info) {
    el.innerHTML = `<div class="mi-alert">${escapeHtml(t('noInflationData'))}</div>`;
    return;
  }
  const impact = salaryImpact(info.totalPct, loadMemurSalary());
  el.innerHTML = `
    <div class="mi-stat"><span>${escapeHtml(t('salaryIncrease'))}</span><strong>${escapeHtml(formatMoney(impact.increase, 'TRY'))}</strong></div>
    <div class="mi-stat"><span>${escapeHtml(t('newSalary'))}</span><strong>${escapeHtml(formatMoney(impact.newSalary, 'TRY'))}</strong></div>`;
}

function renderMemurSection() {
  const payload = typeof getInflationPayload === 'function' ? getInflationPayload() : null;
  const info = payload && typeof nextRaiseInfo === 'function' ? nextRaiseInfo(payload) : null;
  if (!info) {
    return `<section class="mi-section">
      <div class="section-header-row"><h3>${escapeHtml(t('memurTitle'))}</h3></div>
      <div class="mi-alert">${escapeHtml(t('noInflationData'))}</div>
    </section>`;
  }
  const monthKey = info.monthName === 'Ocak' ? 'monthOcak' : 'monthTemmuz';
  const status = info.provisional
    ? t('provisional', { count: info.monthsAvailable })
    : t('final');
  const salary = loadMemurSalary();

  return `
    <section class="mi-section">
      <div class="section-header-row"><h3>${escapeHtml(t('memurTitle'))}</h3></div>
      <p style="font-size:0.8rem; color:var(--text-muted); line-height:1.5;">${escapeHtml(t('memurDesc'))}</p>
      <div class="mi-stats">
        <div class="mi-stat"><span>${escapeHtml(t('nextRaise'))}</span><strong>${escapeHtml(t(monthKey))} ${info.raiseYear}</strong></div>
        <div class="mi-stat"><span>${escapeHtml(t('sixMonthInflation'))}</span><strong>${info.inflationPct.toFixed(2)}%</strong></div>
        <div class="mi-stat"><span>${escapeHtml(t('inflationDifference'))}</span><strong>${info.inflationDifferencePct.toFixed(2)}%</strong></div>
        <div class="mi-stat"><span>${escapeHtml(t('contractRaise'))}</span><strong>${info.contractPct}% · ${escapeHtml(status)}</strong></div>
        <div class="mi-stat"><span>${escapeHtml(t('totalRaise'))}</span><strong>${info.totalPct.toFixed(2)}%</strong></div>
      </div>
      <div class="mi-inputs">
        <label>${escapeHtml(t('currentSalary'))}<input type="number" id="memurSalaryInput" class="form-input" min="0" step="any" placeholder="50000" value="${salary || ''}" onchange="setMemurSalaryFromUi()"></label>
      </div>
      <div class="mi-stats" id="memurSalaryResult">${salary ? '' : `<div class="mi-stat"><span>${escapeHtml(t('salaryIncrease'))}</span><strong>—</strong></div>`}</div>
    </section>`;
}

function safeExternalUrl(url) {
  const value = String(url || '').trim();
  return /^https?:\/\//i.test(value) ? value : '#';
}

function renderCampaignResult() {
  const el = document.getElementById('campaignResult');
  if (!el) return;
  const categorySelect = document.getElementById('campaignCategory');
  const spendInput = document.getElementById('campaignSpend');
  const category = (categorySelect && categorySelect.value) || 'digital';
  const spend = spendInput ? Number(spendInput.value) || 0 : 0;
  if (!state.cards || !state.cards.length) {
    el.innerHTML = `<div class="mi-alert">${escapeHtml(t('campaignNoCards'))}</div>`;
    return;
  }
  const data = typeof campaignCache !== 'undefined' && campaignCache ? campaignCache : null;
  if (!data || !data.offers || !data.offers.length) {
    el.innerHTML = `<div class="mi-alert warning">${escapeHtml(t('campaignNoData'))}</div>`;
    return;
  }
  const ranked = typeof rankCardsForCategory === 'function'
    ? rankCardsForCategory({ cards: state.cards, banks: state.banks, offers: data.offers, category, spend })
    : [];

  const cardRows = ranked.map((item, index) => {
    const best = index === 0 && item.earn > 0;
    const detail = item.offer
      ? `${escapeHtml(item.offer.bankName)} · ${escapeHtml(item.offer.benefitLabel || `${item.offer.rate}%`)} · ${escapeHtml(item.offer.appName)}`
      : escapeHtml(t('campaignNoOffer'));
    return `
      <div class="mi-row ${best ? 'mi-best' : ''}">
        <div class="mi-card-name">
          <strong>${escapeHtml(item.card.nickname || t('cardColumn'))}</strong>
          <span>${detail}</span>
        </div>
        <div class="mi-metric"><strong>${escapeHtml(formatMoney(item.earn, 'TRY'))}</strong><span>${escapeHtml(t('salaryIncrease'))}</span></div>
        <div>${best ? `<span class="mi-pill mi-wait">${escapeHtml(t('campaignBest'))}</span>` : ''}</div>
      </div>`;
  }).join('');

  const campaigns = typeof activeCampaigns === 'function'
    ? activeCampaigns(data.offers, category, spend)
    : [];
  const campaignRows = campaigns.length
    ? campaigns.map((offer) => `
      <div class="mi-row mi-offer-row">
        <div class="mi-card-name">
          <strong>${escapeHtml(offer.benefitLabel || `${offer.rate}%`)}</strong>
          <span>${escapeHtml(offer.bankName)} · ${escapeHtml(offer.appName)}</span>
          <span>${escapeHtml(offer.note || offer.product)}</span>
        </div>
        <div class="mi-metric"><strong>${escapeHtml(formatMoney(campaignValueTry(offer, spend), 'TRY'))}</strong><span>${escapeHtml(t('campaignWorth'))}</span></div>
        <span style="font-size:0.7rem; color:var(--text-muted);">${escapeHtml(t('expires'))} ${escapeHtml(offer.endDate)}</span>
        <a href="${escapeHtml(safeExternalUrl(offer.sourceUrl))}" target="_blank" rel="noopener noreferrer" style="font-size:0.72rem;">${escapeHtml(t('viewOffer'))}</a>
      </div>`).join('')
    : `<div class="mi-alert">${escapeHtml(t('noCampaigns'))}</div>`;

  const deals = typeof featuredDeals === 'function' ? featuredDeals(data.deals, category) : [];
  const dealRows = deals.length
    ? deals.map((deal) => `
      <div class="mi-row mi-offer-row">
        <div class="mi-card-name">
          <strong>${escapeHtml(deal.price || deal.badge)}</strong>
          <span>${escapeHtml(deal.title)}</span>
          <span>${escapeHtml(deal.store)} · ${escapeHtml(deal.expires)}</span>
        </div>
        <a href="${escapeHtml(safeExternalUrl(deal.sourceUrl))}" target="_blank" rel="noopener noreferrer" style="font-size:0.72rem;">${escapeHtml(t('viewOffer'))}</a>
      </div>`).join('')
    : `<div class="mi-alert">${escapeHtml(t('noDeals'))}</div>`;

  el.innerHTML = `
    <h4 style="font-size:0.82rem; margin:0.4rem 0;">${escapeHtml(t('campaignBest'))}</h4>
    <div class="mi-table">${cardRows}</div>
    <h4 style="font-size:0.82rem; margin:0.9rem 0 0.4rem;">${escapeHtml(t('activeCampaigns'))}</h4>
    <div class="mi-table">${campaignRows}</div>
    <h4 style="font-size:0.82rem; margin:0.9rem 0 0.4rem;">${escapeHtml(t('featuredDeals'))}</h4>
    <div class="mi-table">${dealRows}</div>`;
}

function refreshCampaignResult() {
  if (typeof fetchCampaigns !== 'function') return;
  fetchCampaigns(true).then(renderCampaignResult);
}

function renderCampaignSearchResult() {
  const el = document.getElementById('campaignSearchResult');
  if (!el) return;
  const data = typeof getCampaignSearchResults === 'function' ? getCampaignSearchResults() : null;
  if (!data || !data.results.length) {
    el.innerHTML = `<div class="mi-alert">${escapeHtml(t('campaignSearchHint'))}</div>`;
    return;
  }
  const modeLabel = data.mode === 'web' ? t('campaignSearchWeb') : t('campaignSearchLocal');
  const bankLabel = (data.banks || []).join(', ');
  el.innerHTML = `
    <p style="font-size:0.72rem; color:var(--text-muted);">${escapeHtml(modeLabel)}${bankLabel ? ` · ${escapeHtml(bankLabel)}` : ''}</p>
    <div class="mi-table">${data.results.map((item) => `
      <div class="mi-row mi-offer-row">
        <div class="mi-card-name">
          <strong>${escapeHtml(item.title)}</strong>
          <span>${escapeHtml(item.bank || item.source)}</span>
          <span>${escapeHtml(item.snippet)}</span>
        </div>
        <a href="${escapeHtml(safeExternalUrl(item.url))}" target="_blank" rel="noopener noreferrer" style="font-size:0.72rem;">${escapeHtml(t('viewOffer'))}</a>
      </div>`).join('')}</div>`;
}

function runCampaignSearch() {
  const input = document.getElementById('campaignSearchInput');
  const query = input ? input.value.trim() : '';
  if (!query) return;
  if (typeof searchCampaignsWeb !== 'function') return;
  searchCampaignsWeb(query, state.banks || []).then(renderCampaignSearchResult);
}

function renderCampaignSection() {
  const categoryOptions = [
    ['digital', 'catDigital'], ['shopping', 'catShopping'], ['groceries', 'catGroceries'],
    ['travel', 'catTravel'], ['education', 'catEducation'], ['fuel', 'catFuel'], ['other', 'catOther']
  ].map(([value, key]) => `<option value="${value}">${escapeHtml(t(key))}</option>`).join('');

  return `
    <section class="mi-section">
      <div class="section-header-row"><h3>${escapeHtml(t('campaignTitle'))}</h3></div>
      <p style="font-size:0.8rem; color:var(--text-muted); line-height:1.5;">${escapeHtml(t('campaignDesc'))}</p>
      <div class="mi-inputs">
        <label>${escapeHtml(t('campaignCategory'))}
          <select class="form-input" id="campaignCategory" onchange="renderCampaignResult()">${categoryOptions}</select>
        </label>
        <label>${escapeHtml(t('campaignSpend'))}<input type="number" id="campaignSpend" class="form-input" min="0" step="any" placeholder="2000" value="2000" onchange="renderCampaignResult()"></label>
        <button type="button" class="btn btn-secondary btn-sm" onclick="refreshCampaignResult()">${escapeHtml(t('campaignRefresh'))}</button>
      </div>
      <div class="mi-table" id="campaignResult"></div>
      <div class="mi-inputs" style="margin-top:0.9rem;">
        <label style="flex:1;">${escapeHtml(t('campaignSearchPlaceholder'))}
          <input type="text" id="campaignSearchInput" class="form-input" data-i18n-placeholder="campaignSearchPlaceholder" placeholder="${escapeHtml(t('campaignSearchPlaceholder'))}">
        </label>
        <button type="button" class="btn btn-primary btn-sm" onclick="runCampaignSearch()">${escapeHtml(t('campaignSearchBtn'))}</button>
      </div>
      <div id="campaignSearchResult"></div>
    </section>`;
}

let autoBankSearchDone = false;

function renderMoneyInsights() {
  const container = document.getElementById('moneyInsightsContainer');
  if (!container) return;
  container.innerHTML = renderTimingSection() + renderFxSection() + renderMemurSection() + renderCampaignSection();
  renderMemurSalaryResult();

  const searchUserBanks = () => {
    if (autoBankSearchDone || typeof searchCampaignsWeb !== 'function') return;
    const banks = (state.banks || []).filter((bank) => bank.name);
    if (!banks.length) return;
    autoBankSearchDone = true;
    searchCampaignsWeb('', banks).then(renderCampaignSearchResult);
  };

  if (typeof fetchCampaigns === 'function' && typeof campaignCache !== 'undefined' && !campaignCache) {
    fetchCampaigns().then(() => { renderCampaignResult(); searchUserBanks(); });
  } else {
    renderCampaignResult();
    searchUserBanks();
  }
  renderCampaignSearchResult();
}
