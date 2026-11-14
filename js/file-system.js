// ==========================================================================
// CARDMON - SAVE FILE SYSTEM & FILE SYSTEM ACCESS API ENGINE
// ==========================================================================

const FILE_SYSTEM_VERSION = '3.0';
const FILE_SYSTEM_EXTENSION = '.cardmon';

const fileSystemState = {
  activeHandle: null,
  activeFileName: '',
  isDirty: false,
  lastSavedAt: null
};

function isFileSystemAccessSupported() {
  return typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function';
}

function serializePortfolio(stateObj = state) {
  const payload = {
    fileType: 'cardmon_portfolio',
    version: FILE_SYSTEM_VERSION,
    savedAt: new Date().toISOString(),
    app: 'CardMon',
    data: {
      banks: stateObj.banks || [],
      cards: stateObj.cards || [],
      loans: stateObj.loans || [],
      cashSubscriptions: stateObj.cashSubscriptions || [],
      profile: stateObj.profile || {}
    }
  };
  return JSON.stringify(payload, null, 2);
}

function validatePortfolioData(raw) {
  if (!raw || typeof raw !== 'object') {
    return { valid: false, error: 'Data is not an object' };
  }
  // New envelope format (version 3.0)
  if (raw.fileType === 'cardmon_portfolio' && raw.data) {
    if (!Array.isArray(raw.data.banks) || !Array.isArray(raw.data.cards)) {
      return { valid: false, error: 'Invalid portfolio data: banks or cards missing' };
    }
    return { valid: true, data: raw.data, version: raw.version || '3.0' };
  }
  // Legacy backup format (version 2.0 / 1.0)
  if (Array.isArray(raw.banks) && Array.isArray(raw.cards)) {
    return {
      valid: true,
      data: {
        banks: raw.banks,
        cards: raw.cards,
        loans: Array.isArray(raw.loans) ? raw.loans : [],
        cashSubscriptions: Array.isArray(raw.cashSubscriptions) ? raw.cashSubscriptions : [],
        profile: raw.profile || {}
      },
      version: raw.version || '2.0'
    };
  }
  return { valid: false, error: 'Unrecognized file format' };
}

function applyPortfolioData(data) {
  state.banks = data.banks;
  state.cards = data.cards;
  state.loans = data.loans || [];
  state.cashSubscriptions = data.cashSubscriptions || [];
  if (data.profile) {
    state.profile = { ...state.profile, ...data.profile };
  }
  saveToStorage();
  renderAll();
}

async function saveToActiveFile() {
  if (fileSystemState.activeHandle) {
    try {
      const handle = fileSystemState.activeHandle;
      if (handle.queryPermission) {
        const status = await handle.queryPermission({ mode: 'readwrite' });
        if (status !== 'granted') {
          const req = await handle.requestPermission({ mode: 'readwrite' });
          if (req !== 'granted') {
            return await saveFileAs();
          }
        }
      }
      const writable = await handle.createWritable();
      await writable.write(serializePortfolio(state));
      await writable.close();
      fileSystemState.isDirty = false;
      fileSystemState.lastSavedAt = new Date();
      updateFileStatusIndicator();
      showToast(`💾 ${t('fileSavedSuccess')}: ${fileSystemState.activeFileName}`);
      return true;
    } catch (err) {
      console.warn('Active file write failed, falling back to Save As:', err);
      return await saveFileAs();
    }
  } else {
    return await saveFileAs();
  }
}

async function saveFileAs() {
  const content = serializePortfolio(state);
  const defaultFilename = `cardmon_portfolio_${new Date().toISOString().slice(0, 10)}.cardmon`;

  if (isFileSystemAccessSupported()) {
    try {
      const options = {
        suggestedName: defaultFilename,
        types: [{
          description: 'CardMon Portfolio (*.cardmon, *.json)',
          accept: {
            'application/json': ['.cardmon', '.json']
          }
        }]
      };
      const handle = await window.showSaveFilePicker(options);
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();

      fileSystemState.activeHandle = handle;
      fileSystemState.activeFileName = handle.name;
      fileSystemState.isDirty = false;
      fileSystemState.lastSavedAt = new Date();
      updateFileStatusIndicator();
      showToast(`💾 ${t('fileSavedSuccess')}: ${handle.name}`);
      return true;
    } catch (err) {
      if (err.name === 'AbortError') return false;
      console.warn('File System Access API failed, falling back to download:', err);
    }
  }

  // Graceful browser download fallback
  try {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = defaultFilename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    fileSystemState.activeFileName = defaultFilename;
    fileSystemState.isDirty = false;
    fileSystemState.lastSavedAt = new Date();
    updateFileStatusIndicator();
    showToast(`💾 ${t('fileSavedSuccess')}: ${defaultFilename}`);
    return true;
  } catch (err) {
    console.error('Download fallback failed:', err);
    alert(t('fileSaveError'));
    return false;
  }
}

async function openPortfolioFile() {
  if (isFileSystemAccessSupported()) {
    try {
      const options = {
        types: [{
          description: 'CardMon Portfolio (*.cardmon, *.json)',
          accept: {
            'application/json': ['.cardmon', '.json']
          }
        }],
        multiple: false
      };
      const [handle] = await window.showOpenFilePicker(options);
      const file = await handle.getFile();
      const text = await file.text();
      const parsed = JSON.parse(text);
      const validation = validatePortfolioData(parsed);

      if (!validation.valid) {
        alert(`${t('fileLoadError')}: ${validation.error}`);
        return false;
      }

      applyPortfolioData(validation.data);
      fileSystemState.activeHandle = handle;
      fileSystemState.activeFileName = handle.name;
      fileSystemState.isDirty = false;
      fileSystemState.lastSavedAt = new Date();
      updateFileStatusIndicator();
      showToast(`📂 ${t('fileLoadedSuccess')}: ${handle.name}`);
      return true;
    } catch (err) {
      if (err.name === 'AbortError') return false;
      console.warn('File System Access API open failed, falling back to input:', err);
    }
  }

  // Fallback: standard file picker input
  triggerImportJson();
  return false;
}

function updateFileStatusIndicator() {
  const badge = document.getElementById('fileStatusBadge');
  if (!badge) return;

  const fileName = fileSystemState.activeFileName || t('activeFile');
  if (fileSystemState.activeFileName) {
    badge.style.display = 'inline-flex';
    badge.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
      <span class="file-name" title="${escapeHtml(fileName)}">${escapeHtml(fileName)}</span>
      <span class="file-status-dot ${fileSystemState.isDirty ? 'dirty' : 'synced'}" title="${fileSystemState.isDirty ? t('unsavedChanges') : t('fileSynced')}"></span>
    `;
  } else {
    badge.style.display = 'none';
  }
}

function markFileSystemDirty() {
  if (fileSystemState.activeFileName) {
    fileSystemState.isDirty = true;
    updateFileStatusIndicator();
  }
}

function setupFileSystemShortcuts() {
  if (typeof window === 'undefined') return;
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key && e.key.toLowerCase() === 's') {
      e.preventDefault();
      saveToActiveFile();
    }
  });
}
