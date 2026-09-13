#!/usr/bin/env node
/**
 * Generate lib/client.js (the shipped browser bundle) from src/client/*.js.
 *
 * A dsh client bundle is not an ES module: the module loader evaluates it as a
 * script that only REGISTERS a factory —
 *
 *     window.__ModuleLoader__.load({ id, factory })
 *
 * and every module-body side effect lives inside that factory closure, running
 * at materialization rather than at script execution. React is resolved through
 * the loader's `require` instead of being bundled.
 *
 * This script keeps the shipped bundle derived from the readable source in
 * src/client/ so the two cannot drift. It performs the mechanical
 * transformations that difference requires:
 *
 *   1. strip the `import`/`export` keywords and concatenate the modules in
 *      dependency order, since the bundle is one CommonJS factory body rather
 *      than a module graph;
 *   2. alias the bare `React` identifier onto `require('react')`, so the
 *      component source can stay in the plain style a reader expects.
 *
 * Both are keyword-level text edits, not a parser, so the script also checks
 * its own work: every declared export must exist in the output, `inject` must
 * name only real services, and the bundle must never reach for a service a
 * client plugin does not have. tests/behaviour.mjs then drives the emitted
 * bundle through the real loader contract.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const PACKAGE_ID = '@climber47/dsh-tab-status'

/**
 * The readable modules, in dependency order. Stripping the imports leaves them
 * one flat scope, so a module may only use names declared above it.
 */
const MODULES = [
  'src/client/status.js',
  'src/client/title.js',
  'src/client/icon.js',
  'src/client/index.js',
]

/** The public surface the bundle re-exports. */
const EXPORTS = [
  'KIND',
  'pickKind',
  'badgeCount',
  'prefixOf',
  'countStates',
  'sessionTitleOf',
  'baseTitleOf',
  'syncTitle',
  'setPrefix',
  'installTitleWatch',
  'clearPrefix',
  'labelOf',
  'readToken',
  'isDarkChrome',
  'badgeIcon',
  'runningIcon',
  'iconFor',
  'iconLink',
  'rememberOriginal',
  'applyIcon',
  'repaintIcon',
  'invalidateCache',
  'adoptLogo',
  'TabStatus',
  'apply',
  'inject',
]

/** Read one source file, stripping its module syntax. */
function moduleBody(relative) {
  const text = readFileSync(join(root, relative), 'utf8')
  const stripped = text
    .replace(/^import\s[^\n]*\n/gm, '')
    .replace(/^export\s+(?=(?:const|function|async function|class))/gm, '')
  if (/^\s*(?:import|export)\s/m.test(stripped)) {
    throw new Error(`${relative}: an import/export the builder does not understand survived stripping`)
  }
  return stripped.trim()
}

const regions = MODULES.map((relative) => {
  const body = moduleBody(relative)
  return `//#region ${relative}\n${body}\n//#endregion`
}).join('\n')

// The component source names `React` directly; bind it to the loader-provided
// module. `react` is also aliased for the long form.
const preamble = `		let react = require("react");
		const React = react;`

const tail = EXPORTS.map((name) => `		exports.${name} = ${name};`).join('\n')

const output = `window.__ModuleLoader__.load({
	id: ${JSON.stringify(PACKAGE_ID)},
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
${preamble}
${regions}
${tail}
		return module.exports;
	}
});
`

// A declared service that no provider offers makes Cordis park the plugin
// forever without throwing, so a typo here is a silent no-render bug. `styles`
// in particular is a dynamic-plugin evaluator builtin, NOT a service: it is
// handed to the dynamic sandbox and never provided on a client context. That
// exact mistake shipped in dsh-step-clock 0.1.0 and rendered nothing at all.
const SERVICE_ALLOWLIST = new Set(['slots', 'timer', 'theme', 'locale', 'sessions', 'remote'])
const declared = /const inject = \[([^\]]*)\]/.exec(output)
if (declared === null) throw new Error('src/client/index.js no longer declares `inject`')
const names = declared[1]
  .split(',')
  .map((part) => part.trim().replace(/^['"]|['"]$/g, ''))
  .filter((part) => part !== '')
for (const name of names) {
  if (!SERVICE_ALLOWLIST.has(name)) {
    throw new Error(
      `inject declares "${name}", which is not a known client service. ` +
        'Cordis would wait for it forever and the plugin would never render. ' +
        'If this is a genuine service, add it to SERVICE_ALLOWLIST deliberately.',
    )
  }
}

// Every re-export must be a real declaration, or the bundle ships `undefined`.
for (const name of EXPORTS) {
  const declaration = new RegExp(`(?:const|function)\\s+${name}\\b`)
  if (!declaration.test(output)) {
    throw new Error(`exports.${name} has no declaration in the bundle — did a module get renamed?`)
  }
}

if (output.includes('ctx.styles')) {
  throw new Error('the bundle references ctx.styles, which does not exist for a client plugin')
}

const target = join(root, 'lib/client.js')
writeFileSync(target, output)
console.log(`built ${target} (${output.length} bytes)`)
