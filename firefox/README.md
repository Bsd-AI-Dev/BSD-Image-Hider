# BSD Image Hider (Firefox version)

Hides images behind a grey striped texture, like WizMage, but with no ability to send data anywhere.

## Install in Firefox

### Quick test (removed when Firefox closes)
1. Unzip this folder somewhere
2. Open `about:debugging#/runtime/this-firefox`
3. Click **Load Temporary Add-on…** and select `manifest.json` inside the folder

### Permanent install
Regular Firefox only keeps add-ons that Mozilla has signed. Two options:

**A. Sign it privately (recommended, free).** Go to https://addons.mozilla.org/developers/, create an account,
choose **Submit a New Add-on → On your own**, and upload this zip. "On your own" means it is NOT listed publicly.
Mozilla signs it automatically within minutes, and you download a signed `.xpi`. Then drag that `.xpi` into Firefox.

**B. Use Firefox Developer Edition or Nightly.** Open `about:config`, set `xpinstall.signatures.required` to `false`,
then open `about:addons` → gear icon → **Install Add-on From File** and pick the zip (rename it to `.xpi` first).

### If images aren't hidden
Open `about:addons` → BSD Image Hider → **Permissions** tab and make sure
"Access your data for all websites" is turned on. Firefox asks for this because the extension
needs to run on every page to hide images. It still has no ability to send anything out.

## Use
A full **How to use** guide is built into the extension. It opens automatically after installing, and you can open it
any time from the popup (**? Help**) or the Settings page.

Quick summary:
- Three modes: **Show images**, **Hide images** (small icons stay visible), **Hide everything**
- Popup: set the mode for this site or this page, pause this tab, show all once, pause everywhere
- Settings page: default mode for all other sites, all your rules in one list, small-icon size
- Hover an image and click 👁 to show it, ↺ to hide it again (or Alt+A / Alt+Z)

## Why it's private (check this yourself)
- **Permissions:** only `storage` (saves your settings locally) and `activeTab` (lets the popup see the current site's name when you click it). No `tabs`, `history`, `cookies` or `webRequest`. `host_permissions` is only there so the content script can run on pages; it does not allow sending data.
- **No network code:** search the files for `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, `http`. The only matches are comments.
- **CSP `connect-src 'none'`** in the manifest blocks network calls from the extension's own pages, even if code were added by mistake.
- **No remote code:** everything is in this folder. Nothing is downloaded, and nothing auto-updates.
- **What the content script does:** it sees every page (it has to, in order to hide images), but it only reads image sizes and CSS background images and toggles CSS classes. It never reads text, forms or cookies.

Note: like WizMage, this does not save bandwidth. Images still download; they just aren't shown.

## Verify network activity yourself
`about:debugging#/runtime/this-firefox` → BSD Image Hider → **Inspect** → Network tab. It should stay empty.
