// ==========================================================================
// CARDMON - MEMUR ZAMMI (TURKISH CIVIL-SERVANT RAISE) CALCULATOR
// Uses TÜİK six-month CPI compounding and the 8th collective agreement
// contract rates. Pure functions; input is the cached inflation-feed payload.
// ==========================================================================

'use strict';

const MEMUR_TR_MONTHS = {
  Ocak: 1, Şubat: 2, Mart: 3, Nisan: 4, Mayıs: 5, Haziran: 6,
  Temmuz: 7, Ağustos: 8, Eylül: 9, Ekim: 10, Kasım: 11, Aralık: 12
};

// 8. Dönem Toplu Sözleşme / Hakem Kurulu rates by raise date.
const CONTRACT_RATES = {
  202501: 6,
  202507: 5,
  202601: 11,
  202607: 7,
  202701: 5,
  202707: 4
};

function periodKey(period) {
  const parts = String(period || '').trim().split(/\s+/);
  const month = MEMUR_TR_MONTHS[parts[0]] || 0;
  return (Number(parts[1]) || 0) * 100 + month;
}

function monthlyChangeMap(payload) {
  const map = new Map();
  for (const row of ((payload && payload.rows) || [])) {
    if (row.seri === 'Aylık değişim (%)' && Number.isFinite(Number(row.deger))) {
      map.set(periodKey(row.donem), Number(row.deger));
    }
  }
  return map;
}

function cumulativeInflation(payload, startKey, endKey) {
  const changes = monthlyChangeMap(payload);
  let factor = 1;
  let monthsAvailable = 0;
  for (let key = startKey; key <= endKey; key += 1) {
    if (!changes.has(key)) continue;
    factor *= 1 + changes.get(key) / 100;
    monthsAvailable += 1;
  }
  return { pct: (factor - 1) * 100, monthsAvailable };
}

function contractRate(key) {
  return CONTRACT_RATES[key] !== undefined ? CONTRACT_RATES[key] : null;
}

function nextRaiseInfo(payload) {
  const changes = monthlyChangeMap(payload);
  if (!changes.size) return null;
  const latest = Math.max(...changes.keys());
  const year = Math.floor(latest / 100);
  const month = latest % 100;

  let baseStart;
  let baseEnd;
  let raiseKey;
  let previousKey;
  let monthName;
  let raiseYear;

  if (month <= 6) {
    baseStart = year * 100 + 1;
    baseEnd = year * 100 + 6;
    raiseKey = year * 100 + 7;
    previousKey = year * 100 + 1;
    monthName = 'Temmuz';
    raiseYear = year;
  } else {
    baseStart = year * 100 + 7;
    baseEnd = year * 100 + 12;
    raiseKey = (year + 1) * 100 + 1;
    previousKey = year * 100 + 7;
    monthName = 'Ocak';
    raiseYear = year + 1;
  }

  const contractPct = contractRate(raiseKey);
  const previousContractPct = contractRate(previousKey);
  if (contractPct === null || previousContractPct === null) return null;

  const inflation = cumulativeInflation(payload, baseStart, baseEnd);
  const differencePct = ((1 + inflation.pct / 100) / (1 + previousContractPct / 100) - 1) * 100;
  const totalPct = ((1 + contractPct / 100) * (1 + differencePct / 100) - 1) * 100;

  return {
    monthName,
    raiseYear,
    contractPct,
    previousContractPct,
    inflationPct: inflation.pct,
    inflationDifferencePct: Math.max(0, differencePct),
    totalPct,
    provisional: inflation.monthsAvailable < 6,
    monthsAvailable: inflation.monthsAvailable,
    monthsExpected: 6
  };
}

function salaryImpact(totalPct, salary) {
  const base = Number(salary) || 0;
  const increase = base * (Number(totalPct) || 0) / 100;
  return { increase, newSalary: base + increase };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    MEMUR_TR_MONTHS,
    CONTRACT_RATES,
    periodKey,
    monthlyChangeMap,
    cumulativeInflation,
    contractRate,
    nextRaiseInfo,
    salaryImpact
  };
}
