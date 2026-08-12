# Matte

*A screenshot prettifier.* A mat is the bordered surround a framer puts between artwork and its
frame — which is what this makes: a screenshot floated on a ground, with a shadow.

One directory, two things:

- **The style editor**, served at `radical.graphics/matte` and doubling as the extension's options
  page. Paste a screenshot, dial in the look, and export Copy/PNG/JPG.
- **A Chrome extension** whose root *is* this directory. Copy a screenshot, click the
  toolbar icon, and the clipboard comes back prettified.

The export bar is the one thing that differs between them: `matte.js` hides it when
`location.protocol` is `chrome-extension:`, because in the extension the popup already hands the
result back to the clipboard and a second way out would just be clutter.

They share `render.js` verbatim, so what the editor previews is what the popup produces.

## Loading the extension

1. Chrome → `chrome://extensions`
2. Turn on **Developer mode** (top right)
3. **Load unpacked** → pick this `matte/` directory
4. Pin it to the toolbar

Set your style once under **Extensions → Radical Matte → Options** (or the
popup's *Style* button). Then the loop is: copy a screenshot → click the icon → paste.
`⌘⇧Y` does the same thing without the mouse.

## Files

| | |
|---|---|
| `render.js` | The compositor. `drawScene()` is the only thing that draws, so the editor preview and the extension always agree. Also holds `DEFAULT_STATE` — the one definition of what a style is. |
| `store.js` | Settings via `chrome.storage.local` in the extension, `localStorage` on the web. The background image and the last original screenshot are Blobs in IndexedDB either way. |
| `matte.js` / `index.html` / `matte.css` | The editor. Doubles as the extension's options page. |
| `popup.js` / `popup.html` / `popup.css` | The toolbar popup: read clipboard → composite → write clipboard → close. |
| `icons/` | `icon.svg` is the source for the toolbar icons; `./icons/build.sh` regenerates the PNGs (needs `rsvg-convert`). The rest are UI icons. |
| `vendor/` | Copies of the site's `lottie-light.js` and `data.json` (as `mark.json`), because an extension can't load anything outside its own root. `./vendor/sync.sh` refreshes them. |

## Notes for whoever picks this up next

**The popup is not an arbitrary choice.** MV3 service workers have no DOM and no
`navigator.clipboard` at all. Offscreen documents have the API but are never focused, and
`clipboard.read()` rejects on an unfocused document. A toolbar popup is focused, which is the one
place this can work.

**Reading the clipboard takes two routes, and the second one is the one that fires.** A popup
document is focused but has **no transient user activation** — the click landed on the toolbar,
not inside the document — so `navigator.clipboard.read()` rejects with `NotAllowedError`.
`document.execCommand('paste')` needs no activation, only a focused editable element, and it is
precisely what the `clipboardRead` permission exists to unlock. So `popup.js` tries the modern API
(cheap, and correct if Chrome ever relaxes this) and falls straight through to a hidden
contenteditable plus `execCommand('paste')`, which delivers a genuine paste event. If both are
refused the popup asks for `⌘V` and shows the underlying `DOMException` in small type, so the next
person is not guessing.

Note that `execCommand('paste')` cannot be tested from a normal web page — it always returns
`false` there. Verifying that path means loading the unpacked extension.

**Scaling is done by hand, not with `ctx.scale()`.** `shadowBlur` is not reliably transformed by
the canvas CTM, so a scaled context makes the export's shadow drift from the preview's. Every
dimension in `render.js` is computed in the screenshot's own pixels and multiplied by an explicit
`s`. Keep it that way.

**The website and the extension keep separate settings.** Different storage areas, no sync. The
extension only ever acts on the style you set in *its* options page.

**There is exactly one background image, or none.** `setBackground()` clears the store before it
writes, so uploading replaces rather than accumulates. That is what removes the need for a
library, a settings modal, and any empty-state copy: hitting *Image* with nothing stored opens the
file picker, and the swap control on the corner of the preview replaces what's there.

**The popup keeps the original screenshot, and that is load-bearing.** It overwrites the clipboard
with its own output, so the source is gone the moment it runs — and a second click would stack a
second background on the first. So `saveLastShot()` stores the source in IndexedDB, and:

- the editor opens on it, which is why clicking *Style* shows what you captured rather than the
  prettified thing now sitting on your clipboard;
- the popup checks whether the clipboard is holding its own previous output and restyles from the
  original instead of compounding.

That check is dimensions plus an 8×8 greyscale fingerprint, not a hash of the bytes — the
clipboard re-encodes PNGs on the way through, so the bytes change but the picture doesn't.

**Output size follows the source bitmap, which on a Retina display is already 2×.** A 1024-point
capture arrives as a 2048-pixel image, so 1× exports at ~2048 plus padding. That is correct, not a
bug — 0.5× is the setting that brings it back to the size you saw on screen. The popup shows both
input and output dimensions so this is visible rather than mysterious.

**The storage keys still say `shot`.** The IndexedDB database is `radical-shot` and the settings
key is `radical-shot-settings`, left alone deliberately through the rename — changing them would
silently drop everyone's saved style and background image for no functional gain. The element ids
in `index.html` keep the same prefix for the same reason: churn with no payoff.

**Chrome's clipboard has no alpha channel.** A transparent background pasted straight through
arrives as *black*, which reads as a bug rather than a choice. So the clipboard copy — in the
popup and behind the editor's Copy button — is flattened onto white via `flatten()` in
`render.js`, while Save PNG and the PNG download keep the real alpha. The popup says so and skips
its auto-close when that happens, so the trade-off is visible and Save PNG is one click away.
There is no way to preserve transparency through the clipboard; this is a platform limit, not
something the compositor can fix.

**Clipboard images are always PNG.** Chrome writes nothing else, so there is no format choice to
offer. *Resolution* (1×/2×) is the one export knob, and it lives with the rest of the style.

**`BG_TYPES` in `matte.js` gates which saved background modes survive a reload.** Anything not in
that list is coerced back to the default on load, so it has to stay in step with the buttons in
`#optBgType` — drop a button without dropping the entry and stale settings quietly persist; add a
button without adding the entry and the mode resets itself every time.

**Don't put a `transition` on the angle dial's `transform`.** It reads its rotation from an
unregistered custom property, and Chrome won't re-evaluate the transform when that property
changes if a transition is attached — the dial silently sticks at whatever angle it first
rendered. The slider fires continuously while dragging, so there is nothing to smooth anyway.
