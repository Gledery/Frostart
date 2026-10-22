/* =========================================
   changelog.js  —  更新日志渲染
   职责：版本数据 / 侧边栏导航 / 版本卡片渲染 / 滚动联动
   注意：MV3 默认 CSP 禁止内联 <script>，从 changelog.html 抽成外部文件。
   ========================================= */

const versions = [
    {
        version: '1.4.0', date: '2026-10-22',
        changes: [
            '变更：壁纸设置页模式选择改用分段选择器',
            '变更：渐变预设改名为配色预设',
            '新增：为所有的浅色配色预设制作了相应的深色预设（共12种），并且切换逻辑改为点击时覆盖写入整套渐变与光斑颜色',
            '变更：切换深浅色模式时，匹配到预设的壁纸自动跟随为对应主题变体，而手动改过的光斑颜色将会保留',
            '变更：光斑颜色改为显式调色盘值，移除"跟随渐变"开关与"恢复默认配色"按钮',
            '变更：必应与图片壁纸改为了使用各自的独立图层，模式切换改为 opacity 交叉淡化',
            '变更：允许直接点选另一深浅模式的配色预设格子',
            '变更：新装默认主题色改为雾蓝，与默认配色预设联动',
            '变更：主题模式改名为模式，渐变壁纸改名为光斑壁纸，渐变颜色与角度同步改为背景颜色与背景渐变角度',
            '新增：手动挑选主题色时会自动关闭主题色联动并提示',
            '样式：配色预设预览格放大，并加入光斑效果',
            '修复：导入配置后壁纸设置面板未同步更新显示',
            '变更：README 改版，新增效果预览截图、徽章与在线体验章节',
        ]
    },
    {
        version: '1.3.0', date: '2026-10-3',
        changes: [
            '新增：新增了英语版本和识别系统语言的功能',
            '新增：在设置页面添加了设置搜索结果框，并优化了搜索体验',
            '新增：添加了更改渐变预设时联动主题色的功能',
            '修复：修复了快捷方式 hover 时会出现透明阴影框的Bug',
            '修复：打包清单重新添加 services.js 和 utils',
            '变更：按功能重新分区了所有设置选项，同时移除全局文本色调整和图标模糊的选项',
            '变更：时钟默认字体改为 Outfit，默认字号改为 104px，同时禁用文字选中功能',
            '变更：移除了背景光斑的动态效果',
            '样式：重新设计了壁纸设置卡',
        ]
    },
    {
        version: '1.2.0', date: '2026-7-27',
        changes: [
            '样式：阴影改为双层模型，同时加强了凹陷阴影 inset',
            '修复：补齐了全项目缺失的触屏门控（@media (hover: none) 重置块）',
            '优化：search-box 按压从 scale(0.96) 改为 scale(0.9)',
            '优化：角落颜文字入场触发从 setTimeout 改为双 requestAnimationFrame，错峰延迟移交给 CSS transition-delay',
            '清理：changelog 页内联样式里的 transition: all 改为具体属性列表',
            '新增：新增 AGENTS.md',
        ]
    },
    {
        version: '1.1.1', date: '2026-7-23',
        changes: [
            '变更：更新检查改用 GitHub Releases API，只有正式发布的 Release 才会被识别',
            '变更：发现新版本后点击按钮会跳转到对应版本的 Release 页面下载安装包',
            '变更：更新 README 的更新章节和发版检查清单以反映新的发版流程',
        ]
    },
    {
        version: '1.1.0', date: '2026-7-15',
        changes: [
            '重构：抽取工具函数到 js/utils/ 目录（数学、字符串、版本比较、色彩转换） @DragonHTDev in #2',
            '重构：合并字体加载函数，消除 core.js 和 panels.js 之间的重复代码 @DragonHTDev in #2',
            '重构：抽取公共服务层 services.js，解除模块间的循环依赖 @DragonHTDev in #2',
            '清理：项目中所有 var 替换为 let/const @DragonHTDev in #2',
            '规范化：统一所有 JS 文件的头部注释格式 @DragonHTDev in #2',
            '规范化：给所有历史 changelog 条目补上了类别前缀（新增/修复/优化/变更/重构/清理/规范化/样式/移除）',
            '变更：重写了版本号分级规则',
            '新增：CONTRIBUTING.md 补充 changelog 类别标准表',
            '新增：检测到更新时设置图标上会出现小红点提示',
        ]
    },
    {
        version: '1.0.6', date: '2026-7-14',
        changes: [
            '新增：贡献指南（CONTRIBUTING.md）及 Issue / PR 模板以规范协作流程',
            '新增：README 贡献章节补充改动分类指引',
            '新增：关于此项目卡片「贡献指南」入口',
        ]
    },    
    {
        version: '1.0.5', date: '2026-7-11',
        changes: [
            '变更：与 PhasWer 同步更新了新版的 pw-switch 并扩展了点击区域',
            '优化：统一所有小按钮的 active 交互反馈，按下回缩改为 scale(0.85)，hover 不再使用 translateY',
            '新增：标签页导航 tab-btn 添加了 hover 浮起和 active 回缩动画',
        ]
    },
    {
        version: '1.0.4', date: '2026-7-10',
        changes: [
            '优化：时钟性能——缓存 DOM 引用和日期字符串，避免每秒重复调用 toLocaleDateString 和创建 Intl 格式化器',
            '优化：缓存农历日期的 Intl.DateTimeFormat 实例',
            '优化：壁纸渲染——缓存 blob alpha 值，避免拖动滑块时 getComputedStyle 每次触发强制回流',
            '优化：escapeHtml——用字符串替换替代每次创建 DOM 元素',
            '优化：移除图标元素的永久 will-change，减少不必要的 GPU 图层开销',
        ]
    },
    {
        version: '1.0.3', date: '2026-7-7',
        changes: [
            '修复：扩展里点开 README / 隐私声明中文会乱码的问题',
            '新增：README 中补充有关浏览器兼容性的说明',
        ]
    },
    {
        version: '1.0.2', date: '2026-6-29',
        changes: [
            '修复：一堆 innerHTML 没转义的 Bug',
            '修复：上传非正方形自定义图标时被 object-fit:cover 提前裁掉的问题',
        ]
    },
    {
        version: '1.0.1', date: '2026-6-28',
        changes: [
            '修复：网页版点击下载安装包会提示需要先把插件加载到浏览器导致根本装不上的问题（我去竟然错在最逆天的地方了',
            '重构：更新检查，不再依赖 GitHub Releases，改成直接读 GitHub 上 manifest.json 的 version 字段做对比（懒是人类之光',
            '清理：一堆老版本配置迁移代码（反正一个用户都没有x',
            '新增：关于此项目卡片「项目说明（README）」入口',
        ]
    },
    {
        version: '1.0.0', date: '2026-6-25',
        changes: [
            '开香槟！！！！Frostart的第一个公开测试版！！！',
            '此版本与含有新增卡片的 PhasWer 主站 3.10.1 版本同步发布',
            '新增：更新检查功能，打开新标签页自动检查 GitHub Releases，有新版时检查更新按钮会变为发现更新（特别漂亮的按钮OwU）',
            '修复：已安装为扩展时仍显示获取项目文件以安装卡片的问题',
            '变更：安装说明和更新说明',
        ]
    },
    {
        version: '0.1.16', date: '2026-6-24',
        changes: [
            '新增：存储空间用量指示器',
            '新增：必应每日壁纸模式',
            '修复：从图片壁纸切回渐变/纯色模式时缺少淡出过渡动画的问题',
        ]
    },
    {
        version: '0.1.15', date: '2026-6-23',
        changes: [
            '变更：「恢复默认设置」移到导出和导入按钮旁边',
            '重构：用自定义弹窗替换所有原生 confirm()',
            '修复：刚进入新标签页时视觉设置会从默认闪到用户配置的 FOUC 问题',
            '修复：Toast 在 async 调用后不播放入场动画的问题',
        ]
    },
    {
        version: '0.1.14', date: '2026-6-22',
        changes: [
            '新增：下载安装包的功能',
        ]
    },
    {
        version: '0.1.13', date: '2026-6-21',
        changes: [
            '修复：字体栈写了 HarmonyOS Sans SC 却没有 @font-face 的问题',
            '新增：时钟在标签页隐藏时自动暂停的功能以节省资源',
            '优化：清理多处永久 will-change 和过度的模糊，降低 GPU 开销',
            '重构：全局变量收拢到 Frostart.state / WidgetState 命名空间以减少命名冲突',
            '新增：发版检查清单（RELEASE_CHECKLIST.md）',
        ]
    },
    {
        version: '0.1.12', date: '2026-6-20',
        changes: [
            '修复：图片压缩使用 PNG 格式导致壁纸占用存储过大的问题',
            '修复：导入配置后主题按钮重复绑定事件监听的问题',
            '修复：右键菜单「在新标签打开」未校验 URL 协议的问题',
            '修复：每次编辑快捷方式时所有图标重新播放入场动画的问题',
            '修复：拖拽排序时重复 id 会导致快捷方式丢失的问题',
            '重构：更新日志和落地页的内联脚本改为外部文件以符合 MV3 CSP 规范',
        ]
    },
    {
        version: '0.1.11', date: '2026-6-19',
        changes: [
            '新增：为开源做准备，新增 README.md 和 PRIVACY.md',
            '重构：转换工具重写为完全自包含的单文件',
            '清理：删除没人引用的 js/converter.js',
            '新增：关于卡片添加 GitHub 仓库和隐私声明的链接入口',
            '重构：内置 FROSTART_DEFAULTS 默认配置，转换工具不再依赖 settings.js',
        ]
    },
    {
        version: '0.1.10', date: '2026-6-18',
        changes: [
            '修复：时钟数字字体预览按钮全部显示为默认字体的问题',
            '变更：光斑颜色的跟随渐变从按钮改为开关',
            '修复：刚进入新标签页时壁纸会从默认色闪一下到自定义壁纸的问题',
            '修复：首次使用时默认壁纸不是晨雾蓝的问题',
            '优化：光斑颜色指示框跟随实际生效的光斑色变化',
            '变更：更新日志的 hero 区域和版本说明文案复制了 PhasWer 主站的文案',
            '变更：转换工具的背景改为默认壁纸',
        ]
    },
    {
        version: '0.1.9', date: '2026-6-17',
        changes: [
            '变更：默认快捷方式改用内置 SVG',
            '修复：about-logo 缩放方向',
            '样式：给滑块、拾色器、按钮等元素补充了阴影',
            '新增：favicon',
            '新增：采用 GPL-3.0 协议，添加 LICENSE 文件',
        ]
    },
    {
        version: '0.1.8', date: '2026-6-16',
        changes: [
            '变更：「数据」标签页改名为「数据与关于」，新增项目介绍与作者卡片',
            '样式：头像和 logo 从圆形改为圆角矩形',
            '样式：设计了新的 Frostart 图标',
        ]
    },
    {
        version: '0.1.7', date: '2026-6-15',
        changes: [
            '修复：点壁纸预设后设置不保存的问题',
            '修复：光斑颜色显示与拾色器不一致的问题',
            '修复：农历写法不标准的问题',
            '优化：搜索栏聚焦高光跟随 accent',
            '移除：打开设置时的背景变暗和模糊遮罩',
        ]
    },
    {
        version: '0.1.6', date: '2026-6-14',
        changes: [
            '变更：把角落的 Kaomoji 从 PhasWer 主站搬过来，删除原本针对各子页面的欢迎语',
            '新增：外观面板「主题色」，8 个预设 + 拾色器',
            '新增：光斑颜色可以单独控制',
        ]
    },
    {
        version: '0.1.5', date: '2026-6-13',
        changes: [
            '重构：app.js 拆分为 core / sliders / panels / widgets 四个模块',
            '重构：styles.css 拆分为 tokens / base / components / pages 四层',
            '重构：转换工具改为引用主站共享样式并跟随主题',
            '新增：更新日志（changelog.html）入口',
            '重构：转换工具的转换逻辑抽离为独立的 converter.js',
        ]
    }
];

function getVersionLevel(v) {
    const parts = v.split('.');
    if (parts[1] === '0' && parts[2] === '0') return 'major';
    if (parts[2] === '0') return 'minor';
    return 'patch';
}

const LEVEL_COLORS = {
    major: '#27ae60',
    minor: '#6dbf8b',
    patch: '#b8deca'
};

function renderSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.innerHTML = '';
    if (!versions.length) {
        sidebar.style.display = 'none';
        return;
    }
    sidebar.style.display = '';
    let currentMajor = null;
    versions.forEach(function (v) {
        const major = v.version.split('.')[0];
        if (major !== currentMajor) {
            currentMajor = major;
            const title = document.createElement('div');
            title.className = 'sidebar-section-title';
            title.textContent = 'v' + major + '.x';
            sidebar.appendChild(title);
        }
        const item = document.createElement('div');
        item.className = 'sidebar-item';
        item.dataset.version = v.version;
        const dot = document.createElement('span');
        dot.className = 'sidebar-dot';
        dot.style.background = LEVEL_COLORS[getVersionLevel(v.version)];
        item.appendChild(dot);
        item.appendChild(document.createTextNode('v' + v.version));
        item.addEventListener('click', function () {
            const el = document.getElementById('v-' + v.version);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.add('highlight');
                setTimeout(function () { el.classList.remove('highlight'); }, 1500);
            }
        });
        sidebar.appendChild(item);
    });
}

function renderVersions() {
    const list = document.getElementById('versionList');
    list.innerHTML = '';
    if (!versions.length) {
        const empty = document.createElement('div');
        empty.className = 'version-empty';
        empty.textContent = I18N.t('changelog.empty');
        list.appendChild(empty);
        return;
    }
    versions.forEach(function (v) {
        const level = getVersionLevel(v.version);
        const card = document.createElement('div');
        card.className = 'version-card';
        card.id = 'v-' + v.version;
        card.dataset.level = level;

        const header = document.createElement('div');
        header.className = 'version-header';

        const badge = document.createElement('span');
        badge.className = 'version-badge';
        badge.textContent = 'v' + v.version;

        const date = document.createElement('span');
        date.className = 'version-date';
        date.textContent = v.date;

        header.appendChild(badge);
        header.appendChild(date);

        const inner = document.createElement('div');
        inner.className = 'version-body-inner';

        v.changes.forEach(function (desc) {
            const item = document.createElement('div');
            item.className = 'change-item';
            item.textContent = desc;
            inner.appendChild(item);
        });

        card.appendChild(header);
        card.appendChild(inner);
        list.appendChild(card);
    });
}

function initScrollSpy() {
    const sidebar = document.getElementById('sidebar');
    const items = document.querySelectorAll('.sidebar-item');
    const cards = document.querySelectorAll('.version-card');

    sidebar.addEventListener('wheel', function (e) {
        e.stopPropagation();
    }, { passive: true });

    const observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                const ver = entry.target.id.replace('v-', '');
                items.forEach(function (item) {
                    const isActive = item.dataset.version === ver;
                    item.classList.toggle('active', isActive);
                    if (isActive) {
                        item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                    }
                });
            }
        });
    }, { rootMargin: '-30% 0px -60% 0px' });

    cards.forEach(function (card) { observer.observe(card); });
}

// 仅在 changelog 页面（存在对应 DOM 时）执行渲染，避免在 newtab 等页面加载本文件时报错
if (document.getElementById('sidebar') && document.getElementById('versionList')) {
    renderSidebar();
    renderVersions();
    initScrollSpy();
}

// 入场动画触发：与 PhasWer 一致，window.load 后添加 .animate-in
window.addEventListener('load', function () {
    const hero = document.querySelector('.changelog-hero');
    if (hero) hero.classList.add('animate-in');
});
