/**
 * @climber47/dsh-tab-status — browser half: title layering.
 *
 * dsh's own layout plugin (`@deepseek-ai/dsh-client-ui-layout`) already writes
 * `document.title = "<session title> — DeepSeek Harness"`. This plugin does NOT
 * take that over. It layers a status prefix on top:
 *
 *     ✓ 2 已完成 · 浏览器标签同步对话进度 — DeepSeek Harness
 *
 * Two independent guarantees keep the prefix in place:
 *
 *   1. Order. We sit in `shell.overlay`, which the built-in `AppFrame` renders
 *      as a later sibling than its `DocumentTitle` child. React commits passive
 *      effects in fiber order, so within one commit ours runs second — we write
 *      last.
 *   2. Backstop. A `MutationObserver` on `<title>` re-layers the prefix after
 *      ANY write, whoever made it: the built-in one, or a future plugin's we
 *      cannot know about.
 *
 * Layering strips our own previous prefix first, so the prefix never
 * accumulates, and we never need to know what the factory title is — if the
 * product renames itself, we follow automatically.
 *
 * The document is passed in rather than read from a global so every rule in
 * here can be driven by a plain object in a test.
 *
 * @module @climber47/dsh-tab-status/client/title
 */

/** The prefix we currently want on screen. */
let desired = ''
/** The prefix we last actually wrote; what {@link baseTitleOf} strips. */
let applied = ''

/**
 * Strip the prefix this plugin previously wrote.
 * @param title - the current `document.title`.
 * @returns The title without our layer.
 */
export function baseTitleOf(title) {
  return applied !== '' && title.indexOf(applied) === 0 ? title.slice(applied.length) : title
}

/**
 * Write "factory title + current prefix" back to `document.title`.
 *
 * Writing nothing when the value already matches is what keeps the
 * `MutationObserver` from re-triggering itself.
 * @param doc - target document.
 */
export function syncTitle(doc) {
  const seen = doc.title
  const next = desired + baseTitleOf(seen)
  applied = desired
  if (seen !== next) doc.title = next
}

/**
 * Set the desired prefix and apply it now.
 * @param prefix - the new prefix; an empty string removes our layer.
 * @param doc - target document.
 */
export function setPrefix(prefix, doc) {
  desired = prefix
  syncTitle(doc)
}

/**
 * Install the title guard: any `<title>` change re-layers the prefix.
 * @param doc - target document.
 * @returns Disposer that disconnects the observer.
 */
export function installTitleWatch(doc) {
  const element = doc.querySelector('title')
  const observer = new MutationObserver(function () {
    syncTitle(doc)
  })
  observer.observe(element === null ? doc.head : element, {
    childList: true,
    characterData: true,
    subtree: true,
  })
  return function () {
    observer.disconnect()
  }
}

/**
 * Drop the layer and hand the title back: called on stop, update and unload.
 * @param doc - target document.
 */
export function clearPrefix(doc) {
  desired = ''
  syncTitle(doc)
  applied = ''
}
