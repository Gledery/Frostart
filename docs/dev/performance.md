# 性能笔记

2026-11 全仓库性能审查的结论存档：已完成的优化、待实测的候选、已定案暂不处理的项、已核实无问题的排查结论。动壁纸 / 首屏 / 动画相关代码前先读这里，避免重复排查或回退既有设计

---

## 已完成

### 存储双写不携带壁纸 base64（2026-11-13）

- 原问题：[settings.js](../../js/settings.js) `_persist()` 每次保存把完整 settings（含 `wallpaperImage` dataURL）写 `frostartSettings` 和 `frostartSettings_backup` 两个键，序列化成本 ×2
- 修复：备份键只存轻设置（每写 ~2KB），图片进独立键 `frostartSettings_backup_img` 且仅在图片实际变化时刷新；恢复路径 `_loadWithFallback` 合并轻备份 + 图片键
- 备份语义边界：备份 = 轻设置永远新鲜 + 图片换图时备份一次，损坏恢复零丢失、无过期窗口
- 同步改动：converter.html `writeFrostartSettings` 对齐新结构（含 localStorage 镜像剔除图片，与 `_cacheToLocalStorage` 一致）；web 环境配额超限改为先清图片备份键再重试
- 存量兼容：`_migrateSettings` 迁移链保留——上个版本的存储数据可能未经清洗（安装后从未触发保存）

### 首屏脚本链 defer 化（2026-11-13）

- 原问题：[newtab.html](../../newtab.html) 18 个同步 `<script>` 串行执行（合计约 282 KB），且 body 被 `html.i18n-loading` 隐藏到 DOMContentLoaded（要等全部脚本执行完），首屏白屏明显
- 修复（defer 化 + 解锁提前，未拆文件）：
  - `<html>` 静态带 `i18n-loading` 类，隐藏规则移入 [base.css](../../css/base.css)（早于任何 JS 生效）；i18n.js 改 `defer` 链首位，应用完文案立即移除类解锁 body
  - wp-cache.js 保持同步并扩展为"首屏视觉全量应用"：从 `frostartSettings` 轻设置镜像抢先应用 data-theme（含 auto 解析）、`--accent-color`、10 个尺寸变量、`hide-shortcut-names`，加上原有壁纸逻辑，保证解锁第一帧即用户外观
  - 其余 16 个脚本全部 `defer`：文档顺序 = 依赖链顺序不变，DOMContentLoaded 仍等全部 defer，初始化时序不变
  - base.css 静态隐藏规则用 `visibility: hidden` 而非 `display: none`：body 背景按 CSS 规范传播到 canvas 作页面底色，`display:none` 会让底色消失（白屏闪白），`visibility:hidden` 保留底色且跟随 data-theme（wp-cache 首绘前已设置）
- 体验变化：首屏从"白屏 → 完整页面"变为"壁纸 + 主题底色 + 搜索框先出现 → 快捷方式/时钟带入场动画弹入"
- 子页面不受影响：changelog.html 等 i18n.js 同步加载时，JS 注入的隐藏规则照常工作（与 base.css 静态规则幂等并存）

#### 教训：壁纸三层与 body 背景传播

壁纸层（光斑/图片/遮罩）是负 z-index（-3/-2/-1），依赖"html 无背景 → body 背景传播到 canvas"才能露出。给 html 设背景会禁用传播，body 自身背景层会盖住全部壁纸层——首版实现踩过，已修正

---

## 待实测

### 光斑层"缩小重绘 + scale 还原"

- 思路：65/60/40/35vmax 四个超大 radial-gradient 层按 1/4 尺寸声明、transform scale 补回，理论上降低每帧光栅化面积
- 不确定点：Chrome 对静态 transform 可能仍按最终尺寸光栅化，收益无把握；先用 DevTools Performance 的 Rasterize 段实测再决定

### `.settings-section` 用 `content-visibility: auto`

- 思路：抽屉打开状态下也只渲染可见区段
- 风险：设置搜索的 `scrollIntoView` 平滑跳转会经过未渲染区段，滚动条长度随 `contain-intrinsic-size` 估算抖动；需实测带 `contain-intrinsic-size: auto` 变体的表现

---

## 已定案暂不处理

### 光斑模式切主题重叠掉帧

- 已定位：壁纸 0.8s 渐变动画与 UI 0.3s 交叉淡入重叠期，全屏重光栅化 × 玻璃重采样超帧预算；单项均流畅，仅叠加掉帧
- 决定：不出补丁方案（串行化/直跳均评估后否决），等纯色壁纸版本自然消除

### backdrop-filter 表面积

- 毛玻璃固有成本（表面数 × 面积 × 半径），中低端设备主要瓶颈
- 决定：由后续纯色壁纸版本解决，不做针对性优化

---

## 已核实无问题（勿重复排查）

| 项 | 结论 |
|----|------|
| 滑块 input 高频写存储 | `SettingsManager.set` → `save()` 有防抖合批 |
| 快捷方式拖拽排序 | `dragover` 已 rAF 节流，FLIP 的 rect 已缓存 |
| 时钟与定时器 | 页面隐藏时已暂停 |
| 设置抽屉 | 已加 `contain: layout style paint`；关闭态 `content-visibility: hidden` 已撤销（2026-11-14：子树首绘撞滑入动画第一帧 + 关闭时内容瞬变空壳，滑入/滑出动画被吃掉；离屏裁剪交给视口剔除 + contain: paint） |
| 主题切换平滑变色 | theme-switching 窗口机制（全局元素过渡 / 变量插值混跑）已移除；最终形态：主题色源变量全部注册 @property，`:root` 常驻 0.8s ease 插值，与壁纸层 `--wp-*` 同时长同缓动，单一平滑源无双过渡 |
| 抽屉遮罩 | 已是 `visibility: hidden`，零渲染成本 |
| 壁纸层隔离 | 已有 `contain: strict` |
| `will-change` | 仅 3 处，均为小元素 |
| `renderShortcuts` 全量重建 | 仅增删改时触发，列表规模小 |
| 首屏阻塞脚本 | wp-cache.js 同步加载是刻意防闪设计，勿改 defer |
| 更新检测时序 | [core.js](../../js/core.js) `initUpdateCheck` 里 `checkForUpdates(false)` 不 await，fetch 前仅两次 localStorage 同步读；6 小时节流命中时连请求都不发。不阻塞首帧 |
| 启动路径 await 链 | DOMContentLoaded 处理器只有 core.js 一处 `await SettingsManager.load()`（chrome.storage 单次读取）；select.js/i18n.js 的处理器均为同步轻量；changelog.js 的 `window.load` 只加一个 class |
| setInterval 总量 | 仅 3 处：时钟 1s（隐藏已暂停）、颜文字 spin 300ms（临时、自清理、generation 防串场） |
| console 残留 | 仅 5 处，全在错误 catch 分支，无高频路径日志 |
| 常驻 keyframes | 仅 `update-dot-pulse`，挂在 `.has-update::after`（8px 小点），有更新时才渲染 |
| 高频事件监听 | scroll/resize 处理器只做隐藏类轻操作；图标编辑器 pointermove 仅写一条 transform；存储条 rAF 循环 0.6s 有限时长 |
