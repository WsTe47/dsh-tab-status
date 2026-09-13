# dsh-tab-status

[中文](README.zh.md) | English

Puts the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) workspace's session progress on the **browser tab**: a state prefix on the page title, and a count badge on the tab icon for the two states that want your attention.

```
⚠ 2 待处理 · 浏览器标签同步对话进度 — DeepSeek Harness
● 进行中 · 浏览器标签同步对话进度 — DeepSeek Harness
✓ 2 已完成 · 浏览器标签同步对话进度 — DeepSeek Harness
浏览器标签同步对话进度 — DeepSeek Harness        ← idle: byte-for-byte the factory behaviour
```

## Why it exists

The sidebar already tells you which session is running and which one finished — but the sidebar is **page content**, and it only helps while you are looking at it.

The browser tab is the one strip that is **always** on screen, and the only thing still visible from a background tab. This plugin moves the three things worth knowing onto it: a session is waiting on you, a session is working, a session finished while you were looking elsewhere.

## What it says

| State | When | Title prefix | Tab icon |
| --- | --- | --- | --- |
| ⚠ 待处理 (waiting) | a session is waiting on you (approval / question / plan review) | `⚠ 2 待处理 · ` | full-bleed amber disc with a white count |
| ● 进行中 (running) | a session is working (its subagents included) | `● 进行中 · `, or `● 3 进行中 · ` for several | the original mark with an enlarged status dot |
| ✓ 已完成 (finished) | a session finished and you have not opened it | `✓ 2 已完成 · ` | full-bleed green disc with a white count |
| idle | none of the above | none | the original icon, restored |

Priority matches the workspace sidebar: **waiting > running > finished > idle**.

Badge counts cap at `9+`. A running state is deliberately **not** a whole-image badge: it is the high-frequency normal case, so replacing the brand mark with a disc would hide it almost permanently, while the two "come look at me" states are exactly the ones worth spending the whole icon position on.

## Where the states come from

Everything arrives as standard slot props; the plugin fetches nothing, polls nothing, and makes no RPC calls:

- `useSessions` — the session list snapshot, the very same one the sidebar reads (`running`, `completed`, `title`).
- `useSessionPendingInteraction` — each session's pending interaction.
- `usePanelInfo` — the active main panel; a session title is shown only while the conversation panel is in front, matching the built-in title rule.

The "finished" bit deserves a note of its own: the host sets it only for a session that is **not** the selected one, so it means exactly "it finished while you were elsewhere" — which is precisely what a tab should tell you.

## Install

```sh
dsh plugin --profile web add @climber47/dsh-tab-status
```

then restart `dsh web`.

## How it works

This is a dsh bundle, mounted by a single insert row:

- `package.json` declares `dsh.bundle.patch` (what makes it installable) and `dsh.client` (`platform: web`, what makes the browser half load).
- `cordis.patch.yml` inserts the `tab-status` row.
- `lib/index.js` is the (deliberately empty) host half: this plugin has no host behaviour, but the bundle's insert row resolves the package root, so the package has to be importable.
- `lib/client.js` is the browser half, in the `window.__ModuleLoader__.load({ id, factory })` registration shape a client bundle must have. It is generated from `src/client/` by `npm run build`, so the readable source and the shipped artifact cannot drift.
- It registers **one purely additive** entry in `shell.overlay` (the frame-wide layer with `replaceRisk: none`) and returns `null`: its only effects are `document.title` and the favicon `<link>`.
- **The title is layered, not taken over.** The built-in `DocumentTitle` in `@deepseek-ai/dsh-client-ui-layout` keeps writing the title exactly as before, and we add a prefix on top. Two independent guarantees: effect order (`shell.overlay` is a later sibling in AppFrame, so within one commit our effect runs second), and a `MutationObserver` on `<title>` that re-layers the prefix after any write. Layering strips our own previous prefix first, so it never accumulates and we never need to know what the factory title is — if the product renames itself, we follow.
- The favicon is composed on a canvas, coloured from theme tokens (`--dsw-alias-state-warn-primary` / `--dsw-alias-brand-primary` / `--dsw-alias-state-success-primary`), and repainted when the theme changes.
- It declares only **real** services (`slots`). A client plugin has no styles service — `styles` exists only inside the dynamic-plugin sandbox; declaring a service nobody provides makes Cordis wait forever, so the plugin reports itself loaded, logs no error, and never renders. The build script carries a service allowlist that exists specifically to catch that class of mistake.

## Known limits

- **This page only**: several tabs are independent; this is not a cross-page dashboard.
- **No polling**: it writes once per snapshot change, so there is no per-second information such as "running for 3 minutes".
- **Badge counts cap at `9+`.**
- **Do not run it alongside a dynamic Cordis plugin that does the same thing** — the two would fight over the title. Stop the dynamic one before installing this.
- The plugin makes no network request and stores no data.

## Requirements

- dsh `>=0.1.5-rc.1`
- React 18 (a peer dependency, supplied by the harness shell)

## License

MIT
