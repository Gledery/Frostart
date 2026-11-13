/* =========================================
   wp-cache.js  —  首屏视觉缓存（同步应用）
   职责：在主 JS 加载前，从 localStorage 抢先应用首屏可见的全部视觉状态——
         主题 data-theme、accent 色、布局尺寸变量（frostartSettings 轻设置镜像），
         以及壁纸 CSS 变量与图片（frostartWpCache 键），
         保证 body 解除隐藏的第一帧就是用户自己的外观，不闪默认主题/布局/壁纸。
   注意：MV3 默认 CSP `script-src 'self'` 禁止内联脚本，所以必须独立为外部文件，
         并在 newtab.html 中以普通 <script src> 同步加载（位于壁纸 DOM 之后、主 JS 之前）。
         镜像缺失或过期时跳过，由 core.js 在 DOMContentLoaded 用权威值对账。
   ========================================= */
(function () {
    // 首屏主题与布局：frostartSettings 镜像由 SettingsManager._cacheToLocalStorage 写入（轻设置，不含图片）
    try {
        const raw = localStorage.getItem('frostartSettings');
        if (raw) {
            const s = JSON.parse(raw);
            if (s && typeof s === 'object') {
                const root = document.documentElement;
                // 与 services.js applyTheme 相同的 auto 解析，保证 DCL 时值一致、无跳变
                root.setAttribute('data-theme',
                    s.theme === 'dark' || s.theme === 'light' ? s.theme
                        : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
                if (s.accentColor) root.style.setProperty('--accent-color', s.accentColor);
                const px = function (k, v) { if (v != null) root.style.setProperty(k, v + 'px'); };
                px('--blur-amount', s.blur);
                if (s.saturation != null) root.style.setProperty('--saturation-amount', s.saturation + '%');
                px('--icon-size', s.iconSize);
                px('--border-radius', s.borderRadius);
                px('--shortcut-gap', s.shortcutGap);
                px('--shortcut-name-size', s.shortcutNameSize);
                px('--clock-size', s.clockSize);
                px('--search-width', s.searchWidth);
                px('--search-height', s.searchHeight);
                if (s.contentPosition != null) root.style.setProperty('--content-position', s.contentPosition);
                document.body.classList.toggle('hide-shortcut-names', s.shortcutNameSize === 0);
            }
        }
    } catch (e) { /* 镜像缺失或损坏，回退 CSS 默认值 */ }

    // 首屏壁纸：frostartWpCache 由 services.js writeWallpaperCache 在每次应用壁纸时写入
    try {
        const raw = localStorage.getItem('frostartWpCache');
        if (!raw) return;
        const c = JSON.parse(raw);
        if (!c || typeof c !== 'object') return;
        const root = document.documentElement;
        if (c.mode) document.body.setAttribute('data-wallpaper', c.mode);
        const setVar = function (k, v) { if (v) root.style.setProperty(k, v); };
        setVar('--wp-solid', c.wpSolid);
        setVar('--wp-c1', c.wpC1);
        setVar('--wp-c2', c.wpC2);
        setVar('--wp-angle', c.wpAngle);
        setVar('--blob-c1-strong', c.blobC1Strong);
        setVar('--blob-c1-soft', c.blobC1Soft);
        setVar('--blob-c2-strong', c.blobC2Strong);
        setVar('--blob-c2-soft', c.blobC2Soft);
        if (typeof c.maskOpacity === 'number') root.style.setProperty('--wallpaper-mask-opacity', c.maskOpacity);
        if (typeof c.imageBlur === 'number') root.style.setProperty('--wallpaper-image-blur', c.imageBlur + 'px');
        if (c.mode === 'image' && c.image) {
            const img = document.querySelector('.wallpaper-image[data-wp="image"]');
            if (img) img.style.backgroundImage = 'url("' + c.image + '")';
        }
        if (c.mode === 'bing' && c.image) {
            const bingImg = document.querySelector('.wallpaper-image[data-wp="bing"]');
            if (bingImg) bingImg.style.backgroundImage = 'url("' + c.image + '")';
        }
        if (c.mode === 'url' && c.image) {
            const urlImg = document.querySelector('.wallpaper-image[data-wp="url"]');
            if (urlImg) urlImg.style.backgroundImage = 'url("' + c.image + '")';
        }
    } catch (e) { /* 放弃缓存，回退到默认值 */ }
})();
