document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('restore-file');
  const closeBtn = document.getElementById('close-btn');
  const statusEl = document.getElementById('status');

  function setStatus(text) {
    if (!statusEl) return;
    statusEl.textContent = text || '';
  }

  function readFileAsText(file) {
    if (!file) return Promise.reject(new Error('No file selected.'));
    if (typeof file.text === 'function') {
      try {
        return file.text();
      } catch (error) {
        console.warn('file.text() failed, falling back to FileReader:', error);
      }
    }
    return new Promise((resolve, reject) => {
      try {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(reader.error || new Error('Failed to read file.'));
        reader.readAsText(file);
      } catch (error) {
        reject(error);
      }
    });
  }

  function normalizeBoolean(value, defaultValue) {
    if (typeof value === 'boolean') return value;
    return defaultValue;
  }

  function normalizeString(value, defaultValue = '') {
    if (value === undefined || value === null) return defaultValue;
    return String(value);
  }

  function normalizeNonNegativeInt(value, defaultValue = 0) {
    const num = parseInt(String(value), 10);
    if (!Number.isFinite(num) || num < 0) return defaultValue;
    return num;
  }

  function normalizeConfigFromJson(parsed) {
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Backup file must contain a JSON object.');
    }
    if (!Array.isArray(parsed.rules)) {
      throw new Error('Backup file must contain a "rules" array.');
    }

    const normalizedRules = parsed.rules.map((rule, idx) => {
      const r = (rule && typeof rule === 'object') ? rule : {};
      const name = normalizeString(r.name, '').trim() || `Rule ${idx + 1}`;
      const urlPattern = normalizeString(r.urlPattern, '').trim();
      const email = normalizeString(r.email, '').trim();
      const enabled = normalizeBoolean(r.enabled, true);
      const autoClosePattern = normalizeString(r.autoClosePattern, '').trim();
      const successCount = normalizeNonNegativeInt(r.successCount, 0);
      return { name, urlPattern, email, enabled, autoClosePattern, successCount };
    });

    const enabled = normalizeBoolean(parsed.enabled, true);
    const autoCloseConfirmation = normalizeBoolean(parsed.autoCloseConfirmation, true);
    const autoCloseDelay = normalizeNonNegativeInt(parsed.autoCloseDelay, 10000) || 10000;

    const autoConfirm = normalizeBoolean(parsed.autoConfirm, false);

    return { enabled, autoCloseConfirmation, autoCloseDelay, autoConfirm, rules: normalizedRules };
  }

  function validateRulesRegexes(rules) {
    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      if (rule.urlPattern && rule.enabled) {
        try {
          new RegExp(rule.urlPattern);
        } catch (error) {
          throw new Error(`Invalid regex pattern in rule "${rule.name || `Rule ${i + 1}`}": ${error.message}`, { cause: error });
        }
      }
      if (rule.autoClosePattern && rule.autoClosePattern.trim()) {
        try {
          new RegExp(rule.autoClosePattern);
        } catch (error) {
          throw new Error(`Invalid auto-close pattern in rule "${rule.name || `Rule ${i + 1}`}": ${error.message}`, { cause: error });
        }
      }
    }
  }

  async function handleRestoreSelectedFile() {
    const file = fileInput && fileInput.files && fileInput.files[0];
    if (!file) return;

    // Allow selecting same file again.
    fileInput.value = '';

    try {
      setStatus('Reading file…');
      const text = await readFileAsText(file);
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (e) {
        throw new Error('Selected file is not valid JSON.', { cause: e });
      }

      setStatus('Validating backup…');
      const normalized = normalizeConfigFromJson(parsed);
      validateRulesRegexes(normalized.rules);

      const existing = await browser.storage.sync.get(['rules']);
      const existingRules = existing.rules || [];
      if (existingRules.length > 0) {
        const ok = confirm('Restore will overwrite all your addon data (settings and rules). This cannot be undone. Continue?');
        if (!ok) {
          setStatus('Restore cancelled.');
          return;
        }
      }

      setStatus('Restoring…');
      await browser.storage.sync.set({
        enabled: normalized.enabled,
        autoCloseConfirmation: normalized.autoCloseConfirmation,
        autoCloseDelay: normalized.autoCloseDelay,
        autoConfirm: normalized.autoConfirm,
        rules: normalized.rules
      });

      setStatus('Restore complete. Closing…');
      // Close this restore page automatically on success.
      try {
        const tab = await browser.tabs.getCurrent();
        if (tab && tab.id !== undefined) {
          await browser.tabs.remove(tab.id);
          return;
        }
      } catch (e) {
        console.warn('Unable to close restore tab via tabs API, falling back to window.close():', e);
      }
      // Fallback: may work in some contexts.
      window.close();
    } catch (error) {
      console.error('Restore failed:', error);
      setStatus('');
      alert(error && error.message ? error.message : 'Error restoring configuration. Please try again.');
    }
  }

  if (fileInput) fileInput.addEventListener('change', handleRestoreSelectedFile);
  if (closeBtn) closeBtn.addEventListener('click', () => window.close());
});


