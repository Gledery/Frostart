/* =========================================
   services.js  —  公共服务层
   职责：被多个模块调用的核心服务函数 /
         showToast / 抽屉开关 / 壁纸渲染 / 主题切换 /
         文本颜色应用 / 光斑缓存
   加载顺序：utils → settings → services → core → ...
   依赖：SettingsManager, color-utils
   ========================================= */

/* =========================================
   Toast 通知
   ========================================= */
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    requestAnimationFrame(() => {
        requestAnimationFrame(() => toast.classList.add('show'));
    });

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

/* =========================================
   悬浮抽屉（设置面板）
   ========================================= */
function openDrawer() {
    document.getElementById('settings-drawer').classList.add('open');
    document.getElementById('drawer-overlay').classList.add('open');
}

function closeDrawer() {
    document.getElementById('settings-drawer').classList.remove('open');
    document.getElementById('drawer-overlay').classList.remove('open');
}

/* =========================================
   壁纸渲染
   ========================================= */
/* 渐变预设表：每个色相含浅色 / 深色两个变体，选中预设即选中一整对。
   applyTheme 主题跟随与 panels.js 的点击/预览都按解析主题取对应变体 */
const WALLPAPER_PRESETS = {
    mistBlue:    { light: { c1: '#e8eef7', c2: '#dde6f5', angle: 135 }, dark: { c1: '#1e2433', c2: '#141b2b', angle: 135 } },
    celadon:     { light: { c1: '#e7efe9', c2: '#d6e6dc', angle: 135 }, dark: { c1: '#1b2620', c2: '#131d19', angle: 135 } },
    warmSand:    { light: { c1: '#f3ece6', c2: '#e8dcd2', angle: 135 }, dark: { c1: '#2a2320', c2: '#1e1815', angle: 135 } },
    lotusPink:   { light: { c1: '#f1e8ee', c2: '#e4d4df', angle: 135 }, dark: { c1: '#271f25', c2: '#1c161b', angle: 135 } },
    riceApricot: { light: { c1: '#efece6', c2: '#e0d8c8', angle: 135 }, dark: { c1: '#26231d', c2: '#1a1813', angle: 135 } },
    lavender:    { light: { c1: '#edeaf2', c2: '#d8d2e6', angle: 135 }, dark: { c1: '#221f2c', c2: '#171420', angle: 135 } },
};

/* 值匹配反查：当前渐变三字段恰好等于某预设的某变体时返回 { id, variant }，否则 null。
   预设选中态高亮与主题跟随都由它派生，不存独立模式标签 */
function matchGradientPreset(settings) {
    const norm = (v) => String(v == null ? '' : v).trim().toLowerCase();
    const angle = parseInt(settings.gradientAngle, 10) || 135;
    for (const id of Object.keys(WALLPAPER_PRESETS)) {
        for (const variant of ['light', 'dark']) {
            const p = WALLPAPER_PRESETS[id][variant];
            if (norm(p.c1) === norm(settings.gradientColor1)
                && norm(p.c2) === norm(settings.gradientColor2)
                && p.angle === angle) {
                return { id, variant };
            }
        }
    }
    return null;
}

// blob alpha 值缓存：仅在主题切换时变化，避免 applyWallpaper 每次都触发 getComputedStyle 强制回流
let _blobAlphaCache = null;
function getBlobAlphas() {
    if (_blobAlphaCache) return _blobAlphaCache;
    const cs = getComputedStyle(document.documentElement);
    _blobAlphaCache = {
        strong: parseFloat(cs.getPropertyValue('--blob-alpha-strong')) || 0.5,
        soft: parseFloat(cs.getPropertyValue('--blob-alpha-soft')) || 0.38,
    };
    return _blobAlphaCache;
}

function applyWallpaper(settings) {
    document.body.dataset.wallpaper = settings.wallpaperMode;

    const imageLayer = document.querySelector('.wallpaper-image');

    // 图片层：仅在 image/bing 模式下设置背景图。
    // 切到 gradient/solid 时不清空背景图——靠 opacity:0 隐藏即可，
    // 这样从图片模式切回时图片能随 opacity 平滑淡出，而不是被瞬切清空。
    // 仅当处于 image/bing 模式却没有对应图片（无效态/用户点清除）时才显式清空。
    if (imageLayer) {
        if (settings.wallpaperMode === 'image' && settings.wallpaperImage) {
            imageLayer.style.backgroundImage = `url("${settings.wallpaperImage}")`;
        } else if (settings.wallpaperMode === 'bing' && settings.bingWallpaperUrl) {
            imageLayer.style.backgroundImage = `url("${settings.bingWallpaperUrl}")`;
        } else if (settings.wallpaperMode === 'image' || settings.wallpaperMode === 'bing') {
            imageLayer.style.backgroundImage = '';
        }
    }

    // 纯色壁纸（写入类型化变量 --wp-solid，便于平滑过渡）
    document.documentElement.style.setProperty('--wp-solid', settings.wallpaperColor);

    // 自定义渐变（写入类型化颜色/角度分量，由 CSS 组装为 linear-gradient，使颜色/角度变化可平滑过渡）
    const c1 = settings.gradientColor1 || '#e8eef7';
    const c2 = settings.gradientColor2 || '#dde6f5';
    const angle = settings.gradientAngle || 135;
    const root = document.documentElement;
    root.style.setProperty('--wp-c1', c1);
    root.style.setProperty('--wp-c2', c2);
    root.style.setProperty('--wp-angle', `${angle}deg`);

    // 光斑颜色：用户自定义优先；否则跟随壁纸派生（提取背景色相，提升饱和度，
    // 让光斑在低饱和背景下依然可见，对齐 PhasWer 风格）。
    // 输出完整的 rgba 字符串（而非 RGB 三元组），避免 rgba() 内嵌套含逗号的 CSS 变量导致解析不一致。
    const solid = settings.wallpaperColor || c1;
    const customBlob1 = settings.blobColor1;
    const customBlob2 = settings.blobColor2;
    const blob1Rgb = customBlob1 ? hexToRgbTriplet(customBlob1)
        : (settings.wallpaperMode === 'solid' ? hexToBlobRgb(solid, 0) : hexToBlobRgb(c1, 0));
    const blob2Rgb = customBlob2 ? hexToRgbTriplet(customBlob2)
        : (settings.wallpaperMode === 'solid' ? hexToBlobRgb(solid, 40) : hexToBlobRgb(c2, 0));
    // 缓存 blob alpha 值，避免每次 applyWallpaper 都 getComputedStyle 触发强制回流。
    // alpha 值仅在主题切换时变化，由 applyTheme() 清除缓存。
    const alphas = getBlobAlphas();
    const alphaStrong = alphas.strong;
    const alphaSoft = alphas.soft;
    const blobC1Strong = `rgba(${blob1Rgb}, ${alphaStrong})`;
    const blobC1Soft = `rgba(${blob1Rgb}, ${alphaSoft})`;
    const blobC2Strong = `rgba(${blob2Rgb}, ${alphaStrong})`;
    const blobC2Soft = `rgba(${blob2Rgb}, ${alphaSoft})`;
    root.style.setProperty('--blob-c1-strong', blobC1Strong);
    root.style.setProperty('--blob-c1-soft', blobC1Soft);
    root.style.setProperty('--blob-c2-strong', blobC2Strong);
    root.style.setProperty('--blob-c2-soft', blobC2Soft);

    // 图片壁纸遮罩透明度
    const maskOpacity = settings.wallpaperMask / 100;
    document.documentElement.style.setProperty('--wallpaper-mask-opacity', maskOpacity);

    // 图片壁纸模糊度
    const imageBlur = settings.wallpaperBlur || 0;
    document.documentElement.style.setProperty('--wallpaper-image-blur', `${imageBlur}px`);

    // 写入首屏壁纸缓存，供 newtab.html 内联脚本在主 JS 加载前同步应用，消除首屏闪烁
    writeWallpaperCache({
        mode: settings.wallpaperMode,
        wpSolid: settings.wallpaperColor || '',
        wpC1: c1,
        wpC2: c2,
        wpAngle: `${angle}deg`,
        blobC1Strong, blobC1Soft, blobC2Strong, blobC2Soft,
        maskOpacity,
        imageBlur,
        image: (settings.wallpaperMode === 'image' && settings.wallpaperImage)
            ? settings.wallpaperImage
            : (settings.wallpaperMode === 'bing' && settings.bingWallpaperUrl ? settings.bingWallpaperUrl : '')
    });
}

/* 首屏壁纸缓存：把 applyWallpaper 已计算的全部 CSS 变量序列化到 localStorage，
   供 newtab.html 顶部内联脚本在主 JS 加载前同步读取并应用，避免首屏从默认壁纸闪到自定义壁纸。
   图片数据可能很大，若触发配额错误则去掉 image 字段重试。 */
function writeWallpaperCache(cache) {
    const KEY = 'frostartWpCache';
    const dump = (obj) => localStorage.setItem(KEY, JSON.stringify(obj));
    try {
        dump(cache);
    } catch (e) {
        try {
            dump({ ...cache, image: '' });
        } catch (e2) { /* 放弃缓存，首屏回退到默认值 */ }
    }
}

/* =========================================
   主题
   ========================================= */
/* 解析当前实际生效的主题：applyTheme 已把 light/dark 写入 documentElement 的 data-theme，
   壁纸跟随、预设选中态等直接读它，无需重新探测系统偏好。 */
function getResolvedTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

function applyTheme(theme) {
    if (theme === 'auto') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
        document.documentElement.setAttribute('data-theme', theme);
    }
    // 主题切换后 blob alpha 值变化，清除缓存以重新读取
    _blobAlphaCache = null;
    // 主题切换后图标背景基色 RGB 变化，需重新应用
    applyIconBgOpacity(SettingsManager.get('iconBgOpacity'));
    // 文本默认色随主题变化，需重新解析（单独覆盖的优先级在函数内保留）
    applyTextColors(SettingsManager.getAll());

    // 壁纸跟随主题：仅渐变模式下，三字段匹配某预设变体时重写为新主题的对应变体，不匹配则保留自定义。
    // 派生态光斑随 applyWallpaper 自动重算，自定义光斑不动。
    // 放在 applyTheme 里可一处覆盖主题按钮、auto 随系统变化、初始化等所有路径（幂等）
    const s = SettingsManager.getAll();
    if (s.wallpaperMode === 'gradient') {
        const matched = matchGradientPreset(s);
        if (matched) {
            const variant = WALLPAPER_PRESETS[matched.id][getResolvedTheme()];
            SettingsManager.set('gradientColor1', variant.c1);
            SettingsManager.set('gradientColor2', variant.c2);
            SettingsManager.set('gradientAngle', variant.angle);
            applyWallpaper(SettingsManager.getAll());
        }
    }
    // 联动主题色：blob2 有效值可能已随主题重写变化，重算 accent
    if (typeof relinkAccentFromBlob === 'function') relinkAccentFromBlob();
    // 同步取色器/角度滑块、预设选中态、光斑指示与 accent 选择器（定义在 panels/core，运行时已加载）
    if (typeof syncGradientPresetUI === 'function') syncGradientPresetUI(SettingsManager.getAll());
    if (typeof syncGradientPresetActive === 'function') syncGradientPresetActive();
    if (typeof updateBlobIndicators === 'function') updateBlobIndicators();
    if (typeof syncAccentPickerUI === 'function') syncAccentPickerUI();
}

/* =========================================
   自定义文本颜色（细化控制）
   ========================================= */
function applyTextColors(settings) {
    const root = document.documentElement;
    const theme = root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';

    // 各主题下"未自定义"时的默认色
    // 时钟/日期/快捷名称默认白色（浮于壁纸/毛玻璃上更清晰）；
    // 搜索文字/占位符/设置图标保持各自主题的深浅色（搜索框内是浅色玻璃背景）。
    const WHITE = '#ffffff';
    const defaults = theme === 'dark'
        ? { clock: WHITE, date: 'rgba(255,255,255,0.78)', shortcutName: 'rgba(255,255,255,0.78)', searchText: '#f0f0f8', searchPlaceholder: '#888898', settingsIcon: '#f0f0f8' }
        : { clock: WHITE, date: 'rgba(255,255,255,0.82)', shortcutName: 'rgba(255,255,255,0.82)', searchText: '#1a1a2a', searchPlaceholder: '#6a6a7a', settingsIcon: '#1a1a2a' };

    // 解析顺序：单独覆盖 > 主题默认色
    const resolve = (specific, def) => specific || def;

    const map = [
        { key: 'clockColor', cssVar: '--clock-color', value: resolve(settings.clockColor, defaults.clock) },
        { key: 'dateColor', cssVar: '--date-color', value: resolve(settings.dateColor, defaults.date) },
        { key: 'shortcutNameColor', cssVar: '--shortcut-name-color', value: resolve(settings.shortcutNameColor, defaults.shortcutName) },
        { key: 'searchTextColor', cssVar: '--search-text-color', value: resolve(settings.searchTextColor, defaults.searchText) },
        { key: 'searchPlaceholderColor', cssVar: '--search-placeholder-color', value: resolve(settings.searchPlaceholderColor, defaults.searchPlaceholder) },
        { key: 'settingsIconColor', cssVar: '--settings-icon-color', value: resolve('', defaults.settingsIcon) }
    ];
    map.forEach(({ cssVar, value }) => {
        root.style.setProperty(cssVar, value);
    });
}

/* =========================================
   必应每日壁纸（从 core.js 迁移）
   ========================================= */
const BING_WALLPAPER_API = 'https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN';

function getTodayDateStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function refreshBingWallpaper(force) {
    const today = getTodayDateStr();
    const current = SettingsManager.getAll();
    if (!force && current.bingWallpaperDate === today && current.bingWallpaperUrl) return;

    try {
        const res = await fetch(BING_WALLPAPER_API, { cache: 'no-store' });
        if (!res.ok) throw new Error('Bing API HTTP ' + res.status);
        const data = await res.json();
        const img = data && data.images && data.images[0];
        if (!img || !img.url) throw new Error('Bing API 未返回图片');
        const url = 'https://www.bing.com' + img.url;

        SettingsManager.set('bingWallpaperUrl', url);
        SettingsManager.set('bingWallpaperDate', today);
        SettingsManager.set('bingWallpaperTitle', img.title || '');
        SettingsManager.set('bingWallpaperCopyright', img.copyright || '');

        if (SettingsManager.get('wallpaperMode') === 'bing') {
            applyWallpaper(SettingsManager.getAll());
        }
        if (typeof updateBingWallpaperInfo === 'function') updateBingWallpaperInfo();
        if (force) showToast(I18N.t('toast.bingUpdated'));
    } catch (e) {
        if (!current.bingWallpaperUrl) {
            showToast(I18N.t('toast.bingLoadFailed'), 'error');
        } else if (force) {
            showToast(I18N.t('toast.refreshFailed'), 'error');
        }
    }
}

/* =========================================
   字体加载（从 core.js 迁移）
   ========================================= */
function applyFont(fontName) {
    const root = document.documentElement;
    if (!fontName || !fontName.trim()) {
        root.style.removeProperty('--custom-font');
        removeFontLink('custom-font-link');
        return;
    }

    root.style.setProperty('--custom-font', fontName);

    const systemFonts = ['HarmonyOS Sans SC', 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC',
        'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Inter', 'Arial', 'sans-serif',
        'Helvetica', 'Helvetica Neue'];
    const isSystem = systemFonts.some(sf => fontName.toLowerCase().includes(sf.toLowerCase()));

    if (!isSystem) {
        loadGoogleFont(fontName, 'custom-font-link', '300;400;500;600;700');
    } else {
        removeFontLink('custom-font-link');
    }
}

/* =========================================
   时间（从 core.js 迁移）
   ========================================= */
// 缓存时钟/日期 DOM 引用，避免每秒 getElementById
let _timeEl = null;
let _dateEl = null;
// 日期字符串缓存：日期每天只变一次，避免每秒重复创建 Intl 格式化器
let _lastDateKey = '';
let _cachedDateStr = '';

function updateTime() {
    const now = new Date();
    if (!_timeEl) _timeEl = document.getElementById('time');
    if (!_dateEl) _dateEl = document.getElementById('date');

    const format = SettingsManager.get('timeFormat') || 24;
    const showSeconds = SettingsManager.get('showSeconds') || false;

    let hours = now.getHours();
    let minutes = String(now.getMinutes()).padStart(2, '0');
    let seconds = String(now.getSeconds()).padStart(2, '0');
    let suffix = '';

    if (format === 12) {
        suffix = hours >= 12 ? ' PM' : ' AM';
        hours = hours % 12 || 12;
    }

    const hh = String(hours).padStart(2, '0');
    let timeStr = `${hh}:${minutes}`;
    if (showSeconds) timeStr += `:${seconds}`;
    timeStr += suffix;

    _timeEl.textContent = timeStr;

    const showWeek = SettingsManager.get('showWeek') !== false;
    const showLunar = SettingsManager.get('showLunar') || false;
    // 缓存键带上当前语言，切换语言后日期/农历会按新语言重新格式化
    const dateKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${showWeek}-${showLunar}-${I18N.lang}`;
    if (dateKey !== _lastDateKey) {
        _lastDateKey = dateKey;
        let dateStr = showWeek
            ? now.toLocaleDateString(I18N.locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
            : now.toLocaleDateString(I18N.locale, { year: 'numeric', month: 'long', day: 'numeric' });
        if (showLunar) {
            const lunar = getLunarDate(now);
            if (lunar) dateStr += ` · ${lunar}`;
        }
        _cachedDateStr = dateStr;
    }
    _dateEl.textContent = _cachedDateStr;
}

/* 农历日期 */
const LUNAR_MONTH_NAMES = ['正月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '腊月'];
const LUNAR_DAY_NAMES = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
    '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
    '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];

/* 英文序数词：1st / 2nd / 3rd ...（11-13 一律 th） */
function ordinalEn(n) {
    const mod100 = n % 100;
    if (mod100 >= 11 && mod100 <= 13) return n + 'th';
    switch (n % 10) {
        case 1: return n + 'st';
        case 2: return n + 'nd';
        case 3: return n + 'rd';
        default: return n + 'th';
    }
}

let _lunarFmt = null;
function getLunarDate(date) {
    try {
        // 固定用 zh-CN 中国历格式化器提取月/日数字与闰月标记，输出语言再按界面语言组装
        if (!_lunarFmt) {
            _lunarFmt = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', {
                month: 'numeric',
                day: 'numeric'
            });
        }
        const parts = _lunarFmt.formatToParts(date);
        let monthNum = 0, dayNum = 0, isLeap = false;
        for (const p of parts) {
            if (p.type === 'month') {
                const raw = p.value;
                const m = raw.match(/(\d+)/);
                if (m) monthNum = parseInt(m[1], 10);
                isLeap = /闰|leap/i.test(raw);
            } else if (p.type === 'day') {
                const m = p.value.match(/(\d+)/);
                if (m) dayNum = parseInt(m[1], 10);
            }
        }
        if (!monthNum || !dayNum) return null;

        if (I18N.lang === 'en') {
            return `${ordinalEn(dayNum)} day of the ${isLeap ? 'leap ' : ''}${ordinalEn(monthNum)} lunar month`;
        }
        const monthName = LUNAR_MONTH_NAMES[monthNum - 1] || `${monthNum}月`;
        const dayName = LUNAR_DAY_NAMES[dayNum - 1] || `${dayNum}日`;
        return (isLeap ? '闰' : '') + monthName + dayName;
    } catch (e) {
        return null;
    }
}
