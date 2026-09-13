#!/usr/bin/env node
/**
 * Behaviour tests for the shipped bundle.
 *
 * These drive the real `lib/client.js` — not the readable source — through the
 * module-loader contract, with a minimal React stand-in and a minimal DOM
 * stand-in, and assert on what the plugin actually does to `document.title` and
 * to the favicon link. That is deliberate: the bundle is what ships, and it is
 * produced by text transformations, so testing the source would not prove the
 * shipped artifact is correct.
 *
 * The modules keep their state in module scope (the title layer's prefix, the
 * favicon's current state), so every test that touches that state sets it
 * explicitly first instead of inheriting it from whichever test ran before.
 *
 * Run: node --test tests/
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Load the shipped bundle through a fake module loader and return its exports. */
function loadBundle() {
  const registrations = []
  const previous = globalThis.window
  globalThis.window = { __ModuleLoader__: { load: (entry) => registrations.push(entry) } }
  const source = readFileSync(join(root, 'lib/client.js'), 'utf8')
  new Function('window', source)(globalThis.window)
  globalThis.window = previous

  assert.equal(registrations.length, 1, 'the bundle must register exactly one module')
  const entry = registrations[0]
  assert.equal(entry.id, '@climber47/dsh-tab-status')
  assert.equal(typeof entry.factory, 'function', 'the registration must carry a factory')

  // Effects are captured rather than run, so a test decides when the commit
  // "happens". Rendering an element is an error by construction: this plugin
  // contributes no page content.
  const effects = []
  const fakeReact = {
    createElement() {
      throw new Error('this plugin must not render an element')
    },
    useEffect(effect) {
      effects.push(effect)
    },
  }
  const exports = entry.factory((name) => {
    if (name === 'react') return fakeReact
    throw new Error(`bundle required an unexpected module: ${name}`)
  })
  return { exports, effects, source }
}

const { exports: bundle, effects, source } = loadBundle()

/** A 2D-context stand-in that records every drawing call it receives. */
function fakeContext(calls) {
  const record = (name) => (...args) => {
    calls.push({ name, args })
  }
  return {
    beginPath: record('beginPath'),
    arc: record('arc'),
    fill: record('fill'),
    stroke: record('stroke'),
    fillText: record('fillText'),
    drawImage: record('drawImage'),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    font: '',
    textAlign: '',
    textBaseline: '',
  }
}

/**
 * A DOM stand-in with exactly the surface this plugin uses: `title`, a head, a
 * favicon link, and a canvas factory.
 * @returns `{ doc, link, draws, calls }` — the document, its favicon link, how
 *   many times a canvas was exported, and the drawing calls that were made.
 */
function createDom() {
  const draws = { count: 0 }
  const calls = []
  const link = {
    attributes: { href: './favicon.svg', type: 'image/svg+xml' },
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null
    },
    setAttribute(name, value) {
      this.attributes[name] = value
    },
    removeAttribute(name) {
      delete this.attributes[name]
    },
  }
  const titleElement = { nodeName: 'TITLE' }
  const doc = {
    title: 'DeepSeek Harness',
    body: {},
    head: { nodeName: 'HEAD' },
    defaultView: {
      getComputedStyle: () => ({ getPropertyValue: () => '' }),
      matchMedia: () => ({ matches: false }),
    },
    createElement(name) {
      assert.equal(name, 'canvas', 'a canvas is the only element this plugin creates')
      return {
        width: 0,
        height: 0,
        getContext: () => fakeContext(calls),
        toDataURL: () => {
          draws.count += 1
          return `data:image/png;base64,DRAW${draws.count}`
        },
      }
    },
    querySelector(selector) {
      if (selector === 'title') return titleElement
      if (selector === 'link[rel~="icon"]') return link
      return null
    },
  }
  return { doc, link, draws, calls, titleElement }
}

/** Run a body with a MutationObserver stand-in, exposing the instances it made. */
function withObserver(body) {
  const previous = globalThis.MutationObserver
  const instances = []
  globalThis.MutationObserver = class {
    constructor(callback) {
      this.callback = callback
      instances.push(this)
    }
    observe(target, options) {
      this.target = target
      this.options = options
    }
    disconnect() {
      this.disconnected = true
    }
  }
  try {
    return body(instances)
  } finally {
    globalThis.MutationObserver = previous
  }
}

/** Run a body with `document` (and helpers) installed as globals. */
function withDocument(doc, body) {
  const previousDocument = globalThis.document
  const previousImage = globalThis.Image
  globalThis.document = doc
  globalThis.Image = class {
    set src(value) {
      this.source = value
    }
  }
  try {
    return body()
  } finally {
    globalThis.document = previousDocument
    globalThis.Image = previousImage
  }
}

/** Leave the favicon state idle, so each icon test starts from the same place. */
function idleIcon() {
  const dom = createDom()
  bundle.applyIcon(dom.doc, '', 0)
  return createDom()
}

//#region the shipped artifact

test('the bundle registers one module under the package id', () => {
  assert.match(source, /window\.__ModuleLoader__\.load\(/)
  assert.match(source, /id: "@climber47\/dsh-tab-status"/)
})

test('the bundle declares only real client services', () => {
  assert.deepEqual(bundle.inject, ['slots'])
  assert.ok(
    !bundle.inject.includes('styles'),
    'inject must not declare the non-existent styles service',
  )
  assert.doesNotMatch(source, /ctx\.styles/, 'a client plugin has no ctx.styles')
})

//#endregion
//#region state derivation

test('a Session waiting on you outranks a running one, which outranks a finished one', () => {
  assert.equal(bundle.pickKind({ attention: 1, running: 1, done: 1 }), 'attention')
  assert.equal(bundle.pickKind({ attention: 0, running: 2, done: 5 }), 'running')
  assert.equal(bundle.pickKind({ attention: 0, running: 0, done: 1 }), 'done')
  assert.equal(bundle.pickKind({ attention: 0, running: 0, done: 0 }), '')
})

test('the title prefix names the state, and the count where the count is the news', () => {
  assert.equal(bundle.prefixOf('attention', { attention: 2, running: 0, done: 0 }), '\u26a0 2 待处理 \u00b7 ')
  assert.equal(bundle.prefixOf('running', { attention: 0, running: 1, done: 0 }), '\u25cf 进行中 \u00b7 ')
  assert.equal(bundle.prefixOf('running', { attention: 0, running: 3, done: 0 }), '\u25cf 3 进行中 \u00b7 ')
  assert.equal(bundle.prefixOf('done', { attention: 0, running: 0, done: 2 }), '\u2713 2 已完成 \u00b7 ')
  assert.equal(bundle.prefixOf('', { attention: 0, running: 0, done: 0 }), '')
})

test('only the two come-look states put a number on the badge', () => {
  assert.equal(bundle.badgeCount('attention', { attention: 4, running: 0, done: 0 }), 4)
  assert.equal(bundle.badgeCount('done', { attention: 0, running: 0, done: 2 }), 2)
  assert.equal(bundle.badgeCount('running', { attention: 0, running: 3, done: 0 }), 0)
  assert.equal(bundle.badgeCount('', { attention: 0, running: 0, done: 0 }), 0)
})

test('counts come from leaf fields, and a missing pending map is tolerated', () => {
  const list = {
    ids: ['a', 'b', 'c'],
    byId: {
      a: { running: true },
      b: { completed: true },
      c: { running: true, completed: true },
    },
  }
  assert.deepEqual(bundle.countStates(list, undefined), { attention: 0, running: 2, done: 2 })
  const pending = new Map([['a', { kind: 'approval' }]])
  assert.deepEqual(bundle.countStates(list, pending), { attention: 1, running: 2, done: 2 })
})

test('an id with no row is skipped rather than counted or thrown on', () => {
  const list = { ids: ['gone', 'here'], byId: { here: { running: true } } }
  assert.deepEqual(bundle.countStates(list, new Map()), { attention: 0, running: 1, done: 0 })
})

test('the session title follows the built-in panel rule', () => {
  const list = { current: 's1', ids: ['s1'], byId: { s1: { title: '聊天' } } }
  assert.equal(bundle.sessionTitleOf(list, null), '聊天')
  assert.equal(bundle.sessionTitleOf(list, 'settings'), undefined)
  assert.equal(bundle.sessionTitleOf({ current: undefined, ids: [], byId: {} }, null), undefined)
})

//#endregion
//#region the title layer

test('the layer stacks once and never accumulates', () => {
  const { doc } = createDom()
  doc.title = '聊天 — DeepSeek Harness'
  bundle.setPrefix('\u2713 2 已完成 \u00b7 ', doc)
  assert.equal(doc.title, '\u2713 2 已完成 \u00b7 聊天 — DeepSeek Harness')
  bundle.syncTitle(doc)
  bundle.syncTitle(doc)
  assert.equal(doc.title, '\u2713 2 已完成 \u00b7 聊天 — DeepSeek Harness')
})

test('the layer survives the built-in title writer', () => {
  const { doc } = createDom()
  bundle.setPrefix('\u25cf 进行中 \u00b7 ', doc)
  assert.equal(doc.title, '\u25cf 进行中 \u00b7 DeepSeek Harness')
  // The built-in DocumentTitle rewrites the whole title, unaware of us.
  doc.title = '新标题 — DeepSeek Harness'
  bundle.syncTitle(doc)
  assert.equal(doc.title, '\u25cf 进行中 \u00b7 新标题 — DeepSeek Harness')
})

test('dropping the layer hands the title back untouched', () => {
  const { doc } = createDom()
  bundle.setPrefix('\u2713 1 已完成 \u00b7 ', doc)
  bundle.clearPrefix(doc)
  assert.equal(doc.title, 'DeepSeek Harness')
})

test('the title guard re-layers after a write, and stops when disposed', () => {
  withObserver((instances) => {
    const { doc, titleElement } = createDom()
    bundle.setPrefix('\u2713 2 已完成 \u00b7 ', doc)
    const dispose = bundle.installTitleWatch(doc)
    assert.equal(instances.length, 1, 'exactly one observer guards the title')
    assert.equal(instances[0].target, titleElement, 'the observer watches <title>, not all of <head>')
    assert.deepEqual(instances[0].options, { childList: true, characterData: true, subtree: true })

    doc.title = '被内置改掉了 — DeepSeek Harness'
    instances[0].callback()
    assert.equal(doc.title, '\u2713 2 已完成 \u00b7 被内置改掉了 — DeepSeek Harness')

    dispose()
    assert.equal(instances[0].disconnected, true)
    bundle.clearPrefix(doc)
  })
})

//#endregion
//#region the favicon badge

test('a badge shows its count, and counts above nine read 9+', () => {
  assert.equal(bundle.labelOf(1), '1')
  assert.equal(bundle.labelOf(9), '9')
  assert.equal(bundle.labelOf(10), '9+')
})

test('the favicon is swapped for a badge, cached, then restored', () => {
  const { doc, link, draws } = idleIcon()
  bundle.applyIcon(doc, 'done', 2)
  assert.equal(link.getAttribute('type'), 'image/png')
  assert.match(link.getAttribute('href'), /^data:image\/png/)
  assert.equal(draws.count, 1, 'the badge is drawn once')

  bundle.applyIcon(doc, 'done', 2)
  assert.equal(draws.count, 1, 'an unchanged state must not redraw')

  bundle.applyIcon(doc, '', 0)
  assert.equal(link.getAttribute('href'), './favicon.svg')
  assert.equal(link.getAttribute('type'), 'image/svg+xml')
})

test('a state change redraws, and a count change with it', () => {
  const { doc, draws } = idleIcon()
  bundle.applyIcon(doc, 'done', 1)
  assert.equal(draws.count, 1)
  bundle.applyIcon(doc, 'attention', 1)
  assert.equal(draws.count, 2, 'a different state must redraw')
  bundle.applyIcon(doc, 'attention', 2)
  assert.equal(draws.count, 3, 'a different count must redraw')
  bundle.applyIcon(doc, '', 0)
  assert.equal(draws.count, 3, 'restoring the factory icon paints nothing')
})

test('the running icon paints its dot even before the mark is decoded', () => {
  const { doc, calls } = createDom()
  const url = bundle.runningIcon(doc)
  assert.match(url, /^data:image\/png/)
  assert.ok(
    calls.some((call) => call.name === 'arc'),
    'the status dot must be painted',
  )
  assert.ok(
    !calls.some((call) => call.name === 'drawImage'),
    'nothing is composited while the mark is not decoded',
  )
})

test('the badge draws its digits, and is a full-bleed disc rather than a corner dot', () => {
  const { doc, calls } = createDom()
  bundle.badgeIcon(doc, 'done', 12)
  const text = calls.find((call) => call.name === 'fillText')
  assert.equal(text.args[0], '9+', 'a two-digit count reads 9+')
  const disc = calls.find((call) => call.name === 'arc')
  assert.equal(disc.args[2], 29, 'the disc spans the icon rather than sitting in a corner')
})

//#endregion
//#region wiring

test('a running Session writes both the prefix and the badge', () => {
  const dom = createDom()
  // In the real page the built-in DocumentTitle has already written the
  // "<session title> — <product>" title before our effect runs; we only stack.
  dom.doc.title = '聊天 — DeepSeek Harness'
  withDocument(dom.doc, () => {
    const list = { ids: ['s1'], current: 's1', byId: { s1: { title: '聊天', running: true } } }
    const props = {
      useSessions: (select) => select(list),
      useSessionPendingInteraction: (select) => select(new Map()),
      usePanelInfo: (select) => select({ activePanelId: null }),
    }
    const before = effects.length
    assert.equal(bundle.TabStatus(props), null, 'the overlay entry renders nothing')
    const committed = effects.slice(before)
    assert.equal(committed.length, 2, 'one effect for the title, one for the favicon')
    for (const effect of committed) effect()
    assert.equal(dom.doc.title, '\u25cf 进行中 \u00b7 聊天 — DeepSeek Harness')
    assert.equal(dom.link.getAttribute('type'), 'image/png')
  })
})

test('a finished Session that is not selected raises the count badge', () => {
  const dom = createDom()
  dom.doc.title = '聊天 — DeepSeek Harness'
  withDocument(dom.doc, () => {
    const list = {
      ids: ['s1', 's2'],
      current: 's1',
      byId: { s1: { title: '聊天' }, s2: { title: '别的会话', completed: true } },
    }
    const props = {
      useSessions: (select) => select(list),
      useSessionPendingInteraction: (select) => select(new Map()),
      usePanelInfo: (select) => select({ activePanelId: null }),
    }
    const before = effects.length
    bundle.TabStatus(props)
    for (const effect of effects.slice(before)) effect()
    assert.equal(dom.doc.title, '\u2713 1 已完成 \u00b7 聊天 — DeepSeek Harness')
  })
})

test('apply registers one overlay seat, guards the title, and cleans up after itself', () => {
  withObserver(() => {
    const dom = createDom()
    withDocument(dom.doc, () => {
      const disposers = []
      const events = []
      const injected = []
      const registered = []
      const ctx = {
        effect(setup) {
          disposers.push(setup())
        },
        on(name) {
          events.push(name)
        },
        slots: {
          inject(slot, build) {
            injected.push(slot)
            build()
          },
          register(options, component) {
            registered.push({ options, component })
            return () => {}
          },
        },
      }

      bundle.apply(ctx)

      assert.deepEqual(injected, ['shell.overlay'], 'exactly one seat, and it is the additive overlay layer')
      assert.equal(registered.length, 1)
      assert.deepEqual(registered[0].options, { name: 'shell.overlay', id: 'tab-status', order: 200 })
      assert.equal(registered[0].component, bundle.TabStatus)
      assert.deepEqual(events, ['theme/change'], 'the badge must follow the theme')
      assert.equal(disposers.length, 1, 'the title guard must be owned by the plugin fiber')

      bundle.setPrefix('\u2713 2 已完成 \u00b7 ', dom.doc)
      bundle.applyIcon(dom.doc, 'done', 2)
      disposers[0]()
      assert.equal(dom.doc.title, 'DeepSeek Harness', 'stopping the plugin restores the title')
      assert.equal(dom.link.getAttribute('href'), './favicon.svg', 'and the factory favicon')
    })
  })
})

//#endregion
