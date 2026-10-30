/* =========================================
   sliders.js  —  滑块系统
   职责：滑块初始化 / 可编辑数值 / 图标背景与圆角 /
         搜索圆角 / 各 handle* 变更处理 / 滑块值同步
   加载顺序：settings.js → core.js → sliders.js → panels.js → widgets.js
   ========================================= */

/* =========================================
   滑块
   ========================================= */
function initSliders() {
    const sliders = [
        { id: 'blur-slider', key: 'blur', unit: 'px', cssVar: '--blur-amount' },
        { id: 'saturation-slider', key: 'saturation', unit: '%', cssVar: '--saturation-amount' },
        { id: 'icon-size-slider', key: 'iconSize', unit: 'px', cssVar: '--icon-size' },
        { id: 'radius-slider', key: 'borderRadius', unit: 'px', cssVar: '--border-radius' },
        { id: 'shortcut-gap-slider', key: 'shortcutGap', unit: 'px', cssVar: '--shortcut-gap' },
        { id: 'shortcut-name-size-slider', key: 'shortcutNameSize', unit: 'px', cssVar: '--shortcut-name-size', customHandler: handleShortcutNameSizeChange },
        { id: 'clock-size-slider', key: 'clockSize', unit: 'px', cssVar: '--clock-size' },
        { id: 'search-width-slider', key: 'searchWidth', unit: 'px', cssVar: '--search-width' },
        { id: 'search-height-slider', key: 'searchHeight', unit: 'px', cssVar: '--search-height' },
        { id: 'search-radius-slider', key: 'searchRadius', unit: 'px', cssVar: '--search-radius', customHandler: handleSearchRadiusChange },
        { id: 'content-position-slider', key: 'contentPosition', unit: '%', cssVar: '--content-position', rawCss: true },
        { id: 'icon-max-width-slider', key: 'iconMaxWidth', unit: 'px', cssVar: '--icon-max-width', customHandler: handleIconMaxWidthChange },
        { id: 'wallpaper-mask-slider', key: 'wallpaperMask', unit: '%', cssVar: '--wallpaper-mask-opacity', transform: v => v / 100 },
        { id: 'wallpaper-blur-slider', key: 'wallpaperBlur', unit: 'px', cssVar: '--wallpaper-image-blur' },
        { id: 'bing-mask-slider', key: 'wallpaperMask', unit: '%', cssVar: '--wallpaper-mask-opacity', transform: v => v / 100 },
        { id: 'bing-blur-slider', key: 'wallpaperBlur', unit: 'px', cssVar: '--wallpaper-image-blur' },
        { id: 'url-mask-slider', key: 'wallpaperMask', unit: '%', cssVar: '--wallpaper-mask-opacity', transform: v => v / 100 },
        { id: 'url-blur-slider', key: 'wallpaperBlur', unit: 'px', cssVar: '--wallpaper-image-blur' },
        { id: 'icon-bg-slider', key: 'iconBgOpacity', unit: '%', customHandler: handleIconBgChange }
    ];

    sliders.forEach(({ id, key, unit, cssVar, transform, rawCss, customHandler }) => {
        const slider = document.getElementById(id);
        if (!slider) return;

        const valueDisplay = document.getElementById(id.replace('-slider', '-value'));

        slider.addEventListener('input', () => {
            const value = parseInt(slider.value);
            if (customHandler) {
                customHandler(value, valueDisplay, unit);
            } else {
                if (valueDisplay) valueDisplay.textContent = `${value}${unit}`;
                SettingsManager.set(key, value);
                const cssValue = transform ? transform(value) : (rawCss ? value : `${value}${unit}`);
                document.documentElement.style.setProperty(cssVar, cssValue);
            }
        });
    });

    initEditableValues();
}

/* =========================================
   滑块数值点击直接输入
   每个 slider-value 点击后变成输入框，回车/失焦时写入。
   支持特殊词：跟随/默认/-1、隐藏/0、胶囊/9999。
   ========================================= */
/* 特殊词 → 数值映射。中英双语都接受：
   用户可能在中文界面保存了中文词，切到英文后又输入英文词，
   历史数据也可能是中文，所以解析不能只认当前语言。
   匹配时统一小写（中文不受影响） */
const EDITABLE_WORD_MAP = {
    '跟随': -1,      // follow
    '默认': -1,      // default
    '隐藏': 0,       // hidden
    '胶囊': 9999,    // pill
    'follow': -1,
    'default': -1,
    'hidden': 0,
    'pill': 9999
};

function getSliderMeta(sliderId) {
    const slider = document.getElementById(sliderId);
    if (!slider) return null;
    return {
        min: parseInt(slider.min),
        max: parseInt(slider.max),
        step: parseInt(slider.step) || 1
    };
}

function clampSliderValue(sliderId, value) {
    const meta = getSliderMeta(sliderId);
    if (!meta) return value;
    // 允许 -1（跟随/默认）这种特殊值原样通过
    if (value === -1) return value;
    return Math.min(meta.max, Math.max(meta.min, value));
}

function parseEditableInput(sliderId, raw) {
    const text = (raw || '').trim();
    if (!text) return null;
    // 特殊词（中英双语都识别，匹配时忽略大小写）
    const wordVal = EDITABLE_WORD_MAP[text.toLowerCase()];
    if (wordVal !== undefined) {
        return wordVal;
    }
    // 提取首个数字（支持带 px/% 等单位）
    const m = text.match(/-?\d+(\.\d+)?/);
    if (!m) return null;
    return clampSliderValue(sliderId, Math.round(parseFloat(m[0])));
}

function initEditableValues() {
    document.querySelectorAll('.slider-value').forEach(display => {
        // 只处理有对应 slider 的（content-position-value 等都覆盖）
        const sliderId = display.id.replace('-value', '-slider');
        const slider = document.getElementById(sliderId);
        if (!slider) return;

        display.addEventListener('click', () => {
            if (display.classList.contains('editing')) return;
            startEditingValue(display, slider);
        });
    });
}

function startEditingValue(display, slider) {
    const sliderId = slider.id;
    const original = display.textContent;
    display.classList.add('editing');
    display.setAttribute('contenteditable', 'true');
    display.setAttribute('spellcheck', 'false');

    // 聚焦并选中
    display.focus();
    const range = document.createRange();
    range.selectNodeContents(display);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    let committed = false;

    const commit = (restoreOnError) => {
        if (committed) return;
        committed = true;

        const raw = display.textContent;
        const parsed = parseEditableInput(sliderId, raw);

        // 清理编辑态
        display.classList.remove('editing');
        display.removeAttribute('contenteditable');
        display.removeAttribute('spellcheck');
        display.removeEventListener('blur', onBlur);
        display.removeEventListener('keydown', onKey);

        if (parsed === null || (restoreOnError && parsed === null)) {
            // 解析失败，恢复原文本（updateSliderValues 会重新同步，这里也兜底）
            display.textContent = original;
            return;
        }

        // 写入滑块并触发
        slider.value = parsed;
        slider.dispatchEvent(new Event('input', { bubbles: true }));
    };

    const onBlur = () => commit(false);
    const onKey = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            display.blur();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            committed = true;
            display.classList.remove('editing');
            display.removeAttribute('contenteditable');
            display.removeAttribute('spellcheck');
            display.removeEventListener('blur', onBlur);
            display.removeEventListener('keydown', onKey);
            display.textContent = original;
            display.blur();
        }
    };

    display.addEventListener('blur', onBlur);
    display.addEventListener('keydown', onKey);
}

/* 图标背景透明度：-1 = 默认（高不透明度，确保图标可见）；0–100 = 背景色 alpha */
function applyIconBgOpacity(value) {
    const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const baseRgb = theme === 'dark' ? '28, 28, 40' : '255, 255, 255';
    const alpha = (value === -1 || value == null) ? 0.85 : (value / 100);
    document.documentElement.style.setProperty('--icon-bg', `rgba(${baseRgb}, ${alpha})`);
}

function handleIconBgChange(value, display, unit) {
    if (display) {
        display.textContent = value === -1 ? I18N.t('word.default') : `${value}${unit}`;
    }
    SettingsManager.set('iconBgOpacity', value);
    applyIconBgOpacity(value);
}

function handleIconMaxWidthChange(value, display) {
    const unit = SettingsManager.get('iconMaxWidthUnit') || 'px';
    if (display) display.textContent = `${value}${unit}`;
    SettingsManager.set('iconMaxWidth', value);
    const cssValue = unit === '%' ? `${value}%` : `${value}px`;
    document.documentElement.style.setProperty('--icon-max-width', cssValue);
}

function handleShortcutNameSizeChange(value, display, unit) {
    if (display) {
        display.textContent = value === 0 ? I18N.t('word.hidden') : `${value}${unit}`;
    }
    SettingsManager.set('shortcutNameSize', value);
    document.documentElement.style.setProperty('--shortcut-name-size', value === 0 ? '0px' : `${value}px`);
    document.body.classList.toggle('hide-shortcut-names', value === 0);
}

/* 搜索框圆角：滑块 0–60，达到上限(60)即为完全胶囊形 */
const SEARCH_RADIUS_MAX = 60;
function applySearchRadiusValue(value) {
    const cssRadius = value >= SEARCH_RADIUS_MAX ? '9999px' : `${value}px`;
    document.documentElement.style.setProperty('--search-radius', cssRadius);
}
function formatSearchRadiusLabel(value) {
    return value >= SEARCH_RADIUS_MAX ? I18N.t('word.pill') : `${value}px`;
}
function handleSearchRadiusChange(value, display) {
    if (display) display.textContent = formatSearchRadiusLabel(value);
    SettingsManager.set('searchRadius', value >= SEARCH_RADIUS_MAX ? 9999 : value);
    applySearchRadiusValue(value);
}

function updateSliderValues() {
    const settings = SettingsManager.getAll();
    const map = [
        { id: 'blur-slider', valueId: 'blur-value', key: 'blur', unit: 'px' },
        { id: 'saturation-slider', valueId: 'saturation-value', key: 'saturation', unit: '%' },
        { id: 'icon-size-slider', valueId: 'icon-size-value', key: 'iconSize', unit: 'px' },
        { id: 'radius-slider', valueId: 'radius-value', key: 'borderRadius', unit: 'px' },
        { id: 'shortcut-gap-slider', valueId: 'shortcut-gap-value', key: 'shortcutGap', unit: 'px' },
        { id: 'shortcut-name-size-slider', valueId: 'shortcut-name-size-value', key: 'shortcutNameSize', unit: 'px', special: 'nameSize' },
        { id: 'clock-size-slider', valueId: 'clock-size-value', key: 'clockSize', unit: 'px' },
        { id: 'search-width-slider', valueId: 'search-width-value', key: 'searchWidth', unit: 'px' },
        { id: 'search-height-slider', valueId: 'search-height-value', key: 'searchHeight', unit: 'px' },
        { id: 'search-radius-slider', valueId: 'search-radius-value', key: 'searchRadius', unit: 'px', special: 'searchRadius' },
        { id: 'content-position-slider', valueId: 'content-position-value', key: 'contentPosition', unit: '%' },
        { id: 'icon-max-width-slider', valueId: 'icon-max-width-value', key: 'iconMaxWidth', unit: '', special: 'maxwidth' },
        { id: 'wallpaper-mask-slider', valueId: 'wallpaper-mask-value', key: 'wallpaperMask', unit: '%' },
        { id: 'wallpaper-blur-slider', valueId: 'wallpaper-blur-value', key: 'wallpaperBlur', unit: 'px' },
        { id: 'bing-mask-slider', valueId: 'bing-mask-value', key: 'wallpaperMask', unit: '%' },
        { id: 'bing-blur-slider', valueId: 'bing-blur-value', key: 'wallpaperBlur', unit: 'px' },
        { id: 'url-mask-slider', valueId: 'url-mask-value', key: 'wallpaperMask', unit: '%' },
        { id: 'url-blur-slider', valueId: 'url-blur-value', key: 'wallpaperBlur', unit: 'px' },
        { id: 'icon-bg-slider', valueId: 'icon-bg-value', key: 'iconBgOpacity', unit: '%', special: 'iconOpacity' }
    ];

    map.forEach(({ id, valueId, key, unit, special }) => {
        const slider = document.getElementById(id);
        const display = document.getElementById(valueId);

        if (slider && settings[key] !== undefined) {
            // 搜索圆角存储值 9999（胶囊）映射回滑块上限
            if (special === 'searchRadius') {
                slider.value = settings[key] >= 9999 ? SEARCH_RADIUS_MAX : settings[key];
            } else {
                slider.value = settings[key];
            }
        }

        if (display && settings[key] !== undefined) {
            if (special === 'iconOpacity') {
                display.textContent = settings[key] === -1 ? I18N.t('word.default') : `${settings[key]}${unit}`;
            } else if (special === 'maxwidth') {
                const u = settings.iconMaxWidthUnit || 'px';
                display.textContent = `${settings[key]}${u}`;
            } else if (special === 'nameSize') {
                display.textContent = settings[key] === 0 ? I18N.t('word.hidden') : `${settings[key]}${unit}`;
            } else if (special === 'searchRadius') {
                display.textContent = formatSearchRadiusLabel(settings[key] >= 9999 ? SEARCH_RADIUS_MAX : settings[key]);
            } else {
                display.textContent = `${settings[key]}${unit}`;
            }
        }
    });
}

