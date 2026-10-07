# Firefox Sync size limit: future fix

## Problem

All settings are in `browser.storage.sync`. All rules are one array in one key, `rules`. Firefox limits for
`storage.sync` ([MDN](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/sync)):

| Limit                 | Value    |
|-----------------------|----------|
| `QUOTA_BYTES`         | 100 KB   |
| `QUOTA_BYTES_PER_ITEM`| 8 KB     |
| `MAX_ITEMS`           | 512      |

The `rules` key hits the 8 KB per-item limit first (approx. 40–80 rules). The 100 KB total is not the bottleneck.

Second problem: Firefox resolves sync conflicts per key. When two browsers change `rules` before they sync, one change
is lost. `successCount` updates on every auto-selection, so this can happen without the user editing anything.

## Suggested fix: one key per rule

### Storage shape

```jsonc
{
  "enabled": true,
  "autoCloseConfirmation": true,
  "autoCloseDelay": 10000,
  "autoConfirm": false,
  "schemaVersion": 2,
  "ruleOrder": ["r_k3j9x2", "r_a81fq0"],      // display order
  "rule_r_k3j9x2": { "name": "...", "urlPattern": "...", "email": "...", "enabled": true, "autoClosePattern": "" },
  "rule_r_a81fq0": { "...": "..." }
}
```

And in `browser.storage.local` (device-specific, not synced):

```jsonc
{ "ruleStats": { "r_k3j9x2": { "successCount": 12 } } }
```

### Notes

- **Stable ID per rule.** Generate it at creation (for example `r_` + `crypto.randomUUID()` shortened). Do not use the rule
  name or the array index. Today `ruleSucceeded` in `background.js` finds rules by name. Change it to use the ID.
- **Limits after the change.** Each rule gets its own 8 KB. `MAX_ITEMS` 512 minus approx. 6 setting keys gives approx. 500
  rules. The 100 KB total limit becomes the real cap (approx. 500–1000 rules). Show a warning based on
  `browser.storage.sync.getBytesInUse()` against `QUOTA_BYTES`.
- **`ruleOrder` is still one key.** It holds only IDs (approx. 10 bytes each), so 8 KB is enough for approx. 700 rules.
  Two browsers can still reorder at the same time, and one order is lost. That is acceptable.
- **Move `successCount` to `storage.local`.** Then counting hits does not write to sync, and there is no conflict with
  edits from other browsers. Counts become per device. Backup can still export them.
- **Writes:** save only the changed rule keys, not all rules. On delete, `remove('rule_<id>')` and update `ruleOrder`.
- **Reads:** `browser.storage.sync.get(null)`, then build the array from `ruleOrder`. Ignore `rule_*` keys that are not in
  `ruleOrder` (orphans from a conflict). Add rule keys that are missing from `ruleOrder` at the end, so no rule is lost.
- **Listen for changes:** use `browser.storage.onChanged` (area `sync`) in the popup to refresh when other browsers sync.

### Migration (schemaVersion 1 → 2)

Run in `background.js` on `runtime.onInstalled` with reason `update`, and on startup as a safety net:

1. If `schemaVersion >= 2`, stop.
2. Read `rules`. For each rule, create an ID, write `rule_<id>`, and copy `successCount` to `ruleStats` in local storage.
3. Write `ruleOrder` and `schemaVersion: 2` in the same `set()` call.
4. Remove `rules` only after step 3 is successful.

Browsers that run the old version see `rules` disappear after sync. Set `strict_min_version`, or release the reader for
v2 first and the writer later, so that old versions are not active at the same time as new versions.

### Other code to change

- `src/account-chooser.js`, `src/popup.js`, `src/background.js`: read rules through one shared helper
  (for example `src/storage.js`, listed before the scripts in `manifest.json` and `popup.html`).
- `src/restore.js` and backup: keep the backup file format (a `rules` array). Convert only at read/write.

## Alternatives considered

- **Compress `rules` (for example LZ-string) into one key.** Gives approx. 2–3× more rules with a small change. Does not
  fix the sync conflicts. The stored data cannot be read in `about:debugging`.
- **Split `rules` into fixed chunks (`rules_0`, `rules_1`, …).** Simple, but one rule edit can move data to other chunks,
  so conflicts become worse.
- **Optional sync toggle (local by default).** Avoids the limit for users who do not sync, but does not fix it for users
  who do.
