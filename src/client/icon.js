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
export function labelOf(count) {
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
export function readToken(doc, name, fallback) {
  const view = doc.defaultView
  if (view === null || view === undefined) return fallback
  const value = view.getComputedStyle(doc.body).getPropertyValue(name)
  return value !== undefined && value.trim() !== '' ? value.trim() : fallback
}

/** Whether the tab bar around us is dark; the badge outline is inverted to match. */
export function isDarkChrome(doc) {
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
export function badgeIcon(doc, kind, count) {
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
export function runningIcon(doc) {
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
export function iconFor(doc, kind, count) {
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
export function iconLink(doc) {
  return doc.querySelector('link[rel~="icon"]')
}

/**
 * Capture the factory favicon once, so any number of repaints can restore it.
 * @param doc - target document.
 * @returns `{ href, type }` as originally authored.
 */
export function rememberOriginal(doc) {
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
export function applyIcon(doc, kind, count) {
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
export function repaintIcon(doc) {
  const snapshot = current
  if (snapshot.kind === '') return
  current = { kind: '', count: 0 }
  applyIcon(doc, snapshot.kind, snapshot.count)
}

/** Drop every cached icon, because the colours they were drawn with changed. */
export function invalidateCache() {
  cache = new Map()
}

/**
 * Decode the factory favicon in the background, then repaint the running state
 * so it carries the mark instead of standing in for it.
 * @param doc - target document.
 */
export function adoptLogo(doc) {
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
