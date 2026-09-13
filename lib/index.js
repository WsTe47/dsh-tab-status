/**
 * @climber47/dsh-tab-status — host half.
 *
 * This plugin is browser-only: every piece of behaviour is in the client half
 * (`src/client/`, served from `lib/client.js` as the package's `./client`
 * export and declared through `dsh.client` in package.json). The host half
 * therefore contributes nothing at runtime.
 *
 * It still exists, and is still loaded, because a dsh bundle's inserted row
 * resolves the package root: a package that could not be imported would not
 * mount. Both exports below are the empty, valid shape for that contract.
 *
 * @module @climber47/dsh-tab-status
 */

/**
 * No host services are required.
 *
 * The browser half declares its own (`slots`); see `src/client/index.js`.
 * Nothing here should be read as describing it.
 */
export const inject = []

/**
 * Mount the (empty) host half.
 *
 * The client half is loaded independently by the client module host, which
 * scans installed packages for a `dsh.client` declaration; it does not depend
 * on anything this function does.
 */
export function apply() {}
