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
- Quick test: `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on** → pick `manifest.json`. It's removed when Firefox closes.
- Permanent: sign it for free at [addons.mozilla.org/developers](https://addons.mozilla.org/developers/) using **"On your own"** (unlisted), then install the signed `.xpi`.
  See `firefox/README.md` for details.

## Privacy
- **Permissions:** only `storage` (your settings, kept locally) and `activeTab`. The Firefox version also declares `<all_urls>` so it can run on pages.
- **No network code:** no `fetch`, `XMLHttpRequest`, `WebSocket` or `sendBeacon`. The extension's pages also block network calls via `connect-src 'none'`.
- **No remote code:** no analytics, no third-party libraries. Everything is in this repo.
- **What the content script touches:** it reads only image sizes and background images and toggles CSS classes. It never reads text, forms or cookies.

You can verify it yourself: open the extension's background page in the browser's developer tools and watch the Network tab. It stays empty.

## Repo layout
```
chrome-edge/   Manifest V3 build for Chrome and Edge
firefox/       Manifest V3 build for Firefox (background scripts, gecko settings)
```
Both folders share the same code. Only `manifest.json` and the per-folder README differ.

## License
MIT. See [LICENSE](LICENSE).
