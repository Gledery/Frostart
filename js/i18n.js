/* =========================================
   i18n.js  —  轻量国际化
   职责：界面文案中英双语 / 语言判定（设置项优先，否则跟随浏览器）/
         data-i18n 静态文本批量替换 / I18N.t 动态文案查询
   加载顺序：必须在所有脚本之前加载（newtab / changelog / converter / index 四个页面的头部，
             均为页面第一个脚本或紧随极简内联引导之后；packager 打包清单中也必须排第一）
   机制：
   1. 语言判定同步从 localStorage 预读 frostartSettings.lang（与壁纸缓存同一思路，防首屏闪烁）
   2. body 在文案应用前默认隐藏，DOMContentLoaded 时 applyToDom 后再显示
   3. 动态参数用 {name} 占位；数组型文案（Kaomoji 消息池）用 tArray 取
   ========================================= */

const I18N = (function () {
    const SETTINGS_KEY = 'frostartSettings';

    /* 字典：扁平 key，按功能分域 */
    const zh = {
        /* meta / 通用 */
        'title.newtab': '新标签页',
        'title.opening': '正在打开 Frostart…',
        'common.settings': '设置',
        'common.cancel': '取消',
        'common.confirm': '确定',
        'common.reset': '重置',
        'common.done': '完成',
        'common.delete': '删除',
        'common.edit': '编辑',
        'common.clear': '清除',
        'common.upload': '上传',
        'word.default': '默认',
        'word.hidden': '隐藏',
        'word.pill': '胶囊',

        /* 主页面 */
        'search.placeholder': '搜索...',
        'search.aria': '搜索',
        'search.kbdTitle': '按 / 键快速聚焦搜索框',
        'shortcuts.aria': '快捷方式',
        'engine.aria': '搜索引擎',
        'settings.open': '打开设置',
        'settings.close': '关闭设置',
        'settings.searchPlaceholder': '搜索设置…',
        'settings.searchKbdTitle': '按 / 键搜索设置',
        'settings.noMatch': '没有找到与"{q}"相关的设置',
        'settings.located': '已定位',

        /* 标签页 */
        'tab.appearance': '外观',
        'tab.clock': '时钟',
        'tab.text': '文本',
        'tab.wallpaper': '壁纸',
        'tab.search': '搜索',
        'tab.shortcuts': '图标',
        'tab.data': '数据与关于',

        /* 外观 */
        'appearance.language': '语言',
        'lang.auto': '自动',
        'lang.zh': '中文',
        'lang.en': 'English',
        'appearance.themeMode': '模式',
        'appearance.light': '浅色',
        'appearance.lightAria': '浅色模式',
        'appearance.auto': '自动',
        'appearance.autoAria': '跟随系统',
        'appearance.dark': '深色',
        'appearance.darkAria': '深色模式',
        'appearance.themeColor': '主题色',
        'color.blueviolet': '蓝紫',
        'color.indigo': '靛蓝',
        'color.cyan': '青',
        'color.emerald': '翠绿',
        'color.amber': '琥珀',
        'color.pink': '玫红',
        'color.purple': '紫',
        'color.slate': '石板灰',
        'appearance.customColor': '自定义颜色',
        'appearance.customColorAria': '自定义主题色',
        'appearance.resetColor': '恢复默认主题色',
        'appearance.accentHint': '点击预设或自定义颜色',
        'appearance.kaomoji': 'Kaomoji',
        'appearance.layout': '布局',
        'appearance.contentPosition': '内容垂直位置',
        'appearance.glass': '毛玻璃效果',
        'appearance.blur': '模糊度',
        'appearance.saturation': '饱和度',

        /* 时钟 */
        'clock.timeFormat': '时间格式',
        'clock.hours24': '24 小时',
        'clock.hours12': '12 小时',
        'clock.font': '时钟数字字体',
        'clock.fontHint': '完全独立于全局字体，只作用于时钟数字awa 演示文字就是预览',
        'clock.size': '时钟大小',
        'clock.showSeconds': '显示秒',
        'clock.showWeek': '显示星期',
        'clock.showLunar': '显示农历',
        'clock.colorSection': '颜色',
        'clock.clockColor': '时钟颜色',
        'clock.dateColor': '日期颜色',

        /* 文本 */
        'text.fonts': '字体',
        'text.fontPreset': '字体预设',
        'text.presetDefault': '默认',
        'text.fontNotoSans': '思源黑体',
        'text.fontNotoSerif': '思源宋体',
        'text.fontLxgw': '霞鹜文楷',
        'text.fontZcool': '站酷小薇',
        'text.fontLongCang': '龙藏体',
        'text.customFontName': '自定义字体名称',
        'text.customFontHint': '选择预设或输入 Google 字体名。',

        /* 壁纸 */
        'wp.mode': '壁纸模式',
        'wp.gradient': '光斑壁纸',
        'wp.gradientColor1': '背景颜色 1',
        'wp.gradientColor2': '背景颜色 2',
        'wp.gradientAngle': '背景渐变角度',
        'wp.gradientPreset': '配色预设',
        'wp.groupLight': '浅色',
        'wp.groupDark': '深色',
        'wp.mistBlue': '晨雾蓝',
        'wp.celadon': '青瓷绿',
        'wp.warmSand': '暖砂',
        'wp.lotusPink': '藕粉',
        'wp.riceApricot': '米杏',
        'wp.lavender': '薰衣',
        'wp.blobColor': '光斑颜色',
        'wp.blobColor1Aria': '光斑颜色1',
        'wp.blobColor2Aria': '光斑颜色2',
        'wp.linkAccent': '联动主题色',
        'wp.linkAccentTitle': '开启后点击配色预设时主题色同步为主光斑颜色',
        'wp.linkAccentHint': '开启后，点击配色预设时主题色同步为主光斑颜色',
        'wp.bing': '必应每日壁纸',
        'wp.bingHint': '每天自动通过官方接口获取 Bing 首页美图',
        'wp.refreshNow': '立即刷新',
        'wp.maskOpacity': '遮罩不透明度',
        'wp.blur': '模糊度',
        'wp.image': '图片壁纸',
        'wp.imageUrl': '图片网址...',
        'wp.noImage': '暂无图片',
        'wp.solid': '纯色壁纸',
        'wp.bgColor': '背景颜色',
        'wp.wallpaperColorAria': '壁纸颜色',

        /* 搜索设置 */
        'search.quickEngines': '快捷切换引擎',
        'search.quickEnginesHint': '可以勾选要出现在搜索框抽屉里的引擎~当前使用的引擎右侧会显示对勾',
        'search.quickSwitch': '搜索框引擎快捷切换',
        'search.quickSwitchHint': '开启后，点击搜索框左侧引擎图标可快速在已加入的引擎间切换',
        'search.openInNewTab': '在新标签页打开搜索结果',
        'search.width': '搜索框宽度',
        'search.height': '搜索框高度',
        'search.radius': '搜索框圆角',
        'search.radiusHint': '拖到最右为完全胶囊形',
        'search.colorSection': '颜色',
        'search.textColor': '搜索文字颜色',
        'search.placeholderColor': '搜索占位符颜色',
        'search.customEngines': '自定义引擎',
        'search.addEngine': '添加引擎',

        /* 图标设置 */
        'sc.appearanceSection': '图标外观',
        'sc.textSection': '图标文字',
        'sc.iconSize': '图标大小',
        'sc.radius': '圆角',
        'sc.nameSize': '图标文字大小',
        'sc.nameSizeHint': '设为 0 则隐藏图标下方的名称',
        'sc.nameColor': '名称颜色',
        'sc.bgOpacity': '图标背景透明度',
        'sc.bgOpacityHint': '设为"默认"则使用高不透明度，保证图标可见',
        'sc.gap': '图标间距',
        'sc.maxWidth': '图标区域宽度',
        'sc.openInNewTab': '在新标签页打开',
        'sc.add': '添加快捷方式',

        /* 数据页 */
        'pack.title': '获取项目文件以安装',
        'pack.step1': '点击右侧"下载安装包"，获取 ZIP 文件',
        'pack.step2': '解压下载的文件',
        'pack.step3': '在开启开发者模式的浏览器扩展管理中点击加载解压缩的扩展，选择这个文件夹即可',
        'pack.note': '安装包来自 GitHub 最新正式 Release',
        'pack.download': '下载安装包',
        'data.backup': '备份与恢复',
        'data.export': '导出配置',
        'data.import': '导入配置',
        'data.reset': '恢复默认',
        'data.changelog': '更新日志',
        'data.viewChangelog': '查看更新日志',
        'data.checkUpdate': '检查更新',
        'data.updateGuideTitle': '更新方法（没办法鸢没钱买服务器QAQ',
        'data.updateStep1': '发现新版本后，点击按钮跳转 GitHub',
        'data.updateStep2': '下载最新版项目文件并解压',
        'data.updateStep3': '在开启开发者模式的浏览器扩展管理中点击加载解压缩的扩展， 选择这个文件夹即可',
        'data.updateNote': '所有的配置都是保存在浏览器里的，更新不会丢失w',
        'data.storage': '存储空间',
        'data.refreshUsage': '刷新用量',
        'data.refreshUsageAria': '刷新存储用量',
        'data.extStorage': '插件存储',
        'data.extStorageAria': '插件存储用量',
        'data.firstScreenCache': '首屏缓存',
        'data.firstScreenCacheAria': '首屏缓存用量',
        'data.storageHint': '一般来说插件配置本身是只会占几 K的；如果用的太多可能还上传了太多自定义图标或者太大的壁纸<br>（这个限制真的不是我规定的，是万恶的谷歌！！！（超大声 <br> setting.js里已经有了超限兜底，所以你一般不用担心',
        'data.about': '关于此项目',
        'data.aboutDesc': '一款可高度自定义的本地毛玻璃浏览器首页插件',
        'about.openSourcePrefix': '开源项目 · 欢迎 Fork 与二创（受 ',
        'about.openSourceSuffix': ' 协议保护，详见 LICENSE）',
        'about.viewOnGitHub': '在 GitHub 查看',
        'about.privacyTitle': '查看隐私声明',
        'about.privacy': '隐私声明',
        'about.readmeTitle': '查看项目说明',
        'about.readme': '项目说明',
        'about.contributingTitle': '查看贡献指南',
        'about.contributing': '贡献指南',
        'about.authorName': '灰鸢 Gledery',
        'about.authorBio': '独立开发者',
        'about.bilibiliHint': '点击跳转至B站主页',
        'about.siteName': 'PhasWer 工作室',
        'about.siteHint': '点击此处进入PhasWer 的小站~',
        'about.footer1': '© 灰鸢Gledery 闲的没事用肝创建 (。・ω・。)',
        'about.footer2': '你滑到底了哇，去喝杯水吧~',

        /* 快捷方式模态框 */
        'modal.shortcutAria': '编辑快捷方式',
        'modal.addShortcut': '添加快捷方式',
        'modal.name': '名称',
        'modal.namePh': '网站名称',
        'modal.url': '网址',
        'modal.iconUrl': '图标 URL (可选)',
        'modal.iconPh': '留空会自动获取',
        'modal.uploadIcon': '上传图标',
        /* 引擎模态框 */
        'modal.engineAria': '添加搜索引擎',
        'modal.addEngine': '添加搜索引擎',
        'modal.engineNamePh': '如：知乎',
        'modal.searchUrl': '搜索 URL',
        'modal.engineHint': '用 %s 代替关键词位置',
        'modal.iconOptional': '图标（可选）',
        'modal.add': '添加',
        /* 图标编辑器 */
        'editor.aria': '调整图标',
        'editor.title': '调整图标',
        'editor.iconAlt': '图标预览',
        'editor.hint': '拖动图片平移 · 滚轮或滑块缩放',
        'editor.scale': '缩放',
        'editor.bg': '背景',
        'editor.followGlobal': '跟随全局',
        'editor.transparent': '透明',
        /* 重置确认 */
        'reset.aria': '确认恢复默认设置',
        'reset.title': '恢复默认设置？',
        'reset.text': '所有自定义设置都会被清空，没法撤销哦。',

        /* 右键菜单 */
        'menu.edit': '编辑',
        'menu.openNewTab': '在新标签打开',
        'menu.copyTime': '复制时间',
        'menu.hours24': '24 小时制',
        'menu.hours12': '12 小时制',
        'menu.showSeconds': '显示秒',
        'menu.addShortcut': '添加快捷方式',
        'menu.settings': '设置',
        'menu.appearance': '外观设置',
        'menu.gradient': '光斑壁纸',
        'menu.image': '图片壁纸',
        'menu.solid': '纯色壁纸',
        'menu.darkMode': '深色模式',
        'menu.lightMode': '浅色模式',

        /* 引擎弹窗空态 / 列表空态 */
        'popup.noEngine': '未选择引擎',
        'popup.addInSettings': '在设置 → 搜索中添加',
        'shortcuts.empty': '还没有快捷方式',

        /* 内置引擎中文名（其余引擎标签本身是英文） */
        'engine.baidu': '百度',
        'engine.sougou': '搜狗',
        'engine.bilibili': '哔哩哔哩',
        'engine.zhihu': '知乎',
        'engine.weibo': '微博',
        'engine.douban': '豆瓣',
        'engine.xiaohongshu': '小红书',
        'engine.douyin': '抖音',
        'engine.toutiao': '今日头条',
        'engine.taobao': '淘宝',
        'engine.jd': '京东',
        'engine.googlescholar': 'Google 学术',

        /* Toast / 状态文案 */
        'state.checking': '检查中…',
        'state.refreshing': '刷新中…',
        'state.packaging': '打包中…',
        'toast.exported': '配置已导出~',
        'toast.imported': '配置导入成功',
        'toast.deleted': '已删除~',
        'toast.copied': '已复制~',
        'toast.newVersion': '发现新版本 v{v}！点击按钮前往下载',
        'toast.upToDate': '当前已是最新版本~',
        'toast.updateFailed': '检查更新失败，可能是网络问题',
        'toast.updateAvailable': 'v{v} 可更新',
        'toast.wallpaperSet': '壁纸已设置',
        'toast.selectImage': '请选择图片文件',
        'toast.wrongUrl': '网址不太对哦，要以 http:// 或 https:// 开头',
        'toast.accentUnlinked': '已自动关闭主题色联动~',
        'wallpaper.noImageSet': '尚未设置图片',
        'toast.defaultEngineStay': '默认引擎需要留在列表里OwO',
        'toast.removedQuick': '已移出快捷切换',
        'toast.addedQuick': '已加入快捷切换~',
        'badge.default': '默认',
        'toast.fillNameUrl': '请填写名称和 URL',
        'alert.fillNameUrl': '请填写名称和网址',
        'alert.urlBadFormat': '网址格式不太对w',
        'toast.urlNeedsS': 'URL 必须包含 %s',
        'toast.urlHttp': 'URL 必须以 http:// 或 https:// 开头',
        'toast.urlBadFormat': 'URL 格式不太对',
        'toast.engineAdded': '引擎已添加~',
        'hint.noCustomEngines': '暂无自定义引擎',
        'custom.keywordAtEnd': '（关键词会加在末尾）',
        'title.useEngine': '使用此引擎',
        'toast.engineSwitched': '已切换引擎~',
        'toast.bingUpdated': '必应壁纸已更新~',
        'toast.bingLoadFailed': '必应壁纸加载失败，请检查网络',
        'toast.refreshFailed': '刷新失败，仍显示上次的壁纸',
        'toast.svgParseFailed': 'SVG 文件解析失败',
        'toast.readFailed': '读取文件失败',
        'toast.icon2mb': '图标不能超过 2MB',
        'packager.localToast': '本地直接打开无法打包哦，请用在线网页版或已加载的扩展新标签页',
        'packager.filesSkipped': '（{n} 个文件跳过）',
        'packager.noManifest': '无法读取 manifest.json',
        'packager.noFiles': '没有抓到任何文件',
        'packager.releaseDownload': '正在从 GitHub 下载最新正式版安装包',
        'packager.sourceDownload': '正在下载源码 ZIP，加载扩展时请选择解压后的内层文件夹',
        'packager.releasePage': '无法获取下载地址，已打开 Release 页面',
        'toast.unknownError': '未知错误',
        'toast.packageReady': '安装包已生成~ 共 {n} 个文件{extra}',
        'toast.packageFailed': '打包失败了：',
        'error.configFormat': '配置文件格式不太对',
        'error.readFailed': '文件读取失败',

        /* 补充键（静态 DOM 使用，与上面分域命名保持一致） */
        'common.default': '默认',
        'common.add': '添加',
        'text.font': '字体',
        'text.fontPresets': '字体预设',
        'wp.gradientPresets': '配色预设',
        'wp.blobColor1': '光斑颜色1',
        'wp.blobColor2': '光斑颜色2',
        'wp.imageUrlPlaceholder': '图片网址...',
        'wp.color': '壁纸颜色',
        'search.openNewTab': '在新标签页打开搜索结果',
        'sc.areaWidth': '图标区域宽度',
        'sc.openNewTab': '在新标签页打开',
        'data.resetDefault': '恢复默认',
        'about.indieDev': '独立开发者',
        'about.phaswerStudio': 'PhasWer 工作室',
        'about.phaswerHint': '点击此处进入PhasWer 的小站~',
        'about.footer': '© 灰鸢Gledery 闲的没事用肝创建 (。・ω・。)<br>你滑到底了哇，去喝杯水吧~',
        'modal.editShortcut': '编辑快捷方式',
        'modal.siteNamePh': '网站名称',
        'modal.autoFetchPh': '留空会自动获取',
        'modal.addEngineAria': '添加搜索引擎',
        'modal.urlHint': '用 %s 代替关键词位置',
        'editor.preview': '图标预览',
        'editor.done': '完成',

        /* Kaomoji 消息池（数组） */
        'kaomoji.aria': '点我玩',
        'kaomoji.early': [
            '你在看我吗？',
            '你发现我了！',
            '你点到我了，恭喜',
            '我在这待好久了...',
            '今天也要加油啊awa',
            '要不要去喝杯水',
            '你能陪我一下吗',
            '你是不是在摸鱼',
            '我偷偷观察你很久了',
            '你是怎么发现我的',
            '我好像被你点醒了',
            '嘿嘿，被你抓到了~',
            '(*/ω＼*) 别...别一直盯着我看啦...',
            '你好呀~今天过得怎么样？',
            '你每点我一下，我就开心一点',
            '偷偷告诉你，其实我很期待你来的',
            '鸢说让我好好看着这个项目...',
            '我在努力当一只合格的Kaomoji！',
            '你的鼠标好好玩，我能碰一下吗'
        ],
        'kaomoji.mid': [
            '别点了别点了...',
            '我只是一个无辜的颜文字',
            '你是不是闲得慌',
            '你的鼠标还好吗',
            '我要被你点坏了',
            '(´;ω;`) 头好晕...你点太快了',
            '我也有脾气的！'
        ],
        'kaomoji.late': [
            '再点一下试试',
            '嗯...没有了，真的没有了',
            '已经没有更多彩蛋了啊喂...？',
            '好吧，你赢了',
            '...（沉默）',
            '我已经...什么都不想说了 (´;ω;`)'
        ],
        'kaomoji.idle': [
            '......zzZ',
            '好无聊啊......',
            '有人在吗？',
            '（打了个哈欠）',
            '溜了溜了',
            '（发呆中）',
            '要不要聊聊天',
            '（看风景）',
            '芜湖~♪',
            '（开始数天花板上的格子）',
            '有没有人呀...',
            '趁没人注意偷偷蹦一下',
            '（暗中观察）',
            '嘿嘿嘿...没人在看吧？',
            '（开始原地转圈圈）',
            '无聊到想翻个跟头',
            '（试图逃跑）',
            '（假装自己是一朵蘑菇）'
        ],
        'kaomoji.wake': [
            '来啦来啦！',
            '啊！你回来了！',
            '嗯？什么事？',
            '我醒了！',
            '嗷！别吓我...',
            '你终于来了！'
        ],
        'kaomoji.n1': '嘿嘿，我跑到这边来了~',
        'kaomoji.n2a': '我溜了......',
        'kaomoji.n2b': '我回来了！想我了吗',
        'kaomoji.n3': '我反过来了......好玩',
        'kaomoji.n4': '我来视察一下中间地带',
        'kaomoji.n5': '转转转......',

        /* 子页面通用 */
        'page.backToNewTab': '返回新标签页',
        'page.backToNewTabTitle': '返回新标签页',

        /* changelog 页面（历史版本条目不翻译，只翻译界面框架） */
        'changelog.title': '更新日志 | Frostart',
        'changelog.heroTitle': '<br>屎山是怎样炼成的 :',
        'changelog.heroBody': '<br><strong>X.0.0</strong>：全局级调整，设计方向或底层架构的根本性变更且影响所有页面和模块<br><strong>X.X.0</strong>：系统级调整，包括新增功能模块、整体重写某个页面或核心系统<br><strong>X.X.X</strong>：组件级调整，单组件或页面改动、Bug 修复、性能优化、局部重构<br><strong>X.X.X Debugged</strong>：问题修复或轻量内容新增，不纳入此页面<br>*Beta 和 Debugged 版本被我吃了<br><small>含有"@"的条目为其他开发者贡献，格式为「@GitHub用户名 in #PR编号」，灰鸢（@Gledery）的更改留空</small>',
        'changelog.empty': '暂无版本记录',

        /* converter 数据转换页 */
        'converter.title': 'Frostart 数据转换工具',
        'converter.h1': 'Frostart 数据转换',
        'converter.subtitle': '在 iTab 和 Frostart 格式之间互相转换',
        'converter.dropItab': '点击或拖拽 iTab 备份文件到这里',
        'converter.itabExt': '支持 .itabdata 格式',
        'converter.convertDownload': '转换并下载',
        'converter.importNow': '导入到新标签页',
        'converter.dropFrostart': '点击或拖拽 Frostart 备份文件',
        'converter.frostartExt': '支持 .frostartdata 格式',
        'converter.exportCurrent': '从当前新标签页导出',
        'converter.convertToItab': '转换为 iTab 格式',
        'converter.info': '<strong>格式说明</strong><br><strong>.itabdata</strong> — iTab 插件备份格式，包含导航图标、搜索引擎、壁纸等<br><strong>.frostartdata</strong> — Frostart 新标签页格式，包含全部设置与快捷方式<br>转换时会自动映射快捷方式、搜索引擎、主题、壁纸、时钟设置等',
        'converter.unnamed': '未命名',
        'converter.statsImport': '{n} 个快捷方式，{m} 个自定义引擎',
        'converter.importPreviewTitle': '转换预览',
        'converter.shortcutList': '快捷方式列表:',
        'converter.parseOk': '解析成功~ {stats}',
        'converter.parseFailed': '文件解析失败：',
        'converter.downloadedFrostart': '已下载 .frostartdata 文件',
        'converter.importedJump': '已导入~ 正在跳转到新标签页…',
        'converter.statsExport': '{n} 个快捷方式',
        'converter.exportPreviewTitle': '数据预览',
        'converter.shortcutsLabel': '快捷方式：',
        'converter.noData': '当前没有存储的数据哦',
        'converter.dataRead': '已读取当前数据~',
        'converter.downloadedItab': '已下载 .itabdata 文件~'
    };

    const en = {
        /* meta / common */
        'title.newtab': 'New Tab',
        'title.opening': 'Opening Frostart…',
        'common.settings': 'Settings',
        'common.cancel': 'Cancel',
        'common.confirm': 'OK',
        'common.reset': 'Reset',
        'common.done': 'Done',
        'common.delete': 'Delete',
        'common.edit': 'Edit',
        'common.clear': 'Clear',
        'common.upload': 'Upload',
        'word.default': 'Default',
        'word.hidden': 'Hidden',
        'word.pill': 'Pill',

        /* main page */
        'search.placeholder': 'Search...',
        'search.aria': 'Search',
        'search.kbdTitle': 'Press / to focus the search box',
        'shortcuts.aria': 'Shortcuts',
        'engine.aria': 'Search engine',
        'settings.open': 'Open settings',
        'settings.close': 'Close settings',
        'settings.searchPlaceholder': 'Search settings…',
        'settings.searchKbdTitle': 'Press / to search settings',
        'settings.noMatch': 'No settings matching "{q}" found',
        'settings.located': 'Located',

        /* tabs */
        'tab.appearance': 'Appearance',
        'tab.clock': 'Clock',
        'tab.text': 'Text',
        'tab.wallpaper': 'Wallpaper',
        'tab.search': 'Search',
        'tab.shortcuts': 'Icons',
        'tab.data': 'Data & About',

        /* appearance */
        'appearance.language': 'Language',
        'lang.auto': 'Auto',
        'lang.zh': '中文',
        'lang.en': 'English',
        'appearance.themeMode': 'Mode',
        'appearance.light': 'Light',
        'appearance.lightAria': 'Light mode',
        'appearance.auto': 'Auto',
        'appearance.autoAria': 'Follow system',
        'appearance.dark': 'Dark',
        'appearance.darkAria': 'Dark mode',
        'appearance.themeColor': 'Accent color',
        'color.blueviolet': 'Periwinkle',
        'color.indigo': 'Blue',
        'color.cyan': 'Cyan',
        'color.emerald': 'Emerald',
        'color.amber': 'Amber',
        'color.pink': 'Pink',
        'color.purple': 'Purple',
        'color.slate': 'Slate',
        'appearance.customColor': 'Custom color',
        'appearance.customColorAria': 'Custom accent color',
        'appearance.resetColor': 'Reset accent color',
        'appearance.accentHint': 'Pick a preset or custom color',
        'appearance.kaomoji': 'Kaomoji',
        'appearance.layout': 'Layout',
        'appearance.contentPosition': 'Vertical position',
        'appearance.glass': 'Frosted glass',
        'appearance.blur': 'Blur',
        'appearance.saturation': 'Saturation',

        /* clock */
        'clock.timeFormat': 'Time format',
        'clock.hours24': '24 hours',
        'clock.hours12': '12 hours',
        'clock.font': 'Clock font',
        'clock.fontHint': 'Fully independent of the global font, only affects clock digits; the demo text is the preview',
        'clock.size': 'Clock size',
        'clock.showSeconds': 'Show seconds',
        'clock.showWeek': 'Show weekday',
        'clock.showLunar': 'Show lunar date',
        'clock.colorSection': 'Color',
        'clock.clockColor': 'Clock color',
        'clock.dateColor': 'Date color',

        /* text */
        'text.fonts': 'Fonts',
        'text.fontPreset': 'Font presets',
        'text.presetDefault': 'Default',
        'text.fontNotoSans': 'Noto Sans SC',
        'text.fontNotoSerif': 'Noto Serif SC',
        'text.fontLxgw': 'LXGW WenKai',
        'text.fontZcool': 'ZCOOL XiaoWei',
        'text.fontLongCang': 'Long Cang',
        'text.customFontName': 'Custom font name',
        'text.customFontHint': 'Pick a preset or enter a Google font name',

        /* wallpaper */
        'wp.mode': 'Wallpaper mode',
        'wp.gradient': 'Blob wallpaper',
        'wp.gradientColor1': 'Background color 1',
        'wp.gradientColor2': 'Background color 2',
        'wp.gradientAngle': 'Gradient angle',
        'wp.gradientPreset': 'Color presets',
        'wp.groupLight': 'Light',
        'wp.groupDark': 'Dark',
        'wp.mistBlue': 'Morning Mist',
        'wp.celadon': 'Celadon',
        'wp.warmSand': 'Warm Sand',
        'wp.lotusPink': 'Lotus Pink',
        'wp.riceApricot': 'Cream',
        'wp.lavender': 'Lavender',
        'wp.blobColor': 'Blob color',
        'wp.blobColor1Aria': 'Blob color 1',
        'wp.blobColor2Aria': 'Blob color 2',
        'wp.linkAccent': 'Link accent color',
        'wp.linkAccentTitle': 'When on, clicking a color preset syncs the accent color to the color of main blob',
        'wp.linkAccentHint': 'When on, clicking a color preset sets the accent color to the color of main blob',
        'wp.bing': 'Bing Daily Wallpaper',
        'wp.bingHint': 'Auto-fetches the Bing homepage photo daily via the official API',
        'wp.refreshNow': 'Refresh now',
        'wp.maskOpacity': 'Mask opacity',
        'wp.blur': 'Blur',
        'wp.image': 'Image wallpaper',
        'wp.imageUrl': 'Image URL...',
        'wp.noImage': 'No image',
        'wp.solid': 'Solid color wallpaper',
        'wp.bgColor': 'Background color',
        'wp.wallpaperColorAria': 'Wallpaper color',

        /* search settings */
        'search.quickEngines': 'Quick-switch engines',
        'search.quickEnginesHint': 'Check the engines to show in the search box popup; the current engine has a checkmark',
        'search.quickSwitch': 'Engine quick-switch',
        'search.quickSwitchHint': 'When on, click the engine icon in the search box to switch among added engines',
        'search.openInNewTab': 'Open search results in a new tab',
        'search.width': 'Search width',
        'search.height': 'Search height',
        'search.radius': 'Search radius',
        'search.radiusHint': 'Drag all the way right for a full pill shape',
        'search.colorSection': 'Color',
        'search.textColor': 'Search text color',
        'search.placeholderColor': 'Search placeholder color',
        'search.customEngines': 'Custom engines',
        'search.addEngine': 'Add engine',

        /* icon settings */
        'sc.appearanceSection': 'Icon appearance',
        'sc.textSection': 'Icon labels',
        'sc.iconSize': 'Icon size',
        'sc.radius': 'Radius',
        'sc.nameSize': 'Label size',
        'sc.nameSizeHint': 'Set to 0 to hide labels under icons',
        'sc.nameColor': 'Label color',
        'sc.bgOpacity': 'Icon background opacity',
        'sc.bgOpacityHint': '"Default" uses high opacity to keep icons visible',
        'sc.gap': 'Icon gap',
        'sc.maxWidth': 'Icon area width',
        'sc.openInNewTab': 'Open in new tab',
        'sc.add': 'Add shortcut',

        /* data */
        'pack.title': 'Get project files to install',
        'pack.step1': 'Click "Download package" on the right to get the ZIP file',
        'pack.step2': 'Unzip the downloaded file',
        'pack.step3': 'In your browser\'s extension manager with developer mode on, click Load unpacked and select this folder',
        'pack.note': 'Install package from the latest official GitHub Release',
        'pack.download': 'Download package',
        'data.backup': 'Backup & restore',
        'data.export': 'Export settings',
        'data.import': 'Import settings',
        'data.reset': 'Reset to defaults',
        'data.changelog': 'Changelog',
        'data.viewChangelog': 'View changelog',
        'data.checkUpdate': 'Check for updates',
        'data.updateGuideTitle': 'How to update (can\'t afford a server QAQ)',
        'data.updateStep1': 'When a new version is found, click the button to open GitHub',
        'data.updateStep2': 'Download and unzip the latest project files',
        'data.updateStep3': 'In your browser\'s extension manager with developer mode on, click Load unpacked and select the folder',
        'data.updateNote': 'All settings are stored in the browser and survive updates',
        'data.storage': 'Storage',
        'data.refreshUsage': 'Refresh usage',
        'data.refreshUsageAria': 'Refresh storage usage',
        'data.extStorage': 'Extension storage',
        'data.extStorageAria': 'Extension storage usage',
        'data.firstScreenCache': 'First-screen cache',
        'data.firstScreenCacheAria': 'First-screen cache usage',
        'data.storageHint': 'Settings usually take only a few K; heavy usage usually means too many custom icons or oversized wallpapers<br>(This limit isn\'t mine, blame Google!!!<br>settings.js already has overflow handling, so no need to worry',
        'data.about': 'About',
        'data.aboutDesc': 'A highly customizable local frosted-glass browser new tab extension',
        'about.openSourcePrefix': 'Open source · Forks and remixes welcome (protected by ',
        'about.openSourceSuffix': ', see LICENSE)',
        'about.viewOnGitHub': 'View on GitHub',
        'about.privacyTitle': 'View privacy statement',
        'about.privacy': 'Privacy',
        'about.readmeTitle': 'View project readme',
        'about.readme': 'README',
        'about.contributingTitle': 'View contribution guide',
        'about.contributing': 'Contributing',
        'about.authorName': 'Gledery',
        'about.authorBio': 'Independent developer',
        'about.bilibiliHint': 'Click to visit the Bilibili page',
        'about.siteName': 'PhasWer Studio',
        'about.siteHint': 'Click to enter the PhasWer site',
        'about.footer1': '© Gledery, built out of pure free time (。・ω・。)',
        'about.footer2': 'You\'ve scrolled to the bottom, go get some water',

        /* shortcut modal */
        'modal.shortcutAria': 'Edit shortcut',
        'modal.addShortcut': 'Add shortcut',
        'modal.name': 'Name',
        'modal.namePh': 'Site name',
        'modal.url': 'URL',
        'modal.iconUrl': 'Icon URL (optional)',
        'modal.iconPh': 'Leave empty to auto-fetch',
        'modal.uploadIcon': 'Upload icon',
        /* engine modal */
        'modal.engineAria': 'Add search engine',
        'modal.addEngine': 'Add search engine',
        'modal.engineNamePh': 'e.g. Zhihu',
        'modal.searchUrl': 'Search URL',
        'modal.engineHint': 'Use %s for the keyword position',
        'modal.iconOptional': 'Icon (optional)',
        'modal.add': 'Add',
        /* icon editor */
        'editor.aria': 'Adjust icon',
        'editor.title': 'Adjust icon',
        'editor.iconAlt': 'Icon preview',
        'editor.hint': 'Drag to pan · scroll or use the slider to zoom',
        'editor.scale': 'Scale',
        'editor.bg': 'Background',
        'editor.followGlobal': 'Follow global',
        'editor.transparent': 'Transparent',
        /* reset confirm */
        'reset.aria': 'Confirm reset to defaults',
        'reset.title': 'Reset to defaults?',
        'reset.text': 'All custom settings will be cleared, this can\'t be undone.',

        /* context menu */
        'menu.edit': 'Edit',
        'menu.openNewTab': 'Open in new tab',
        'menu.copyTime': 'Copy time',
        'menu.hours24': '24-hour',
        'menu.hours12': '12-hour',
        'menu.showSeconds': 'Show seconds',
        'menu.addShortcut': 'Add shortcut',
        'menu.settings': 'Settings',
        'menu.appearance': 'Appearance',
        'menu.gradient': 'Blob wallpaper',
        'menu.image': 'Image wallpaper',
        'menu.solid': 'Solid wallpaper',
        'menu.darkMode': 'Dark mode',
        'menu.lightMode': 'Light mode',

        /* popup / list empty states */
        'popup.noEngine': 'No engine selected',
        'popup.addInSettings': 'Add in Settings → Search',
        'shortcuts.empty': 'No shortcuts yet',

        /* localized built-in engine names */
        'engine.baidu': 'Baidu',
        'engine.sougou': 'Sogou',
        'engine.bilibili': 'Bilibili',
        'engine.zhihu': 'Zhihu',
        'engine.weibo': 'Weibo',
        'engine.douban': 'Douban',
        'engine.xiaohongshu': 'Xiaohongshu',
        'engine.douyin': 'Douyin',
        'engine.toutiao': 'Toutiao',
        'engine.taobao': 'Taobao',
        'engine.jd': 'JD',
        'engine.googlescholar': 'Google Scholar',

        /* toast / state */
        'state.checking': 'Checking…',
        'state.refreshing': 'Refreshing…',
        'state.packaging': 'Packaging…',
        'toast.exported': 'Settings exported',
        'toast.imported': 'Settings imported',
        'toast.deleted': 'Deleted',
        'toast.copied': 'Copied',
        'toast.newVersion': 'New version v{v} found! Click the button to download',
        'toast.upToDate': 'You\'re already on the latest version',
        'toast.updateFailed': 'Update check failed, might be a network issue',
        'toast.updateAvailable': 'v{v} available',
        'toast.wallpaperSet': 'Wallpaper set',
        'toast.selectImage': 'Please select an image file',
        'toast.wrongUrl': 'Invalid URL, must start with http:// or https://',
        'toast.accentUnlinked': 'Accent link turned off automatically',
        'wallpaper.noImageSet': 'No image set yet',
        'toast.defaultEngineStay': 'The default engine must stay in the list',
        'toast.removedQuick': 'Removed from quick-switch',
        'toast.addedQuick': 'Added to quick-switch',
        'badge.default': 'Default',
        'toast.fillNameUrl': 'Please fill in name and URL',
        'alert.fillNameUrl': 'Please fill in name and URL',
        'alert.urlBadFormat': 'That URL looks wrong',
        'toast.urlNeedsS': 'URL must contain %s',
        'toast.urlHttp': 'URL must start with http:// or https://',
        'toast.urlBadFormat': 'URL format looks wrong',
        'toast.engineAdded': 'Engine added',
        'hint.noCustomEngines': 'No custom engines yet',
        'custom.keywordAtEnd': '(keyword appended at the end)',
        'title.useEngine': 'Use this engine',
        'toast.engineSwitched': 'Engine switched',
        'toast.bingUpdated': 'Bing wallpaper updated',
        'toast.bingLoadFailed': 'Failed to load Bing wallpaper, check your network',
        'toast.refreshFailed': 'Refresh failed, still showing the previous wallpaper',
        'toast.svgParseFailed': 'Failed to parse the SVG file',
        'toast.readFailed': 'Failed to read file',
        'toast.icon2mb': 'Icon must not exceed 2MB',
        'packager.localToast': 'Can\'t package when opened locally, use the online version or an extension new tab',
        'packager.filesSkipped': '({n} files skipped)',
        'packager.noManifest': 'Unable to read manifest.json',
        'packager.noFiles': 'No files were fetched',
        'packager.releaseDownload': 'Downloading the latest official release from GitHub',
        'packager.sourceDownload': 'Downloading the source ZIP — select the inner extracted folder when loading',
        'packager.releasePage': 'Couldn\'t get a download link, opened the release page',
        'toast.unknownError': 'unknown error',
        'toast.packageReady': 'Package ready, {n} files{extra}',
        'toast.packageFailed': 'Packaging failed: ',
        'error.configFormat': 'Invalid settings file format',
        'error.readFailed': 'Failed to read file',

        /* supplemental keys used by static DOM */
        'common.default': 'Default',
        'common.add': 'Add',
        'text.font': 'Fonts',
        'text.fontPresets': 'Font presets',
        'wp.gradientPresets': 'Color presets',
        'wp.blobColor1': 'Blob color 1',
        'wp.blobColor2': 'Blob color 2',
        'wp.imageUrlPlaceholder': 'Image URL...',
        'wp.color': 'Wallpaper color',
        'search.openNewTab': 'Open search results in a new tab',
        'sc.areaWidth': 'Icon area width',
        'sc.openNewTab': 'Open in new tab',
        'data.resetDefault': 'Reset to defaults',
        'about.indieDev': 'Independent developer',
        'about.phaswerStudio': 'PhasWer Studio',
        'about.phaswerHint': 'Click to enter the PhasWer site',
        'about.footer': '© Gledery, built out of pure free time (。・ω・。)<br>You\'ve scrolled to the bottom, go get some water',
        'modal.editShortcut': 'Edit shortcut',
        'modal.siteNamePh': 'Site name',
        'modal.autoFetchPh': 'Leave empty to auto-fetch',
        'modal.addEngineAria': 'Add search engine',
        'modal.urlHint': 'Use %s for the keyword position',
        'editor.preview': 'Icon preview',
        'editor.done': 'Done',

        /* Kaomoji message pools (arrays) */
        'kaomoji.aria': 'Click to play',
        'kaomoji.early': [
            'Are you looking at me?',
            'You found me!',
            'You clicked me, congrats',
            'I\'ve been here for ages...',
            'Keep it going today awa',
            'Want to get some water?',
            'Can you stay with me a while',
            'Are you slacking off?',
            'I\'ve been secretly watching you for ages',
            'How did you find me',
            'I think you woke me up',
            'Hehe, caught me~',
            '(*/ω＼*) D-don\'t keep staring...',
            'Hi~ how\'s your day?',
            'Every click makes me a little happier',
            'Between us, I really look forward to your visits',
            'Gledery told me to watch over this project...',
            'I\'m trying to be a qualified Kaomoji!',
            'Your mouse is fun, can I touch it'
        ],
        'kaomoji.mid': [
            'Stop clicking, stop...',
            'I\'m just an innocent kaomoji',
            'Do you have nothing better to do',
            'Is your mouse okay',
            'You\'re going to break me',
            '(´;ω;`) So dizzy... you\'re clicking too fast',
            'I have a temper too!'
        ],
        'kaomoji.late': [
            'Click one more time, I dare you',
            'Um... nothing left, really',
            'There are no more easter eggs, okay...?',
            'Fine, you win',
            '...(silence)',
            'I... don\'t want to say anything anymore (´;ω;`)'
        ],
        'kaomoji.idle': [
            '......zzZ',
            'So bored......',
            'Anyone there?',
            '(yawn)',
            'I\'m outta here',
            '(zoning out)',
            'Want to chat',
            '(watching the scenery)',
            'Woohoo~♪',
            '(counting ceiling tiles)',
            'Is anyone around...',
            'Hop once while nobody\'s watching',
            '(watching from the shadows)',
            'Hehehe... nobody sees me?',
            '(spinning in circles)',
            'Bored enough to do a flip',
            '(trying to escape)',
            '(pretending to be a mushroom)'
        ],
        'kaomoji.wake': [
            'Coming, coming!',
            'Ah! You\'re back!',
            'Hm? What\'s up?',
            'I\'m awake!',
            'Whoa! Don\'t scare me...',
            'You\'re finally here!'
        ],
        'kaomoji.n1': 'Hehe, I ran over here~',
        'kaomoji.n2a': 'I\'m off......',
        'kaomoji.n2b': 'I\'m back! Miss me?',
        'kaomoji.n3': 'I\'m flipped backwards...... fun',
        'kaomoji.n4': 'I\'m here to inspect the middle ground',
        'kaomoji.n5': 'Spin spin spin......',

        /* shared sub-page strings */
        'page.backToNewTab': 'Back to new tab',
        'page.backToNewTabTitle': 'Back to new tab',

        /* changelog page (historical entries stay in their original language) */
        'changelog.title': 'Changelog | Frostart',
        'changelog.heroTitle': '<br>How the spaghetti code was cooked :',
        'changelog.heroBody': '<br><strong>X.0.0</strong>: global — fundamental changes in design direction or underlying architecture, affecting every page and module<br><strong>X.X.0</strong>: system-level — new feature modules, a full rewrite of a page or a core system<br><strong>X.X.X</strong>: component-level — single component or page changes, bug fixes, performance improvements, local refactors<br><strong>X.X.X Debugged</strong>: fixes or lightweight additions, not listed on this page<br>*Beta and Debugged versions got eaten by me<br><small>Entries with "@" come from other contributors, in the form "@GitHubUser in #PR"; changes by Gledery (@Gledery) are left blank</small>',
        'changelog.empty': 'No version history yet',

        /* converter page */
        'converter.title': 'Frostart Data Converter',
        'converter.h1': 'Frostart Data Converter',
        'converter.subtitle': 'Convert between iTab and Frostart formats',
        'converter.dropItab': 'Click or drag an iTab backup file here',
        'converter.itabExt': 'Supports .itabdata files',
        'converter.convertDownload': 'Convert & download',
        'converter.importNow': 'Import to new tab',
        'converter.dropFrostart': 'Click or drag a Frostart backup file',
        'converter.frostartExt': 'Supports .frostartdata files',
        'converter.exportCurrent': 'Export from current new tab',
        'converter.convertToItab': 'Convert to iTab format',
        'converter.info': '<strong>About the formats</strong><br><strong>.itabdata</strong> — iTab extension backup, includes navigation icons, search engines, wallpaper and more<br><strong>.frostartdata</strong> — Frostart new tab format, includes all settings and shortcuts<br>Shortcuts, search engines, theme, wallpaper and clock settings are mapped automatically',
        'converter.unnamed': 'Untitled',
        'converter.statsImport': '{n} shortcuts, {m} custom engines',
        'converter.importPreviewTitle': 'Conversion preview',
        'converter.shortcutList': 'Shortcuts:',
        'converter.parseOk': 'Parsed successfully~ {stats}',
        'converter.parseFailed': 'Failed to parse file: ',
        'converter.downloadedFrostart': '.frostartdata file downloaded',
        'converter.importedJump': 'Imported · jumping to the new tab…',
        'converter.statsExport': '{n} shortcuts',
        'converter.exportPreviewTitle': 'Data preview',
        'converter.shortcutsLabel': 'Shortcuts:',
        'converter.noData': 'No stored data yet',
        'converter.dataRead': 'Current data loaded',
        'converter.downloadedItab': '.itabdata file downloaded'
    };

    const DICTS = { zh, en };

    /* 浏览器语言判定：zh 前缀视为中文，其余回退英文 */
    function detectBrowserLang() {
        const navLang = (navigator.language || 'zh').toLowerCase();
        return navLang.indexOf('zh') === 0 ? 'zh' : 'en';
    }

    /* 首屏语言判定：设置项显式指定优先（同步预读 localStorage），否则跟随浏览器。
       仅用于启动时——运行时切到 auto 不能走这里：设置保存有防抖，localStorage 镜像
       可能还停留在上一次的显式语言，会导致"自动"解析成旧语言而非浏览器语言 */
    function detectLang() {
        try {
            const raw = localStorage.getItem(SETTINGS_KEY);
            if (raw) {
                const s = JSON.parse(raw);
                if (s && (s.lang === 'zh' || s.lang === 'en')) return s.lang;
            }
        } catch (e) { /* 缓存不可读则走浏览器语言 */ }
        return detectBrowserLang();
    }

    let currentLang = detectLang();

    /* 查询文案，{name} 占位替换；缺失时回退中文，再缺失返回 key */
    function t(key, vars) {
        let s = DICTS[currentLang] ? DICTS[currentLang][key] : undefined;
        if (s === undefined) s = zh[key];
        if (s === undefined) return key;
        if (vars) {
            s = String(s).replace(/\{(\w+)\}/g, function (_, name) {
                return vars[name] !== undefined ? vars[name] : '{' + name + '}';
            });
        }
        return s;
    }

    /* 数组型文案（Kaomoji 消息池等） */
    function tArray(key) {
        const v = t(key);
        return Array.isArray(v) ? v : [];
    }

    /* 批量替换 DOM：
       data-i18n → textContent
       data-i18n-html → innerHTML（文案里含 <br> 等标签时用）
       data-i18n-ph → placeholder
       data-i18n-title → title
       data-i18n-aria → aria-label
       data-i18n-alt → alt */
    function applyToDom(root) {
        root = root || document;
        root.querySelectorAll('[data-i18n]').forEach(function (el) {
            el.textContent = t(el.getAttribute('data-i18n'));
        });
        root.querySelectorAll('[data-i18n-html]').forEach(function (el) {
            el.innerHTML = t(el.getAttribute('data-i18n-html'));
        });
        root.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
            el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph')));
        });
        root.querySelectorAll('[data-i18n-title]').forEach(function (el) {
            el.setAttribute('title', t(el.getAttribute('data-i18n-title')));
        });
        root.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
            el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria')));
        });
        root.querySelectorAll('[data-i18n-alt]').forEach(function (el) {
            el.setAttribute('alt', t(el.getAttribute('data-i18n-alt')));
        });
    }

    /* 防闪烁：文案应用前隐藏 body（与壁纸三层防线同一思路）。
       DOMContentLoaded 时替换完再显示。 */
    const hideStyle = document.createElement('style');
    hideStyle.textContent = 'html.i18n-loading body{display:none !important}';
    document.documentElement.classList.add('i18n-loading');
    (document.head || document.documentElement).appendChild(hideStyle);

    function finish() {
        document.documentElement.setAttribute('lang', currentLang === 'zh' ? 'zh-CN' : 'en');
        applyToDom(document);
        document.documentElement.classList.remove('i18n-loading');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', finish);
    } else {
        finish();
    }

    /* 运行时切换语言：lang 传 'zh'/'en' 显式指定，'auto' 或空则直接跟随浏览器
       （不能读 localStorage 镜像，设置保存有防抖，镜像可能还是旧的显式语言）。
       切换后同步 <html lang> 并重刷静态文案；动态生成的 UI 由各模块自行重渲染 */
    function setLang(lang) {
        currentLang = (lang === 'zh' || lang === 'en') ? lang : detectBrowserLang();
        document.documentElement.setAttribute('lang', currentLang === 'zh' ? 'zh-CN' : 'en');
        applyToDom(document);
        return currentLang;
    }

    return {
        t,
        tArray,
        applyToDom,
        setLang,
        get lang() { return currentLang; },
        get locale() { return currentLang === 'zh' ? 'zh-CN' : 'en-US'; }
    };
})();

window.I18N = I18N;
