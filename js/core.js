/* =========================================
   core.js  —  应用骨架与全局状态
   职责：全局状态变量 / 常量 / 应用初始化 / 设置应用 /
         语言切换 / 搜索 /
         引擎弹窗 / 宽度单位 / 快捷方式 / 设置抽屉 /
         模态框 / 存储用量 / 数据管理 / 更新检查 / 颜文字开关
   加载顺序：settings.js → core.js → sliders.js → panels.js → widgets.js
   架构说明：目前各模块共享全局作用域，正在逐步模块化。小型低风险改动可直接提 PR；涉及整体架构的改动请先在 Issue 中讨论。
   详见 CONTRIBUTING.md。
   ========================================= */
/* 可变状态集中管理：减少裸全局变量，降低重名风险（Q3）
   所有模块共享 Frostart.state.xxx 读写，替代原来的散装 let。 */
const Frostart = window.Frostart || {};
Frostart.state = {
    editingShortcutId: null,
    pendingIconStyle: null,       // 快捷方式编辑：待提交的裁切/背景
    pendingEngineIcon: '',        // 自定义引擎编辑：待提交的图标源
    pendingEngineIconStyle: null, // 自定义引擎编辑：待提交的裁切/背景
};

// 搜索引擎配置（key 与 icons/search-engine/<key>.svg 一一对应）
// label 为英文兜底名；中文界面的内置引擎名走 I18N 字典 engine.<key>，由 getEngineLabel 统一取
const SEARCH_ENGINES = {
    google:        { url: 'https://www.google.com/search?q=',          label: 'Google' },
    bing:          { url: 'https://www.bing.com/search?q=',            label: 'Bing' },
    baidu:         { url: 'https://www.baidu.com/s?wd=',               label: 'Baidu' },
    duckduckgo:    { url: 'https://duckduckgo.com/?q=',                label: 'DuckDuckGo' },
    sougou:        { url: 'https://www.sogou.com/web?query=',          label: 'Sogou' },
    yahoo:         { url: 'https://search.yahoo.com/search?p=',        label: 'Yahoo' },
    bilibili:      { url: 'https://search.bilibili.com/all?keyword=',  label: 'Bilibili' },
    youtube:       { url: 'https://www.youtube.com/results?search_query=', label: 'YouTube' },
    zhihu:         { url: 'https://www.zhihu.com/search?q=',           label: 'Zhihu' },
    weibo:         { url: 'https://s.weibo.com/weibo?q=',              label: 'Weibo' },
    douban:        { url: 'https://www.douban.com/search?q=',          label: 'Douban' },
    xiaohongshu:   { url: 'https://www.xiaohongshu.com/search_result?keyword=', label: 'Xiaohongshu' },
    douyin:        { url: 'https://www.douyin.com/search/',            label: 'Douyin' },
    toutiao:       { url: 'https://so.toutiao.com/search?keyword=',    label: 'Toutiao' },
    taobao:        { url: 'https://s.taobao.com/search?q=',            label: 'Taobao' },
    jd:            { url: 'https://search.jd.com/Search?keyword=',     label: 'JD' },
    github:        { url: 'https://github.com/search?q=',              label: 'GitHub' },
    googlescholar: { url: 'https://scholar.google.com/scholar?q=',     label: 'Google Scholar' }
};

/* 取引擎显示名：内置引擎走 I18N（engine.<key> 有字典时用译文），
   自定义引擎用用户命名，找不到时回退 key */
function getEngineLabel(key) {
    const builtIn = SEARCH_ENGINES[key];
    if (builtIn) {
        const dictKey = 'engine.' + key;
        const localized = I18N.t(dictKey);
        return localized === dictKey ? builtIn.label : localized;
    }
    const c = getCustomEngine(key);
    return c ? c.name : key;
}

document.addEventListener('DOMContentLoaded', async () => {
    // 1. 同步从 localStorage 读取缓存的设置，抢先应用 CSS 变量（消除首屏闪烁）
    const cached = SettingsManager.loadSync();
    if (cached) {
        applyTheme(cached.theme);
        const root = document.documentElement;
        root.style.setProperty('--blur-amount', `${cached.blur}px`);
        root.style.setProperty('--saturation-amount', `${cached.saturation}%`);
        root.style.setProperty('--icon-size', `${cached.iconSize}px`);
        root.style.setProperty('--border-radius', `${cached.borderRadius}px`);
        root.style.setProperty('--shortcut-gap', `${cached.shortcutGap}px`);
        root.style.setProperty('--shortcut-name-size', cached.shortcutNameSize === 0 ? '0px' : `${cached.shortcutNameSize}px`);
        root.style.setProperty('--clock-size', `${cached.clockSize}px`);
        root.style.setProperty('--search-width', `${cached.searchWidth}px`);
        root.style.setProperty('--search-height', `${cached.searchHeight}px`);
        root.style.setProperty('--content-position', cached.contentPosition);
        document.body.classList.toggle('hide-shortcut-names', cached.shortcutNameSize === 0);
    }
    // 2. 异步从 chrome.storage 读取权威设置，完整初始化
    await SettingsManager.load();
    I18N.setLang(SettingsManager.get('lang') || 'auto');
    initializeApp();
});

function initializeApp() {
    initFaviconFallback();
    bindThemeButtons();        // 绑定主题按钮事件（只一次）
    applyTheme(SettingsManager.get('theme'));  // 先确定主题，applyTextColors 依赖 data-theme 解析默认色
    syncThemeUI();             // 同步主题按钮选中态
    // 首屏：临时禁用壁纸过渡，避免从 initial-value 到用户保存值出现一次 0.8s 颜色过渡闪动；
    // 下一帧移除，恢复正常过渡行为。
    document.body.classList.add('wp-instant');
    applySettings();
    requestAnimationFrame(() => {
        document.body.classList.remove('wp-instant');
    });
    initAccentPicker();
    initLanguage();
    initKaomojiToggle();
    initTime();
    initTimeFormat();
    initSearch();
    initKeyboardShortcuts();
    initShortcuts();
    initSettingsDrawer();
    initTabs();
    initModal();
    initDataManagement();
    initStorageIndicator();
    initSliders();
    initWallpaperSettings();
    // 必应每日壁纸：开屏按天检查并静默更新（已有当天缓存则直接复用）
    if (SettingsManager.get('wallpaperMode') === 'bing') {
        refreshBingWallpaper();
    }
    initSearchEngine();
    initFontSetting();
    initClockFont();
    initSwitches();
    initTextColors();
    initContextMenu();
    initDragSort();
    initCustomEngines();
    initEnginePopup();
    initIconEditor();
    initWidthUnitToggle();
    initSettingsSearch();
    initPackager();
    initUpdateCheck();
}

/* =========================================
   应用设置到 DOM
   ========================================= */
function applySettings() {
    const settings = SettingsManager.getAll();
    const root = document.documentElement;

    // 自定义主题色（空值=移除覆盖，回归主题默认 accent）
    applyAccentColor(settings.accentColor);

    root.style.setProperty('--blur-amount', `${settings.blur}px`);
    root.style.setProperty('--saturation-amount', `${settings.saturation}%`);
    root.style.setProperty('--icon-size', `${settings.iconSize}px`);
    root.style.setProperty('--border-radius', `${settings.borderRadius}px`);
    root.style.setProperty('--shortcut-gap', `${settings.shortcutGap}px`);
    root.style.setProperty('--shortcut-name-size', settings.shortcutNameSize === 0 ? '0px' : `${settings.shortcutNameSize}px`);
    document.body.classList.toggle('hide-shortcut-names', settings.shortcutNameSize === 0);
    root.style.setProperty('--clock-size', `${settings.clockSize}px`);
    root.style.setProperty('--search-width', `${settings.searchWidth}px`);
    root.style.setProperty('--search-height', `${settings.searchHeight}px`);
    applySearchRadiusValue(settings.searchRadius >= 9999 ? SEARCH_RADIUS_MAX : settings.searchRadius);
    root.style.setProperty('--content-position', settings.contentPosition);
    const maxWidthValue = settings.iconMaxWidthUnit === '%' ? `${settings.iconMaxWidth}%` : `${settings.iconMaxWidth}px`;
    root.style.setProperty('--icon-max-width', maxWidthValue);
    // 同步宽度单位切换按钮 + 滑块范围（导入/重置后单位可能变化）
    syncWidthUnitUI(settings.iconMaxWidthUnit);

    // 图标背景透明度自定义（-1 = 默认高不透明度，确保可见）
    applyIconBgOpacity(settings.iconBgOpacity);

    applyWallpaper(settings);
    applyFont(settings.customFont);
    applyClockFont(settings.clockFont);
    applyTextColors(settings);
    updateSliderValues();
    updateWallpaperUI(settings);
    renderSearchEngineGrid();
    updateSearchEngineUI(settings.searchEngine);
    updateSearchEngineIndicator();
    updateSwitchUI(settings);
    updateTimeFormatUI(settings.timeFormat);
    updateFontPresets(settings.customFont);
    updateClockFontPresets(settings.clockFont);
    syncLanguageUI();
}

/* =========================================
   角落颜文字开关
   ========================================= */
function initKaomojiToggle() {
    const toggle = document.getElementById('kaomoji-toggle');
    if (!toggle || !window.KaomojiWidget) return;

    // 应用当前设置到组件
    function applyKaomojiState(enabled) {
        if (enabled) {
            if (!window.KaomojiWidget.isActive()) window.KaomojiWidget.init();
        } else {
            if (window.KaomojiWidget.isActive()) window.KaomojiWidget.destroy();
        }
    }

    // 初始态
    toggle.checked = SettingsManager.get('kaomoji') !== false;
    applyKaomojiState(toggle.checked);

    // 开关变化时实时响应
    toggle.addEventListener('change', () => {
        SettingsManager.set('kaomoji', toggle.checked);
        applyKaomojiState(toggle.checked);
    });
}

/* =========================================
   语言（界面国际化）
   ========================================= */
/* 同步语言选项按钮选中态（初始化 / 导入 / 重置后通用） */
function syncLanguageUI() {
    const lang = SettingsManager.get('lang') || 'auto';
    document.querySelectorAll('[data-lang-option]').forEach(b => {
        b.classList.toggle('active', b.dataset.langOption === lang);
    });
}

function initLanguage() {
    syncLanguageUI();
    document.querySelectorAll('[data-lang-option]').forEach(btn => {
        btn.addEventListener('click', () => {
            const lang = btn.dataset.langOption;
            SettingsManager.set('lang', lang);
            document.querySelectorAll('[data-lang-option]').forEach(b => {
                b.classList.toggle('active', b.dataset.langOption === lang);
            });
            applyLanguageChange();
        });
    });
}

/* 切换语言后：刷新 I18N 当前语言、静态文案与所有动态生成的 UI */
function applyLanguageChange() {
    I18N.setLang(SettingsManager.get('lang') || 'auto');
    applySettings();           // 滑块文字、壁纸面板、引擎网格等
    if (typeof renderShortcutsList === 'function') renderShortcutsList();
    if (typeof renderCustomEngines === 'function') renderCustomEngines();
    if (typeof renderEnginePopup === 'function') renderEnginePopup();
    if (typeof rebuildSettingsSearchIndex === 'function') rebuildSettingsSearchIndex();
    if (typeof updateTime === 'function') updateTime();
    if (typeof updateButtonState === 'function') updateButtonState(SettingsManager.VERSION);
}

/* =========================================
   搜索
   ========================================= */
function initSearch() {
    const searchInput = document.getElementById('search-input');

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && searchInput.value.trim()) {
            const engine = SettingsManager.get('searchEngine') || 'google';
            const config = getEngineConfig(engine);
            const query = encodeURIComponent(searchInput.value.trim());
            const targetUrl = config.url + query;

            if (SettingsManager.get('searchInNewTab')) {
                window.open(targetUrl, '_blank', 'noopener');
            } else {
                window.location.href = targetUrl;
            }
        }
    });

    updateSearchEngineIndicator();
}

function updateSearchEngineIndicator() {
    const engine = SettingsManager.get('searchEngine') || 'google';
    const indicator = document.getElementById('search-engine-indicator');
    if (!indicator) return;

    const engineLabel = getEngineLabel(engine);
    indicator.innerHTML = renderEngineIconHtml(engine, 28, engineLabel);
    indicator.title = engineLabel;
}

function getEngineIconFile(engine) {
    // 内置引擎全部使用同名 SVG；找不到时回退到 google
    if (SEARCH_ENGINES[engine]) return `${engine}.svg`;
    return 'google.svg';
}

/* 取得自定义引擎对象（按 id）；不存在返回 null */
function getCustomEngine(engineKey) {
    return (SettingsManager.get('customEngines') || []).find(e => e.id === engineKey) || null;
}

/* 渲染引擎图标 HTML（内置走 svg 文件，自定义引擎有 icon 则用上传图标+裁切 transform，
   否则回退首字母）。size 为正方形像素。 */
function renderEngineIconHtml(engineKey, size, fallbackText) {
    const custom = getCustomEngine(engineKey);
    if (custom && custom.icon) {
        const tf = iconStyleToTransform(custom.iconStyle);
        return `<img src="${escapeHtml(custom.icon)}" alt="${escapeHtml(custom.name || '')}" style="width:${size}px;height:${size}px;object-fit:contain;${tf ? tf : ''}">`;
    }
    if (custom) {
        const ch = (custom.name || '?').charAt(0).toUpperCase();
        return `<span style="font-size:${Math.round(size * 0.5)}px;font-weight:600;color:var(--text-primary);">${escapeHtml(ch)}</span>`;
    }
    const label = SEARCH_ENGINES[engineKey] ? getEngineLabel(engineKey) : (fallbackText || engineKey);
    return `<img src="icons/search-engine/${getEngineIconFile(engineKey)}" alt="${escapeHtml(label)}" style="width:${size}px;height:${size}px;object-fit:contain;">`;
}

function initEnginePopup() {
    const indicator = document.getElementById('search-engine-indicator');
    const popup = document.getElementById('engine-popup');
    if (!indicator || !popup) return;

    indicator.addEventListener('click', (e) => {
        e.stopPropagation();
        // 关闭快捷切换功能时不弹出列表
        if (!SettingsManager.get('engineQuickSwitch')) return;
        renderEnginePopup();
        popup.classList.toggle('show');
    });

    // 点击外部关闭
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-engine-indicator') && !e.target.closest('.engine-popup')) {
            popup.classList.remove('show');
        }
    });
}

/* 获取已加入快捷切换的引擎列表（key 顺序保持 pinned 顺序） */
function getPinnedEngines() {
    const pinned = SettingsManager.get('pinnedEngines') || [];
    const custom = SettingsManager.get('customEngines') || [];
    const customIds = new Set(custom.map(e => e.id));
    // 过滤掉已删除的自定义引擎
    return pinned.filter(key => SEARCH_ENGINES[key] || customIds.has(key));
}

/* 切换某个引擎是否加入快捷切换列表 */
function toggleEnginePinned(key) {
    let pinned = getPinnedEngines();
    if (pinned.includes(key)) {
        pinned = pinned.filter(k => k !== key);
    } else {
        pinned.push(key);
    }
    SettingsManager.set('pinnedEngines', pinned);
}

function renderEnginePopup() {
    const popup = document.getElementById('engine-popup');
    if (!popup) return;
    const current = SettingsManager.get('searchEngine') || 'google';

    // 只渲染已加入快捷切换的引擎（当前默认引擎始终保留，避免无法选中）
    const pinnedKeys = getPinnedEngines();
    const currentEngine = SettingsManager.get('searchEngine') || 'google';
    const visibleKeys = pinnedKeys.includes(currentEngine) || !currentEngine
        ? pinnedKeys
        : [...pinnedKeys, currentEngine];
    const customList = SettingsManager.get('customEngines') || [];
    const engines = visibleKeys.map(key => {
        const builtIn = SEARCH_ENGINES[key];
        if (builtIn) return { key, label: getEngineLabel(key), custom: false };
        const c = customList.find(e => e.id === key);
        return { key, label: c ? c.name : key, custom: true };
    });

    if (engines.length === 0) {
        popup.innerHTML = `<div class="engine-popup-empty">${escapeHtml(I18N.t('popup.noEngine'))}<br><span>${escapeHtml(I18N.t('popup.addInSettings'))}</span></div>`;
        return;
    }

    popup.innerHTML = engines.map(en => {
        const iconHtml = en.custom
            ? renderEngineIconHtml(en.key, 24, en.label)
            : `<img src="icons/search-engine/${getEngineIconFile(en.key)}" alt="${escapeHtml(en.label)}" style="width:24px;height:24px;object-fit:contain;border-radius:6px;">`;
        // label 可能来自导入的自定义引擎名，转义防止 title/alt 属性被 " 断开注入
        return `<div class="engine-popup-item${en.key === current ? ' active' : ''}" data-engine="${en.key}" title="${escapeHtml(en.label)}">${iconHtml}</div>`;
    }).join('');

    popup.querySelectorAll('.engine-popup-item').forEach(item => {
        item.addEventListener('click', () => {
            const key = item.dataset.engine;
            SettingsManager.set('searchEngine', key);
            updateSearchEngineUI(key);
            updateSearchEngineIndicator();
            popup.classList.remove('show');
        });
    });
}

function initWidthUnitToggle() {
    // 初始化按钮状态与滑块范围
    syncWidthUnitUI(SettingsManager.get('iconMaxWidthUnit'));

    document.querySelectorAll('[data-width-unit]').forEach(btn => {
        btn.addEventListener('click', () => {
            const unit = btn.dataset.widthUnit;
            SettingsManager.set('iconMaxWidthUnit', unit);

            syncWidthUnitUI(unit);
            handleIconMaxWidthChange(
                parseInt(document.getElementById('icon-max-width-slider').value),
                document.getElementById('icon-max-width-value')
            );
        });
    });
}

/* 同步宽度单位切换按钮的 active 状态与滑块 min/max/value（初始化/导入/重置后通用） */
function syncWidthUnitUI(unit) {
    unit = unit || 'px';
    document.querySelectorAll('[data-width-unit]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.widthUnit === unit);
    });
    updateWidthSliderRange(unit);
}

function updateWidthSliderRange(unit) {
    const slider = document.getElementById('icon-max-width-slider');
    if (!slider) return;
    const currentValue = SettingsManager.get('iconMaxWidth') || 960;
    if (unit === '%') {
        slider.min = 30;
        slider.max = 100;
        slider.value = Math.min(Math.max(currentValue, 30), 100);
    } else {
        slider.min = 200;
        slider.max = 1920;
        slider.value = Math.min(Math.max(currentValue, 200), 1920);
    }
}

function getEngineConfig(engineKey) {
    const builtIn = SEARCH_ENGINES[engineKey];
    if (builtIn) return builtIn;
    const custom = (SettingsManager.get('customEngines') || []).find(e => e.id === engineKey);
    if (custom) {
        // 运行时防御：仅信任 http/https，避免恶意配置（导入/旧数据）注入 javascript:/data: 触发 XSS
        const probe = (custom.url || '').replace('%s', 'x');
        if (/^https?:\/\//i.test(probe)) {
            return { url: custom.url, label: custom.name };
        }
    }
    return SEARCH_ENGINES.google;
}

/* =========================================
   快捷方式
   ========================================= */
function initShortcuts() {
    renderShortcuts();
    renderShortcutsList();
}

function renderShortcuts() {
    const container = document.getElementById('shortcuts-container');
    const shortcuts = SettingsManager.get('shortcuts') || [];

    // 入场动画只在首次渲染时播放，后续重渲染（编辑/删除/排序）不再重播
    const isFirstRender = !container.dataset.entered;
    container.innerHTML = shortcuts.map((shortcut, index) => `
        <div class="shortcut-item" draggable="true" data-id="${shortcut.id}" data-url="${escapeHtml(shortcut.url)}"${isFirstRender ? ` style="animation-delay: ${0.5 + index * 0.05}s"` : ''}>
            <div class="shortcut-icon"${iconStyleToBg(shortcut.iconStyle) ? ` style="${iconStyleToBg(shortcut.iconStyle)}"` : ''}>
                ${getShortcutIcon(shortcut)}
            </div>
            <span class="shortcut-name">${escapeHtml(shortcut.name)}</span>
        </div>
    `).join('');
    container.dataset.entered = '1';

    container.querySelectorAll('.shortcut-item').forEach(item => {
        item.addEventListener('click', () => openShortcut(item.dataset.url));
    });
}

function openShortcut(url) {
    if (!url) return;
    // 安全防御：仅允许 http/https/mailto，拦截 javascript:/data: 等
    // （导入的配置可能绕过新增时的校验，这里兜底）
    if (!/^(https?|mailto):/i.test(url)) return;
    if (SettingsManager.get('openInNewTab')) {
        window.open(url, '_blank', 'noopener');
    } else {
        window.location.href = url;
    }
}

function renderShortcutsList() {
    const list = document.getElementById('shortcuts-list');
    const shortcuts = SettingsManager.get('shortcuts') || [];

    if (shortcuts.length === 0) {
        list.innerHTML = `<div class="setting-hint" style="text-align:center;padding:16px;">${escapeHtml(I18N.t('shortcuts.empty'))}</div>`;
        return;
    }

    list.innerHTML = shortcuts.map(shortcut => `
        <div class="shortcut-list-item" data-id="${shortcut.id}">
            <div class="shortcut-list-info">
                <div class="shortcut-list-icon"${iconStyleToBg(shortcut.iconStyle) ? ` style="${iconStyleToBg(shortcut.iconStyle)}"` : ''}>
                    ${getShortcutIcon(shortcut, true)}
                </div>
                <div class="shortcut-list-details">
                    <span class="shortcut-list-name">${escapeHtml(shortcut.name)}</span>
                    <span class="shortcut-list-url">${escapeHtml(shortcut.url)}</span>
                </div>
            </div>
            <div class="shortcut-list-actions">
                <button class="shortcut-action-btn edit-shortcut" aria-label="${escapeHtml(I18N.t('common.edit'))}" title="${escapeHtml(I18N.t('common.edit'))}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                </button>
                <button class="shortcut-action-btn delete-shortcut" aria-label="${escapeHtml(I18N.t('common.delete'))}" title="${escapeHtml(I18N.t('common.delete'))}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');

    list.querySelectorAll('.edit-shortcut').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.closest('.shortcut-list-item').dataset.id);
            openEditShortcutModal(id);
        });
    });

    list.querySelectorAll('.delete-shortcut').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.closest('.shortcut-list-item').dataset.id);
            SettingsManager.removeShortcut(id);
            renderShortcuts();
            renderShortcutsList();
        });
    });
}

function getShortcutIcon(shortcut, small = false) {
    const name = shortcut.name || '?';
    const fallbackChar = name.charAt(0).toUpperCase();

    // 自定义图标（含内置 SVG 品牌 logo）：SVG 用 contain + 70% 尺寸保留留白，
    // 位图（用户上传）沿用 cover 填满
    if (shortcut.icon) {
        const tf = iconStyleToTransform(shortcut.iconStyle);
        const isSvg = shortcut.icon.toLowerCase().endsWith('.svg');
        const sizeStyle = isSvg
            ? `object-fit: contain; width: 70%; height: 70%;${tf ? ' ' + tf : ''}`
            : (tf ? tf : '');
        return `
            <img src="${escapeHtml(shortcut.icon)}"
                 alt="${escapeHtml(shortcut.name)}"
                 class="shortcut-favicon"
                 data-fallback="${escapeHtml(fallbackChar)}"${sizeStyle ? ` style="${sizeStyle}"` : ''}>
        `;
    }

    // 尝试获取 favicon，使用更可靠的 DuckDuckGo API
    let domain;
    try {
        domain = new URL(shortcut.url).hostname;
    } catch (e) {
        return `<span class="fallback-icon">${escapeHtml(fallbackChar)}</span>`;
    }

    // DuckDuckGo 的 favicon 服务更稳定
    const faviconUrl = `https://icons.duckduckgo.com/ip3/${domain}.ico`;
    return `
        <img src="${faviconUrl}" 
             alt="${escapeHtml(shortcut.name)}" 
             class="shortcut-favicon"
             data-fallback="${escapeHtml(fallbackChar)}">
    `;
}

/* =========================================
   图标 Fallback 处理
   ========================================= */
function initFaviconFallback() {
    document.addEventListener('error', function(e) {
        const target = e.target;
        // 提前返回：只处理快捷方式图标的加载失败
        if (!target || !target.classList || !target.classList.contains('shortcut-favicon')) return;
        const fallback = target.dataset.fallback || '?';
        target.style.display = 'none';
        const span = document.createElement('span');
        span.className = 'fallback-icon';
        span.textContent = fallback;
        target.parentElement.appendChild(span);
    }, true);
}

/* =========================================
   悬浮抽屉（设置面板）
   ========================================= */
function initSettingsDrawer() {
    const settingsBtn = document.getElementById('settings-btn');
    const drawer = document.getElementById('settings-drawer');
    const overlay = document.getElementById('drawer-overlay');
    const closeBtn = document.getElementById('close-settings');

    settingsBtn.addEventListener('click', openDrawer);
    closeBtn.addEventListener('click', closeDrawer);
    overlay.addEventListener('click', closeDrawer);

    // ESC 关闭
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (drawer.classList.contains('open')) closeDrawer();
            const modal = document.getElementById('modal-overlay');
            if (modal.classList.contains('open')) closeModal();
            const resetOverlay = document.getElementById('reset-confirm-overlay');
            if (resetOverlay && resetOverlay.classList.contains('open')) {
                resetOverlay.classList.remove('open');
            }
        }
    });
}

/* =========================================
   模态框（快捷方式编辑）
   ========================================= */
function initModal() {
    const modalOverlay = document.getElementById('modal-overlay');
    const addBtn = document.getElementById('add-shortcut-btn');
    const cancelBtn = document.getElementById('modal-cancel');

    addBtn.addEventListener('click', () => {
        Frostart.state.editingShortcutId = null;
        Frostart.state.pendingIconStyle = null;
        document.getElementById('modal-title').textContent = I18N.t('modal.addShortcut');
        document.getElementById('shortcut-name').value = '';
        document.getElementById('shortcut-url').value = '';
        document.getElementById('shortcut-icon').value = '';
        clearIconPreview();
        modalOverlay.classList.add('open');
        setTimeout(() => document.getElementById('shortcut-name').focus(), 100);
    });

    cancelBtn.addEventListener('click', closeModal);

    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });

    document.getElementById('modal-confirm').addEventListener('click', saveShortcut);

    // 图标上传：读文件 → 打开编辑器（裁切/缩放/背景）→ 写入
    const iconUploadBtn = document.getElementById('icon-upload-btn');
    const iconUploadInput = document.getElementById('icon-upload-input');
    if (iconUploadBtn && iconUploadInput) {
        iconUploadBtn.addEventListener('click', () => iconUploadInput.click());
        iconUploadInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            iconUploadInput.value = ''; // 允许重复选同一文件
            readIconFile(file, (source, type) => {
                openIconEditor({
                    source,
                    type,
                    existingStyle: Frostart.state.pendingIconStyle,
                    onConfirm: (result) => {
                        document.getElementById('shortcut-icon').value = result.src;
                        Frostart.state.pendingIconStyle = result.iconStyle;
                        showIconPreview(result.src, result.iconStyle);
                    }
                });
            });
        });
    }
}

function showIconPreview(src, iconStyle) {
    const preview = document.getElementById('icon-preview');
    if (preview) {
        preview.style.display = 'flex';
        preview.style.backgroundImage = `url("${src}")`;
        // 预览框沿用独立背景，便于所见即所得
        if (iconStyle && iconStyle.bgEnabled) {
            preview.style.backgroundColor = (iconStyle.bgColor && iconStyle.bgColor !== 'transparent')
                ? iconStyle.bgColor : 'transparent';
        } else {
            preview.style.backgroundColor = '';
        }
    }
}

function clearIconPreview() {
    const preview = document.getElementById('icon-preview');
    if (preview) {
        preview.style.display = 'none';
        preview.style.backgroundImage = '';
        preview.style.backgroundColor = '';
    }
}

function openEditShortcutModal(id) {
    const shortcuts = SettingsManager.get('shortcuts') || [];
    const shortcut = shortcuts.find(s => s.id === id);
    if (!shortcut) return;

    Frostart.state.editingShortcutId = id;
    Frostart.state.pendingIconStyle = shortcut.iconStyle || null;
    document.getElementById('modal-title').textContent = I18N.t('modal.editShortcut');
    document.getElementById('shortcut-name').value = shortcut.name;
    document.getElementById('shortcut-url').value = shortcut.url;
    document.getElementById('shortcut-icon').value = shortcut.icon || '';
    if (shortcut.icon) showIconPreview(shortcut.icon, shortcut.iconStyle); else clearIconPreview();
    document.getElementById('modal-overlay').classList.add('open');
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('open');
    Frostart.state.editingShortcutId = null;
}

function saveShortcut() {
    const name = document.getElementById('shortcut-name').value.trim();
    const url = document.getElementById('shortcut-url').value.trim();
    const icon = document.getElementById('shortcut-icon').value.trim();

    if (!name || !url) {
        alert(I18N.t('alert.fillNameUrl'));
        return;
    }

    let finalUrl = url;
    if (!/^https?:\/\//i.test(url)) {
        finalUrl = 'https://' + url;
    }

    // 校验 URL 有效性
    try {
        new URL(finalUrl);
    } catch (e) {
        alert(I18N.t('alert.urlBadFormat'));
        return;
    }

    if (Frostart.state.editingShortcutId !== null) {
        SettingsManager.updateShortcut(Frostart.state.editingShortcutId, { name, url: finalUrl, icon, iconStyle: icon ? Frostart.state.pendingIconStyle : null });
    } else {
        SettingsManager.addShortcut({ name, url: finalUrl, icon, iconStyle: icon ? Frostart.state.pendingIconStyle : null });
    }

    Frostart.state.pendingIconStyle = null;
    renderShortcuts();
    renderShortcutsList();
    closeModal();
}

/* =========================================
   存储空间用量指示器
   ========================================= */
const STORAGE_QUOTA = {
    chrome: 10 * 1024 * 1024,   // chrome.storage.local ≈ 10 MB
    // localStorage 配额按 UTF-16 字符计为 5 MB（5,242,880 字符），
    // 本工具换算为字节显示，故对应 10 MB 字节。
    local: 10 * 1024 * 1024
};

function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

/* 估算 localStorage 已用字节：键值字符串按 UTF-16（每字符 2 字节）计算 */
function getLocalStorageBytes() {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const val = localStorage.getItem(key) || '';
        total += (key.length + val.length) * 2;
    }
    return total;
}

function renderStorageBar(fillEl, valueEl, used, quota, animate) {
    const pct = Math.min(100, (used / quota) * 100);
    if (fillEl) {
        if (animate) {
            // 先关闭过渡并归零，强制重排落实 0%，下一帧再恢复过渡设目标值，
            // 这样每次都能可靠触发进度条从 0 弹起。
            fillEl.style.transition = 'none';
            fillEl.style.width = '0%';
            void fillEl.offsetWidth;
            requestAnimationFrame(() => {
                fillEl.style.transition = '';
                fillEl.style.width = pct + '%';
            });
        } else {
            fillEl.style.width = pct + '%';
        }
    }
    if (valueEl) {
        if (animate) {
            animateNumber(valueEl, 0, used, quota, pct);
        } else {
            valueEl.textContent = formatBytes(used) + ' / ' + formatBytes(quota) +
                ' · ' + pct.toFixed(pct < 0.1 ? 2 : 1) + '%';
        }
    }
}

/* 数字 count-up 动画：用 cubic-out 缓动，约 0.6s 完成 */
function animateNumber(el, from, to, quota, pct) {
    const duration = 600;
    const start = performance.now();
    el.classList.add('updating');
    function tick(now) {
        const t = Math.min(1, (now - start) / duration);
        // easeOutCubic
        const eased = 1 - Math.pow(1 - t, 3);
        const cur = from + (to - from) * eased;
        el.textContent = formatBytes(cur) + ' / ' + formatBytes(quota) +
            ' · ' + (cur / quota * 100).toFixed(pct < 0.1 ? 2 : 1) + '%';
        if (t < 1) {
            requestAnimationFrame(tick);
        } else {
            el.classList.remove('updating');
        }
    }
    requestAnimationFrame(tick);
}

function refreshStorageIndicator(animate) {
    // chrome.storage.local：异步查询实际字节数
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local &&
        typeof chrome.storage.local.getBytesInUse === 'function') {
        try {
            chrome.storage.local.getBytesInUse((used) => {
                if (chrome.runtime.lastError) return;
                renderStorageBar(
                    document.getElementById('storage-cs-fill'),
                    document.getElementById('storage-cs-value'),
                    used || 0, STORAGE_QUOTA.chrome, animate
                );
            });
        } catch (e) { /* getBytesInUse 不可用，保持占位文本 */ }
    }
    // localStorage：同步估算
    renderStorageBar(
        document.getElementById('storage-ls-fill'),
        document.getElementById('storage-ls-value'),
        getLocalStorageBytes(), STORAGE_QUOTA.local, animate
    );
}

function initStorageIndicator() {
    // 首次渲染：带动画（进度条从 0 弹起）
    refreshStorageIndicator(true);

    // 数据变化时自动刷新（静默，不带高光）
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
        chrome.storage.onChanged.addListener(() => refreshStorageIndicator(false));
    }

    // 手动刷新按钮：图标旋转 + 高光扫过
    const refreshBtn = document.getElementById('storage-refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            if (refreshBtn.classList.contains('spinning')) return; // 防抖
            refreshBtn.classList.add('spinning');
            refreshStorageIndicator(true);
            setTimeout(() => refreshBtn.classList.remove('spinning'), 700);
        });
    }
}

/* =========================================
   数据管理
   ========================================= */
function initDataManagement() {
    // 填充"关于此项目"的版本号
    const versionEl = document.getElementById('about-version');
    if (versionEl) {
        const ver = (SettingsManager.VERSION || '1.0.0');
        versionEl.textContent = 'v' + ver;
    }

    document.getElementById('export-btn').addEventListener('click', () => {
        SettingsManager.export();
        showToast(I18N.t('toast.exported'));
    });

    const importFile = document.getElementById('import-file');
    document.getElementById('import-btn').addEventListener('click', () => {
        importFile.click();
    });

    importFile.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                await SettingsManager.import(file);
                applyTheme(SettingsManager.get('theme'));
                updateWallpaperUI(SettingsManager.getAll());
                syncThemeUI();
                renderShortcuts();
                applyLanguageChange();
                showToast(I18N.t('toast.imported'));
            } catch (err) {
                showToast(err.message, 'error');
            }
        }
        importFile.value = '';
    });

    // 重置：用自定义弹窗确认，替代原生 confirm()
    const resetBtn = document.getElementById('reset-btn');
    const resetOverlay = document.getElementById('reset-confirm-overlay');
    const resetConfirmOk = document.getElementById('reset-confirm-ok');
    const resetConfirmCancel = document.getElementById('reset-confirm-cancel');

    if (resetBtn && resetOverlay) {
        resetBtn.addEventListener('click', () => {
            resetOverlay.classList.add('open');
        });
        resetConfirmCancel.addEventListener('click', () => {
            resetOverlay.classList.remove('open');
        });
        // 点遮罩关闭
        resetOverlay.addEventListener('click', (e) => {
            if (e.target === resetOverlay) resetOverlay.classList.remove('open');
        });
        resetConfirmOk.addEventListener('click', async () => {
            await SettingsManager.reset();
            location.reload();
        });
    }

    // 修复：扩展环境（chrome-extension://）下用 <a> 直接打开 .md 时，Chrome 以
    // text/plain 加载且响应头不带 charset，会用系统默认编码（中文 Windows 上为
    // GBK）解析 UTF-8 文件，导致中文乱码。GitHub / 在线网页因服务器返回
    // charset=utf-8 不受影响。这里改为 fetch（Response.text() 始终按 UTF-8 解码）
    // 后在新标签页以正确 charset 显示，对正常环境也无副作用。
    document.querySelectorAll('a.about-link-btn[href$=".md"]').forEach(a => {
        a.addEventListener('click', async (e) => {
            e.preventDefault();
            const href = a.getAttribute('href');
            try {
                const res = await fetch(href);
                if (!res.ok) throw new Error('HTTP ' + res.status);
                const text = await res.text();
                const win = window.open('', '_blank');
                if (!win) return; // 弹窗被拦截，保持已阻止的默认行为
                const esc = escapeHtml;
                win.document.open();
                win.document.write(
                    '<!DOCTYPE html><html><head><meta charset="utf-8">' +
                    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
                    '<title>' + esc(href) + '</title>' +
                    '<style>' +
                    'body{margin:0;background:#1a1a1a;color:#e6e6e6;' +
                    'font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;line-height:1.6}' +
                    'pre{padding:24px;white-space:pre-wrap;word-break:break-word}' +
                    '@media(prefers-color-scheme:light){body{background:#fafafa;color:#222}}' +
                    '</style></head><body><pre>' + esc(text) + '</pre></body></html>'
                );
                win.document.close();
            } catch (err) {
                // fetch 失败（如本地 file:// 打开被浏览器拦截），回退到原生打开
                window.open(href, '_blank');
            }
        });
    });
}
/* =========================================
   更新检查
   数据源：GitHub Releases API（/releases/latest），同时拿版本号和下载地址。
   只有正式发布的 Release 才会被识别，main 分支上的开发中版本不会被推给用户。
   一旦改仓库名，下面两个 URL 必须同步修改。
   ========================================= */
const UPDATE_REPO = 'Gledery/Frostart';
const UPDATE_API = `https://api.github.com/repos/${UPDATE_REPO}/releases/latest`;
const UPDATE_RELEASES_PAGE = `https://github.com/${UPDATE_REPO}/releases/latest`;
const UPDATE_CHECK_INTERVAL = 6 * 60 * 60 * 1000; // 6 小时节流

function initUpdateCheck() {
    const checkBtn = document.getElementById('check-update-btn');
    if (checkBtn) {
        checkBtn.addEventListener('click', () => {
            // 有更新时点击跳转下载对应版本安装包，否则执行检查
            if (checkBtn.classList.contains('has-update')) {
                let downloadUrl = UPDATE_RELEASES_PAGE;
                try {
                    downloadUrl = localStorage.getItem('frostart_update_download_url') || UPDATE_RELEASES_PAGE;
                } catch (e) {}
                window.open(downloadUrl, '_blank', 'noopener');
            } else {
                checkForUpdates(true);
            }
        });
    }
    // 打开新标签页时静默检查（受 6 小时节流控制）
    checkForUpdates(false);
}

/* 从 Release 响应解析版本号和下载地址。
   下载优先级：手动上传的 asset > tag 源码包(zipball) > Release 网页 */
function parseRelease(data) {
    if (!data || !data.tag_name) return null;
    // tag_name 形如 "v1.1.1"，去掉 v 前缀得到纯版本号
    const version = data.tag_name.replace(/^v/i, '');
    let downloadUrl = data.html_url || UPDATE_RELEASES_PAGE;
    if (data.assets && data.assets.length > 0 && data.assets[0].browser_download_url) {
        downloadUrl = data.assets[0].browser_download_url;
    } else if (data.zipball_url) {
        downloadUrl = data.zipball_url;
    }
    return { version, downloadUrl };
}

async function checkForUpdates(manual) {
    const currentVersion = SettingsManager.VERSION;

    // 节流：非手动检查时，6 小时内不重复请求
    let lastCheck = 0;
    try { lastCheck = parseInt(localStorage.getItem('frostart_update_check') || '0', 10); }
    catch (e) {}

    if (!manual && Date.now() - lastCheck < UPDATE_CHECK_INTERVAL) {
        updateButtonState(currentVersion);
        return;
    }

    // 手动检查时给按钮反馈
    const btn = document.getElementById('check-update-btn');
    const btnLabel = document.getElementById('check-update-label');
    if (manual && btn) {
        btn.disabled = true;
        if (btnLabel) btnLabel.textContent = I18N.t('state.checking');
    }

    try {
        let latestVersion = null;
        let downloadUrl = null;

        // 主源：GitHub Releases API
        const res = await fetch(UPDATE_API);
        if (res.ok) {
            const data = await res.json();
            const info = parseRelease(data);
            if (info) {
                latestVersion = info.version;
                downloadUrl = info.downloadUrl;
            }
        }
        // 失败 = 还没有正式 Release / 网络问题，静默处理，不提示更新

        // 缓存结果
        try {
            localStorage.setItem('frostart_update_check', String(Date.now()));
            if (latestVersion) {
                localStorage.setItem('frostart_update_latest', latestVersion);
                if (downloadUrl) {
                    localStorage.setItem('frostart_update_download_url', downloadUrl);
                } else {
                    localStorage.removeItem('frostart_update_download_url');
                }
            } else {
                localStorage.removeItem('frostart_update_latest');
                localStorage.removeItem('frostart_update_download_url');
            }
        } catch (e) {}

        if (manual) {
            if (latestVersion && compareVersions(latestVersion, currentVersion) > 0) {
                showToast(I18N.t('toast.newVersion', { v: latestVersion }));
            } else {
                showToast(I18N.t('toast.upToDate'));
            }
        }

        updateButtonState(currentVersion, latestVersion);
    } catch (e) {
        if (manual) showToast(I18N.t('toast.updateFailed'), 'error');
        updateButtonState(currentVersion);
    } finally {
        if (manual && btn) {
            btn.disabled = false;
        }
    }
}

/* 有新版时把按钮变成高亮态，无新版时恢复默认 */
function updateButtonState(currentVersion, latestVersion) {
    const btn = document.getElementById('check-update-btn');
    const label = document.getElementById('check-update-label');
    const settingsBtn = document.getElementById('settings-btn');
    if (!btn || !label) return;

    if (latestVersion === undefined) {
        try { latestVersion = localStorage.getItem('frostart_update_latest'); }
        catch (e) { latestVersion = null; }
    }

    if (latestVersion && compareVersions(latestVersion, currentVersion) > 0) {
        label.textContent = I18N.t('toast.updateAvailable', { v: latestVersion });
        btn.classList.add('has-update');
        if (settingsBtn) settingsBtn.classList.add('has-update');
    } else {
        label.textContent = I18N.t('data.checkUpdate');
        btn.classList.remove('has-update');
        if (settingsBtn) settingsBtn.classList.remove('has-update');
    }
}

