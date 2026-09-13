# dsh-tab-status

中文 | [English](README.md)

把 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 网页版的**工作区进度同步到浏览器标签**：页签标题前面加一句状态，页签图标在其中两种状态下换成带数字的徽章。

```
⚠ 2 待处理 · 浏览器标签同步对话进度 — DeepSeek Harness
● 进行中 · 浏览器标签同步对话进度 — DeepSeek Harness
✓ 2 已完成 · 浏览器标签同步对话进度 — DeepSeek Harness
浏览器标签同步对话进度 — DeepSeek Harness        ← 空闲时与出厂行为逐字节一致
```

## 为什么需要它

侧边栏其实已经告诉你哪条会话在跑、哪条跑完了——但那是**页面内容**，只在你看着它的时候有用。

而浏览器标签是**始终在屏幕上**的那一小块地方，也是后台标签页里唯一还看得见的东西。这个插件把那三件"值得你知道"的事搬到那里：有会话在等你、有会话在跑、有会话在你没看的时候跑完了。

## 它会说什么

| 状态 | 判据 | 标题前缀 | 页签图标 |
| --- | --- | --- | --- |
| ⚠ 待处理 | 某会话在等你（审批 / 回答 / 计划评审） | `⚠ 2 待处理 · ` | 满幅琥珀圆 + 白色数字 |
| ● 进行中 | 某会话在跑（含子代理在跑） | `● 进行中 · `（多条时 `● 3 进行中 · `） | 原图标 + 放大的状态点 |
| ✓ 已完成 | 某会话跑完了、你还没打开 | `✓ 2 已完成 · ` | 满幅绿圆 + 白色数字 |
| 空闲 | 以上都没有 | 无 | 原图标，原样还原 |

优先级与工作区侧边栏一致：**待处理 > 进行中 > 已完成 > 空闲**。

徽章数字上限 `9+`。进行中**不**换成整图徽章是刻意的：它是高频常态，整图替换会让品牌图标几乎一直消失，而"要你看一眼"的两种状态才值得占掉整个图标位置。

## 状态从哪来

全部来自座位标准 props，插件自己不取数、不轮询、不调 RPC：

- `useSessions` —— 会话列表快照，与侧边栏读的是**同一份**（`running` / `completed` / `title`）。
- `useSessionPendingInteraction` —— 每个会话的待交互项。
- `usePanelInfo` —— 当前主面板；只有会话面板在前台时才显示会话标题（与内置标题规则一致）。

「已完成」的语义值得单独说：宿主只对**非选中**会话置这一位，所以它天然就是"它在你没看的时候跑完了"——正是标签最该提示的事。

## 安装

```sh
dsh plugin --profile web add @climber47/dsh-tab-status
```

然后重启 `dsh web`。

## 实现方式

这是一个 dsh bundle，以单条 insert 行挂载：

- `package.json` 声明 `dsh.bundle.patch`（这是它能被安装的关键）与 `dsh.client`（`platform: web`，这是浏览器半边被加载的关键）。
- `cordis.patch.yml` 插入 `tab-status` 行。
- `lib/index.js` 是（有意为空的）宿主半边：本插件没有宿主行为，但 bundle 的 insert 行会解析包根，所以包必须可被导入。
- `lib/client.js` 是浏览器半边，采用客户端 bundle 必须的 `window.__ModuleLoader__.load({ id, factory })` 注册形状；由 `npm run build` 从 `src/client/` 生成，可读源码与产物不会漂移。
- 它只在 `shell.overlay`（`replaceRisk: none` 的整框架浮层）注册**一个纯新增**条目，且只返回 `null`——本插件唯一的副作用是 `document.title` 与 favicon 的 `<link>`。
- **标题是叠加，不是接管**：内置 `@deepseek-ai/dsh-client-ui-layout` 的 `DocumentTitle` 仍然照常写标题，我们在它之上加前缀。两条独立保证：一是 effect 顺序（`shell.overlay` 是 AppFrame 里更靠后的兄弟节点，同一次提交里我们的 effect 后执行）；二是挂在 `<title>` 上的 `MutationObserver`，任何写入之后都会把前缀补回来。叠加时先剥掉自己上次写的前缀，所以既不自我累积，也不需要知道出厂标题是什么——产品改名会自动跟随。
- favicon 用 canvas 合成，取色走主题 token（`--dsw-alias-state-warn-primary` / `--dsw-alias-brand-primary` / `--dsw-alias-state-success-primary`），切换主题时重画。
- 它只声明**真实存在**的服务（`slots`）。客户端插件没有样式服务——`styles` 只存在于动态插件沙箱里；声明一个无人提供的服务会让 Cordis 无限期等待，插件显示"已加载"、不报任何错，却永远不渲染。构建脚本里有白名单守卫，专门防这一类事故。

## 已知边界

- **只反映本页**：多个标签页各自独立，不是跨页面的全局看板。
- **不轮询**：只在快照变化时写一次，因此没有"已运行 3 分钟"这类秒级信息。
- **徽章数字上限 `9+`**。
- **与动态 Cordis 插件二选一**：如果同时有一个动态插件在做同样的事，两者会互相抢写标题。装本包前请先停掉它。
- 本插件不发送任何网络请求，也不保存任何数据。

## 环境要求

- dsh `>=0.1.5-rc.1`
- React 18（peer 依赖，由 harness 外壳提供）

## 许可

MIT
