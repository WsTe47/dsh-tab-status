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

import { badgeCount, countStates, pickKind, prefixOf, sessionTitleOf } from './status.js'
import { clearPrefix, installTitleWatch, setPrefix } from './title.js'
import { adoptLogo, applyIcon, invalidateCache, repaintIcon } from './icon.js'

/**
 * Cordis services this plugin waits for.
 *
 * Only real client services belong here. Cordis parks a plugin whose declared
 * service is missing and waits indefinitely rather than throwing, so a name
 * nothing provides produces a plugin that loads, reports no error, and never
 * runs. `slots` owns the registration seat.
 */
export const inject = ['slots']

/**
 * The status component.
 *
 * Returns `null` on purpose: everything visible about this plugin is browser
 * chrome, not page content. It reads the standard slot props — no RPC, no
 * service call, no host round trip.
 * @param props - standard `shell.overlay` props.
 * @returns Always null.
 */
export function TabStatus(props) {
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
export function apply(ctx) {
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
