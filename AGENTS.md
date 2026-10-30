# AGENTS.md

给 AI Agent 看的。人类请看 [README.md](./README.md)，想贡献代码再看 [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## 1. 设计原则

- **令牌优先**：颜色、半透明底色、阴影、圆角、间距、动效时长、缓动曲线、壁纸参数，全部从 [tokens.css](./css/tokens.css) 的 `:root` / `[data-theme]` / `@property` 里取变量，禁止硬编码十六进制色值或魔法数字。需要新令牌就加到这里，不要在组件里私自开小灶
- **交互反馈，按压强度与元素大小成反比**：所有可交互元素都要有 hover 和 active 状态。**小按钮**（settings-btn、close-btn、tab-btn、font-preset-btn 等）active 用 `transform: scale(0.85)`；**大卡片/大元素**（shortcut-item、search-box、switch 滑块等）active 更接近 `scale(0.9)`。配合短时长 transition（`--time-fast` 0.15s 或 `--time-normal` 0.3s）+ `--easing-elastic` 产生弹性、拟物的按压手感。**这是核心设计语言，不要改成 0.96 之类的"标准值"**——那种值在快 transition 下反而显得没反应
- **hover 原则上不用 `translateY`**：小按钮 hover 一律走 `scale(1.05~1.1)` + `var(--bg-hover)`。唯一例外是 search-box 这种"大容器"可以 `translateY(-2px)` 配阴影抬升。这条在 [changelog.js](./js/changelog.js) `1.0.5` 有明确记录，不要回退
- **不要用 `transition: all`**：必须列出实际变化的属性（如 `transition: transform var(--time-fast) ease, background-color var(--time-normal) ease`）。`all` 会监听所有属性变化、性能差，还可能对 JS 动态改的属性产生意外动画
- **不引入框架 / 构建工具**：原生 HTML / CSS / JS，保持代码可直接阅读。这是有意决定，记录在 [README.md](./README.md) 技术栈章节——"想抄哪段直接拿走就行"。第三方库一律按需懒加载
- **尊重 `prefers-reduced-motion`**：[components.css](./css/components.css) 末尾有全局兜底关闭动画的媒体查询，新增持续型动画（脉冲、循环 keyframes）时要确认在 reduced-motion 下也被关掉
- **入场动画**：页面载入即出现的元素（search-box、shortcut 等）走 CSS `@keyframes` + `animation-delay` 错峰入场（见 [components.css](./css/components.css)）；只有角落 Kaomoji 和 changelog hero 这种"需要 JS 确认 DOM 后再触发"的场景才用 `window.load` + `.animate-in`（见 [changelog.js](./js/changelog.js) 末尾）。**不要用 `setTimeout` 人工延迟**去防鬼畜，首屏壁纸已经有三层防闪烁防线（见下）
- **实际视觉效果由人类检查**：改完界面后不要自行开浏览器 Agent、自动化截图或起本地服务器去"验收"渲染效果，代码层面的自查（语法、引用、诊断）照常做，视觉确认留给维护者

---

## 2. 这是 MV3 扩展，不是普通网页

以下约束 PhasWer 主站没有，但 frostart 必须遵守：

- **MV3 CSP 禁止内联脚本**：所有 JS 必须是外部 `.js` 文件，**禁止**内联 `<script>...</script>`、**禁止** `onclick="..."` 这类内联事件处理器。[changelog.js](./js/changelog.js) 头部注释和 `0.1.12` changelog 条目都踩过这个坑
- **`newtab.html` 的 `<script>` 加载顺序不能动**：依赖链是固定的——

  ```
  wp-cache.js → utils/* → changelog.js → settings.js → services.js
            → kaomoji.js → core.js → sliders.js → panels.js → widgets.js → packager.js
  ```

  core.js 顶部有完整说明。调换顺序会导致 `Frostart.state` / `SettingsManager` / `versions` 等全局未定义就直接被引用。需要新模块时先确认它在链中的位置，再问维护者
- **配置存储走 `chrome.storage.local`**：键名 `frostartSettings`（见 [settings.js](./js/settings.js)）。为了消除首屏 FOUC，会同步从 `localStorage` 读一份缓存抢先应用 CSS 变量（[core.js](./js/core.js) `DOMContentLoaded` 前 30 行）。改存储结构时两层都要兼容，否则用户配置会丢或闪
- **壁纸颜色变量是 `@property` 注册的类型化属性**：`--wp-c1` / `--wp-c2` / `--wp-angle` / `--wp-solid` / `--blob-*` 都在 [tokens.css](./css/tokens.css) 用 `@property` 声明了 `<color>` / `<angle>` 类型，**这是壁纸切换能平滑过渡的前提**。不要把它们改成普通 `--var`，否则颜色变化会突变
- **MV3 service worker 不稳定**：不要依赖持久后台任务，时钟已经做了"标签页隐藏时暂停"（`0.1.13`），新增定时器类逻辑要考虑页面随时可能被冻结
- **面向用户的下载入口只分发最新正式 Release 的资产**：网页版的"下载安装包"走 GitHub Releases（手动上传的安装 ZIP 优先，自动生成的源码 ZIP 兜底），禁止把工作树或部署目录里的文件自行打包后发给用户；扩展环境的自打包仅限开发者本地使用

---

## 3. 全局状态与模块边界

- **全局状态收拢在命名空间**：可变状态走 `Frostart.state.xxx`（[core.js](./js/core.js) 顶部）和 `WidgetState`，**不要新增裸 `let` 全局变量**。这条在 `0.1.13` 重构过，目的是降低重名风险
- **项目正在逐步模块化**：目前各模块共享全局作用域（非 ES Module）。小型低风险改动可直接提 PR；**涉及整体架构（IIFE 隔离、循环依赖重构、ES Module 迁移）必须先在 Issue 讨论达成共识**，否则容易和维护者正在做的迭代冲突导致一边作废
- **文件头必须有职责注释块**：每个 JS 模块顶部写明「文件名 — 一句话职责 / 职责列举 / 加载顺序」，格式见 [core.js](./js/core.js) 第 1-10 行。CSS 文件同样要有分层说明（见 [base.css](./css/base.css) / [components.css](./css/components.css) 头部）
- **新增设置项必须全链路自查**：默认值、启动时与 `chrome.storage.local` 权威值对账（localStorage 缓存可能缺失或过期）、导出、导入、重置、converter 读写都要覆盖；converter 对存储的读写必须与 SettingsManager 的行为保持一致（键名、双写、localStorage 镜像）
- **改完不写"修改说明"**：不要用注释或界面文本强调本次改了什么、为什么改，正常的职责性注释照常写

---

## 4. 版本号与 changelog

- **`manifest.json` 的 `version` 字段决定扩展自报的当前版本号**，。只有维护者在正式发版时改
- **自动更新检测的数据源是 GitHub Releases API**（`/repos/Gledery/Frostart/releases/latest`），不是读 GitHub 上的 `manifest.json`——这条在 [core.js](./js/core.js) 更新检查段和 [changelog.js](./js/changelog.js) `1.1.1` 条目里有记录。只有**正式发布**的 Release 才会被识别，main 分支上的开发中版本不会被推给用户。版本号从 Release 的 `tag_name`（形如 `v1.1.1`）解析，所以**发版时 Release tag 必须和 `manifest.json` 的 version 保持一致**
- **代码内的当前版本号从 [changelog.js](./js/changelog.js) 派生**：`SettingsManager.VERSION` 直接读 `versions[0].version`，不要在别处再硬编码版本字符串，避免多处不同步
- **changelog 条目统一格式**：「类别：简述」，类别固定为下面九种（完整说明见 [CONTRIBUTING.md](./CONTRIBUTING.md)）：

  | 类别 | 含义 |
  |------|------|
  | 新增 | 新功能、新文件 |
  | 修复 | Bug 修复 |
  | 优化 | 性能或体验提升 |
  | 变更 | 对已有行为或外观的修改 |
  | 重构 | 代码结构调整，不改变行为 |
  | 清理 | 删除无用代码或文件 |
  | 规范化 | 统一格式或规范 |
  | 样式 | 纯视觉设计调整 |
  | 移除 | 移除功能或元素 |

- 你的改动如果涉及用户可感知的变化，在 PR 里注明即可，**维护者会负责更新 changelog 和版本号**

---

## 5. 文风

写给用户看的文案（changelog 条目、UI 文案、提示文字等）遵循以下风格：

- **句末不加句号**，列表条目也一样
- **不用 `「」` `『』` 这类符号**，需要引用就直接写或用引号
- 技术描述本身要准确严谨，但整体语气偏轻松、不端着、不官腔
- 不罗列功能的解决的问题，也不引入新概念和"导致……"式解释
- **hint 只说明用途和用法，不描述实现**：setting-hint 是写给第一次看到这个选项的人看的，讲清"这是干什么的、怎么用"即可。"不会显示在某某输入框里""按回车或移开焦点后生效""数据写入存储"这类内部机制和交互细节是机器视角的废话，不要写。比如网络图片输入框的 hint 写"你也可以使用网络图片的网址来设置背景图片"，而不是罗列协议格式和生效时机
- 参考现有 [changelog.js] 和 [README.md](./README.md) 的写法，比如"变更：按功能重新分区了所有设置选项，同时移除全局文本色调整和图标模糊的选项"

## 6. 命名与文案（用户可见文案与代码内部命名不一致，属刻意决定）

- **用户可见文案**（i18n 值、newtab.html 默认文本）：
  - 深浅色切换：**模式**（浅色模式 / 深色模式 / 跟随系统）
  - 渐变底+光斑的壁纸模式：**光斑壁纸**
  - 预设区（写入整套调色盘值）：**配色预设**
  - 底色取色器：**背景颜色 1 / 背景颜色 2**，滑块：**背景渐变角度**
  - 联动提示：开启后点击配色预设时主题色同步为主光斑颜色
- **代码内部命名不变**：`wp.gradient`、`gradientPreset`、`gradient-color-1/2`、`WALLPAPER_PRESETS`、`selectGradientPreset` 等保持不变，避免无谓的大规模重构
- **不要为了统一而把代码内部命名改成和用户文案一致**——这是刻意的，新增代码沿用现有内部命名

---

## 7. 设计语言继承自 PhasWer

frostart 的视觉语言（大圆角、毛玻璃、光斑、缓动曲线、按压手感）继承自我自己维护的 [PhasWer 小站](https://phaswer.pages.dev/)，位于"c:\Users\Gledery\Desktop\工作室\PhaswerWebSource"。两边的设计令牌、hover/active 范式、文风保持一致——改一边的交互范式时要考虑是否该同步到另一边
