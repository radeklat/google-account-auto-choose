// Popup script for managing configuration rules
document.addEventListener('DOMContentLoaded', function() {
  const rulesContainer = document.getElementById('rules-container');
  const addRuleBtn = document.getElementById('add-rule-btn');
  const backupRulesBtn = document.getElementById('backup-rules-btn');
  const restoreRulesBtn = document.getElementById('restore-rules-btn');
  const helpToggle = document.getElementById('help-toggle');
  const addonEnabledCheckbox = document.getElementById('addon-enabled');
  const autoCloseConfirmationCheckbox = document.getElementById('auto-close-confirmation');
  const autoConfirmCheckbox = document.getElementById('auto-confirm');
  const resetSuccessCountsBtn = document.getElementById('reset-success-counts');
  const emailSuggestionsDatalistId = 'email-suggestions';
  const syncSizeWarning = document.getElementById('sync-size-warning');
  // Firefox storage.sync per-item quota (QUOTA_BYTES_PER_ITEM). All rules live in one item.
  const SYNC_QUOTA_BYTES_PER_ITEM = 8192;
  const SYNC_SIZE_WARNING_RATIO = 0.8;

  let currentRules = [];
  let addonEnabled = true;
  let autoCloseConfirmation = true;
  let autoConfirm = false;
  let autoCloseDelay = 10000; // Default 10 seconds
  let autoSaveTimeout = null;

  // Load existing configuration
  loadConfiguration();

  // Event listeners
  addRuleBtn.addEventListener('click', addNewRule);
  helpToggle.addEventListener('click', toggleHelp);
  resetSuccessCountsBtn.addEventListener('click', resetSuccessCounts);
  if (backupRulesBtn) backupRulesBtn.addEventListener('click', backupConfigurationToJson);
  if (restoreRulesBtn) restoreRulesBtn.addEventListener('click', openRestorePage);
  addonEnabledCheckbox.addEventListener('change', () => {
    updateAddonEnabled();
    autoSave();
  });
  autoCloseConfirmationCheckbox.addEventListener('change', () => {
    updateAutoCloseConfirmation();
    autoSave();
  });
  autoConfirmCheckbox.addEventListener('change', () => {
    autoConfirm = autoConfirmCheckbox.checked;
    autoSave();
  });

  // Add event listener for auto-close delay input
  const autoCloseDelayInput = document.getElementById('auto-close-delay');
  if (autoCloseDelayInput) {
    autoCloseDelayInput.addEventListener('input', () => {
      updateAutoCloseDelay();
      autoSave();
    });
  }

  function toggleHelp() {
    helpToggle.classList.toggle('expanded');
  }

  function updateAddonEnabled() {
    addonEnabled = addonEnabledCheckbox.checked;
  }

  function updateAutoCloseConfirmation() {
    autoCloseConfirmation = autoCloseConfirmationCheckbox.checked;
  }

  function updateAutoCloseDelay() {
    const delayInput = document.getElementById('auto-close-delay');
    if (delayInput) {
      autoCloseDelay = parseInt(delayInput.value) * 1000; // Convert seconds to milliseconds
    }
  }

  function updateAutoCloseDelayUI() {
    const delayInput = document.getElementById('auto-close-delay');
    if (delayInput) {
      delayInput.value = Math.round(autoCloseDelay / 1000); // Convert milliseconds to seconds
    }
  }

  function safeParseSecondsToMs(value) {
    const seconds = parseInt(String(value), 10);
    if (!Number.isFinite(seconds) || seconds <= 0) return 10000;
    return seconds * 1000;
  }

  function getConfigFromCurrentUI() {
    // Preserve any in-flight edits before exporting.
    const rules = collectRulesFromForm();
    const enabled = addonEnabledCheckbox ? addonEnabledCheckbox.checked : true;
    const autoClose = autoCloseConfirmationCheckbox ? autoCloseConfirmationCheckbox.checked : true;
    const delayInput = document.getElementById('auto-close-delay');
    const delayMs = delayInput ? safeParseSecondsToMs(delayInput.value) : 10000;

    return {
      enabled,
      autoCloseConfirmation: autoClose,
      autoCloseDelay: delayMs,
      autoConfirm: autoConfirmCheckbox ? autoConfirmCheckbox.checked : false,
      rules
    };
  }

  function downloadJson(filename, obj) {
    const json = JSON.stringify(obj, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Cleanup the object URL after the click has been handled.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function backupConfigurationToJson() {
    try {
      const config = getConfigFromCurrentUI();
      downloadJson('google-account-auto-chooser-backup.json', config);
    } catch (error) {
      console.error('Error creating backup:', error);
      alert('Error creating backup. Please try again.');
    }
  }

  function loadConfiguration() {
    browser.storage.sync.get(['enabled', 'rules', 'autoCloseConfirmation', 'autoCloseDelay', 'autoConfirm']).then((result) => {
      addonEnabled = result.enabled !== undefined ? result.enabled : true;
      currentRules = result.rules || [];
      autoCloseConfirmation = result.autoCloseConfirmation !== undefined ? result.autoCloseConfirmation : true;
      autoCloseDelay = result.autoCloseDelay !== undefined ? result.autoCloseDelay : 10000;
      autoConfirm = result.autoConfirm === true;
      
      // Update UI
      addonEnabledCheckbox.checked = addonEnabled;
      autoCloseConfirmationCheckbox.checked = autoCloseConfirmation;
      autoConfirmCheckbox.checked = autoConfirm;
      updateAutoCloseDelayUI();
      ensureEmailSuggestionsDatalist();
      updateEmailSuggestionsFromRules(currentRules);
      renderRules();
      updateSyncSizeWarning(currentRules);
    }).catch((error) => {
      console.error('Error loading configuration:', error);
      addonEnabled = true;
      currentRules = [];
      autoCloseConfirmation = true;
      autoCloseDelay = 10000;
      addonEnabledCheckbox.checked = addonEnabled;
      autoCloseConfirmationCheckbox.checked = autoCloseConfirmation;
      updateAutoCloseDelayUI();
      ensureEmailSuggestionsDatalist();
      updateEmailSuggestionsFromRules(currentRules);
      renderRules();
    });
  }

  function ensureEmailSuggestionsDatalist() {
    if (document.getElementById(emailSuggestionsDatalistId)) return;
    const datalist = document.createElement('datalist');
    datalist.id = emailSuggestionsDatalistId;
    document.body.appendChild(datalist);
  }

  function getEmailCountsFromRules(rules) {
    const counts = new Map();
    (rules || []).forEach((r) => {
      const email = (r && r.email ? String(r.email).trim() : '');
      if (!email) return;
      counts.set(email, (counts.get(email) || 0) + 1);
    });
    return counts;
  }

  function updateEmailSuggestionsFromRules(rules) {
    ensureEmailSuggestionsDatalist();
    const datalist = document.getElementById(emailSuggestionsDatalistId);
    if (!datalist) return;

    const counts = getEmailCountsFromRules(rules);
    const emails = Array.from(counts.entries())
      .sort((a, b) => {
        // Most common first; tiebreak by lexicographic order for stability
        const byCount = b[1] - a[1];
        if (byCount !== 0) return byCount;
        return a[0].localeCompare(b[0]);
      })
      .map(([email]) => email);

    datalist.innerHTML = '';
    emails.forEach((email) => {
      const option = document.createElement('option');
      option.value = email;
      datalist.appendChild(option);
    });
  }

  function collectRulesFromForm() {
    const updatedRules = [];
    const ruleElements = rulesContainer.querySelectorAll('.rule');

    ruleElements.forEach((ruleElement, index) => {
      const enabled = ruleElement.querySelector(`#enabled-${index}`).checked;
      const name = ruleElement.querySelector(`#name-${index}`).value.trim();
      const urlPattern = ruleElement.querySelector(`#pattern-${index}`).value.trim();
      const email = ruleElement.querySelector(`#email-${index}`).value.trim();
      const autoClosePattern = ruleElement.querySelector(`#auto-close-${index}`).value.trim();

      // Preserve existing rule data like successCount
      const existingRule = currentRules[index] || {};

      updatedRules.push({
        name: name || `Rule ${index + 1}`,
        urlPattern: urlPattern || '',
        email: email || '',
        enabled,
        autoClosePattern: autoClosePattern || '',
        successCount: existingRule.successCount || 0
      });
    });

    return updatedRules;
  }

  function renderRules() {
    rulesContainer.innerHTML = '';

    // Keep the email suggestions list in sync with whatever we currently have stored.
    ensureEmailSuggestionsDatalist();
    updateEmailSuggestionsFromRules(currentRules);
    
    if (currentRules.length === 0) {
      const emptyMessage = document.createElement('p');
      emptyMessage.style.textAlign = 'center';
      emptyMessage.style.color = '#666';
      emptyMessage.style.fontStyle = 'italic';
      emptyMessage.textContent = 'No rules configured yet. Click "Add New Rule" to get started.';
      rulesContainer.appendChild(emptyMessage);
      return;
    }

    currentRules.forEach((rule, index) => {
      const ruleElement = createRuleElement(rule, index);
      rulesContainer.appendChild(ruleElement);
    });
  }

  function createRuleElement(rule, index) {
    const ruleDiv = document.createElement('div');
    ruleDiv.className = 'rule';
    
    // Format success count display
    const successCount = rule.successCount || 0;
    
    // Create rule header
    const ruleHeader = document.createElement('div');
    ruleHeader.className = 'rule-header';
    
    const ruleName = document.createElement('div');
    ruleName.className = 'rule-name';
    if (rule.name) {
      ruleName.textContent = `${rule.name} (${successCount} hit${successCount !== 1 ? 's' : ''})`;
    } else {
      ruleName.textContent = `Rule ${index + 1}`;
    }
    
    const ruleControls = document.createElement('div');
    ruleControls.className = 'rule-controls';
    
    const enabledCheckboxDiv = document.createElement('div');
    enabledCheckboxDiv.className = 'enabled-checkbox';
    
    const enabledInput = document.createElement('input');
    enabledInput.type = 'checkbox';
    enabledInput.id = `enabled-${index}`;
    if (rule.enabled !== false) {
      enabledInput.checked = true;
    }
    
    const enabledLabel = document.createElement('label');
    enabledLabel.htmlFor = `enabled-${index}`;
    enabledLabel.textContent = 'Enabled';
    
    enabledCheckboxDiv.appendChild(enabledInput);
    enabledCheckboxDiv.appendChild(enabledLabel);
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.setAttribute('data-index', index.toString());
    deleteBtn.textContent = 'Delete';
    
    ruleControls.appendChild(enabledCheckboxDiv);
    ruleControls.appendChild(deleteBtn);
    
    ruleHeader.appendChild(ruleName);
    ruleHeader.appendChild(ruleControls);
    
    // Create form rows
    const createFormRow = (labelText, inputId, inputType, inputValue, placeholder, attributes = {}) => {
      const formRow = document.createElement('div');
      formRow.className = 'form-row';
      
      const label = document.createElement('label');
      label.htmlFor = inputId;
      label.textContent = labelText;
      
      const inputContainer = document.createElement('div');
      inputContainer.className = 'input-container';
      
      const input = document.createElement('input');
      input.type = inputType;
      input.id = inputId;
      input.value = inputValue || '';
      input.placeholder = placeholder;

      Object.entries(attributes || {}).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        input.setAttribute(key, String(value));
      });
      
      inputContainer.appendChild(input);
      formRow.appendChild(label);
      formRow.appendChild(inputContainer);
      
      return formRow;
    };
    
    const nameRow = createFormRow('Name:', `name-${index}`, 'text', rule.name, 'e.g., Work SAML, Personal Gmail');
    const patternRow = createFormRow('Match:', `pattern-${index}`, 'text', rule.urlPattern, 'e.g., .*/saml2/.*');
    const emailRow = createFormRow('Email:', `email-${index}`, 'email', rule.email, 'e.g., user@company.com', {
      list: emailSuggestionsDatalistId
    });
    const autoCloseRow = createFormRow('Auto-close:', `auto-close-${index}`, 'text', rule.autoClosePattern, 'e.g., .*done=1');
    
    // Append all elements to ruleDiv
    ruleDiv.appendChild(ruleHeader);
    ruleDiv.appendChild(nameRow);
    ruleDiv.appendChild(patternRow);
    ruleDiv.appendChild(emailRow);
    ruleDiv.appendChild(autoCloseRow);

    // Add event listeners for auto-save
    const enabledCheckbox = ruleDiv.querySelector(`#enabled-${index}`);
    const nameInput = ruleDiv.querySelector(`#name-${index}`);
    const patternInput = ruleDiv.querySelector(`#pattern-${index}`);
    const emailInput = ruleDiv.querySelector(`#email-${index}`);
    const autoCloseInput = ruleDiv.querySelector(`#auto-close-${index}`);

    enabledCheckbox.addEventListener('change', () => autoSave());
    nameInput.addEventListener('input', () => {
      autoSave();
    });
    patternInput.addEventListener('input', () => {
      autoSave();
    });
    emailInput.addEventListener('input', () => {
      // Update the shared email dropdown suggestions from current form state
      updateEmailSuggestionsFromRules(collectRulesFromForm());
      autoSave();
    });
    autoCloseInput.addEventListener('input', () => {
      autoSave();
    });

    // Add event listener for delete button
    deleteBtn.addEventListener('click', () => deleteRule(index));

    return ruleDiv;
  }

  function addNewRule() {
    // Preserve any in-flight edits before re-rendering.
    currentRules = collectRulesFromForm();
    updateEmailSuggestionsFromRules(currentRules);

    const newRule = {
      name: '',
      urlPattern: '',
      email: '',
      enabled: true, // Start as enabled so users can use it immediately
      autoClosePattern: '', // Initialize auto-close pattern
      successCount: 0 // Initialize success count
    };
    
    currentRules.push(newRule);
    renderRules();
    
    // Focus on the first input of the new rule
    setTimeout(() => {
      const newRuleElement = rulesContainer.lastElementChild;
      const firstInput = newRuleElement.querySelector('input[type="text"]');
      if (firstInput) firstInput.focus();
    }, 100);
  }

  function deleteRule(index) {
    if (confirm('Are you sure you want to delete this rule?')) {
      currentRules.splice(index, 1);
      renderRules();
      autoSave(); // Auto-save after deletion
    }
  }

  function resetSuccessCounts() {
    if (confirm('Are you sure you want to reset all rule success counts? This action cannot be undone.')) {
      // Reset success counts for all rules
      currentRules.forEach(rule => {
        rule.successCount = 0;
      });
      
      // Save the updated rules
      browser.storage.sync.set({ rules: currentRules }).then(() => {
        console.log('Success counts reset successfully');
        renderRules(); // Re-render to show updated counts
        updateSyncSizeWarning(currentRules);
      }).catch((error) => {
        console.error('Error resetting success counts:', error);
        updateSyncSizeWarning(currentRules, error);
        alert('Error resetting success counts. Please try again.');
      });
    }
  }

  // Auto-save function with debouncing
  function autoSave() {
    // Clear existing timeout
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }
    
    // Set new timeout for auto-save (300ms delay)
    autoSaveTimeout = setTimeout(() => {
      saveConfiguration(true); // true = silent save (no user notification)
    }, 300);
  }

  // Approximates how Firefox measures an item: key length + JSON value length, in UTF-8 bytes.
  function getRulesSyncBytes(rules) {
    return new TextEncoder().encode(`rules${JSON.stringify(rules)}`).length;
  }

  function updateSyncSizeWarning(rules, saveError = null) {
    if (!syncSizeWarning) return;
    const bytes = getRulesSyncBytes(rules);
    const percent = Math.round((bytes / SYNC_QUOTA_BYTES_PER_ITEM) * 100);
    let message = '';
    if (saveError && bytes <= SYNC_QUOTA_BYTES_PER_ITEM) {
      message = `Settings NOT saved: ${saveError.message}`;
    } else if (bytes > SYNC_QUOTA_BYTES_PER_ITEM) {
      message = `Rules NOT saved: they use ${percent}% of the ${SYNC_QUOTA_BYTES_PER_ITEM / 1024} KB Firefox Sync limit. Remove or shorten rules.`;
    } else if (bytes >= SYNC_QUOTA_BYTES_PER_ITEM * SYNC_SIZE_WARNING_RATIO) {
      message = `Rules use ${percent}% of the ${SYNC_QUOTA_BYTES_PER_ITEM / 1024} KB Firefox Sync limit. Make a backup.`;
    }
    syncSizeWarning.textContent = message;
    syncSizeWarning.style.display = message ? 'block' : 'none';
  }

  function saveConfiguration(silent = false) {
    const updatedRules = collectRulesFromForm();

    // Check if we have at least one rule
    if (updatedRules.length === 0) {
      if (!silent) {
        alert('Please add at least one rule to enable the addon.');
      }
      return;
    }

    // Keep the suggestions list in sync with what we're about to persist.
    updateEmailSuggestionsFromRules(updatedRules);

    // Test regex patterns for rules that have patterns
    for (let i = 0; i < updatedRules.length; i++) {
      const rule = updatedRules[i];
      if (rule.urlPattern && rule.enabled) { // Only validate enabled rules with patterns
        try {
          new RegExp(rule.urlPattern);
        } catch (error) {
          if (!silent) {
            alert(`Invalid regex pattern in rule "${rule.name || `Rule ${i + 1}`}": ${error.message}`);
          }
          return;
        }
      }
      
      // Test auto-close patterns if they exist
      if (rule.autoClosePattern && rule.autoClosePattern.trim()) {
        try {
          new RegExp(rule.autoClosePattern);
        } catch (error) {
          if (!silent) {
            alert(`Invalid auto-close pattern in rule "${rule.name || `Rule ${i + 1}`}": ${error.message}`);
          }
          return;
        }
      }
    }

    // Save to storage
    browser.storage.sync.set({ 
      enabled: addonEnabled,
      rules: updatedRules,
      autoCloseConfirmation,
      autoCloseDelay,
      autoConfirm
    }).then(() => {
      currentRules = updatedRules;
      updateEmailSuggestionsFromRules(currentRules);
      updateSyncSizeWarning(currentRules);
      if (!silent) {
        console.log('Configuration saved successfully');
      }
    }).catch((error) => {
      console.error('Error saving configuration:', error);
      updateSyncSizeWarning(updatedRules, error);
      if (!silent) {
        alert('Error saving configuration. Please try again.');
      }
    });
  }

  function openRestorePage() {
    // File pickers inside extension popups are unreliable because the popup can be destroyed
    // when the native dialog opens. Use a dedicated extension page for restore.
    try {
      Promise.resolve(browser.tabs.create({ url: browser.runtime.getURL('src/restore.html') }))
        .then(() => {
          // Close the popup UI to avoid leaving it hanging behind the restore tab.
          window.close();
        })
        .catch((error) => {
          console.error('Error opening restore page:', error);
          alert('Error opening restore page. Please try again.');
        });
    } catch (error) {
      console.error('Error opening restore page:', error);
      alert('Error opening restore page. Please try again.');
    }
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
    const autoCloseConfirmationValue = normalizeBoolean(parsed.autoCloseConfirmation, true);
    const delayMs = normalizeNonNegativeInt(parsed.autoCloseDelay, 10000) || 10000;

    return {
      enabled,
      autoCloseConfirmation: autoCloseConfirmationValue,
      autoCloseDelay: delayMs,
      autoConfirm: normalizeBoolean(parsed.autoConfirm, false),
      rules: normalizedRules
    };
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

});

