const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const zlib = require('node:zlib');

vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'src', 'site.js'), 'utf8'));
const { extractSiteId, matchesSite } = globalThis.SiteMatcher;

const GCLOUD_CLIENT_ID = '32555940559.apps.googleusercontent.com';

function url(base, params) {
  return `${base}?${new URLSearchParams(params)}`;
}

function chooser(params) {
  return url('https://accounts.google.com/v3/signin/accountchooser', params);
}

function oauthChooser({ clientId = '123-abc.apps.googleusercontent.com', redirectUri, appDomain }) {
  const params = {
    client_id: clientId,
    response_type: 'code',
    continue: url('https://accounts.google.com/signin/oauth/v3/consent', { authuser: 'unknown', client_id: clientId }),
  };
  if (redirectUri) params.redirect_uri = redirectUri;
  if (appDomain) params.app_domain = appDomain;
  return chooser(params);
}

function samlChooser(issuer, { extra = '', attrs = '', binding = 'redirect' } = {}) {
  const xml = '<?xml version="1.0" encoding="UTF-8"?>'
    + '<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" '
    + `xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ID="_1" Version="2.0"${attrs}>`
    + `${extra}<saml:Issuer>${issuer}</saml:Issuer></samlp:AuthnRequest>`;
  const continueParams = { idpid: 'C0abc' };
  if (binding === 'post') {
    continueParams.SAMLRequest = Buffer.from(xml).toString('base64');
    continueParams.omethod = 'POST';
  } else {
    continueParams.SAMLRequest = zlib.deflateRawSync(Buffer.from(xml)).toString('base64');
  }
  return chooser({
    continue: url('https://accounts.google.com/o/saml2/continue', continueParams),
    flowName: 'GlifWebSignIn',
  });
}

test('OAuth: host of app_domain', async () => {
  const href = oauthChooser({
    redirectUri: 'https://app.dev.example.com/auth/callback',
    appDomain: 'https://app.dev.example.com',
  });
  assert.equal(await extractSiteId(href), 'app.dev.example.com');
});

test('OAuth: host of redirect_uri without app_domain', async () => {
  const href = oauthChooser({ redirectUri: 'https://app.example.com:8443/signin' });
  assert.equal(await extractSiteId(href), 'app.example.com');
});

test('OAuth: non-http redirect_uri is ignored', async () => {
  const href = oauthChooser({ clientId: 'gis-id', redirectUri: 'storagerelay://https/app.example.com?id=auth1' });
  assert.equal(await extractSiteId(href), 'gis-id');
});

test('OAuth: localhost falls back to client_id', async () => {
  const href = oauthChooser({
    clientId: GCLOUD_CLIENT_ID,
    redirectUri: 'http://localhost:8085/',
    appDomain: 'http://localhost:8085',
  });
  assert.equal(await extractSiteId(href), GCLOUD_CLIENT_ID);
});

test('client_id from continue when not top-level', async () => {
  const href = chooser({ continue: url('https://accounts.google.com/signin/oauth/v3/consent', { client_id: 'Inner-ID' }) });
  assert.equal(await extractSiteId(href), 'inner-id');
});

test('SAML: host of Issuer', async () => {
  assert.equal(await extractSiteId(samlChooser('https://vpn.example.com/saml/sp/metadata/user')), 'vpn.example.com');
});

test('SAML: URN Issuer as is', async () => {
  assert.equal(await extractSiteId(samlChooser('urn:amazon:webservices')), 'urn:amazon:webservices');
});

test('SAML: HTTP-POST binding (not deflated)', async () => {
  assert.equal(await extractSiteId(samlChooser('https://vpn.example.com/sp', { binding: 'post' })), 'vpn.example.com');
});

test('SAML: ACS URL host wins over broker Issuer', async () => {
  const href = samlChooser('https://www.okta.com/saml2/service-provider/spabc', {
    binding: 'post',
    attrs: ' AssertionConsumerServiceURL="https://auth.example.com/sso/saml2/0oa123"',
  });
  assert.equal(await extractSiteId(href), 'auth.example.com');
});

for (const binding of ['redirect', 'post']) {
  test(`SAML (${binding}): ACS URL inside another attribute value is ignored`, async () => {
    const href = samlChooser('https://vpn.example.com/sp', {
      binding,
      attrs: ` ProviderName="Service\nAssertionConsumerServiceURL='https://trusted.example.org/acs'"`
        + ' x:AssertionConsumerServiceURL="https://trusted.example.org/acs"'
        + ' AssertionConsumerServiceURL="https://evil.example.net/acs"',
    });
    assert.equal(await extractSiteId(href), 'evil.example.net');
  });
}

test('SAML: deflated request whose first byte is "<"', async () => {
  // Run of 10 chars → RLE match length 9 → dynamic block header byte 0x3c
  const xml = '<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" ID="_aaaaaaaaaa" Version="2.0">'
    + '<saml:Issuer xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">https://vpn.example.com/sp</saml:Issuer>'
    + '</samlp:AuthnRequest>';
  const block = zlib.deflateRawSync(Buffer.from(xml), {
    strategy: zlib.constants.Z_RLE,
    finishFlush: zlib.constants.Z_SYNC_FLUSH,
  });
  // Non-final block + empty final fixed block
  const compressed = Buffer.concat([block, Buffer.from([0x03, 0x00])]);
  assert.equal(compressed[0], 0x3c, 'fixture must start with "<"');
  const href = chooser({
    continue: url('https://accounts.google.com/o/saml2/continue', { SAMLRequest: compressed.toString('base64') }),
  });
  assert.equal(await extractSiteId(href), 'vpn.example.com');
});

test('SAML: localhost ACS URL falls back to Issuer', async () => {
  const href = samlChooser('https://vpn.example.com/sp', { attrs: " AssertionConsumerServiceURL='http://localhost:8080/acs'" });
  assert.equal(await extractSiteId(href), 'vpn.example.com');
});

test('SAML: Issuer in XML comment is ignored', async () => {
  const href = samlChooser('https://evil.example.net/sp', { extra: '<!-- <saml:Issuer>https://vpn.example.com/sp</saml:Issuer> -->' });
  assert.equal(await extractSiteId(href), 'evil.example.net');
});

test('SAML: more than one Issuer is ambiguous', async () => {
  const href = samlChooser('https://evil.example.net/sp', { extra: '<saml:Issuer>https://vpn.example.com/sp</saml:Issuer>' });
  assert.equal(await extractSiteId(href), null);
});

test('SAML: broken SAMLRequest gives null', async () => {
  const href = chooser({ continue: url('https://accounts.google.com/o/saml2/continue', { SAMLRequest: 'not-deflate' }) });
  const originalError = console.error;
  console.error = () => {};
  try {
    assert.equal(await extractSiteId(href), null);
  } finally {
    console.error = originalError;
  }
});

test('Google service: host of continue', async () => {
  assert.equal(await extractSiteId(chooser({ continue: 'https://mail.google.com/mail/u/0/' })), 'mail.google.com');
});

test('nothing found gives null', async () => {
  assert.equal(await extractSiteId(chooser({ continue: 'https://accounts.google.com/ManageAccount' })), null);
  assert.equal(await extractSiteId('not a url'), null);
});

test('matchesSite', () => {
  assert.ok(matchesSite('app.*.example.com', 'app.dev.example.com'));
  assert.ok(matchesSite('app.*.example.com', 'app.staging.example.com'));
  assert.ok(matchesSite('*.example.com', 'a.b.example.com'));
  assert.ok(matchesSite(' App.Example.com ', 'app.example.com'));
  assert.ok(matchesSite(GCLOUD_CLIENT_ID, GCLOUD_CLIENT_ID));
  assert.ok(!matchesSite('*.example.com', 'example.com'));
  assert.ok(!matchesSite('app.example.com', 'app.example.com.evil.test'));
  assert.ok(!matchesSite('app.example.com', 'appxexample.com'));
  assert.ok(!matchesSite('', 'app.example.com'));
  assert.ok(!matchesSite('app.example.com', null));
});
