// Default configuration - users should configure this based on their needs
const DEFAULT_CONFIG = {
  // Global addon enabled/disabled state
  "enabled": true,
  
  // Auto-close confirmation pages after account selection
  "autoCloseConfirmation": true,
  
  // Auto-close delay in milliseconds (default: 10 seconds)
  "autoCloseDelay": 10000,
  
  // Example configuration structure:
  // "rules": [
  //   {
  //     "name": "Work SAML",
  //     "urlPattern": ".*/saml2/.*",
  //     "email": "user@company.com",
  //     "enabled": true,
  //     "autoClosePattern": ".*done=1"
  //   },
  //   {
  //     "name": "Personal Gmail",
  //     "urlPattern": ".*/gmail/.*",
  //     "email": "user@gmail.com",
  //     "enabled": true,
  //     "autoClosePattern": ""
  //   }
  // ]
  
  // Leave empty for user configuration
  "rules": []
};

// Track when account selection happens for time-based auto-close
let accountSelectionTime = null;

// Initialize addon when installed or updated
browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // First time installation - set default config
    browser.storage.local.set(DEFAULT_CONFIG).then(() => {
      console.log('Google Account Auto-Chooser: Default configuration initialized');
    }).catch((error) => {
      console.error('Error initializing default configuration:', error);
    });
  } else if (details.reason === 'update') {
    // Update - check if config exists, if not set defaults
    browser.storage.local.get(['rules']).then((result) => {
      if (!result.rules || result.rules.length === 0) {
        return browser.storage.local.set(DEFAULT_CONFIG);
      }
    }).then(() => {
      console.log('Google Account Auto-Chooser: Configuration updated');
    }).catch((error) => {
      console.error('Error updating configuration:', error);
    });
  }
});

// Handle messages from content scripts or popup
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getConfig') {
    // Return current configuration
    browser.storage.local.get(['enabled', 'autoCloseConfirmation', 'autoCloseDelay', 'rules']).then((result) => {
      sendResponse({ success: true, config: result });
    }).catch((error) => {
      sendResponse({ success: false, error: error.message });
    });
    return true; // Keep message channel open for async response
  }
  
  if (message.action === 'setConfig') {
    // Update configuration
    browser.storage.local.set({ 
      enabled: message.enabled !== undefined ? message.enabled : true,
      autoCloseConfirmation: message.autoCloseConfirmation !== undefined ? message.autoCloseConfirmation : true,
      autoCloseDelay: message.autoCloseDelay !== undefined ? message.autoCloseDelay : 10000,
      rules: message.rules 
    }).then(() => {
      sendResponse({ success: true });
    }).catch((error) => {
      sendResponse({ success: false, error: error.message });
    });
    return true; // Keep message channel open for async response
  }
  
  if (message.action === 'resetConfig') {
    // Reset to default configuration
    browser.storage.local.set(DEFAULT_CONFIG).then(() => {
      sendResponse({ success: true });
    }).catch((error) => {
      sendResponse({ success: false, error: error.message });
    });
    return true; // Keep message channel open for async response
  }
  
  if (message.action === 'accountSelected') {
    // Track when account selection happens
    accountSelectionTime = Date.now();
    console.log('Google Account Auto-Chooser: Account selection tracked at:', new Date(accountSelectionTime).toISOString());
    sendResponse({ success: true });
    return true;
  }
  
  if (message.action === 'ruleSucceeded') {
    // Increment success count for the specified rule
    if (message.ruleName) {
      browser.storage.local.get(['rules']).then((result) => {
        const rules = result.rules || [];
        const ruleIndex = rules.findIndex(rule => rule.name === message.ruleName);
        
        if (ruleIndex !== -1) {
          // Initialize successCount if it doesn't exist
          if (!rules[ruleIndex].successCount) {
            rules[ruleIndex].successCount = 0;
          }
          
          // Increment the success count
          rules[ruleIndex].successCount++;
          
          // Save the updated rules
          return browser.storage.local.set({ rules: rules });
        }
      }).then(() => {
        console.log(`Google Account Auto-Chooser: Success count incremented for rule "${message.ruleName}"`);
        sendResponse({ success: true });
      }).catch((error) => {
        console.error('Error updating rule success count:', error);
        sendResponse({ success: false, error: error.message });
      });
    } else {
      sendResponse({ success: false, error: 'No rule name provided' });
    }
    return true;
  }
  
  if (message.action === 'closeTab') {
    // Close the current tab if auto-close is enabled
    browser.storage.local.get(['autoCloseConfirmation', 'autoCloseDelay', 'rules']).then((result) => {
      if (result.autoCloseConfirmation !== false) {
        const currentUrl = message.url;
        let shouldClose = false;
        let matchingRule = null;
        
        // Only close if there's a specific pattern that matches
        if (result.rules && result.rules.length > 0) {
          for (const rule of result.rules) {
            if (rule.enabled && rule.autoClosePattern && rule.autoClosePattern.trim()) {
              try {
                const regex = new RegExp(rule.autoClosePattern);
                if (regex.test(currentUrl)) {
                  matchingRule = rule;
                  break;
                }
              } catch (error) {
                console.error('Invalid auto-close pattern in rule:', rule.name, error);
              }
            }
          }
        }
        
        if (matchingRule) {
          // Check if we're within the time window for auto-close
          const currentTime = Date.now();
          const timeSinceSelection = accountSelectionTime ? currentTime - accountSelectionTime : null;
          const delayMs = result.autoCloseDelay || 10000;
          
          if (timeSinceSelection !== null && timeSinceSelection <= delayMs) {
            // Within time window - proceed with auto-close
            shouldClose = true;
            console.log(`Google Account Auto-Chooser: Auto-closing tab for rule "${matchingRule.name}" (${timeSinceSelection}ms after account selection)`);
          } else if (timeSinceSelection !== null) {
            // Outside time window - log message but don't close
            console.log(`Google Account Auto-Chooser: Match found for rule "${matchingRule.name}" but outside time window (${timeSinceSelection}ms > ${delayMs}ms limit)`);
            sendResponse({ success: true, outsideTimeWindow: true, ruleName: matchingRule.name, timeSinceSelection, delayMs });
            return;
          } else {
            // No account selection tracked - don't close
            console.log('Google Account Auto-Chooser: No account selection time tracked, skipping auto-close');
            sendResponse({ success: true, noAccountSelection: true });
            return;
          }
        }
        
        if (shouldClose) {
          browser.tabs.remove(sender.tab.id).then(() => {
            console.log('Google Account Auto-Chooser: Tab closed automatically');
            sendResponse({ success: true });
          }).catch((error) => {
            console.error('Error closing tab:', error);
            sendResponse({ success: false, error: error.message });
          });
        } else {
          sendResponse({ success: true, noPatternMatch: true });
        }
      } else {
        sendResponse({ success: true, autoCloseDisabled: true });
      }
    }).catch((error) => {
      console.error('Error checking auto-close configuration:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true; // Keep message channel open for async response
  }
});

// Log addon startup
console.log('Google Account Auto-Chooser: Background script loaded');
