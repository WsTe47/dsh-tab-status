## What this adds

One file: `data/plugins/WsTe47__dsh-tab-status.yml`.

Most tab-status plugins answer "how many things need me?" with an icon. This one
puts a **readable word** into the tab title first:

```
⚠ 2 待处理 · 修 tab 标题同步 — DeepSeek Harness
● 进行中 · 修 tab 标题同步 — DeepSeek Harness
✓ 2 已完成 · 修 tab 标题同步 — DeepSeek Harness
```

A tab clips from the right, so the leading text is the part that always survives
truncation: the tab tells you *what* is happening, not only *that* something is.
The three states are counted separately — waiting on you, running, finished while
you were away — with the state word and the count both in the prefix. The tab icon
is badged for the two states that want attention, while a running session keeps
the factory mark.

It reads the session list store, the pending-interaction store and the selected
panel through standard slot props: no host code, no polling, no RPC.

## Relationship to existing entries

I checked the full registry before sending this, and this surface is busy. Being
specific about that seems more useful than pretending otherwise:

| Entry | Its surface |
| --- | --- |
| `Luaphes/dsh-web-attention-badge` | `(N)` tab-title count, amber/green whale tint, in-frame count pills |
| `bf185003/dsh-favicon-status` | favicon painted from the session list, spinning while work runs |
| `waknow/dsh-web-icon-indicator` | favicon reflecting idle/running/asking/done, configurable |
| `Pudge1996/dsh-task-feedback` | favicon status plus sound |
| `chromoany/dsh-notify-me`, `lw-storm/dsh-plugin-noticeme`, `cookiesheep/whale-on-desk` | notifications, with a tab-title marker or flash |

What is different here is narrow, and I would rather state it narrowly than
oversell it: **the title carries a word**. None of the entries above put a readable
state name in the title — the title side is either a bare count or a marker that
appears only when something is pending.

The icon side, by contrast, genuinely overlaps with the entries above. If the tab
icon were the whole story I would not be sending this. And if you read the overlap
as too close anyway, close this without merging — that is a fair call.

## Checks

| CI requirement | State |
| --- | --- |
| One entry, one file, README untouched | ✅ `data/plugins/WsTe47__dsh-tab-status.yml` only |
| Repository declares `dsh.bundle` | ✅ `dsh.bundle.patch` + `dsh.client` (platform `web`) |
| Repository age ≥ 1 day | repo created 2026-09-13 |
| `dsh-plugin` topic | ✅ |
| Description is functional, not marketing, and true to the code | ✅ the three states, the per-state counts and the `9+` cap all match `src/` |
| Bilingual description | ✅ `description.en` + `description.zh`, both ending with a period |

The package is published on npm as
[`@climber47/dsh-tab-status`](https://www.npmjs.com/package/@climber47/dsh-tab-status),
and its `repository` field points back at the repository being listed.
