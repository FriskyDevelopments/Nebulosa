# Nebulosa Control — Browser Compatibility Roadmap

This document describes the phased plan for validating and shipping Nebulosa Control
across Chrome, Firefox, and Safari. It follows a **test-first** discipline: the core
logic is validated as a plain userscript before the extension packaging layer is added,
so bugs in one layer can't mask bugs in the other.

---

## Workflow: Test Script First, Then Extension

```
Phase 0  ── Validate logic as a userscript (Tampermonkey / Violentmonkey)
              │
              ▼ (once green)
Phase 1  ── Chrome MV3 extension (current state — already loadable)
              │
              ▼
Phase 2  ── Firefox WebExtension MV2/MV3 (browser.* polyfill layer)
              │
              ▼
Phase 3  ── Safari Web Extension (Xcode conversion from the Firefox build)
```

### Why test the script first?

The extension layer adds three surfaces that can introduce their own bugs:
- `manifest.json` permission declarations
- Chrome/browser messaging (`chrome.runtime.sendMessage` etc.)
- Service worker lifecycle (MV3 background is ephemeral)

If multipin, camera monitoring, and the DOM adapter are broken at the core logic level,
those bugs surface as "the extension doesn't work" and are hard to isolate. Validating
the core via a userscript (which runs directly in the page with no messaging layer)
makes root-cause analysis fast.

---

## Phase 0 — Userscript Validation

**Goal:** Confirm that the multipin DOM logic works reliably in a live Zoom meeting
before wrapping it in an extension.

### How to run

1. Install [Tampermonkey](https://www.tampermonkey.net/) (Chrome/Edge/Firefox) or
   [Violentmonkey](https://violentmonkey.github.io/) (all browsers).
2. Create a new script and paste the content below (or import from
   `scripts/nebulosa-test.user.js` once created):

```js
// ==UserScript==
// @name         Nebulosa Control — Dev Test
// @namespace    https://github.com/FriskyDevelopments/Nebulosa
// @version      0.1
// @description  Test harness for core multipin logic — no extension packaging
// @match        https://*.zoom.us/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

// Load order mirrors the extension content_scripts list:
//   packages/event-bus/index.js
//   integrations/zoom/selectors.js
//   integrations/zoom/events.js
//   integrations/zoom/adapter.js
//   modules/multipin.js
//
// In userscript context all of these run in the page scope so
// window.NebulosaEventBus etc. are available immediately.
```

3. Copy each file's content into the script in order (or use `@require` with a local
   server URL while developing).
4. Open a Zoom meeting and watch the browser console for `[Nebulosa:*]` log lines.

### Validation checklist

| Test | Pass condition |
|---|---|
| MutationObserver starts without error | `[Nebulosa:Events] observers started` in console |
| Participant with camera on is detected at bootstrap | `camera_on` event emitted on page load |
| Hand-raise detected | `hand_raised` event emitted when participant raises hand |
| Dual requirement met → pin fires | Context menu opens; "Pin" / "Multi-pin" clicked |
| Camera off → 60 s grace timer starts | `[Nebulosa:Multipin] camera off, grace timer started` |
| Camera off > 60 s → unpin fires | Context menu opens; "Unpin" clicked |
| Camera back on within grace → timer cancelled | `grace timer cancelled` in console |

---

## Phase 1 — Chrome MV3 Extension (Current)

**Status:** ✅ Loadable unpacked today.

**Load:**
```
chrome://extensions → Developer mode → Load unpacked → apps/extension-nebulosa-control/
```

### Key files

| File | Role |
|---|---|
| `manifest.json` | MV3 manifest — `service_worker`, `content_scripts`, permissions |
| `background.js` | Service worker — state cache, tab tracking, message relay |
| `content/zoom.js` | Content script entry — wires modules to message channel |
| `modules/multipin.js` | Core business logic |
| `integrations/zoom/events.js` | MutationObserver → event bus |
| `integrations/zoom/adapter.js` | DOM → action layer |

### Known Chrome-specific patterns to keep

- All `chrome.*` calls use **callback form** (not `async/await`) for compatibility with
  browsers that ship the `chrome.*` namespace without Promise support.
- Service worker background is **ephemeral** — all state is cached in `chrome.storage`
  or in-memory per activation window (reset if the worker suspends).
- `web_accessible_resources` lists only `icons/*` — JS files are loaded via
  `content_scripts`, never via `<script src>` injection.

### Completion checklist

- [x] Popup shows status dot (green on meeting detection)
- [x] Module toggles enable/disable cleanly, no stale state
- [x] Diagnostics panel shows last event + participant
- [ ] E2E test in a live Zoom meeting with ≥ 2 participants
- [ ] Context menu event reliability confirmed (React SPA — may need `pointerdown` fallback)
- [ ] Camera-off grace timer validated in extension context

---

## Phase 2 — Firefox WebExtension

**Status:** 🔲 Planned — no code changes needed yet.

Firefox supports MV3 as of Firefox 109+ but also supports MV2. The safest approach
is a **single codebase** with a thin `browser.*` polyfill shim so all API calls work
in both Chrome and Firefox.

### What changes

#### 1. Add `browser-polyfill` shim

Mozilla's official polyfill wraps `chrome.*` in a Promise-based `browser.*` interface
that works in both browsers. The polyfill is a single file:

```
apps/extension-nebulosa-control/
└── vendor/
    └── browser-polyfill.js   ← mozilla/webextension-polyfill (minified)
```

Add it as the **first** entry in `content_scripts.js` and the **first** `<script>` in
`popup.html`. Then replace all `chrome.*` calls with `browser.*` in application code.

**Source:** https://github.com/mozilla/webextension-polyfill  
**CDN:** `npm install webextension-polyfill` then copy `dist/browser-polyfill.min.js`

#### 2. Add Firefox-specific `manifest.json` keys

```json
"browser_specific_settings": {
  "gecko": {
    "id": "nebulosa-control@friskydev",
    "strict_min_version": "109.0"
  }
}
```

This is ignored by Chrome.

#### 3. MV2 fallback option (Firefox < 109)

If broader Firefox coverage is needed, maintain a separate `manifest.v2.json` with:
```json
{
  "manifest_version": 2,
  "background": { "scripts": ["background.js"], "persistent": false },
  ...
}
```
Use a build step (`scripts/build-firefox-mv2.sh`) to swap the manifest before packaging.

#### 4. Shadow DOM / iframe caveat

Zoom may render the participant tiles inside an iframe on Firefox. Test with:
```js
console.log(document.querySelectorAll('[class*="video-avatar"]').length);
```
If zero, `events.js` needs to attach the MutationObserver to the iframe's `contentDocument`
instead of the top-level `document`.

### Firefox validation checklist

- [ ] Extension loads in Firefox without console errors
- [ ] `browser.*` polyfill resolves correctly (no `chrome is not defined`)
- [ ] Content scripts inject into Zoom meeting page
- [ ] `meeting_detected` status propagates to popup
- [ ] Multipin fires correctly in a live meeting

---

## Phase 3 — Safari Web Extension

**Status:** 🔲 Planned — requires macOS + Xcode.

Apple's conversion tool wraps the existing WebExtension code in a native Swift app
shell. The extension logic itself does not need to change if Phase 2 (the `browser.*`
polyfill) is complete.

### Conversion steps

1. **Prerequisite:** macOS 12+, Xcode 14+.
2. Run Apple's conversion CLI against the Firefox build output:
   ```bash
   xcrun safari-web-extension-converter \
     apps/extension-nebulosa-control/ \
     --project-location apps/safari-nebulosa-control/ \
     --app-name "Nebulosa Control" \
     --bundle-identifier com.friskydev.nebulosa-control \
     --swift
   ```
3. Open `apps/safari-nebulosa-control/*.xcodeproj` in Xcode.
4. Set your Apple Developer Team in the project settings.
5. Build and run on simulator or device.
6. Enable in Safari: **Safari → Settings → Extensions → Nebulosa Control**.

### Safari-specific differences

| Area | Detail |
|---|---|
| Background script | Safari uses a non-persistent background page, not a service worker, for MV2. MV3 service worker support added in Safari 15.4. Prefer MV3. |
| `browser.*` namespace | Safari supports `browser.*` natively since Safari 14 — polyfill is not needed on Safari but doesn't hurt. |
| Content Security Policy | Safari's CSP enforcement is stricter. Avoid `eval` and `new Function()` in content scripts. |
| `contextmenu` events | macOS respects `contextmenu` dispatch; iOS does not (long-press gesture only). Zoom Web on iOS is unsupported anyway. |
| Distribution | Shipped via **Mac App Store** (requires paid Apple Developer account). Side-loading (unsigned) is possible for testing. |

### Safari validation checklist

- [ ] Extension builds without Xcode warnings
- [ ] Extension loads in Safari Technology Preview
- [ ] Content scripts inject into Zoom meeting page (Safari 17+)
- [ ] Popup renders correctly (Safari uses system fonts by default)
- [ ] Multipin fires correctly in a live meeting on macOS

---

## Cross-Browser Compatibility Matrix

| Feature | Chrome MV3 | Firefox MV3 | Firefox MV2 | Safari MV3 |
|---|---|---|---|---|
| Background service worker | ✅ | ✅ (109+) | ❌ (uses scripts) | ✅ (15.4+) |
| `chrome.*` callbacks | ✅ | ✅ (via polyfill) | ✅ (via polyfill) | ✅ (via polyfill) |
| `browser.*` Promises | via polyfill | ✅ native | ✅ native | ✅ native |
| MutationObserver | ✅ | ✅ | ✅ | ✅ |
| `contextmenu` dispatch | ✅ | ✅ | ✅ | ✅ (macOS) |
| `chrome.storage.local` | ✅ | ✅ (via polyfill) | ✅ (via polyfill) | ✅ (via polyfill) |
| Persistent background | ❌ (ephemeral SW) | ❌ (non-persistent) | ✅ (persistent: false) | ❌ |

---

## File Structure (target — all three browsers)

```
apps/
  extension-nebulosa-control/   ← source of truth (Chrome MV3 today)
  firefox-nebulosa-control/     ← Phase 2: copied + gecko manifest keys added
  safari-nebulosa-control/      ← Phase 3: generated by Xcode converter

scripts/
  build-firefox.sh              ← copy extension/, inject polyfill, add gecko keys
  build-safari.sh               ← run xcrun safari-web-extension-converter
  test-userscript.sh            ← serve content scripts locally for Tampermonkey @require

docs/
  browser-compat-roadmap.md     ← this file
  extension.md                  ← Chrome load instructions (current)
  firefox-setup.md              ← Phase 2: Firefox load instructions (to be created)
  safari-setup.md               ← Phase 3: Safari load instructions (to be created)
```

---

## Immediate Next Action

1. **Complete Phase 0** — run the userscript in a live Zoom meeting and tick off the
   validation checklist above. This unblocks Phase 1 sign-off.
2. Once Phase 0 is green, return to Phase 1 and complete the Chrome E2E checklist.
3. Only after Phase 1 is fully validated should Phase 2 (Firefox) begin — the polyfill
   addition is a one-afternoon task once the core logic is confirmed working.
