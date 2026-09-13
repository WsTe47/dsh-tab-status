window.__ModuleLoader__.load({
	id: "@climber47/dsh-tab-status",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		const React = react;
//#region src/client/status.js
/**
 * @climber47/dsh-tab-status — browser half: state derivation.
 *
 * Only three states are worth putting in front of you, plus the empty one.
 * They are the same facts, in the same priority order, the Workspace sidebar
 * already shows (`sessionStatuses` in `@deepseek-ai/dsh-client-ui-workspace`
 * reads the very same session list snapshot):
 *
 *   1. attention — a Session is waiting on you (approval / question / plan review)
 *   2. running   — a Session is working (its subagents included)
 *   3. done      — a Session finished while you were elsewhere, and you have not
 *                  opened it yet (the host arms this bit only for a Session that
 *                  is NOT the selected one)
 *   4. idle      — none of the above, and the tab goes back to its factory look
 *
 * Everything here is pure: no DOM, no services, no snapshot copying. That is
 * what makes each rule below directly assertable.
 *
 * @module @climber47/dsh-tab-status/client/status
 */

/** The three displayable states; `''` means "show nothing". */
const KIND = {
  attention: 'attention',
  running: 'running',
  done: 'done',
  idle: '',
}

/**
 * The symbol that leads the title prefix. A tab clips from the right, so this
 * is the last thing to disappear — and the first thing you see.
 */
const SYMBOL = {
  attention: '\u26a0 ',
  running: '\u25cf ',
  done: '\u2713 ',
}

/**
 * The word after the symbol: a bare symbol is too quiet in a tab, while a
 * three-character word is readable at a glance in either language's tab bar.
 */
const WORD = {
  attention: '待处理',
  running: '进行中',
  done: '已完成',
}

/** Separator between the status and the Session title. */
const SEPARATOR = ' \u00b7 '

/**
 * Pick the state to display, by the sidebar's own priority.
 * @param counts - `{ attention, running, done }` global counts.
 * @returns One of `KIND`'s values; `KIND.idle` when nothing is going on.
 */
function pickKind(counts) {
  if (counts.attention > 0) return KIND.attention
  if (counts.running > 0) return KIND.running
  if (counts.done > 0) return KIND.done
  return KIND.idle
}

/**
 * The number a state puts on the favicon badge.
 *
 * `running` and `idle` deliberately carry no number: running is the high-frequency
 * normal case, and a constant digit on the badge would be noise rather than news.
 * @param kind - a `KIND` value.
 * @param counts - `{ attention, running, done }` global counts.
 * @returns The badge number, or 0 when the state shows no number.
 */
function badgeCount(kind, counts) {
  if (kind === KIND.attention) return counts.attention
  if (kind === KIND.done) return counts.done
  return 0
}

/**
 * The title prefix for a state.
 *
 * A single running Session writes no number (`● 进行中 · `); several do
 * (`● 3 进行中 · `), because then the count itself is the information.
 * @param kind - a `KIND` value.
 * @param counts - `{ attention, running, done }` global counts.
 * @returns The prefix, or an empty string when idle.
 */
function prefixOf(kind, counts) {
  if (kind === KIND.idle) return ''
  if (kind === KIND.attention) return SYMBOL.attention + counts.attention + ' ' + WORD.attention + SEPARATOR
  if (kind === KIND.running) {
    return SYMBOL.running + (counts.running > 1 ? counts.running + ' ' : '') + WORD.running + SEPARATOR
  }
  return SYMBOL.done + counts.done + ' ' + WORD.done + SEPARATOR
}

/**
 * Count the three states out of the session list snapshot.
 *
 * Reads leaf fields only (`ids`, `byId[id].running`, `byId[id].completed` and a
 * key test on the pending map): no snapshot object is copied, cached, or held
 * past this call.
 * @param list - the list snapshot handed to `useSessions`.
 * @param pending - the pending-interaction map handed to `useSessionPendingInteraction`.
 * @returns `{ attention, running, done }`.
 */
function countStates(list, pending) {
  let attention = 0
  let running = 0
  let done = 0
  const ids = list.ids
  for (let index = 0; index < ids.length; index += 1) {
    const id = ids[index]
    const row = list.byId[id]
    if (row === undefined) continue
    if (pending !== undefined && pending.get(id) !== undefined) attention += 1
    if (row.running === true) running += 1
    if (row.completed === true) done += 1
  }
  return { attention: attention, running: running, done: done }
}

/**
 * The selected Session's title, or `undefined` when it should not be shown.
 *
 * Mirrors the built-in title rule exactly: `activePanelId === null` means the
 * conversation panel is in front, and a Session only contributes a title once
 * the host has projected a durable one.
 * @param list - the list snapshot handed to `useSessions`.
 * @param activePanelId - the selected main panel id, or null for the conversation.
 * @returns The durable title, or undefined.
 */
function sessionTitleOf(list, activePanelId) {
  if (activePanelId !== null) return undefined
  const current = list.current
  if (current === undefined) return undefined
  const row = list.byId[current]
  return row === undefined ? undefined : row.title
}
//#endregion
//#region src/client/title.js
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
function baseTitleOf(title) {
  return applied !== '' && title.indexOf(applied) === 0 ? title.slice(applied.length) : title
}

/**
 * Write "factory title + current prefix" back to `document.title`.
 *
 * Writing nothing when the value already matches is what keeps the
 * `MutationObserver` from re-triggering itself.
 * @param doc - target document.
 */
function syncTitle(doc) {
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
function setPrefix(prefix, doc) {
  desired = prefix
  syncTitle(doc)
}

/**
 * Install the title guard: any `<title>` change re-layers the prefix.
 * @param doc - target document.
 * @returns Disposer that disconnects the observer.
 */
function installTitleWatch(doc) {
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
function clearPrefix(doc) {
  desired = ''
  syncTitle(doc)
  applied = ''
}
//#endregion
//#region src/client/icon.js
/**
 * @climber47/dsh-tab-status — browser half: the favicon badge.
 *
 * Prominence is graded by how much the state wants your attention:
 *
 *   attention / done — a whole-image badge: a full-bleed coloured disc with the
 *                      count in white (at most `9+`)
 *   running          — the original mark, with a larger status dot in the corner
 *   idle             — the original icon, restored untouched
 *
 * `running` is deliberately NOT a whole-image badge. It is the high-frequency
 * normal case, so replacing the brand mark with a disc would hide it almost
 * permanently, while the two "come look at me" states are exactly the ones
 * worth spending the whole icon position on.
 *
 * Colours come from theme tokens and the badge is repainted when the theme
 * changes. Composition goes through a canvas; if that fails (a same-origin SVG
 * canvas can refuse to export), the badge degrades to a plain coloured disc
 * rather than to nothing at all.
 *
 * @module @climber47/dsh-tab-status/client/icon
 */

/** Which theme token each state paints with. */
const COLORS = {
  attention: ['--dsw-alias-state-warn-primary', '#e8a33d'],
  running: ['--dsw-alias-brand-primary', '#4c8dff'],
  done: ['--dsw-alias-state-success-primary', '#2fbf71'],
}

const SIZE = 64
const LOGO_SIZE = 44
const DOT_X = 50
const DOT_Y = 50
const DOT_R = 15
const RING = 3

/** What is painted right now; `kind === ''` means "not taken over". */
let current = { kind: '', count: 0 }
/** The factory favicon, captured before the first write so we can restore it. */
let original = null
/** The factory favicon decoded, for compositing. */
let logo = null
let logoReady = false
let cache = new Map()

/**
 * The digits a badge shows: two at most, above which it reads `9+`.
 * @param count - how many Sessions are in that state.
 * @returns The badge label.
 */
function labelOf(count) {
  return count > 9 ? '9+' : String(count)
}

/**
 * Read one theme token's current value (the theme presenter projects tokens
 * onto `document.body`).
 * @param doc - target document.
 * @param name - the token's CSS variable name.
 * @param fallback - value to use when the token resolves to nothing.
 * @returns The resolved colour.
 */
function readToken(doc, name, fallback) {
  const view = doc.defaultView
  if (view === null || view === undefined) return fallback
  const value = view.getComputedStyle(doc.body).getPropertyValue(name)
  return value !== undefined && value.trim() !== '' ? value.trim() : fallback
}

/** Whether the tab bar around us is dark; the badge outline is inverted to match. */
function isDarkChrome(doc) {
  const view = doc.defaultView
  if (view === null || view === undefined) return false
  return view.matchMedia('(prefers-color-scheme: dark)').matches
}

/** A blank square canvas of the icon's own size. */
function newCanvas(doc) {
  const canvas = doc.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  return canvas
}

/**
 * The whole-image badge: full-bleed disc plus the count in white.
 * @param doc - target document.
 * @param kind - `attention` or `done`.
 * @param count - how many Sessions are in that state.
 * @returns A PNG data URL.
 */
function badgeIcon(doc, kind, count) {
  const pair = COLORS[kind]
  const color = readToken(doc, pair[0], pair[1])
  const canvas = newCanvas(doc)
  const context = canvas.getContext('2d')
  context.beginPath()
  context.arc(32, 32, 29, 0, Math.PI * 2)
  context.fillStyle = color
  context.fill()
  context.lineWidth = 3
  context.strokeStyle = isDarkChrome(doc) ? 'rgba(255,255,255,.35)' : 'rgba(0,0,0,.16)'
  context.stroke()
  const label = labelOf(count)
  context.fillStyle = '#ffffff'
  context.font = 'bold ' + (label.length > 1 ? 26 : 36) + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(label, 32, 34)
  return canvas.toDataURL('image/png')
}

/**
 * The running icon: the factory mark with an enlarged status dot.
 * @param doc - target document.
 * @returns A PNG data URL.
 */
function runningIcon(doc) {
  const pair = COLORS.running
  const color = readToken(doc, pair[0], pair[1])
  const canvas = newCanvas(doc)
  const context = canvas.getContext('2d')
  if (logoReady && logo !== null) {
    context.drawImage(logo, 0, 0, LOGO_SIZE, LOGO_SIZE)
    context.beginPath()
    context.arc(DOT_X, DOT_Y, DOT_R + RING, 0, Math.PI * 2)
    context.fillStyle = isDarkChrome(doc) ? '#1c1c1e' : '#ffffff'
    context.fill()
  }
  context.beginPath()
  context.arc(DOT_X, DOT_Y, DOT_R, 0, Math.PI * 2)
  context.fillStyle = color
  context.fill()
  return canvas.toDataURL('image/png')
}

/**
 * Draw, and cache, one state's icon.
 *
 * A failed composition (canvas export refused) drops the mark and redraws
 * without it, so the badge still says the right thing.
 * @param doc - target document.
 * @param kind - the state to draw.
 * @param count - the state's count.
 * @returns A PNG data URL.
 */
function iconFor(doc, kind, count) {
  const key = kind + ':' + count
  const cached = cache.get(key)
  if (cached !== undefined) return cached
  let url
  try {
    url = kind === 'running' ? runningIcon(doc) : badgeIcon(doc, kind, count)
  } catch (error) {
    logo = null
    logoReady = false
    url = kind === 'running' ? runningIcon(doc) : badgeIcon(doc, kind, count)
  }
  cache.set(key, url)
  return url
}

/**
 * The document's favicon link, if it has one.
 * @param doc - target document.
 * @returns The link element, or null.
 */
function iconLink(doc) {
  return doc.querySelector('link[rel~="icon"]')
}

/**
 * Capture the factory favicon once, so any number of repaints can restore it.
 * @param doc - target document.
 * @returns `{ href, type }` as originally authored.
 */
function rememberOriginal(doc) {
  if (original !== null) return original
  const link = iconLink(doc)
  original = link === null
    ? { href: '', type: '' }
    : { href: link.getAttribute('href') || '', type: link.getAttribute('type') || '' }
  return original
}

/**
 * Switch the favicon to a state; `kind === ''` restores the factory icon.
 * @param doc - target document.
 * @param kind - the state to paint.
 * @param count - the state's count.
 */
function applyIcon(doc, kind, count) {
  const link = iconLink(doc)
  if (link === null) return
  const saved = rememberOriginal(doc)
  if (kind === current.kind && count === current.count) return
  current = { kind: kind, count: count }
  if (kind === '') {
    if (saved.href !== '') link.setAttribute('href', saved.href)
    if (saved.type !== '') link.setAttribute('type', saved.type)
    else link.removeAttribute('type')
    return
  }
  link.setAttribute('type', 'image/png')
  link.setAttribute('href', iconFor(doc, kind, count))
}

/**
 * Repaint the current state. Used when something outside the state itself
 * changed: the theme tokens, or the arrival of the factory mark.
 * @param doc - target document.
 */
function repaintIcon(doc) {
  const snapshot = current
  if (snapshot.kind === '') return
  current = { kind: '', count: 0 }
  applyIcon(doc, snapshot.kind, snapshot.count)
}

/** Drop every cached icon, because the colours they were drawn with changed. */
function invalidateCache() {
  cache = new Map()
}

/**
 * Decode the factory favicon in the background, then repaint the running state
 * so it carries the mark instead of standing in for it.
 * @param doc - target document.
 */
function adoptLogo(doc) {
  const saved = rememberOriginal(doc)
  if (saved.href === '' || logo !== null) return
  const image = new Image()
  image.onload = function () {
    logo = image
    logoReady = true
    invalidateCache()
    repaintIcon(doc)
  }
  image.onerror = function () {
    logoReady = false
  }
  image.src = saved.href
}
//#endregion
//#region src/client/index.js
/**
 * @climber47/dsh-tab-status — browser half.
 *
 * Keeps the browser tab in step with the workspace: a status prefix on the
 * title, and a favicon badge, for the three states the sidebar already tracks
 * (a Session waiting on you, a Session working, a Session finished while you
 * were elsewhere).
 *
 * What it does NOT do
 * -------------------
 * It does not poll. It does not fetch. It does not own any state of its own:
 * the session list, the pending interactions and the selected panel all arrive
 * as standard slot props, straight from the stores the sidebar itself reads.
 * It renders into `shell.overlay` and returns no element at all — its only
 * effects are `document.title` and the favicon link.
 *
 * Why that seat
 * -------------
 * `shell.overlay` is the frame-wide layer the layout plugin declares for
 * exactly this kind of occupant: `replaceRisk: none`, a fresh `id` is added
 * beside the shipped entries rather than replacing one. It is also a later
 * sibling than the built-in `DocumentTitle`, which is the ordering the title
 * layering relies on (see `./title.js`).
 *
 * @module @climber47/dsh-tab-status/client
 */


/**
 * Cordis services this plugin waits for.
 *
 * Only real client services belong here. Cordis parks a plugin whose declared
 * service is missing and waits indefinitely rather than throwing, so a name
 * nothing provides produces a plugin that loads, reports no error, and never
 * runs. `slots` owns the registration seat.
 */
const inject = ['slots']

/**
 * The status component.
 *
 * Returns `null` on purpose: everything visible about this plugin is browser
 * chrome, not page content. It reads the standard slot props — no RPC, no
 * service call, no host round trip.
 * @param props - standard `shell.overlay` props.
 * @returns Always null.
 */
function TabStatus(props) {
  const useSessions = props.useSessions
  const usePending = props.useSessionPendingInteraction
  const usePanelInfo = props.usePanelInfo

  const list = useSessions(function (state) {
    return state
  })
  const pending = usePending(function (map) {
    return map
  })
  const activePanelId = usePanelInfo(function (info) {
    return info.activePanelId
  })

  const counts = countStates(list, pending)
  const kind = pickKind(counts)
  const title = sessionTitleOf(list, activePanelId)
  const prefix = prefixOf(kind, counts)
  const count = badgeCount(kind, counts)

  // The dependency list covers the built-in DocumentTitle's own inputs (the
  // Session title and the panel), so whenever it rewrites the title we re-run
  // in the same commit and layer on top of it.
  React.useEffect(function () {
    setPrefix(prefix, document)
  }, [prefix, title, activePanelId])

  React.useEffect(function () {
    applyIcon(document, kind, count)
  }, [kind, count])

  return null
}

/**
 * Mount the plugin: title guard, theme repaint, and the overlay seat.
 * @param ctx - the plugin's Cordis context.
 */
function apply(ctx) {
  ctx.effect(function () {
    const disposeWatch = installTitleWatch(document)
    adoptLogo(document)
    return function () {
      disposeWatch()
      clearPrefix(document)
      applyIcon(document, '', 0)
    }
  })

  ctx.on('theme/change', function () {
    invalidateCache()
    repaintIcon(document)
  })

  ctx.slots.inject('shell.overlay', function () {
    return ctx.slots.register(
      { name: 'shell.overlay', id: 'tab-status', order: 200 },
      TabStatus,
    )
  })
}
//#endregion
		exports.KIND = KIND;
		exports.pickKind = pickKind;
		exports.badgeCount = badgeCount;
		exports.prefixOf = prefixOf;
		exports.countStates = countStates;
		exports.sessionTitleOf = sessionTitleOf;
		exports.baseTitleOf = baseTitleOf;
		exports.syncTitle = syncTitle;
		exports.setPrefix = setPrefix;
		exports.installTitleWatch = installTitleWatch;
		exports.clearPrefix = clearPrefix;
		exports.labelOf = labelOf;
		exports.readToken = readToken;
		exports.isDarkChrome = isDarkChrome;
		exports.badgeIcon = badgeIcon;
		exports.runningIcon = runningIcon;
		exports.iconFor = iconFor;
		exports.iconLink = iconLink;
		exports.rememberOriginal = rememberOriginal;
		exports.applyIcon = applyIcon;
		exports.repaintIcon = repaintIcon;
		exports.invalidateCache = invalidateCache;
		exports.adoptLogo = adoptLogo;
		exports.TabStatus = TabStatus;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
