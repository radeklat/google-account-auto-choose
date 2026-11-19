# Site ID extraction

A rule matches by **site ID**: a stable ID of the app that asks for Google sign-in, usually its host name. The addon
gets the site ID from the account chooser URL (`https://accounts.google.com/v3/signin/accountchooser?…`).

Code: [`src/site.js`](../src/site.js) (`extractSiteId`, `matchesSite`). Tests: [`tests/site.test.js`](../tests/site.test.js).

## Extraction order

The first step that gives a value wins.

| # | Sign-in type | Source | Example site ID |
|---|--------------|--------|-----------------|
| 1 | OAuth / OIDC | Host of the top-level `app_domain` parameter, else host of `redirect_uri` (`http(s)` only) | `app.dev.example.com` |
| 2 | SAML | `continue` → `SAMLRequest`: host of `AssertionConsumerServiceURL`, else `<saml:Issuer>` (its host, or the raw value if it is not a URL, e.g. a URN). XML comments are ignored; more than one `AuthnRequest` or `Issuer` gives no value | `vpn.example.com`, `auth.example.com` |
| 3 | Google services | Host of `continue`, if it is not `accounts.google.com` | `mail.google.com` |
| 4 | Local CLI apps, fallback | `client_id`: top-level, else from `continue` | `32555940559.apps.googleusercontent.com` |

Steps 1 and 3 skip `localhost`, `127.0.0.1` and `[::1]`. CLI tools (e.g. `gcloud auth login`) all use these hosts, often
on a random port, so the OAuth client ID is the only stable ID.

No value → no auto-selection and no prompt.

## URL shapes

### OAuth / OIDC

`continue` is always the Google consent page. It has no app data, except `client_id`:

```
accountchooser
  ?client_id=402977942691-….apps.googleusercontent.com
  &redirect_uri=https://app.dev.example.com/auth/callback
  &continue=https://accounts.google.com/signin/oauth/v3/consent?authuser=unknown&part=…&client_id=…
  &app_domain=https://app.dev.example.com
```

The `client_id` changes per app registration (e.g. per environment). The host is easier to read and to match with `*`.

Google Identity Services popups can use `redirect_uri=storagerelay://https/app.example.com?id=…`. The parser cannot
read its host, so step 1 accepts only `http(s)` URLs.

### SAML

There is no `app_domain`. `continue` is the Google SAML IdP endpoint:

```
accountchooser
  ?continue=https://accounts.google.com/o/saml2/continue?idpid=C0abc123&SAMLRequest=fZFPT8Mw…&RelayState=…
  &flowName=GlifWebSignIn
```

- `idpid` is the same for all SAML apps of one Google Workspace. Do not use it.
- `SAMLRequest` encoding depends on the SAML binding
  ([OASIS SAML 2.0 Bindings](https://docs.oasis-open.org/security/saml/v2.0/saml-bindings-2.0-os.pdf)):
  - HTTP-Redirect (section 3.4.4.1): `base64(DEFLATE(XML))`.
  - HTTP-POST (section 3.5.4), `continue` has `omethod=POST`: `base64(XML)`, not deflated.

  The addon decodes base64 with `atob`. If the result starts with `<`, it is the XML. Else the addon inflates it with
  `DecompressionStream('deflate-raw')`.
- The decoded XML has the service provider entity ID (`Issuer`) and, optionally, the URL that gets the response
  (`AssertionConsumerServiceURL`):
  ```xml
  <samlp:AuthnRequest … Destination="https://accounts.google.com/o/saml2/idp?idpid=C0abc123">
    <saml:Issuer>https://vpn.example.com/saml/sp/metadata/user</saml:Issuer>
  </samlp:AuthnRequest>
  ```
- Brokers such as Okta send a generic `Issuer`, the same for all their customers. The ACS URL is on the app's own host,
  so it wins:
  ```xml
  <saml2p:AuthnRequest … AssertionConsumerServiceURL="https://auth.example.com/sso/saml2/0oa123">
    <saml2:Issuer>https://www.okta.com/saml2/service-provider/spabc</saml2:Issuer>
  </saml2p:AuthnRequest>
  ```
  Site ID: `auth.example.com`, not `www.okta.com`.

## Pattern matching

The rule's **Site** value is compared with the whole site ID:

- `*` matches any text, dots included: `app.*.example.com`, `*.example.com`.
- No other special characters. Regex is not supported.
- Case-insensitive. Spaces at the start and end are ignored.

## Add a new source

1. Get a real account chooser URL from the address bar. The browser console shows `Site ID: <id>` or
   `No site ID found`.
2. Decode the parameters, e.g.:
   ```bash
   python3 -c 'import sys, urllib.parse as u; q = u.urlparse(sys.argv[1]).query; [print(k, "=", v) for k, v in u.parse_qsl(q)]' '<URL>'
   ```
   Decode `continue` the same way, because it is a URL itself.
3. Find a value that names the app and does not change between sign-ins. Do not use `state`, `nonce`,
   `code_challenge`, `dsh`, `part`, `RelayState`, `Signature`: they change on each sign-in.
4. Add the step to `extractSiteId` in `src/site.js`. Put specific sources before generic ones (step 4 is the last
   fallback).
5. Add a test with a made-up URL of the same shape to `tests/site.test.js`. Use `example.com` hosts, not real private
   hosts. Run `make test`.
6. Add a row to the table above and a section to [URL shapes](#url-shapes).
