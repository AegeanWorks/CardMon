// ==========================================================================
// CARDMON - INTEREST-FREE TIMING OPTIMIZER
// Compares buying today with waiting until just after the statement cut-off.
// Pure functions; no DOM and no side effects.
// ==========================================================================

'use strict';

function cardCycleDays(card, date) {
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const approx = typeof getApproxDay === 'function' ? getApproxDay : () => 15;
  let cutoff = card.dateMethod === 'exact' ? Number(card.cutoffDay) : approx(card.approxCutoffWeek);
  let due = card.dateMethod === 'exact' ? Number(card.dueDay) : approx(card.approxDueWeek);
  cutoff = Number.isFinite(cutoff) ? Math.max(1, Math.min(daysInMonth, Math.round(cutoff))) : 15;
  due = Number.isFinite(due) ? Math.max(1, Math.min(daysInMonth, Math.round(due))) : 25;
  return { cutoff, due, daysInMonth };
}

function purchaseDueDate(card, purchaseDate) {
  const cycle = cardCycleDays(card, purchaseDate);
  let cutYear = purchaseDate.getFullYear();
  let cutMonth = purchaseDate.getMonth();
  if (purchaseDate.getDate() > cycle.cutoff) cutMonth += 1;

  const cut = new Date(cutYear, cutMonth, 1);
  const cutMonthDays = new Date(cut.getFullYear(), cut.getMonth() + 1, 0).getDate();
  const effectiveCutoff = Math.min(cycle.cutoff, cutMonthDays);

  let dueMonth = cut.getMonth();
  if (cycle.due < effectiveCutoff) dueMonth += 1;
  const dueDays = new Date(cut.getFullYear(), dueMonth + 1, 0).getDate();
  return new Date(cut.getFullYear(), dueMonth, Math.min(cycle.due, dueDays));
}

function dayDifference(later, earlier) {
  const toUtc = (date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((toUtc(later) - toUtc(earlier)) / 86400000);
}

function interestFreeOption(card, purchaseDate) {
  const dueDate = purchaseDueDate(card, purchaseDate);
  return {
    purchaseDate,
    dueDate,
    freeDays: Math.max(0, dayDifference(dueDate, purchaseDate))
  };
}

function firstWaitDate(card, now) {
  const cycle = cardCycleDays(card, now);
  let year = now.getFullYear();
  let month = now.getMonth();
  let day;

  if (now.getDate() <= cycle.cutoff) {
    day = cycle.cutoff + 1;
    if (day > cycle.daysInMonth) { month += 1; day = 1; }
  } else {
    month += 1;
    const nextDays = new Date(year, month + 1, 0).getDate();
    day = Math.min(cycle.cutoff, nextDays) + 1;
    if (day > nextDays) { month += 1; day = 1; }
  }
  return new Date(year, month, day);
}

function interestFreePlan(card, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const current = interestFreeOption(card, today);
  const waitDate = firstWaitDate(card, today);
  const delayed = interestFreeOption(card, waitDate);
  const extraDays = delayed.freeDays - current.freeDays;
  return {
    card,
    current,
    delayed,
    waitDate,
    extraDays,
    recommendWait: extraDays >= 7,
    bestFreeDays: Math.max(current.freeDays, delayed.freeDays)
  };
}

function timingPlans(cards, now = new Date()) {
  return (cards || [])
    .map((card) => interestFreePlan(card, now))
    .sort((left, right) => right.extraDays - left.extraDays);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    cardCycleDays,
    purchaseDueDate,
    dayDifference,
    interestFreeOption,
    firstWaitDate,
    interestFreePlan,
    timingPlans
  };
}
