/* =========================================
   wp-cache.js  —  首屏壁纸缓存（同步应用）
   职责：在主 JS 加载前，从 localStorage 读取已序列化的壁纸 CSS 变量，
         立即写回 :root，避免首屏从默认壁纸闪到用户自定义壁纸。
   注意：MV3 默认 CSP `script-src 'self'` 禁止内联脚本，所以必须独立为外部文件，
         并在 newtab.html 中以普通 <script src> 同步加载（位于壁纸 DOM 之后、主 JS 之前）。
   ========================================= */
(function () {
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
    } catch (e) { /* 放弃缓存，回退到默认值 */ }
})();
