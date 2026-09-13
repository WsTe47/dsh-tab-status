# 上架 awesome-dsh-plugin — 直达 PR

> 目标：让 `@climber47/dsh-tab-status` 出现在 dshmarket 的插件列表里。
>
> **要提 PR 的是精选列表仓库 `awesome-dsh-plugin/awesome-dsh-plugin`，不是市场应用仓库。**
> 市场本身只是读这份列表（README 原话：市场仓库不是插件目录）。

---

## ⚠️ 零、重复性尽调（先看这一节，再决定要不要提）

提交前遍历了注册表全部 **1000** 条条目，并**完整读过**最近的那一条：
`Luaphes/dsh-web-attention-badge@0.3.2`（已收录、5 stars、最后推送 2026-09-09、319 行手写 bundle 无构建步骤）。

### 0.1 逐项对照

| 维度 | 本插件 `dsh-tab-status` | 对方 `dsh-web-attention-badge` |
| --- | --- | --- |
| 标签标题 | `⚠ 2 待处理 · ` / `● 进行中 · ` / `✓ 2 已完成 · `，**带状态词**、按状态分别计数 | `(N) `，N = 待输入 + 已完成 **合计**，不区分状态 |
| **进行中状态** | ✅ 一等状态，优先级夹在「待处理」与「已完成」之间 | ❌ **完全没有**：正在跑的会话在它那里没有任何表示 |
| **待你输入** | ✅ 读 `useSessionPendingInteraction`（宿主里 `ui-approval` 与 `ui-user-questions` 正是用它发布） | ⚠️ 读 `SessionSummary.pendingInteraction` —— **该字段在当前版本不存在，琥珀态永远不会亮**（取证见 0.2） |
| 完成未查看 | ✅ `SessionSummary.completed` | ✅ 同 |
| favicon | canvas 合成：待处理/完成 = 满幅色圆 + 白色数字；进行中 = 保留鱼标 + 放大状态点 | 取 `/favicon.svg` 文本 → 去掉 `<style>` → 给每个 `path` 强制 `fill` → data URI，整条鱼单色染色 |
| favicon 跟随主题 | ✅ 监听 `theme/change` 重画 | ❌ 仅在状态变化时解析颜色，切主题后残留旧色直到下次状态变化 |
| 标题抢写兜底 | ✅ React effect 顺序 **+ `<title>` 上的 MutationObserver** | 仅 React effect 顺序 |
| 页内可见元素 | ❌ 无（组件只返回 `null`） | ✅ 框架左上角两枚计数 pill，`pointer-events:none`，带 `role="status"` 与 `aria-label` |
| 计数上限 | `9+` | 无上限（`(12)` 会更宽） |
| 工程形态 | `src/` 四模块 + 构建脚本 + 服务白名单守卫 + 20 条针对**发布产物**的行为测试 | 单文件手写，无构建、无测试 |
| 数据源 | 三个标准 props（`useSessions` / `useSessionPendingInteraction` / `usePanelInfo`） | 只用 `useSessions` |

### 0.2 「琥珀态不亮」的取证

对方代码第 90 行：

```js
if (row.pendingInteraction !== void 0) inputCount += 1;
```

安装版 dsh `0.1.5-rc.1` 中的核查结果：

1. `SessionSummary` 的字段是 `id / title? / displayTitle / cwd? / parentId? / origin? / running / completed? / blank / updatedAt / projectionValues?` —— **没有 `pendingInteraction`**（`dsh-api-session-controller/lib/types/client/sessions/service.d.ts`）。
2. 列表行的两层构造都不补这个字段：`projectList()` 的对象字面量里没有；`flattenLineage()` 只额外补 `completed` 与 `depth`。
3. 全运行时 grep `pendingInteraction`：`ui-workspace` 24 次（消费方）、`ui-session` 2 次（发布注册表）、`ui-conversation` 2、`cordis-client-runner` 1、`ui-user-questions` 1、`ui-approval` 1 —— **持有 store 行的 session-controller 里 0 次**。
4. 该状态的正确来源是独立的 observable：`uiSession.pendingInteractions`（`useSessionPendingInteraction` 标准 hook），由 `ui-approval` / `ui-user-questions` 通过 `registerPendingInteraction()` 发布 —— 本插件走的就是这条。

**保留意见**：对方 `package.json` 没有声明任何 `dsh.engines` 约束，所以不能排除它面向的是另一个 dsh 版本、而那个版本把该字段放进了摘要。若你要 100% 确定性，可以把它临时装进 profile 实测一次再决定。

### 0.3 结论与建议

**重叠是"表面与想法"层面的**：标签标题前缀 + favicon 提示「完成未查看」，这两件事它已经做了。
**差异是"状态覆盖"层面的**，而且不小：它缺一个高频状态（进行中），而它主打的另一个状态（待你输入）在当前版本不生效。

因此建议：**照提，但把差异写进 PR 正文**（`contrib/pr-body.md` 已按此重写），把判断交给维护者。备选是只发 npm、不提收录。

> ⚠️ **社交层面的一条纪律**：PR 正文里**不要**写"对方那个状态是坏的"。公开指出同行的缺陷会让一个技术判断变成人际问题，而且对收录毫无帮助。正文只讲我们做了什么（事实即可）。
> 如果愿意做件更有价值的事：以**善意 issue** 的形式把 0.2 的取证发给对方作者——那才是真正帮到人的做法，也能积累声誉。这一步同样由你决定。

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
- 仓库地址与目录约定已实测核对：`awesome-dsh-plugin/awesome-dsh-plugin`，默认分支 `main`，条目目录 `data/plugins/`，无 PR 模板（正文自由格式）。
- 第零节的对照基于实际克隆的 `Luaphes/dsh-web-attention-badge` 仓库与安装版 dsh `0.1.5-rc.1` 的类型/运行时源码，不是从描述推测的。
