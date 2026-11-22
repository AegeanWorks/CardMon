// --------------------------------------------------------------------------
// Helper Utilities
// --------------------------------------------------------------------------
function getDaysInCurrentMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
}

function getApproxDay(approxWeekKey) {
  switch (approxWeekKey) {
    case 'week1': return 4;
    case 'week2': return 11;
    case 'week3': return 18;
    case 'week4': return 25;
    case 'weekMonthEnd': return 29;
    default: return 15;
  }
}

function turkishDaySuffix(day) {
  const suffixes = ['', "'i", "'si", "'ü", "'ü", "'i", "'sı", "'si", "'i", "'u", "'u",
    "'i", "'si", "'ü", "'ü", "'i", "'sı", "'si", "'i", "'u", "'si",
    "'i", "'si", "'ü", "'ü", "'i", "'sı", "'si", "'i", "'u", "'u", "'i"];
  const n = Number(day);
  return Number.isInteger(n) && n >= 1 && n <= 31 ? suffixes[n] : "'i";
}

function getUtilizationColor(utilization) {
  if (utilization <= 30) return 'var(--accent-emerald)';
  if (utilization <= 70) return 'var(--accent-amber)';
  return 'var(--accent-rose)';
}

function getNetworkLogoSvg(network) {
  switch (network) {
    case 'Mastercard':
      return `
        <svg width="34" height="22" viewBox="0 0 36 24">
          <circle cx="13" cy="12" r="10" fill="#EB001B" fill-opacity="0.9"/>
          <circle cx="23" cy="12" r="10" fill="#F79E1B" fill-opacity="0.85"/>
        </svg>
      `;
    case 'Visa':
      return `<span style="font-weight:900; letter-spacing:-0.05em; font-size:1.15rem; color:#ffffff;">VISA</span>`;
    case 'Troy':
      return `<span style="font-weight:900; letter-spacing:0.02em; font-size:0.95rem; color:#00a4e4; background:#ffffff; padding:0.1rem 0.35rem; border-radius:4px;">TROY</span>`;
    case 'Amex':
      return `<span style="font-weight:800; font-size:0.85rem; color:#ffffff; background:#007bc1; padding:0.15rem 0.35rem; border-radius:4px;">AMEX</span>`;
    default:
      return `<span style="font-weight:800; font-size:0.85rem;">CARD</span>`;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function hasAndroidBridge(method) {
  return typeof window !== 'undefined' && window.CardMonAndroid &&
    typeof window.CardMonAndroid[method] === 'function';
}

function downloadText(filename, text, mime) {
  if (hasAndroidBridge('downloadText')) {
    window.CardMonAndroid.downloadText(filename, text, mime || 'application/octet-stream');
    return;
  }
  // encodeURI leaves '#', '?' and reserved characters raw; in a data URL a
  // literal '#' would truncate the payload, so encode every unsafe character.
  const dataUrl = `data:${mime || 'text/plain'};charset=utf-8,${encodeURIComponent(text)}`;
  const anchor = document.createElement('a');
  anchor.setAttribute('href', dataUrl);
  anchor.setAttribute('download', filename);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function downloadBlob(blob, filename) {
  if (hasAndroidBridge('downloadBase64') && typeof FileReader !== 'undefined') {
    const reader = new FileReader();
    reader.onloadend = function () {
      const value = String(reader.result || '');
      const base64 = value.includes(',') ? value.slice(value.indexOf(',') + 1) : '';
      window.CardMonAndroid.downloadBase64(filename, base64, blob.type || 'application/octet-stream');
    };
    reader.readAsDataURL(blob);
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function triggerPrint() {
  if (hasAndroidBridge('printPage')) {
    window.CardMonAndroid.printPage();
    return;
  }
  window.print();
}

function showToast(msg) {
  if (typeof enTranslateText === 'function') msg = enTranslateText(msg);
  let toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toastContainer';
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
    <span>${escapeHtml(msg)}</span>
  `;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

