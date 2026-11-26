/* =========================================
   string-utils.js  —  字符串工具函数
   职责：HTML 转义 escapeHtml / UTF-8 编码 encodeUtf8
   ========================================= */

/**
 * 转义 HTML 特殊字符，防止 XSS
 * @param {*} text - 要转义的文本
 * @returns {string}
 */
function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * 将字符串编码为 UTF-8 字节数组
 * @param {string} str - 要编码的字符串
 * @returns {Uint8Array}
 */
function encodeUtf8(str) {
    const encoder = new TextEncoder();
    return encoder.encode(str);
}

/* 显式导出：被其他模块跨文件消费的顶层声明 */
window.escapeHtml = escapeHtml;
