// Content script for Google account selection functionality
(function() {
  'use strict';

  const { extractSiteId, matchesSite } = globalThis.SiteMatcher;
  const PROMPT_ID = 'google-account-auto-chooser-prompt';

  // Configuration and state
  const config = { enabled: true, autoConfirm: false, passkeyPromptDelay: 5000, showNotification: false, rules: [] };
  let isProcessing = false;
  const successfulRulesThisSession = new Set(); // Track successful rules in current session
  const confirmedUrls = new Set(); // Avoid clicking the same confirmation page twice

  // Initialize the account chooser functionality
  function init() {
    
    // Check if we're on a Google account chooser page
    if (isAccountChooserPage()) {
      // Handle Google account selection
      loadConfiguration().then(() => {
        if (!config.enabled) {
          console.log('Google Account Auto-Chooser is disabled');
        } else if (isPasskeyPage() || isConsentPage()) {
          if (config.rules.length > 0) {
            processConfirmation();
          }
        } else {
          // Runs without rules too, to offer a new rule
          processAccountSelection();
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

  // "Use your passkey to confirm it's really you" page
  function isPasskeyPage() {
    return window.location.pathname.includes('/challenge/pk');
  }

  function isAccountChooserPath() {
    return window.location.pathname.includes('/accountchooser');
  }

  // OAuth "<app> wants access to your Google Account" page
  function isConsentPage() {
    return /\/signin\/oauth\/.*consent/.test(window.location.pathname);
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
    return browser.storage.sync.get(['enabled', 'rules', 'autoConfirm', 'passkeyPromptDelay', 'showNotification']).then((result) => {
      config.enabled = result.enabled !== undefined ? result.enabled : true;
      config.autoConfirm = result.autoConfirm === true;
      config.passkeyPromptDelay = Number.isFinite(result.passkeyPromptDelay) && result.passkeyPromptDelay >= 0
        ? result.passkeyPromptDelay
        : 5000;
      config.showNotification = result.showNotification === true;
      config.rules = result.rules || [];
      return config;
    });
  }

  async function processAccountSelection() {
    if (isProcessing) {
      return;
    }
    isProcessing = true;
    const href = window.location.href;
    // SPA navigation during the waits: init() was skipped, so run again for the new URL
    const urlChanged = () => window.location.href !== href;
    let restart = false;

    try {
      const siteId = await extractSiteId(href);
      if (!siteId) {
        console.log('No site ID found, skipping auto-selection');
        return;
      }
      console.log('Site ID:', siteId);

      const matchingRule = findMatchingRule(siteId);
      if (matchingRule) {
        await waitForAccounts();
        restart = urlChanged();
        if (!restart) {
          selectAccount(matchingRule);
        }
      } else if (isAccountChooserPath() && !config.rules.some((rule) => matchesSite(rule.site, siteId))) {
        // Disabled rule for the site also stops the prompt ("Never ask")
        await waitForAccounts();
        restart = urlChanged();
        if (!restart) {
          showNewSitePrompt(siteId);
        }
      } else {
        console.log('No enabled rule for site:', siteId);
      }
    } catch (error) {
      console.error('Error processing account selection:', error);
    } finally {
      isProcessing = false;
    }
    if (restart) {
      init();
    }
  }

  function findMatchingRule(siteId) {
    return config.rules.find((rule) => rule.enabled !== false && matchesSite(rule.site, siteId)) || null;
  }

  // Wait for an element matching the selector to appear on the page
  function waitForElement(selector) {
    return new Promise((resolve, reject) => {
      const maxAttempts = 50; // 5 seconds with 100ms intervals
      let attempts = 0;

      const check = () => {
        attempts++;

        const element = document.querySelector(selector);
        if (element) {
          resolve(element);
          return;
        }

        if (attempts >= maxAttempts) {
          reject(new Error(`Timeout waiting for element: ${selector}`));
          return;
        }

        setTimeout(check, 100);
      };

      check();
    });
  }

  // Wait for account elements to appear on the page
  function waitForAccounts() {
    return waitForElement('[data-email]');
  }

  // Click "Continue" on passkey page or "Allow" on consent page
  function processConfirmation() {
    const url = window.location.href;
    if (!config.autoConfirm || confirmedUrls.has(url)) {
      return;
    }

    // Google button ids/jsnames, not labels, so it works in any UI language
    const selector = isConsentPage()
      ? '#submit_approve_access button'
      : '[data-primary-action-label] [jsname="Njthtb"] button';

    confirmedUrls.add(url);
    let userClicked = false;
    waitForElement(selector).then((button) => {
      // Password managers (1Password) miss the WebAuthn request if "Continue" is clicked too early
      if (isConsentPage() || config.passkeyPromptDelay <= 0) {
        return button;
      }
      // Document level, Google may replace the button during the delay
      const onUserClick = (event) => {
        if (event.isTrusted && event.target.closest(selector)) {
          userClicked = true;
          document.removeEventListener('click', onUserClick, true);
          trackConfirmation();
        }
      };
      document.addEventListener('click', onUserClick, true);
      return new Promise((resolve) => setTimeout(resolve, config.passkeyPromptDelay)).then(() => {
        document.removeEventListener('click', onUserClick, true);
        // Second click would restart the passkey prompt the user already opened
        if (userClicked || window.location.href !== url) {
          return null;
        }
        return waitForElement(selector);
      });
    }).then((button) => {
      if (!button) {
        return;
      }

      // Grant consent only for accounts configured in enabled rules
      if (isConsentPage()) {
        const account = document.querySelector('[data-email]');
        const email = account && account.getAttribute('data-email');
        if (!config.rules.some((rule) => rule.enabled !== false && rule.email === email)) {
          console.log('Consent page account not in any enabled rule, skipping auto-confirm');
          return;
        }
      }

      trackConfirmation();
      button.click();
    }).catch((error) => {
      confirmedUrls.delete(url);
      console.error('Error waiting for confirmation button:', error);
    });
  }

  // Restart auto-close time window, user may have spent time on passkey prompt
  function trackConfirmation() {
    browser.runtime.sendMessage({ action: 'accountSelected' }).catch((error) => {
      console.error('Error tracking confirmation:', error);
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
          
          if (config.showNotification) {
            browser.runtime.sendMessage({
              action: 'notifyRuleMatched',
              ruleName: rule.name || rule.email,
              email: rule.email
            }).catch((error) => {
              console.error('Error showing notification:', error);
            });
          }

          clickableElement.click();
          return;
        }
        
        console.error('Could not find clickable element for account:', email);
        return;
      }
    }
    
    console.error('Account not found:', rule.email);
  }

  async function addRule(rule) {
    const { rules = [] } = await browser.storage.sync.get(['rules']);
    rules.push(rule);
    await browser.storage.sync.set({ rules });
    config.rules = rules;
  }

  function el(tag, props = {}, children = []) {
    const element = Object.assign(document.createElement(tag), props);
    element.append(...children);
    return element;
  }

  const PROMPT_CSS = `
    .card { position: fixed; top: 16px; right: 16px; z-index: 2147483647; width: 340px; box-sizing: border-box;
      padding: 14px 16px; background: #fff; color: #202124; border: 1px solid #dadce0; border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2); font: 13px/1.4 Roboto, Arial, sans-serif; }
    .head { display: flex; justify-content: space-between; align-items: center; font-weight: 600; color: #1a73e8; }
    .close { border: none; background: none; font-size: 18px; cursor: pointer; color: #5f6368; padding: 0 4px; }
    p { margin: 8px 0; }
    label { display: block; margin-top: 8px; font-weight: 500; }
    input { width: 100%; box-sizing: border-box; margin-top: 2px; padding: 5px 8px; border: 1px solid #dadce0;
      border-radius: 4px; font: inherit; }
    .hint { color: #5f6368; font-size: 12px; margin-top: 2px; }
    .emails { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; }
    .email { padding: 7px 10px; border: none; border-radius: 4px; background: #1a73e8; color: #fff; font: inherit;
      cursor: pointer; text-align: left; overflow: hidden; text-overflow: ellipsis; }
    .email:hover { background: #1765cc; }
    .error { color: #d93025; }
    .error:empty { display: none; }
    .never { margin-top: 10px; border: none; background: none; padding: 0; color: #5f6368; font: inherit;
      text-decoration: underline; cursor: pointer; }
  `;

  // Offer to create a rule for a site without one
  function showNewSitePrompt(siteId) {
    if (document.getElementById(PROMPT_ID)) {
      return;
    }
    const emails = [...new Set(Array.from(document.querySelectorAll('[data-email]'),
      (account) => account.getAttribute('data-email')).filter(Boolean))];
    if (emails.length === 0) {
      return;
    }

    const host = el('div', { id: PROMPT_ID });
    const siteInput = el('input', { value: siteId, spellcheck: false });
    const nameInput = el('input', { value: siteId });
    const error = el('p', { className: 'error' });

    const save = async (rule) => {
      const site = siteInput.value.trim();
      if (!matchesSite(site, siteId)) {
        error.textContent = `Site does not match ${siteId}.`;
        return null;
      }
      const newRule = { name: nameInput.value.trim() || site, site, autoClosePattern: '', successCount: 0, ...rule };
      try {
        await addRule(newRule);
      } catch (saveError) {
        error.textContent = `Rule not saved: ${saveError.message}`;
        return null;
      }
      host.remove();
      return newRule;
    };

    const emailButtons = emails.map((email) => {
      const button = el('button', { className: 'email', textContent: email, title: email });
      button.addEventListener('click', async () => {
        const rule = await save({ email, enabled: true });
        if (rule) {
          selectAccount(rule);
        }
      });
      return button;
    });

    const closeButton = el('button', { className: 'close', textContent: '\u00d7', title: 'Close' });
    closeButton.addEventListener('click', () => host.remove());
    const neverButton = el('button', { className: 'never', textContent: 'Never ask for this site' });
    neverButton.addEventListener('click', () => save({ email: '', enabled: false }));

    const root = host.attachShadow({ mode: 'closed' });
    root.append(
      el('style', { textContent: PROMPT_CSS }),
      el('div', { className: 'card' }, [
        el('div', { className: 'head' }, ['Google Account Auto-Chooser', closeButton]),
        el('p', { textContent: 'No rule for this site. Pick the account to always use here.' }),
        el('label', { textContent: 'Site' }, [siteInput]),
        el('div', { className: 'hint', textContent: '* matches any text, e.g. app.*.example.com' }),
        el('label', { textContent: 'Name' }, [nameInput]),
        el('div', { className: 'emails' }, emailButtons),
        error,
        neverButton
      ])
    );
    document.body.appendChild(host);
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
      const prompt = document.getElementById(PROMPT_ID);
      if (prompt) {
        prompt.remove();
      }
      if (isAccountChooserPage()) {
        setTimeout(init, 100); // Small delay to ensure page is loaded
      }
    }
  }).observe(document, { subtree: true, childList: true });

})();
