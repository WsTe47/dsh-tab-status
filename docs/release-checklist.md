# 发布准备清单 — `@climber47/dsh-tab-status`

> **当前状态：仓库已建好并推送，24 小时计时已开始；发 npm 与提收录 PR 待执行。**
>
> 时间约束来自收录 CI 的硬性要求：**仓库创建满 1 天**（`contrib/` 里那条注释同样写了）。
> 那 24 小时从「建 GitHub 仓库」那一刻开始计时，不是从发 npm 开始。
>
> | 里程碑 | 本地 CST | UTC |
> | --- | --- | --- |
> | 仓库创建（计时起点） | 2026-09-13 22:39 | 2026-09-13 14:39 |
> | **最早可以提收录 PR** | **2026-09-14 22:39** | **2026-09-14 14:39** |

---

## 一、已就绪（本地可复现）

| 项 | 证据 |
| --- | --- |
| 构建 | `npm run build` → `lib/client.js`，`node --check` 通过 |
| 行为测试 | `npm test` → 20/20 通过。测试驱动的是**发布产物** `lib/client.js`，不是 `src/` |
| 打包 | `npm pack` → `climber47-dsh-tab-status-0.1.0.tgz`（16.4 kB，11 个文件），已校验 tarball 内的 manifest 含 `dsh.bundle.patch` 与 `dsh.client.platform` |
| `dsh.bundle` | `package.json` 同时声明 `dsh.bundle.patch` 与 `dsh.client`（只声明 `dsh.client` 无法安装，是最常见的被拒原因） |
| 服务注入 | 只声明 `slots`；`scripts/build-client.mjs` 内有服务白名单守卫，专门防止重蹈 `dsh-step-clock@0.1.0` 的 `styles` 静默事故 |
| 导出一致性 | 构建脚本校验每个 `exports.*` 在产物里都有真实声明，重命名模块会立刻失败 |
| 条目文件 | `contrib/awesome-dsh-plugin-entry.yml` |
| 描述属实 | README 与条目描述逐条对照代码（优先级、`9+` 上限、安装命令、`shell.overlay` 座位） |
| 许可 | MIT |

---

## 二、现在就能做（需要你的账号动作）

### 1. 建仓库并推上去 —— ✅ 已完成（2026-09-13 22:39 CST，24 小时从这里开始算）

已执行：

```sh
gh repo create WsTe47/dsh-tab-status --public --source=. --remote=origin --push
gh repo edit WsTe47/dsh-tab-status --add-topic dsh-plugin --description "..."
```

结果：<https://github.com/WsTe47/dsh-tab-status>（public，topic `dsh-plugin` 已打）。

### 2. 发布 npm —— ⏳ 被认证阻塞

**现状（已实测）**：

- 本机默认 registry 是 `https://registry.npmmirror.com` —— 那是**只读镜像，不能发布**。
- `~/.npmrc` 里虽然有 `//registry.npmjs.org/:_authToken`，但该 token **已失效**：
  `npm whoami --registry https://registry.npmjs.org/` 返回 `E401 Unauthorized`。
  （`dsh-step-clock` 当时能发，是因为那时 token 还有效。）
- `package.json` 已写入 `publishConfig.registry: https://registry.npmjs.org/`，
  所以认证恢复后**不带 `--registry` 也能发对地方**，不会被本机镜像设置带偏。

**恢复认证**（需要你在终端交互完成，含浏览器/OTP）：

```sh
npm login --registry https://registry.npmjs.org/
```

**然后发布**（两步都能发；`publishConfig` 已兜底）：

```sh
cd /Users/climber47/dsh-tab-status
npm publish --access public
```

**发布后验收**：

```sh
npm view @climber47/dsh-tab-status version --registry https://registry.npmjs.org/
```

要点：

- 已发布包的 `repository` 字段必须指回收录的仓库，否则条目与包不会关联。
  本仓库的 `package.json` 已写好 `https://github.com/WsTe47/dsh-tab-status`。
- 条目里**没有** `npm:` 字段，也不需要通知维护者（映射从 registry 自动采集）。

### 3. 可选：截图

放 1-8 张到自己仓库的 `assets/`，再加一个 `screenshots.json`：

```json
["assets/tab-badge.png"]
```

不声明也行，市场会从 README 自动抽取；声明只是让你能控制顺序与选择。
（当前仓库**没有** `screenshots.json`，也没有 `assets/` —— 需要的话先补图片再声明。）

---

## 三、+24 小时后：提收录 PR

> 复制粘贴级的完整流程在 [`market-submission.md`](./market-submission.md)，
> PR 正文在 [`../contrib/pr-body.md`](../contrib/pr-body.md)。
>
> ⚠️ 那份文档的**第零节**是全量重复性尽调（注册表共 **3633** 条）：同一个细分领域
> 至少已有 4-8 条收录条目，其中两条（`bf185003/dsh-favicon-status`、
> `waknow/dsh-web-icon-indicator`）连「进行中」状态与动画/可配置都做了。
> 该节的结论是**建议只发 npm、不提收录**。提 PR 前请先读它。

前置条件：仓库年龄 ≥ 1 天（CI 自动查）、已打 `dsh-plugin` topic、仓库根 `package.json` 声明了 `dsh.bundle`。

```sh
# fork + clone awesome-dsh-plugin/awesome-dsh-plugin
# 新增一个文件，内容即本仓库 contrib/awesome-dsh-plugin-entry.yml：
#   data/plugins/WsTe47__dsh-tab-status.yml
```

- 一个 PR 只加**这一个**文件，不要动 README（README 是脚本生成的）。
- 描述不得出现营销词，且必须与代码一致 —— 评审会逐条对照。
- CI 通过 ≠ 收录：合并前维护者会实际阅读仓库。

---

## 四、装到自己的 profile（正式包验证）

```sh
# 已发布：
dsh plugin --profile web add @climber47/dsh-tab-status

# 未发布、只装本地目录：
dsh plugin --profile web add file:/Users/climber47/dsh-tab-status
```

然后重启 `dsh web`。

> ⚠️ **装正式包之前，先停掉本会话里的动态 Cordis 插件**（`tabsts-1`）。两者都会写
> `document.title`，同时跑会互相抢写，表现是前缀闪烁或叠加两次。

---

## 五、与 `dsh-step-clock` 发布流程的差异

`dsh-step-clock` 还带了一份 `docs/review-0.1.0.md` —— 那是一次独立批判性评审，发现了
`0.1.0` 把 `styles` 写进 `inject` 的致命缺陷（装得上、安静、永不渲染）。

本包 `0.1.0` **尚未**经历同样流程。那条教训已经以守卫的形式固化在
`scripts/build-client.mjs`（服务白名单 + `ctx.styles` 负向检查）与
`tests/behaviour.mjs`（断言 `inject` 里不含 `styles`）里。若要沿用同样的发布纪律，
可在发版后补一份独立评审归档到 `docs/`。

---

## 六、发布前最后一遍自检

- [ ] `npm test` 全绿（会先重新构建产物，防止源码与产物漂移）
- [ ] `git status` 干净，产物 `lib/client.js` 已提交（它是要发布的文件）
- [ ] `package.json` 版本号是本次要发的号
- [ ] 仓库已打 `dsh-plugin` topic
- [ ] 与本插件同名的动态插件已停用
