# Frostart 发版检查清单

鸢很傻，鸢需要一个每次发布新版本前逐项检查的清单OwO

## 版本号同步

- [ ] `manifest.json` → `"version"`
- [ ] `js/changelog.js` → `versions` 数组顶部插入新版本条目
- [ ] `README.md` → 徽章 `version-x.x.x`

## 配置默认值同步

- [ ] `js/settings.js` 的 `defaultSettings` 有新增 / 改动时，同步更新 `converter.html` 内联脚本中的 `FROSTART_DEFAULTS`
- [ ] 检查 converter.html 内联脚本的 FROSTART_DEFAULTS 注释是否需要更新

## 功能验证

- [ ] 新标签页正常加载，时钟 / 农历 / 天气正常
- [ ] 搜索栏：所有引擎可切换，自定义引擎能添加 / 删除
- [ ] 快捷方式：增删改、拖拽排序、右键菜单、图标上传 + 编辑器
- [ ] 设置面板：所有滑块 / 开关 / 拾色器生效且实时保存
- [ ] 壁纸：渐变 / 纯色 / 图片三种模式切换，预设可用
- [ ] 数据：导出 / 导入 / 重置功能正常
- [ ] 全新安装验证：下载刚上传的 Release 安装 ZIP，解压后经「开发者模式 → 加载已解压的扩展程序」加载并跑一遍本页检查清单（只在源码模式验证会漏掉文件缺失问题）
- [ ] 网页版下载：在线预览页「下载安装包」按钮下载的是最新正式 Release 的资产；未上传安装 ZIP 时兜底拿到 GitHub 自动生成的源码 ZIP（toast 会提示加载时选内层文件夹）
- [ ] 安装包卡片：已安装为扩展时自动隐藏；在线预览（网页版）时显示
- [ ] 更新检查：发布 Release 后打开新标签页 → 自动请求 GitHub Releases API；版本号旁出现徽章（若有新版）；点「检查更新」按钮给出 toast 反馈。注意：只有**正式发布的 Release** 才会被识别，草稿 / main 分支开发版本不会推送
- [ ] 转换工具（converter.html）：iTab 导入 + Frostart 导出双向可用

## MV3 合规

- [ ] 所有 HTML 页面的 `<script>` 均为外部引用（`src="..."`），无内联脚本
- [ ] 无 `eval()`、`new Function()`、内联事件处理器（`onclick=` 等）
- [ ] CSP 未报错（打开扩展页后 DevTools Console 无 CSP 违规警告）

## 视觉与性能

- [ ] 亮色 / 暗色 / 跟随系统三种主题切换正常
- [ ] Kaomoji 角落组件正常显示和交互
- [ ] 图标编辑器裁切 / 缩放 / 背景色正常
- [ ] 无残留的 `will-change` 常驻在非动画元素上

## 提交与打包

- [ ] 更新 `changelog.html` / `js/changelog.js` 的版本记录
- [ ] Release 上传可直接加载的安装 ZIP 资产（网页版分发的就是它；不传则用户只能拿源码 ZIP 手动选内层文件夹）
- [ ] `git commit` 信息格式：`vX.X.X: 简述`
- [ ] 打包时排除 `.git/`、`PhaswerWebSource-*/`、`*.zip`
- [ ] 在 Chrome 和 Edge 中分别加载测试
- [ ] Release 发布后把 `release` 分支快进到新 tag，触发在线预览网页版部署稳定版：`git push origin vX.X.X:refs/heads/release`