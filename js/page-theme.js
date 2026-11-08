/* =========================================
   page-theme.js  —  子页面（converter / changelog）主题与 accent 同步
   职责：在页面渲染前同步主站的主题与自定义 accent-color，避免闪烁。
   注意：MV3 默认 CSP `script-src 'self'` 禁止内联脚本，所以从原 <script> 块抽成外部文件。
         优先读 chrome.storage.local（扩展环境），降级到 localStorage（纯网页环境）。
   ========================================= */
(function () {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    function applyTheme(s) {
        const theme = (s && s.theme) || 'auto';
        const resolved = theme === 'auto' ? (prefersDark ? 'dark' : 'light') : theme;
        document.documentElement.setAttribute('data-theme', resolved);
        if (s && s.accentColor) {
            document.documentElement.style.setProperty('--accent-color', s.accentColor);
        }
        if (s && s.darkBaseColor) {
            document.documentElement.style.setProperty('--surface-dark-base', s.darkBaseColor);
        }
    }

    function readFromLocalStorage() {
        try {
            const raw = localStorage.getItem('frostartSettings');
            return raw ? JSON.parse(raw) : {};
        } catch (e) { return {}; }
    }

    function init() {
        // 扩展环境：chrome.storage.local；纯网页环境：localStorage
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get(['frostartSettings'], function (result) {
                applyTheme(result && result.frostartSettings);
            });
        } else {
            applyTheme(readFromLocalStorage());
        }
    }

    // auto 主题跟随系统变化
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
        // 简化：只切换 data-theme，accent 不变
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get(['frostartSettings'], function (result) {
                const s = result && result.frostartSettings;
                if (!s || (s.theme || 'auto') === 'auto') {
                    document.documentElement.setAttribute('data-theme',
                        window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                }
            });
        } else {
            const s = readFromLocalStorage();
            if ((s.theme || 'auto') === 'auto') {
                document.documentElement.setAttribute('data-theme',
                    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
            }
        }
    });

    init();
})();
