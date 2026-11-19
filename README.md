# BSD Image Hider

A private, offline browser extension that hides images on websites behind a grey striped box, without breaking page layouts.
It's inspired by WizMage but was written from scratch, with one rule: **it can never send your data anywhere.**

Available for **Chrome, Edge** and **Firefox**.

## Features
- Hides images, CSS background images and videos. Small icons and logos can stay visible, or you can hide them too.
- Hover any image and click 👁 to reveal it, or press Alt+A / Alt+Z.
- Show images on a **whole site**, on **single pages**, or on **sections** (`site.com/blog/*`).
- **Always-hide list:** keep images hidden on chosen pages even when their site is allowed.
- Pause per tab, pause everywhere, or show everything once.
- A built-in **How to use** guide opens on install and is always available from the popup.

## Install

Download the zip for your browser from the [Releases](../../releases) page, or use the folders in this repo.

**Chrome / Edge** (`chrome-edge/`)
1. Unzip to a folder you'll keep.
2. Open `chrome://extensions` or `edge://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and pick the folder that contains `manifest.json`.

**Firefox** (`firefox/`)
- If the release has a `*-signed.xpi` file, click it and Firefox installs it permanently.
- Otherwise, for a quick test: `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on** → pick `manifest.json`. It's removed when Firefox closes.

## Privacy
- **Permissions:** only `storage` (your settings, kept locally) and `activeTab`. The Firefox version also declares `<all_urls>` so it can run on pages.
- **No network code:** no `fetch`, `XMLHttpRequest`, `WebSocket` or `sendBeacon`. The extension's pages also block network calls via `connect-src 'none'`.
- **No remote code:** no analytics, no third-party libraries. Everything is in this repo.
- **What the content script touches:** it reads only image sizes and background images and toggles CSS classes. It never reads text, forms or cookies.
- **`shadow-hook.js`:** a 15-line helper that runs inside the page and only announces when a page component creates a "shadow root", so images inside components get hidden too. It reads nothing and sends nothing.

You can verify it yourself: open the extension's background page in the browser's developer tools and watch the Network tab. It stays empty.

## Repo layout
```
chrome-edge/   Manifest V3 build for Chrome and Edge
firefox/       Manifest V3 build for Firefox (background scripts, gecko settings)
```
Both folders share the same code. Only `manifest.json` and the per-folder README differ.

## Publishing a new version
Releases are created automatically by GitHub Actions (`.github/workflows/release.yml`):
1. Change the code in **both** `chrome-edge/` and `firefox/`. Only `manifest.json` and `README.md` differ between them.
2. Raise `"version"` in **both** `manifest.json` files to the same new number (e.g. `1.3.1` → `1.4.0`).
3. Push to `main`. GitHub builds the two zips, creates the tag `v<version>` and publishes the release.

If the two versions don't match, the workflow stops with an error.

**Signed Firefox builds (optional):** add the repository secrets `AMO_JWT_ISSUER` and `AMO_JWT_SECRET`
(from addons.mozilla.org → Developer Hub → *Manage API Keys*). The workflow then gets the Firefox build signed by Mozilla
as an *unlisted* add-on (not published on the store) and attaches the `.xpi` to the release.
For a release that already exists, run the workflow by hand from the Actions tab. You can also run it by hand from the **Actions** tab ("Release" → **Run workflow**).

## License
MIT. See [LICENSE](LICENSE).
