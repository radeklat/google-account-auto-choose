// Content script for Google account selection functionality
(function() {
  'use strict';

  // Configuration and state
  let config = { enabled: true, rules: [] };
  let isProcessing = false;
  let successfulRulesThisSession = new Set(); // Track successful rules in current session

  // Initialize the account chooser functionality
  function init() {
    
    // Check if we're on a Google account chooser page
    if (isAccountChooserPage()) {
      // Handle Google account selection
      loadConfiguration().then(() => {
        // Only process if addon is enabled and there are rules
        if (config.enabled && config.rules.length > 0) {
          processAccountSelection();
        } else if (!config.enabled) {
          console.log('Google Account Auto-Chooser is disabled');
        } else {
          console.log('No rules configured for Google Account Auto-Chooser');
        }
      }).catch((error) => {
        console.error('Error loading configuration:', error);
      });
      return;
    }

    return;
  }

  // Check if current page is Google account chooser
  function isAccountChooserPage() {
    return window.location.href.includes('accounts.google.com');
  }

  // Check if this is a new login session (different from previous URL)
  function isNewLoginSession(currentUrl) {
    // If we don't have a previous URL, this is a new session
    if (!lastUrl) {
      return true;
    }
    
    // If the previous URL was not a Google account page, this is a new session
    if (!lastUrl.includes('accounts.google.com')) {
      return true;
    }
    
    // If the current URL is significantly different (different domain or major path change)
    // this might be a new login session
    const currentDomain = new URL(currentUrl).hostname;
    const lastDomain = new URL(lastUrl).hostname;
    
    if (currentDomain !== lastDomain) {
      return true;
    }
    
    // Check if this is a fresh account chooser page (not a redirect)
    if (currentUrl.includes('/accountchooser') && !lastUrl.includes('/accountchooser')) {
      return true;
    }
    
    return false;
  }

  // Load configuration from storage
  function loadConfiguration() {
    return browser.storage.local.get(['enabled', 'rules']).then((result) => {
      config.enabled = result.enabled !== undefined ? result.enabled : true;
      config.rules = result.rules || [];
      return config;
    });
  }

  // Main processing function
  function processAccountSelection() {
    if (isProcessing) {
      return;
    }

    isProcessing = true;
    
    try {
      const fullUrl = window.location.href;
      if (!fullUrl) {
        console.log('No URL found, skipping auto-selection');
        isProcessing = false;
        return;
      }

      const matchingRule = findMatchingRule(fullUrl);
      if (!matchingRule) {
        console.log('No matching rule found for URL:', fullUrl);
        isProcessing = false;
        return;
      }

      // Wait for accounts to load and then select the matching one
      waitForAccounts().then(() => {
        selectAccount(matchingRule);
      }).catch((error) => {
        console.error('Error waiting for accounts:', error);
        isProcessing = false;
      });

    } catch (error) {
      console.error('Error processing account selection:', error);
      isProcessing = false;
    }
  }

  // Find a rule that matches the full URL
  function findMatchingRule(fullUrl) {
    for (const rule of config.rules) {
      // Skip disabled rules
      if (rule.enabled === false) {
        continue;
      }
      
      try {
        const regex = new RegExp(rule.urlPattern);
        if (regex.test(fullUrl)) {
          return rule;
        }
      } catch (error) {
        console.error('Invalid regex pattern in rule:', rule.name, error);
      }
    }
    return null;
  }

  // Wait for account elements to appear on the page
  function waitForAccounts() {
    return new Promise((resolve, reject) => {
      const maxAttempts = 50; // 5 seconds with 100ms intervals
      let attempts = 0;

      const checkForAccounts = () => {
        attempts++;
        
        const accounts = document.querySelectorAll('[data-email]');
        if (accounts.length > 0) {
          resolve(accounts);
          return;
        }

        if (attempts >= maxAttempts) {
          reject(new Error('Timeout waiting for accounts to load'));
          return;
        }

        setTimeout(checkForAccounts, 100);
      };

      checkForAccounts();
    });
  }

  // Select the account with the specified email
  function selectAccount(rule) {
    const accounts = document.querySelectorAll('[data-email]');
    
    for (const account of accounts) {
      const email = account.getAttribute('data-email');
      
      if (email === rule.email) {
        // Find the clickable parent element
        const clickableElement = findClickableParent(account);
        
        if (clickableElement) {
          // Track account selection for time-based auto-close
          browser.runtime.sendMessage({ action: 'accountSelected' }).catch((error) => {
            console.error('Error tracking account selection:', error);
          });
          
          // Track successful rule execution
          if (rule && rule.name) {
            // Only track success if this rule hasn't succeeded in this session yet
            if (!successfulRulesThisSession.has(rule.name)) {
              successfulRulesThisSession.add(rule.name);
              browser.runtime.sendMessage({ 
                action: 'ruleSucceeded', 
                ruleName: rule.name 
              }).catch((error) => {
                console.error('Error tracking rule success:', error);
              });
            }
          }
          
          clickableElement.click();
          isProcessing = false;
          return;
        }
        
        console.error('Could not find clickable element for account:', email);
        isProcessing = false;
        return;
      }
    }
    
    console.error('Account not found:', rule.email);
    isProcessing = false;
    return;
  }

  // Find the clickable parent element (usually a button or div with click handlers)
  function findClickableParent(accountElement) {
    // Look for common clickable selectors
    const clickableSelectors = [
      'button',
      '[role="button"]',
      '[jsname]',
      '.yAlK0b', // Google's account container class
      '[tabindex]'
    ];

    // Check the account element itself
    for (const selector of clickableSelectors) {
      if (accountElement.matches(selector)) {
        return accountElement;
      }
    }

    // Check parent elements
    let parent = accountElement.parentElement;
    while (parent && parent !== document.body) {
      for (const selector of clickableSelectors) {
        if (parent.matches(selector)) {
          return parent;
        }
      }
      
      // Also check if parent has click event listeners or is interactive
      if (parent.onclick || parent.getAttribute('tabindex') !== null) {
        return parent;
      }
      
      parent = parent.parentElement;
    }

    // Fallback: return the account element itself
    return accountElement;
  }

  // Start processing when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Also listen for navigation changes (for SPA-like behavior)
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      // Check if this is a new login session
      if (isNewLoginSession(url)) {
        // Reset session tracking for new login sessions
        successfulRulesThisSession.clear();
      }
      
      lastUrl = url;
      if (isAccountChooserPage()) {
        setTimeout(init, 100); // Small delay to ensure page is loaded
      }
    }
  }).observe(document, { subtree: true, childList: true });

})();
