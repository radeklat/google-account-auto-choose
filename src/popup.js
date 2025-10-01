// Popup script for managing configuration rules
document.addEventListener('DOMContentLoaded', function() {
  const rulesContainer = document.getElementById('rules-container');
  const addRuleBtn = document.getElementById('add-rule-btn');
  const helpToggle = document.getElementById('help-toggle');
  const addonEnabledCheckbox = document.getElementById('addon-enabled');
  const autoCloseConfirmationCheckbox = document.getElementById('auto-close-confirmation');
  const resetSuccessCountsBtn = document.getElementById('reset-success-counts');

  let currentRules = [];
  let addonEnabled = true;
  let autoCloseConfirmation = true;
  let autoCloseDelay = 10000; // Default 10 seconds
  let autoSaveTimeout = null;

  // Load existing configuration
  loadConfiguration();

  // Event listeners
  addRuleBtn.addEventListener('click', addNewRule);
  helpToggle.addEventListener('click', toggleHelp);
  resetSuccessCountsBtn.addEventListener('click', resetSuccessCounts);
  addonEnabledCheckbox.addEventListener('change', () => {
    updateAddonEnabled();
    autoSave();
  });
  autoCloseConfirmationCheckbox.addEventListener('change', () => {
    updateAutoCloseConfirmation();
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

  function loadConfiguration() {
    browser.storage.local.get(['enabled', 'rules', 'autoCloseConfirmation', 'autoCloseDelay']).then((result) => {
      addonEnabled = result.enabled !== undefined ? result.enabled : true;
      currentRules = result.rules || [];
      autoCloseConfirmation = result.autoCloseConfirmation !== undefined ? result.autoCloseConfirmation : true;
      autoCloseDelay = result.autoCloseDelay !== undefined ? result.autoCloseDelay : 10000;
      
      // Update UI
      addonEnabledCheckbox.checked = addonEnabled;
      autoCloseConfirmationCheckbox.checked = autoCloseConfirmation;
      updateAutoCloseDelayUI();
      renderRules();
    }).catch((error) => {
      console.error('Error loading configuration:', error);
      addonEnabled = true;
      currentRules = [];
      autoCloseConfirmation = true;
      autoCloseDelay = 10000;
      addonEnabledCheckbox.checked = addonEnabled;
      autoCloseConfirmationCheckbox.checked = autoCloseConfirmation;
      updateAutoCloseDelayUI();
      renderRules();
    });
  }

  function renderRules() {
    rulesContainer.innerHTML = '';
    
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
    ruleName.textContent = rule.name || `Rule ${index + 1} (${successCount} hit${successCount !== 1 ? 's' : ''})`;
    
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
    const createFormRow = (labelText, inputId, inputType, inputValue, placeholder) => {
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
      
      inputContainer.appendChild(input);
      formRow.appendChild(label);
      formRow.appendChild(inputContainer);
      
      return formRow;
    };
    
    const nameRow = createFormRow('Name:', `name-${index}`, 'text', rule.name, 'e.g., Work SAML, Personal Gmail');
    const patternRow = createFormRow('Match:', `pattern-${index}`, 'text', rule.urlPattern, 'e.g., .*/saml2/.*');
    const emailRow = createFormRow('Email:', `email-${index}`, 'email', rule.email, 'e.g., user@company.com');
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
      browser.storage.local.set({ rules: currentRules }).then(() => {
        console.log('Success counts reset successfully');
        renderRules(); // Re-render to show updated counts
      }).catch((error) => {
        console.error('Error resetting success counts:', error);
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

  function saveConfiguration(silent = false) {
    // Collect all rule data from the form
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
        enabled: enabled,
        autoClosePattern: autoClosePattern || '',
        successCount: existingRule.successCount || 0
      });
    });

    // Check if we have at least one rule
    if (updatedRules.length === 0) {
      if (!silent) {
        alert('Please add at least one rule to enable the addon.');
      }
      return;
    }

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
    browser.storage.local.set({ 
      enabled: addonEnabled,
      rules: updatedRules,
      autoCloseConfirmation: autoCloseConfirmation,
      autoCloseDelay: autoCloseDelay
    }).then(() => {
      currentRules = updatedRules;
      if (!silent) {
        console.log('Configuration saved successfully');
      }
    }).catch((error) => {
      console.error('Error saving configuration:', error);
      if (!silent) {
        alert('Error saving configuration. Please try again.');
      }
    });
  }
});

