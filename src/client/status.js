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
export const KIND = {
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
export function pickKind(counts) {
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
export function badgeCount(kind, counts) {
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
export function prefixOf(kind, counts) {
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
export function countStates(list, pending) {
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
export function sessionTitleOf(list, activePanelId) {
  if (activePanelId !== null) return undefined
  const current = list.current
  if (current === undefined) return undefined
  const row = list.byId[current]
  return row === undefined ? undefined : row.title
}
