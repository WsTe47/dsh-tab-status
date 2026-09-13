# 上架 awesome-dsh-plugin — 直达 PR

> 目标：让 `@climber47/dsh-tab-status` 出现在 dshmarket 的插件列表里。
>
> **要提 PR 的是精选列表仓库 `awesome-dsh-plugin/awesome-dsh-plugin`，不是市场应用仓库。**
> 市场本身只是读这份列表（README 原话：市场仓库不是插件目录）。

---

## ⚠️ 零、重复性尽调（先看这一节，再决定要不要提）

提交前我遍历了注册表全部 **1000** 条条目，最近的一条是：

| | |
| --- | --- |
| 条目 | **`Luaphes/dsh-web-attention-badge`**（已收录，5 stars，最后推送 2026-09-09） |
| 原描述 | *"Attention reminders: frame badge, tab-title count, and a status-colored whale favicon for sessions waiting for input or finished unopened."* |
| 它的三个表面 | 框架左上角角标 `(N)` / **标签标题 `(N) …`** / **鲸鱼 favicon 按状态变琥珀或绿** |
| 它覆盖的状态 | **等待你**（amber）与 **完成未打开**（green） |

**重叠部分**：标签标题里放计数、favicon 按状态变色，这两件事它已经做了。
**本插件的实际差异**：

1. **多了「进行中」状态** —— 它只有等待 / 完成两种，正在跑的会话在它那里没有任何提示；本插件把进行中也放到标题与图标上（且是高频状态）。
2. **状态带文字** —— `⚠ 2 待处理 · ` / `● 进行中 · ` / `✓ 2 已完成 · `，而不是裸的 `(N)`；标签被裁切时先保住状态词。
3. **图标分级** —— 等待/完成用满幅带数字的徽章，进行中保留鱼标只加状态点；它则是整体染色。
4. 反面差距：它还有**框架内角标**，本插件没有。

收录评审的 8 条里明确包含「**是否与已有条目重复**」。所以有两条路：

- **A. 照提，但把差异写进 PR 正文**（`contrib/pr-body.md` 已写好这一段），把判断交给维护者。
  描述本身是属实的，没有夸大。
- **B. 不提收录**，只发 npm：包照样能被任何人 `dsh plugin add` 安装，只是不进列表、没有被发现的入口。

本次默认按 **A** 准备材料，但最终提交与否由你决定。

---

## 一、前置状态

| 硬性要求 | 状态 |
| --- | --- |
| 仓库创建满 **1 天** | 计时起点 2026-09-13 22:39 CST → **最早 2026-09-14 22:39 CST 提 PR** |
| 仓库打 `dsh-plugin` topic | ✅ 已打 |
| `package.json` 声明 `dsh.bundle` | ✅ `dsh.bundle.patch` + `dsh.client`（只声明 `dsh.client` 无法安装，是最常见的被拒原因） |
| 仓库含真实可用代码 | ✅ `src/` 可读源码 + `lib/client.js` 构建产物 + 20 条行为测试 |
| 描述只说功能、无营销词、且属实 | ✅ 逐条对照代码（优先级、`9+` 上限、`shell.overlay` 座位） |
| 条目文件 | ✅ `contrib/awesome-dsh-plugin-entry.yml` |
| npm 已发布（推荐，非必须） | ⏳ 待 `npm login`（本机 token 已失效，见 `docs/release-checklist.md` 第二节） |

---

## 二、提 PR（复制粘贴即可）

```sh
gh repo fork awesome-dsh-plugin/awesome-dsh-plugin --clone --remote
cd awesome-dsh-plugin
git checkout -b add-dsh-tab-status

cp /Users/climber47/dsh-tab-status/contrib/awesome-dsh-plugin-entry.yml \
   data/plugins/WsTe47__dsh-tab-status.yml

git add data/plugins/WsTe47__dsh-tab-status.yml
git commit -m "Add WsTe47/dsh-tab-status"
git push -u origin add-dsh-tab-status

gh pr create \
  --repo awesome-dsh-plugin/awesome-dsh-plugin \
  --title "Add WsTe47/dsh-tab-status" \
  --body-file /Users/climber47/dsh-tab-status/contrib/pr-body.md
```

### 那个文件里必须对的东西

| 项 | 要求 | 本仓库的值 |
| --- | --- | --- |
| 文件名 | 严格是 `<owner>__<repo>.yml`（双下划线） | `WsTe47__dsh-tab-status.yml` |
| `url` | 与仓库地址**完全一致** | `https://github.com/WsTe47/dsh-tab-status` |
| `name` | 列表里显示的链接文字 | `WsTe47/dsh-tab-status` |
| `category` | 23 个取值之一 | `ui`（主题/皮肤才用 `theme`） |
| 描述里的 `: ` | 半角冒号+空格必须整体加引号 | 本条目没有半角 `: ` |
| PR 范围 | **只加这一个文件**，不要动 README | README 由脚本从 `data/plugins/*.yml` 生成 |
| 每条 PR | 最多 3 条 | 本 PR 只有 1 条 |

---

## 三、CI 会按这个顺序查

1. **条目数** —— 每 PR 最多 3 条（最先查，早于任何网络请求）
2. **`dsh.bundle`** —— 从仓库根 `package.json` 读取；只声明 `dsh.client` 会在这里失败
3. **仓库年龄** —— 1 天门槛
4. **`awesome-lint` 与站点构建** —— 双语一致性、分隔符、日期

失败时会明确指出要改什么。

## 四、评审会看的 8 点（逐条自查）

| 评审项 | 本条目 |
| --- | --- |
| 代码与条目声明一致 | ✅ 描述里的三种状态、`9+` 上限、`shell.overlay` 座位都在代码里 |
| 分类是否合理 | ✅ `ui`（不会因此被打回，维护者会直接改） |
| 是否真实可用代码 | ✅ 非占位、非纯 README |
| 仓库年龄 | ⏳ 2026-09-14 22:39 CST 之后 |
| `dsh-plugin` topic | ✅ |
| 描述不带营销词 | ✅ |
| 描述属实 | ✅ |
| **是否与已有条目重复** | ⚠️ **见第零节**，差异写进了 PR 正文 |

## 五、合并之后

- 市场应用（dshmarket）与站点自动收录，通常**一天内**生效；你不需要跑任何命令。
- npm 下载量由 registry **自动**采集，条目里**没有** `npm:` 字段，手写会被校验拒绝。
- 不要手工编辑 README。
- 后续更新条目时**只改自己那一条**（手工编辑 README 是行号错位事故的常见起因）。

## 六、备注

- 教程与规范来源：`~/dsh-plugin-submission-guide.md`（查询日期 2026-09-12），以及 `awesome-dsh-plugin` 的 `contributing.md` 与 `pr-gate.yml`。
- 仓库地址与目录约定已于本次核对：`awesome-dsh-plugin/awesome-dsh-plugin`，默认分支 `main`，条目目录 `data/plugins/`，无 PR 模板（正文自由格式）。
