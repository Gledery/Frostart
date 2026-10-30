/* =========================================
   panels.js  —  设置面板分区逻辑
   职责：壁纸设置 UI / 搜索引擎网格 / 字体预设 /
         时钟字体 / 文本颜色 / 自定义引擎
   加载顺序：settings.js → core.js → sliders.js → panels.js → widgets.js
   ========================================= */

/* 壁纸过渡开关：enabled=true 时启用平滑过渡（点击预设/恢复默认/松手时），
   enabled=false 时瞬切（拖动颜色/角度时，避免迟滞）。
   通过给 body 加/去 wp-instant 类，CSS 中对该类禁用壁纸相关 transition。 */
function setWallpaperTransition(enabled) {
    document.body.classList.toggle('wp-instant', !enabled);
}

/* 联动主题色（反应式）：开关开启时把 accentColor 同步为调色盘中的 blob2 色 */
function relinkAccentFromBlob() {
    if (!SettingsManager.get('linkAccentToBlob')) return;
    const linked = SettingsManager.get('blobColor2');
    if (!linked) return;
    SettingsManager.set('accentColor', linked);
    applyAccentColor(linked);
    syncAccentPickerUI(linked);
}

/* 同步渐变/光斑取色器与角度滑块显示为当前调色盘值 */
function syncGradientPresetUI(settings) {
    const s = settings || SettingsManager.getAll();
    const gc1 = document.getElementById('gradient-color-1');
    const gc2 = document.getElementById('gradient-color-2');
    const angleSlider = document.getElementById('gradient-angle-slider');
    const angleValue = document.getElementById('gradient-angle-value');
    const blob1 = document.getElementById('blob-color-1');
    const blob2 = document.getElementById('blob-color-2');
    if (gc1) gc1.value = s.gradientColor1 || '#e8eef7';
    if (gc2) gc2.value = s.gradientColor2 || '#dde6f5';
    if (blob1) blob1.value = s.blobColor1 || '#5a93e2';
    if (blob2) blob2.value = s.blobColor2 || '#5f96f2';
    const angle = s.gradientAngle || 135;
    if (angleSlider) angleSlider.value = angle;
    if (angleValue) angleValue.textContent = `${angle}°`;
}

/* 同步预设选中态：由值匹配派生——当前三字段等于哪个预设的哪个变体，就高亮那一格；不匹配则全部不高亮 */
function syncGradientPresetActive() {
    const matched = matchGradientPreset(SettingsManager.getAll());
    document.querySelectorAll('.gradient-preset').forEach(btn => {
        const active = !!matched && btn.dataset.preset === matched.id && btn.dataset.variant === matched.variant;
        btn.classList.toggle('active', active);
    });
}

/* 选中渐变预设：把所点格子的变体整套写入调色盘（渐变三件套 + 两枚光斑，不传变体则取当前解析主题）；
   跨变体选择持续到下次切主题，切主题按成对跟随重写、光斑仅跟随未被手动改过的字段 */
function selectGradientPreset(id, variantId) {
    const preset = (typeof WALLPAPER_PRESETS !== 'undefined') ? WALLPAPER_PRESETS[id] : null;
    if (!preset) return;
    const variant = preset[variantId || getResolvedTheme()] || preset.light;

    setWallpaperTransition(true);
    SettingsManager.set('gradientColor1', variant.c1);
    SettingsManager.set('gradientColor2', variant.c2);
    SettingsManager.set('gradientAngle', variant.angle);
    SettingsManager.set('blobColor1', variant.b1);
    SettingsManager.set('blobColor2', variant.b2);
    applyWallpaper(SettingsManager.getAll());
    syncGradientPresetUI(SettingsManager.getAll());
    syncGradientPresetActive();
    relinkAccentFromBlob();
}

/* 生成单个预设格的预览背景：渐变底 + 双光斑，全部取预设烘焙值 */
function buildGradientPresetPreview(variant) {
    const blob1 = hexToRgbTriplet(variant.b1);
    const blob2 = hexToRgbTriplet(variant.b2);
    return `radial-gradient(circle at 53% 55%, rgba(${blob2}, var(--blob-alpha-strong)) 0%, rgba(${blob2}, 0) 65%),`
        + ` radial-gradient(circle at 47% 45%, rgba(${blob1}, var(--blob-alpha-soft)) 0%, rgba(${blob1}, 0) 65%),`
        + ` linear-gradient(${variant.angle}deg, ${variant.c1}, ${variant.c2})`;
}

/* 初始化所有预设格预览：配色统一取自 WALLPAPER_PRESETS，避免 hex 在 HTML 里重复一份 */
function renderGradientPresetPreviews() {
    document.querySelectorAll('.gradient-preset').forEach(btn => {
        const preset = WALLPAPER_PRESETS[btn.dataset.preset];
        if (!preset) return;
        const variant = preset[btn.dataset.variant] || preset.light;
        btn.style.background = buildGradientPresetPreview(variant);
        btn.style.setProperty('--preset-edge', variant.b2);
    });
}

/* =========================================
   壁纸设置
   ========================================= */
function initWallpaperSettings() {
    const settings = SettingsManager.getAll();

    // 渲染预设格预览（浅/深两行，渐变底 + 双光斑）
    renderGradientPresetPreviews();

    // 模式下拉
    const modeSelect = document.getElementById('wallpaper-mode-select');
    modeSelect?.addEventListener('selectchange', (e) => selectWallpaperType(e.detail.value));
    syncWallpaperModeUI(settings.wallpaperMode);

    // 上传本地图片
    const uploadInput = document.getElementById('wallpaper-upload');
    document.getElementById('wallpaper-upload-btn').addEventListener('click', () => {
        uploadInput.click();
    });

    uploadInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            showToast(I18N.t('toast.selectImage'), 'error');
            return;
        }
        compressImage(file, 1920, 0.85, (dataUrl) => {
            SettingsManager.set('wallpaperImage', dataUrl);
            applyWallpaper(SettingsManager.getAll());
            updateWallpaperUI(SettingsManager.getAll());
            showToast(I18N.t('toast.wallpaperSet'));
        });
        uploadInput.value = '';
    });

    // URL 输入：本地上传的 data URL 不回填输入框，输入框只用于在线直链
    const urlInput = document.getElementById('wallpaper-url');
    const storedImage = SettingsManager.get('wallpaperImage') || '';
    urlInput.value = /^data:/i.test(storedImage) ? '' : storedImage;
    urlInput.addEventListener('change', () => {
        const val = urlInput.value.trim();
        if (!val) {
            SettingsManager.set('wallpaperImage', '');
            applyWallpaper(SettingsManager.getAll());
            updateWallpaperUI(SettingsManager.getAll());
            return;
        }
        if (!/^https?:\/\//i.test(val)) {
            showToast(I18N.t('toast.wrongUrl'), 'error');
            return;
        }
        SettingsManager.set('wallpaperImage', val);
        applyWallpaper(SettingsManager.getAll());
        updateWallpaperUI(SettingsManager.getAll());
    });

    // 纯色选择器
    const colorPicker = document.getElementById('wallpaper-color');
    colorPicker.value = SettingsManager.get('wallpaperColor') || '#e6eef7';
    colorPicker.addEventListener('input', () => {
        setWallpaperTransition(false);
        SettingsManager.set('wallpaperColor', colorPicker.value);
        applyWallpaper(SettingsManager.getAll());
    });
    colorPicker.addEventListener('change', () => {
        setWallpaperTransition(true);
    });

    // 清除图片：弹窗二次确认
    const clearOverlay = document.getElementById('wallpaper-clear-overlay');
    document.getElementById('wallpaper-clear-btn').addEventListener('click', () => {
        clearOverlay.classList.add('open');
    });
    document.getElementById('wallpaper-clear-cancel').addEventListener('click', () => {
        clearOverlay.classList.remove('open');
    });
    clearOverlay.addEventListener('click', (e) => {
        if (e.target === clearOverlay) clearOverlay.classList.remove('open');
    });
    document.getElementById('wallpaper-clear-ok').addEventListener('click', () => {
        clearOverlay.classList.remove('open');
        SettingsManager.set('wallpaperImage', '');
        document.getElementById('wallpaper-url').value = '';
        applyWallpaper(SettingsManager.getAll());
        updateWallpaperUI(SettingsManager.getAll());
    });

    // 渐变颜色 1
    const gc1 = document.getElementById('gradient-color-1');
    gc1.value = settings.gradientColor1 || '#e8eef7';
    gc1.addEventListener('input', () => {
        setWallpaperTransition(false);
        SettingsManager.set('gradientColor1', gc1.value);
        applyWallpaper(SettingsManager.getAll());
        syncGradientPresetActive();
    });
    gc1.addEventListener('change', () => {
        setWallpaperTransition(true);
    });

    // 渐变颜色 2
    const gc2 = document.getElementById('gradient-color-2');
    gc2.value = settings.gradientColor2 || '#dde6f5';
    gc2.addEventListener('input', () => {
        setWallpaperTransition(false);
        SettingsManager.set('gradientColor2', gc2.value);
        applyWallpaper(SettingsManager.getAll());
        syncGradientPresetActive();
    });
    gc2.addEventListener('change', () => {
        setWallpaperTransition(true);
    });

    // 渐变角度
    const angleSlider = document.getElementById('gradient-angle-slider');
    const angleValue = document.getElementById('gradient-angle-value');
    angleSlider.value = settings.gradientAngle || 135;
    angleValue.textContent = `${angleSlider.value}°`;
    angleSlider.addEventListener('input', () => {
        setWallpaperTransition(false);
        angleValue.textContent = `${angleSlider.value}°`;
        SettingsManager.set('gradientAngle', parseInt(angleSlider.value));
        applyWallpaper(SettingsManager.getAll());
        syncGradientPresetActive();
    });
    angleSlider.addEventListener('change', () => {
        setWallpaperTransition(true);
    });

    // 渐变预设：浅/深两行均可点选，写入所点格子的变体
    document.querySelectorAll('.gradient-preset').forEach(preset => {
        preset.addEventListener('click', () => {
            if (WALLPAPER_PRESETS[preset.dataset.preset]) {
                selectGradientPreset(preset.dataset.preset, preset.dataset.variant);
            }
        });
    });

    // 联动主题色开关
    const accentLinkToggle = document.getElementById('accent-link-toggle');
    if (accentLinkToggle) {
        accentLinkToggle.checked = !!SettingsManager.get('linkAccentToBlob');
        accentLinkToggle.addEventListener('change', () => {
            SettingsManager.set('linkAccentToBlob', accentLinkToggle.checked);
            // 打开联动立即采用当前生效 blob2 色
            relinkAccentFromBlob();
        });
    }

    // 光斑颜色（调色盘值，预设写入或手动自定义）
    const blob1 = document.getElementById('blob-color-1');
    const blob2 = document.getElementById('blob-color-2');
    blob1.value = settings.blobColor1 || '#5a93e2';
    blob2.value = settings.blobColor2 || '#5f96f2';

    blob1.addEventListener('input', () => {
        setWallpaperTransition(false);
        SettingsManager.set('blobColor1', blob1.value);
        applyWallpaper(SettingsManager.getAll());
    });
    blob1.addEventListener('change', () => {
        setWallpaperTransition(true);
    });
    blob2.addEventListener('input', () => {
        setWallpaperTransition(false);
        SettingsManager.set('blobColor2', blob2.value);
        applyWallpaper(SettingsManager.getAll());
        relinkAccentFromBlob();
    });
    blob2.addEventListener('change', () => {
        setWallpaperTransition(true);
    });

    // 必应每日壁纸：手动刷新
    const bingRefreshBtn = document.getElementById('bing-refresh-btn');
    if (bingRefreshBtn) {
        bingRefreshBtn.addEventListener('click', () => {
            if (typeof refreshBingWallpaper !== 'function') return;
            bingRefreshBtn.disabled = true;
            const orig = bingRefreshBtn.textContent;
            bingRefreshBtn.textContent = I18N.t('state.refreshing');
            refreshBingWallpaper(true).finally(() => {
                bingRefreshBtn.disabled = false;
                bingRefreshBtn.textContent = orig;
            });
        });
    }
    updateBingWallpaperInfo();
}

/* 同步下拉选中态与区块显隐 */
function syncWallpaperModeUI(mode) {
    const select = document.getElementById('wallpaper-mode-select');
    if (select) FrostartSelect.setValue(select, mode, true);
    document.querySelectorAll('.wallpaper-type-block').forEach(block => {
        block.classList.toggle('active', block.dataset.type === mode);
        block.classList.remove('revealed');
    });
}

function selectWallpaperType(type) {
    SettingsManager.set('wallpaperMode', type);
    applyWallpaper(SettingsManager.getAll());

    // 切到必应模式：若当日壁纸未缓存则拉取
    if (type === 'bing' && typeof refreshBingWallpaper === 'function') {
        refreshBingWallpaper();
    }

    syncWallpaperModeUI(type);
}

function updateWallpaperUI(settings) {
    syncWallpaperModeUI(settings.wallpaperMode);

    // 预览
    const preview = document.getElementById('wallpaper-preview');
    if (preview) {
        if (settings.wallpaperImage) {
            preview.style.backgroundImage = `url("${settings.wallpaperImage}")`;
            preview.classList.remove('empty');
            preview.removeAttribute('data-i18n');
            preview.textContent = '';
        } else {
            preview.style.backgroundImage = '';
            preview.classList.add('empty');
            preview.setAttribute('data-i18n', 'wp.noImage');
            preview.textContent = I18N.t('wp.noImage');
        }
    }

    // URL 输入框：data URL（本地上传）不回填
    const urlInput = document.getElementById('wallpaper-url');
    if (urlInput) {
        const img = settings.wallpaperImage || '';
        urlInput.value = /^data:/i.test(img) ? '' : img;
    }

    // 颜色选择器
    const colorPicker = document.getElementById('wallpaper-color');
    if (colorPicker) colorPicker.value = settings.wallpaperColor || '#e6eef7';

    // 联动主题色开关
    const accentLinkToggle = document.getElementById('accent-link-toggle');
    if (accentLinkToggle) accentLinkToggle.checked = !!settings.linkAccentToBlob;

    // 渐变/光斑取色器与角度滑块
    syncGradientPresetUI(settings);

    // 必应模式遮罩/模糊滑块同步（与图片模式共享同一设置项，导入/重置后需回填）
    const bingMask = document.getElementById('bing-mask-slider');
    if (bingMask) {
        bingMask.value = settings.wallpaperMask;
        const bingMaskValue = document.getElementById('bing-mask-value');
        if (bingMaskValue) bingMaskValue.textContent = `${settings.wallpaperMask}%`;
    }
    const bingBlur = document.getElementById('bing-blur-slider');
    if (bingBlur) {
        bingBlur.value = settings.wallpaperBlur;
        const bingBlurValue = document.getElementById('bing-blur-value');
        if (bingBlurValue) bingBlurValue.textContent = `${settings.wallpaperBlur}px`;
    }
    updateBingWallpaperInfo();
}

/* 必应每日壁纸预览与版权/标题信息展示 */
function updateBingWallpaperInfo() {
    const preview = document.getElementById('bing-preview');
    if (preview) {
        const url = SettingsManager.get('bingWallpaperUrl');
        preview.style.backgroundImage = url ? `url("${url}")` : '';
        preview.classList.toggle('empty', !url);
        if (url) {
            preview.removeAttribute('data-i18n');
            preview.textContent = '';
        } else {
            preview.setAttribute('data-i18n', 'wp.bingNoImage');
            preview.textContent = I18N.t('wp.bingNoImage');
        }
    }
    const text = document.getElementById('bing-info-text');
    if (text) {
        const s = SettingsManager.getAll();
        const info = s.bingWallpaperCopyright || s.bingWallpaperTitle;
        text.textContent = info || '';
        text.style.display = info ? '' : 'none';
    }
}

/* =========================================
   搜索引擎
   ========================================= */
function initSearchEngine() {
    renderSearchEngineGrid();

    const grid = document.getElementById('search-engine-grid');
    if (grid) {
        // 单击：加入／移出快捷切换（当前默认引擎不可移出）
        grid.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-search-engine]');
            if (!btn) return;
            const engine = btn.dataset.searchEngine;
            const pinned = getPinnedEngines();
            const isPinned = pinned.includes(engine);
            if (engine === SettingsManager.get('searchEngine') && isPinned) {
                showToast(I18N.t('toast.defaultEngineStay'));
                return;
            }
            toggleEnginePinned(engine);
            renderSearchEngineGrid();
            showToast(isPinned ? I18N.t('toast.removedQuick') : I18N.t('toast.addedQuick'));
        });
    }

    // 快捷切换开关
    const quickSwitch = document.getElementById('engine-quick-switch');
    if (quickSwitch) {
        quickSwitch.checked = SettingsManager.get('engineQuickSwitch');
        quickSwitch.addEventListener('change', () => {
            SettingsManager.set('engineQuickSwitch', quickSwitch.checked);
        });
    }
}

function renderSearchEngineGrid() {
    const grid = document.getElementById('search-engine-grid');
    if (!grid) return;
    const current = SettingsManager.get('searchEngine') || 'google';
    const pinned = getPinnedEngines();

    // 已加入的排在前面，其余按内置顺序在后
    const entries = Object.entries(SEARCH_ENGINES).map(([key, cfg]) => ({
        key,
        label: getEngineLabel(key),
        pinned: pinned.includes(key)
    }));
    entries.sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return 0;
    });

    const html = entries.map(en => {
        const isCurrent = en.key === current;
        // pinned = 已加入快捷切换；active = 当前默认引擎
        return `
            <button class="engine-chip${en.pinned ? ' pinned' : ''}${isCurrent ? ' active' : ''}" data-search-engine="${en.key}" title="${escapeHtml(en.label)}">
                <span class="engine-chip-check" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </span>
                <img src="icons/search-engine/${en.key}.svg" alt="${escapeHtml(en.label)}" class="engine-chip-icon">
                <span class="engine-chip-name">${escapeHtml(en.label)}</span>
                ${isCurrent ? `<span class="engine-chip-current">${escapeHtml(I18N.t('badge.default'))}</span>` : ''}
            </button>`;
    }).join('');
    grid.innerHTML = html;
}

function updateSearchEngineUI(engine) {
    document.querySelectorAll('[data-search-engine]').forEach(btn => {
        const isCurrent = btn.dataset.searchEngine === engine;
        btn.classList.toggle('active', isCurrent);
        // 同步"默认"角标
        let badge = btn.querySelector('.engine-chip-current');
        if (isCurrent && !badge) {
            badge = document.createElement('span');
            badge.className = 'engine-chip-current';
            badge.textContent = I18N.t('badge.default');
            btn.appendChild(badge);
        } else if (!isCurrent && badge) {
            badge.remove();
        }
    });
}

/* =========================================
   字体设置
   ========================================= */
function initFontSetting() {
    const fontInput = document.getElementById('custom-font');
    const settings = SettingsManager.getAll();

    if (settings.customFont) {
        fontInput.value = settings.customFont;
    }

    fontInput.addEventListener('change', () => {
        const font = fontInput.value.trim();
        SettingsManager.set('customFont', font);
        applyFont(font);
        updateFontPresets(font);
    });

    // 字体预设点击
    document.querySelectorAll('[data-font-preset]').forEach(btn => {
        btn.addEventListener('click', () => {
            const font = btn.dataset.fontPreset;
            fontInput.value = font;
            SettingsManager.set('customFont', font);
            applyFont(font);
            updateFontPresets(font);
        });
    });
}

function updateFontPresets(currentFont) {
    document.querySelectorAll('[data-font-preset]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.fontPreset === currentFont);
    });
}

/* =========================================
   时钟数字字体设置（独立于全局字体）
   ========================================= */
function applyClockFont(fontName) {
    const root = document.documentElement;
    if (!fontName || !fontName.trim()) {
        root.style.removeProperty('--clock-font');
        removeFontLink('clock-font-link');
        return;
    }

    root.style.setProperty('--clock-font', fontName);
    loadGoogleFont(fontName, 'clock-font-link', '300;400;500;600;700;800');
}

function preloadClockFontPreviews() {
    const families = [...new Set(
        [...document.querySelectorAll('[data-clock-font]')]
            .map(btn => (btn.dataset.clockFont || '').trim())
            .filter(Boolean)
    )];
    if (families.length === 0) return;

    const familyParams = families
        .map(f => `family=${f.replace(/\s+/g, '+')}:wght@400`)
        .sort()
        .join('&');
    const link = document.createElement('link');
    link.id = 'clock-font-previews-link';
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?${familyParams}&display=swap`;
    document.head.appendChild(link);
}

function initClockFont() {
    document.querySelectorAll('[data-clock-font]').forEach(btn => {
        btn.addEventListener('click', () => {
            const font = btn.dataset.clockFont;
            SettingsManager.set('clockFont', font);
            applyClockFont(font);
            updateClockFontPresets(font);
        });
    });

    // 惰性加载预览字体：首次打开设置时引入，确保预览按钮能显示各自字形
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', preloadClockFontPreviews, { once: true });
    }
}

function updateClockFontPresets(currentFont) {
    document.querySelectorAll('[data-clock-font]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.clockFont === (currentFont || ''));
    });
}

/* =========================================
   文本颜色设置
   五个颜色选择器分布在时钟 / 搜索 / 图标三个标签页，按 id 统一绑定
   ========================================= */
function initTextColors() {
    // fallback = 未自定义时选择器显示的颜色（与 applyTextColors 的默认色取向一致）
    const items = [
        { id: 'clock-color', key: 'clockColor', fallback: '#ffffff' },
        { id: 'date-color', key: 'dateColor', fallback: '#ffffff' },
        { id: 'shortcut-name-color', key: 'shortcutNameColor', fallback: '#ffffff' },
        { id: 'search-text-color', key: 'searchTextColor', fallback: '#1a1a2a' },
        { id: 'search-placeholder-color', key: 'searchPlaceholderColor', fallback: '#6a6a7a' }
    ];

    items.forEach(({ id, key, fallback }) => {
        const picker = document.getElementById(`${id}-picker`);
        const reset = document.getElementById(`${id}-reset`);
        if (!picker) return;

        picker.value = SettingsManager.get(key) || fallback;

        picker.addEventListener('input', () => {
            SettingsManager.set(key, picker.value);
            applyTextColors(SettingsManager.getAll());
        });

        if (reset) {
            reset.addEventListener('click', () => {
                SettingsManager.set(key, '');
                applyTextColors(SettingsManager.getAll());
                picker.value = fallback;
            });
        }
    });
}

/* =========================================
   自定义搜索引擎
   ========================================= */
function initCustomEngines() {
    const addBtn = document.getElementById('add-engine-btn');
    const overlay = document.getElementById('engine-modal-overlay');
    const cancelBtn = document.getElementById('engine-modal-cancel');
    const confirmBtn = document.getElementById('engine-modal-confirm');
    const nameInput = document.getElementById('engine-name');
    const urlInput = document.getElementById('engine-url');

    if (addBtn) {
        addBtn.addEventListener('click', () => {
            nameInput.value = '';
            urlInput.value = '';
            Frostart.state.pendingEngineIcon = '';
            Frostart.state.pendingEngineIconStyle = null;
            clearEngineIconPreview();
            overlay.classList.add('open');
            setTimeout(() => nameInput.focus(), 100);
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => overlay.classList.remove('open'));
    }

    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.classList.remove('open');
        });
    }

    // 自定义引擎图标上传：读文件 → 编辑器 → 暂存
    const engineIconUploadBtn = document.getElementById('engine-icon-upload-btn');
    const engineIconUploadInput = document.getElementById('engine-icon-upload-input');
    if (engineIconUploadBtn && engineIconUploadInput) {
        engineIconUploadBtn.addEventListener('click', () => engineIconUploadInput.click());
        engineIconUploadInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            engineIconUploadInput.value = '';
            readIconFile(file, (source, type) => {
                openIconEditor({
                    source,
                    type,
                    existingStyle: Frostart.state.pendingEngineIconStyle,
                    onConfirm: (result) => {
                        Frostart.state.pendingEngineIcon = result.src;
                        Frostart.state.pendingEngineIconStyle = result.iconStyle;
                        showEngineIconPreview(result.src, result.iconStyle);
                    }
                });
            });
        });
    }

    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            const name = nameInput.value.trim();
            const url = urlInput.value.trim();

            if (!name || !url) {
                showToast(I18N.t('toast.fillNameUrl'), 'error');
                return;
            }
            if (!url.includes('%s')) {
                showToast(I18N.t('toast.urlNeedsS'), 'error');
                return;
            }
            // 安全校验：只允许 http/https 搜索引擎 URL，防止 javascript:/data: 等协议
            // 在 window.open / location.href 中触发 XSS（防御导入恶意配置的场景）
            const testUrl = url.replace('%s', 'test');
            if (!/^https?:\/\//i.test(testUrl)) {
                showToast(I18N.t('toast.urlHttp'), 'error');
                return;
            }
            try {
                new URL(testUrl);
            } catch (e) {
                showToast(I18N.t('toast.urlBadFormat'), 'error');
                return;
            }

            const engines = SettingsManager.get('customEngines') || [];
            const id = 'custom_' + Date.now();
            const newEngine = { id, name, url: url.replace('%s', '') };
            if (Frostart.state.pendingEngineIcon) {
                newEngine.icon = Frostart.state.pendingEngineIcon;
                newEngine.iconStyle = Frostart.state.pendingEngineIconStyle;
            }
            engines.push(newEngine);
            SettingsManager.set('customEngines', engines);
            // 新增自定义引擎默认加入快捷切换
            const pinned = getPinnedEngines();
            if (!pinned.includes(id)) {
                pinned.push(id);
                SettingsManager.set('pinnedEngines', pinned);
            }
            Frostart.state.pendingEngineIcon = '';
            Frostart.state.pendingEngineIconStyle = null;
            renderCustomEngines();
            overlay.classList.remove('open');
            showToast(I18N.t('toast.engineAdded'));
        });
    }

    renderCustomEngines();
}

/* 自定义引擎图标预览（与 shortcut 预览同结构） */
function showEngineIconPreview(src, iconStyle) {
    const preview = document.getElementById('engine-icon-preview');
    if (preview) {
        preview.style.display = 'flex';
        preview.style.backgroundImage = `url("${src}")`;
        preview.style.backgroundColor = (iconStyle && iconStyle.bgEnabled && iconStyle.bgColor && iconStyle.bgColor !== 'transparent')
            ? iconStyle.bgColor : '';
    }
}

function clearEngineIconPreview() {
    const preview = document.getElementById('engine-icon-preview');
    if (preview) {
        preview.style.display = 'none';
        preview.style.backgroundImage = '';
        preview.style.backgroundColor = '';
    }
}

function renderCustomEngines() {
    const list = document.getElementById('custom-engines-list');
    if (!list) return;
    const engines = SettingsManager.get('customEngines') || [];

    if (engines.length === 0) {
        list.innerHTML = `<div class="setting-hint" style="padding:8px 0;">${escapeHtml(I18N.t('hint.noCustomEngines'))}</div>`;
        return;
    }

    list.innerHTML = engines.map(en => `
        <div class="shortcut-list-item" data-engine-id="${en.id}">
            <div class="shortcut-list-info">
                <div class="shortcut-list-icon"${iconStyleToBg(en.iconStyle) ? ` style="${iconStyleToBg(en.iconStyle)}"` : ''}>
                    ${renderEngineIconHtml(en.id, 22, en.name)}
                </div>
                <div class="shortcut-list-details">
                    <span class="shortcut-list-name">${escapeHtml(en.name)}</span>
                    <span class="shortcut-list-url">${escapeHtml(en.url)}${escapeHtml(I18N.t('custom.keywordAtEnd'))}</span>
                </div>
            </div>
            <div class="shortcut-list-actions">
                <button class="shortcut-action-btn use-engine" data-i18n-title="title.useEngine" title="${escapeHtml(I18N.t('title.useEngine'))}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                </button>
                <button class="shortcut-action-btn delete-engine" data-i18n-title="common.delete" title="${escapeHtml(I18N.t('common.delete'))}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
                </button>
            </div>
        </div>
    `).join('');

    list.querySelectorAll('.use-engine').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.closest('[data-engine-id]').dataset.engineId;
            SettingsManager.set('searchEngine', id);
            updateSearchEngineUI(id);
            updateSearchEngineIndicator();
            showToast(I18N.t('toast.engineSwitched'));
        });
    });

    list.querySelectorAll('.delete-engine').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.closest('[data-engine-id]').dataset.engineId;
            let engines = SettingsManager.get('customEngines') || [];
            engines = engines.filter(en => en.id !== id);
            SettingsManager.set('customEngines', engines);
            // 同步从快捷切换列表移除
            let pinned = getPinnedEngines().filter(k => k !== id);
            SettingsManager.set('pinnedEngines', pinned);
            if (SettingsManager.get('searchEngine') === id) {
                SettingsManager.set('searchEngine', 'google');
                if (!pinned.includes('google') && SEARCH_ENGINES.google) {
                    pinned.push('google');
                    SettingsManager.set('pinnedEngines', pinned);
                }
                updateSearchEngineUI('google');
                updateSearchEngineIndicator();
            }
            renderCustomEngines();
            renderSearchEngineGrid();
        });
    });
}

