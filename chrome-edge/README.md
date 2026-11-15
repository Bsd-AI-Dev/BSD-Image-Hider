# Private Image Hider (Chrome & Edge version)

Hides images behind a grey striped texture, like WizMage, but with no ability to send data anywhere.

## Install in Edge or Chrome
1. Unzip this folder somewhere permanent (e.g. Documents\private-image-hider). Don't delete it later: Edge loads the extension from this folder.
2. Open `edge://extensions` (Edge) or `chrome://extensions` (Chrome)
3. Turn on **Developer mode** (bottom-left in Edge, top-right in Chrome)
4. Click **Load unpacked** and choose the folder
5. Pin the icon from the puzzle-piece menu

Edge may show a "developer mode extensions" notice at startup. Chrome may show a similar notice. That's normal for personal extensions.

## Use
A full **How to use** guide is built into the extension. It opens automatically after installing, and you can open it
any time from the popup (**? Help**) or the Settings page.

Quick summary:
- Hover an image and click 👁 to show it, ↺ to hide it again (or Alt+A / Alt+Z)
- Popup: show images on the whole site or on this page only, keep hiding a page even when its site is shown,
  hide small icons too, pause this tab, show all once, pause everywhere
- Settings page: two lists ("Show images on…" and "Always hide images on…") for managing many sites and pages,
  plus the small-image size setting

## Why it's private (check this yourself)
- **Permissions:** only `storage` (saves your settings locally) and `activeTab` (lets the popup see the current site's name when you click it). No `tabs`, `history`, `cookies`, `webRequest` or `host_permissions`.
- **No network code:** search the files for `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, `http`. The only matches are comments.
- **CSP `connect-src 'none'`** in the manifest blocks network calls from the extension's own pages, even if code were added by mistake.
- **No remote code:** everything is in this folder. Nothing is downloaded, and nothing auto-updates.
- **What the content script does:** it sees every page (it has to, in order to hide images), but it only reads image sizes and CSS background images and toggles CSS classes. It never reads text, forms or cookies.

Note: like WizMage, this does not save bandwidth. Images still download; they just aren't shown.

## Verify network activity yourself
`edge://extensions` → Private Image Hider → "Inspect views: service worker" → Network tab. It should stay empty.
