## What this adds

One file: `data/plugins/WsTe47__dsh-tab-status.yml`.

`WsTe47/dsh-tab-status` keeps the browser tab in step with the WebUI workspace:
the page title gains a state prefix with a word in it
(`⚠ 2 待处理 · …`, `● 进行中 · …`, `✓ 2 已完成 · …`), and the tab icon becomes a
count badge for the two states that want your attention.

It reads the session list store, the pending-interaction map and the selected
panel through standard slot props — no host code, no polling, no RPC — and
registers one additive entry in `shell.overlay`.

## Relationship to existing entries

`Luaphes/dsh-web-attention-badge` (already listed) also puts session state on the
tab: an `(N)` title count and an amber/green whale tint for sessions **waiting**
on you and sessions **finished while you were away**.

The overlap is real, and I would rather flag it than have you find it later. What
this entry covers that the existing one does not:

- **The running state.** Waiting and finished are the two states the existing
  entry tracks; a session that is currently working has no representation there.
  Here `● 进行中` is a first-class state with its own priority slot between the
  two, which also makes it the state a background tab shows most of the time.
- **A state word in the prefix, not only a count.** A tab clips from the right,
  so `⚠ 2 待处理 · ` survives truncation where a bare `(2) ` does not. Counts are
  per-state rather than one combined total.
- **The badge follows the theme.** Colours are read from theme tokens and the
  badge is repainted on `theme/change`.

To be equally clear about the other direction: the existing entry also draws
count pills inside the app frame, which this plugin does not.

If you judge the overlap to be too close for a second entry, close this without
merging — that is a fair call and I would rather it be yours than mine.

## Checks

| CI requirement | State |
| --- | --- |
| One entry, one file, README untouched | ✅ `data/plugins/WsTe47__dsh-tab-status.yml` only |
| Repository declares `dsh.bundle` | ✅ `dsh.bundle.patch` + `dsh.client` (platform `web`) |
| Repository age ≥ 1 day | repo created 2026-09-13 |
| `dsh-plugin` topic | ✅ |
| Description is functional, not marketing, and true to the code | ✅ states, counts (`9+` cap) and the `shell.overlay` seat all match `src/` |
| Bilingual description | ✅ `description.en` + `description.zh`, both ending with a period |

Published on npm as [`@climber47/dsh-tab-status`](https://www.npmjs.com/package/@climber47/dsh-tab-status);
the package's `repository` field points back at the repository being listed.
