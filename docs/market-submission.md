# 上架 awesome-dsh-plugin — 直达 PR

> 目标：让 `@climber47/dsh-tab-status` 出现在 dshmarket 的插件列表里。
>
> **要提 PR 的是精选列表仓库 `awesome-dsh-plugin/awesome-dsh-plugin`，不是市场应用仓库。**
> 市场本身只是读这份列表（README 原话：市场仓库不是插件目录）。

---

## ⚠️ 零、全量重复性尽调（先看这一节，再决定要不要提）

> **更正**：本文件初版只覆盖了注册表前 1000 条条目 —— 那是 GitHub contents API 的
> 分页上限，不是全量。本地克隆后在**全部 3633 条**上重扫，结论明显变化。

提交前已**完整克隆并逐行读过**最相似的那一条
（`Luaphes/dsh-web-attention-badge@0.3.2`，319 行手写 bundle、无构建步骤）。

### 0.1 先看全局：这个细分领域已经很挤

按描述全文检索 `tab title` / `browser tab` / `favicon` / `标签页标题`，命中同一件事的条目：

| 条目 | 它做了什么 | 覆盖进行中？ |
| --- | --- | --- |
| `Luaphes/dsh-web-attention-badge` | 标签标题 `(N)` 计数 + 鲸鱼 favicon 琥珀/绿 + 框架内角标 | ❌ |
| **`bf185003/dsh-favicon-status`** | 按会话列表画 favicon：**蓝色旋转 = 运行中**、琥珀 = 等你、绿 = 完成 | ✅ 且有动画 |
| **`waknow/dsh-web-icon-indicator`** | favicon 映射会话状态（idle / **running** / asking / done），单个基础 SVG 重着色，**效果可配置** | ✅ 且可配置 |
| `Pudge1996/dsh-task-feedback` | 标签 favicon 上的实时会话状态 + 声音提醒 | — |
| `chromoany/dsh-notify-me` | 桌面通知 + 声音 + **标签标题标记**（需要输入 / 后台完成） | — |
| `lw-storm/dsh-plugin-noticeme` | 后台审批/提问时桌面通知，**标签标题兜底** | — |
| `cookiesheep/whale-on-desk` | 审批等待时**闪标签标题** + 完成语音播报 | — |

「favicon 随会话状态变化」至少已有 **3** 条在做，其中 2 条连**进行中**与**动画/可配置**都做了；
「标签标题提示」至少已有 **4** 条在做。

因此本插件的实际差异缩水为：标题前缀带**状态词**（而非裸 `(N)`）、**按状态分别计数**、徽章**跟随主题**重画、
`<title>` 上的 MutationObserver 兜底、以及 `src/` + 构建守卫 + 20 条行为测试的工程形态。
**这些属于打磨，不属于新能力。**

### 0.2 与最相似那条的逐项对照

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

### 0.3 「琥珀态不亮」的取证

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

### 0.4 结论与决定：照提，但**重新定位**

全量尽调后确定的走法：

- **照提收录 PR，把卖点收窄到唯一还算空的角落 —— 标签标题里可读的状态词。**
  上表 7 条里没有一条把状态名写进标题：标题侧要么是裸计数 `(N)`，要么是只在有事时才出现的标记。
- **favicon 侧与已有条目确实重叠，在 PR 正文里如实承认**，而不是把它当卖点。
- 正文（`contrib/pr-body.md`）以表格逐一列出与这 7 条的关系，并写明"若认为重合度过高，直接关闭即可"。
- 已知风险：仍可能被判重复 —— 这是知情后的选择。

> 供后来者参考：本文件初版只覆盖了前 1000 条（GitHub contents API 的分页上限），据此得出的
> "差异足够大、照提"结论**不成立**。全量 3633 条下，本插件更像"同类的第 5 条"而非"一条新能力"。

> ⚠️ **社交层面的一条纪律**：PR 正文里**不要**写"某条已收录插件的状态是坏的"。公开指出同行缺陷
> 会把技术判断变成人际问题，且对收录毫无帮助。正文只讲我们做了什么。
> 如果愿意做件更有价值的事：以**善意 issue** 的形式把 0.3 的取证发给 `Luaphes` 作者。

---

## 一、前置状态

| 硬性要求 | 状态 |
| --- | --- |
| 仓库创建满 **1 天** | 计时起点 2026-09-13 22:39 CST → **最早 2026-09-14 22:39 CST 提 PR** |
| 仓库打 `dsh-plugin` topic | ✅ 已打 |
| `package.json` 声明 `dsh.bundle` | ✅ `dsh.bundle.patch` + `dsh.client`（只声明 `dsh.client` 无法安装，是最常见的被拒原因） |
| 仓库含真实可用代码 | ✅ `src/` 可读源码 + `lib/client.js` 构建产物 + 20 条行为测试 |
| 描述只说功能、无营销词、且属实 | ✅ 逐条对照代码（优先级、`9+` 上限、`shell.overlay` 座位） |
| 条目文件 | ✅ `contrib/awesome-dsh-plugin-entry.yml` —— **无注释头的干净格式**，可直接复制进目标仓库（注册表 3633 条里 3581 条都是干净格式）；规则说明留在本文档，不写进条目文件 |
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
| **是否与已有条目重复** | ⚠️ 见第零节：同一细分至少 7 条。差异与关系已逐一写进 PR 正文，并声明"重合度过高可直接关闭" |

## 五、合并之后

- 市场应用（dshmarket）与站点自动收录，通常**一天内**生效；你不需要跑任何命令。
- npm 下载量由 registry **自动**采集，条目里**没有** `npm:` 字段，手写会被校验拒绝。
- 不要手工编辑 README。
- 后续更新条目时**只改自己那一条**（手工编辑 README 是行号错位事故的常见起因）。

## 六、备注

- 教程与规范来源：`~/dsh-plugin-submission-guide.md`（查询日期 2026-09-12），以及 `awesome-dsh-plugin` 的 `contributing.md` 与 `pr-gate.yml`。
- 仓库地址与目录约定已实测核对：`awesome-dsh-plugin/awesome-dsh-plugin`，默认分支 `main`，条目目录 `data/plugins/`，无 PR 模板（正文自由格式）。
- 第零节的对照基于实际克隆的 `Luaphes/dsh-web-attention-badge` 仓库与安装版 dsh `0.1.5-rc.1` 的类型/运行时源码，不是从描述推测的。
