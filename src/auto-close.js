// Content script for auto-closing confirmation pages
(function() {
  'use strict';

  // Check if this is a confirmation page that should be auto-closed
  isConfirmationPage().then((shouldClose) => {
    if (shouldClose) {
      closePage();
    }
  });

  // Check if current page is a confirmation page that should be auto-closed
  function isConfirmationPage() {
    // Check if current URL matches any configured auto-close patterns
    const currentUrl = window.location.href;
    
    // Request configuration to check auto-close patterns
    return browser.runtime.sendMessage({ action: 'getConfig' })
      .then((response) => {
        if (response.success && response.config.autoCloseConfirmation && response.config.rules) {
          // Check if current URL matches any enabled auto-close pattern
          for (const rule of response.config.rules) {
            if (rule.enabled && rule.autoClosePattern && rule.autoClosePattern.trim()) {
              try {
                const regex = new RegExp(rule.autoClosePattern);
                if (regex.test(currentUrl)) {
                  return true;
                }
              } catch (error) {
                console.error('Invalid auto-close pattern in rule:', rule.name, error);
              }
            }
          }
        }
        return false;
      })
      .catch((error) => {
        console.error('Error checking auto-close configuration:', error);
        return false;
      });
  }

  // Handle confirmation page - request tab closing
  function closePage() {
    // Send message to background script to close the tab
    browser.runtime.sendMessage({ 
      action: 'closeTab',
      url: window.location.href
    }).then((response) => {
      if (!(response.success)) {
        console.error('Error requesting tab close:', response.error);
      } else if (response.outsideTimeWindow) {
        // Log message about match found but outside time window
        console.log(`Google Account Auto-Chooser: Match found for rule "${response.ruleName}" but outside time window (${response.timeSinceSelection}ms > ${response.delayMs}ms limit)`);
      } else if (response.noAccountSelection) {
        // Log message about no account selection tracked
        console.log('Google Account Auto-Chooser: No account selection time tracked, skipping auto-close');
      }
    }).catch((error) => {
      console.error('Error sending close tab message:', error);
    });
  }

})();
