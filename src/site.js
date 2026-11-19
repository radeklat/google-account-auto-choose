// Site ID extraction from Google sign-in URLs and `*` pattern matching.
// See documentation/SITE_ID_EXTRACTION.md before adding a new source.
// Shared with account-chooser.js via globalThis (content scripts share one sandbox).
globalThis.SiteMatcher = (() => {
  'use strict';

  const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

  function parseUrl(value) {
    try {
      return value ? new URL(value) : null;
    } catch {
      return null;
    }
  }

  // Only http(s): GIS popups use redirect_uri like `storagerelay://https/host?id=…`
  function webHostname(value) {
    const url = parseUrl(value);
    if (!url || (url.protocol !== 'https:' && url.protocol !== 'http:')) return null;
    return url.hostname.toLowerCase() || null;
  }

  function isLocal(hostname) {
    return LOCAL_HOSTS.has(hostname);
  }

  // HTTP-Redirect binding: base64(DEFLATE(XML)). HTTP-POST binding (`omethod=POST`): base64(XML).
  const AUTHN_REQUEST = /<(?:[\w-]+:)?AuthnRequest\b([^>]*)>/g;

  async function decodeSamlRequest(value) {
    // `+` becomes a space if the value was decoded one time too many
    const bytes = Uint8Array.from(atob(value.replace(/ /g, '+')), (c) => c.charCodeAt(0));
    const plain = new TextDecoder().decode(bytes);
    // Raw DEFLATE can also start with `<`, so require the element too
    if (plain.replace(/^\uFEFF/, '').trimStart().startsWith('<') && plain.match(AUTHN_REQUEST)) return plain;
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Response(stream).text();
  }

  async function samlSiteId(continueUrl) {
    const samlRequest = continueUrl && continueUrl.pathname.includes('/saml2/')
      && continueUrl.searchParams.get('SAMLRequest');
    if (!samlRequest) return null;
    try {
      // No DOMParser in tests; strip comments so a commented-out element cannot spoof the real one
      const xml = (await decodeSamlRequest(samlRequest)).replace(/<!--[\s\S]*?-->/g, '');
      const requests = [...xml.matchAll(AUTHN_REQUEST)];
      const issuers = [...xml.matchAll(/<(?:[\w-]+:)?Issuer\b[^>]*>\s*([^<]+?)\s*<\/(?:[\w-]+:)?Issuer>/g)];
      if (requests.length !== 1 || issuers.length !== 1) return null;

      // Brokers (e.g. Okta) send a generic Issuer (www.okta.com); ACS URL is on the app's own host
      // Tokenize in order, so a lookalike inside another attribute's value is skipped
      const acs = [...requests[0][1].matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)]
        .find((attr) => attr[1] === 'AssertionConsumerServiceURL');
      const acsHost = acs && webHostname(acs[2] ?? acs[3]);
      if (acsHost && !isLocal(acsHost)) return acsHost;

      const issuer = issuers[0][1];
      // Entity ID may be a URN, not a URL
      return webHostname(issuer) || issuer;
    } catch (error) {
      console.error('Cannot decode SAMLRequest:', error);
      return null;
    }
  }

  // Returns a stable ID (usually a hostname) of the app that asks for sign-in, or null
  async function extractSiteId(href) {
    const url = parseUrl(href);
    if (!url) return null;
    const params = url.searchParams;
    const continueUrl = parseUrl(params.get('continue'));

    // 1. OAuth / OIDC
    const appHost = webHostname(params.get('app_domain')) || webHostname(params.get('redirect_uri'));
    if (appHost && !isLocal(appHost)) return appHost;

    // 2. SAML
    const samlId = await samlSiteId(continueUrl);
    if (samlId) return samlId;

    // 3. Google's own services, e.g. continue=https://mail.google.com/…
    const continueHost = continueUrl && webHostname(continueUrl.href);
    if (continueHost && continueHost !== 'accounts.google.com' && !isLocal(continueHost)) return continueHost;

    // 4. Local CLI apps (gcloud) or nothing else found
    const clientId = params.get('client_id') || (continueUrl && continueUrl.searchParams.get('client_id'));
    return clientId ? clientId.toLowerCase() : null;
  }

  function patternToRegExp(pattern) {
    const escaped = pattern.trim().toLowerCase().split('*')
      .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
      .join('.*');
    return new RegExp(`^${escaped}$`);
  }

  // `*` matches any characters, dots included. Case-insensitive, whole ID.
  function matchesSite(pattern, siteId) {
    if (!pattern || !pattern.trim() || !siteId) return false;
    return patternToRegExp(pattern).test(siteId.toLowerCase());
  }

  return { extractSiteId, matchesSite };
})();
