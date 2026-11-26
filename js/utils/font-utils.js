/* =========================================
   font-utils.js  —  字体加载工具函数
   职责：Google Fonts 加载 / 动态 link 标签移除
   ========================================= */

/**
 * 加载 Google Fonts 样式表
 * @param {string} fontName - 字体名称（支持逗号分隔的 fallback）
 * @param {string} linkId - link 标签的 id，用于后续移除
 * @param {string} weights - 加载的字重，如 "400;700" 或 "300;400;500;600;700;800"
 */
function loadGoogleFont(fontName, linkId, weights) {
    removeFontLink(linkId);
    const family = fontName.split(',')[0].trim().replace(/\s+/g, '+');
    const link = document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${family}:wght@${weights}&display=swap`;
    document.head.appendChild(link);
}

/**
 * 移除之前加载的 Google Fonts link 标签
 * @param {string} linkId - 创建时指定的 link id
 */
function removeFontLink(linkId) {
    const existing = document.getElementById(linkId);
    if (existing) existing.remove();
}

/* 显式导出：被其他模块跨文件消费的顶层声明 */
window.loadGoogleFont = loadGoogleFont;
window.removeFontLink = removeFontLink;
